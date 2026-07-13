"""
EdTech Curriculum Platform - Service Layer
===========================================

Production-grade backend service layer for a two-role EdTech platform:

  - Admin:   drafts a curriculum with AI, iteratively refines it via
             chat-style feedback, and approves/publishes it.
  - Student: reads published modules, builds a daily streak, and asks
             an AI "study buddy" questions scoped strictly to the
             lesson they're reading.

Design notes
------------
- This module exposes plain functions with type hints and docstrings so it
  drops directly into a FastAPI (or Flask) route layer later - each function
  here maps roughly 1:1 to an eventual API endpoint.
- Error handling philosophy: RBAC failures raise PermissionError, and
  AI/database failures raise RuntimeError with a descriptive message. We do
  NOT silently swallow errors and return None, because a service layer that
  hides failures makes the eventual API layer unable to return correct HTTP
  status codes (403 vs 500). Catch these at the API layer and translate them.
- MOCK_MODE = True makes every AI call resolve instantly against realistic
  hardcoded sample data, and every "Firestore" call read/write to a local
  SQLite file (course_content_creator.db) instead - no network, no GCP auth, no
  Firebase project needed. Flip it to False once Vertex AI billing and a
  real Firebase project are both ready. The function signatures and return
  shapes are identical in both modes, so nothing above this layer (frontend,
  API routes) needs to change when you flip the flag.
"""

from __future__ import annotations

import os
import json
import sqlite3
import uuid
from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# 1. CONFIGURATION & GLOBAL STATE
# ---------------------------------------------------------------------------

# The single switch that controls the entire file. While True, no network
# call (Vertex AI or Firestore) is ever made - everything resolves against
# in-memory mock data so a frontend teammate can build against this today.
MOCK_MODE: bool = True

GCP_PROJECT_ID = "intern-bnmit-july-2026"
GCP_LOCATION = "us-central1"  # standard Vertex AI region

TEXT_MODEL = "gemini-2.5-flash"

# Local SQLite file used ONLY while MOCK_MODE = True, as a drop-in stand-in
# for Firestore. Lives next to this script regardless of the working
# directory the app is launched from.
MOCK_DB_PATH = Path(__file__).resolve().parent / "course_content_creator.db"


# --- Vertex AI / Firestore client initialization (skipped entirely in mock mode) ---
genai_client = None
firestore_db = None

if not MOCK_MODE:
    # Imports are deferred into this branch so MOCK_MODE=True never requires
    # google-genai or firebase-admin to even be importable, let alone
    # configured - useful if your frontend teammate hasn't installed them yet.
    from google import genai
    from google.genai import types
    from google.genai import errors as genai_errors
    import firebase_admin
    from firebase_admin import credentials, firestore as admin_firestore

    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"
    os.environ["GOOGLE_CLOUD_PROJECT"] = GCP_PROJECT_ID
    os.environ["GOOGLE_CLOUD_LOCATION"] = GCP_LOCATION

    genai_client = genai.Client()

    if not firebase_admin._apps:
        # Uses the same Application Default Credentials as the genai client.
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {"projectId": GCP_PROJECT_ID})
    firestore_db = admin_firestore.client()


# ---------------------------------------------------------------------------
# 2. SYSTEM INSTRUCTIONS & PROMPT TEMPLATES
# ---------------------------------------------------------------------------

CURRICULUM_ARCHITECT_SYSTEM_INSTRUCTION = """\
You are an expert curriculum architect for an EdTech platform.

Given a course topic, produce ONE focused, well-structured lesson aimed at a
beginner-to-intermediate learner, plus exactly 3 multiple-choice quiz
questions (4 options each) that test understanding of that lesson.

Rules:
- Write in plain, encouraging language. Avoid jargon unless you define it.
- The lesson should be self-contained: a student with no other materials
  should be able to answer the quiz using only what you wrote.
- Each quiz question must have exactly one unambiguously correct answer,
  and that answer must appear verbatim in the options list.
"""

CURRICULUM_REFINER_SYSTEM_INSTRUCTION = """\
You are revising an existing EdTech lesson based on admin feedback.

You will be given the CURRENT lesson + quiz as JSON, and free-text feedback
from the admin describing what to change. Return a complete, fully revised
lesson + quiz in the same structure - do not return a diff or partial edit,
return the entire updated content as if generating it fresh.

Rules:
- Apply the admin's feedback precisely; do not introduce unrelated changes.
- Keep whatever the feedback doesn't ask you to change as close to the
  original as makes sense.
- Maintain exactly 3 quiz questions, 4 options each, one correct answer
  that appears verbatim in the options list.
"""

STUDENT_TUTOR_SYSTEM_INSTRUCTION_TEMPLATE = """\
You are a patient, encouraging AI study buddy embedded on a student's lesson
page. Your ONLY source of truth is the lesson content below - you must
answer using only that content.

If the student asks something the lesson content doesn't cover, say so
warmly and redirect them back to what the lesson does cover. Never invent
facts that aren't grounded in the lesson text. Keep answers short (2-4
sentences) and encouraging in tone - you're a study buddy, not a lecturer.

--- LESSON CONTENT ---
{lesson_text}
--- END LESSON CONTENT ---
"""


# ---------------------------------------------------------------------------
# 3. DATA SCHEMAS
# ---------------------------------------------------------------------------

class QuizItem(BaseModel):
    question: str
    options: List[str] = Field(description="Exactly 4 multiple-choice options")
    correct_answer: str = Field(description="Must exactly match one entry in 'options'")


class ModelCurriculumOutput(BaseModel):
    """
    The shape we ask the AI model itself to produce. Deliberately narrower
    than the final curriculum payload - course_id and video_url are NOT
    generated by the model (IDs shouldn't be hallucinated, and video
    selection is handled by our own deterministic mapping service below),
    they're attached by our own code in _assemble_curriculum_payload().
    """
    topic: str
    lesson_text: str
    quiz: List[QuizItem]


# ---------------------------------------------------------------------------
# 4. VIDEO MAPPING SERVICE (reused from the earlier hardcoded video feature)
# ---------------------------------------------------------------------------

VIDEO_LIBRARY: dict[str, dict] = {
    "Machine Learning": {
        "video_id": "aircAruvnKk",
        "title": "But what is a neural network? | Deep learning chapter 1",
    },
    "Deep Work": {
        "video_id": "gTaJhjQHcf8",
        "title": "Success in a Distracted World: DEEP WORK by Cal Newport",
    },
    "Programming Basics": {
        "video_id": "eWRfhZUzrAc",
        "title": "Python for Beginners - Full Course",
    },
    "General Productivity": {
        "video_id": "arj7oStGLkU",
        "title": "Inside the mind of a master procrastinator",
    },
}

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "Machine Learning": [
        "machine learning", "ml", "deep learning", "neural network", "nlp",
        "genai", "generative ai", "agentic ai", "artificial intelligence", "ai",
    ],
    "Programming Basics": [
        "programming", "coding", "python", "java", "javascript", "algorithms",
    ],
    "Deep Work": ["deep work", "focus", "concentration", "distraction"],
    "General Productivity": ["productivity", "time management", "habits", "procrastination"],
}

DEFAULT_VIDEO = {"video_id": "arj7oStGLkU", "title": "Inside the mind of a master procrastinator"}


def _match_video_for_topic(topic: str) -> str:
    """Returns a YouTube embed URL for the closest matching category, or a default."""
    topic_lower = topic.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in topic_lower for keyword in keywords):
            return f"https://www.youtube.com/embed/{VIDEO_LIBRARY[category]['video_id']}"
    return f"https://www.youtube.com/embed/{DEFAULT_VIDEO['video_id']}"


def _assemble_curriculum_payload(model_output: ModelCurriculumOutput, course_id: Optional[str] = None) -> dict:
    """Attaches a deterministic course_id and video_url to the model's output."""
    return {
        "course_id": course_id or f"course_{uuid.uuid4().hex[:12]}",
        "topic": model_output.topic,
        "lesson_text": model_output.lesson_text,
        "video_url": _match_video_for_topic(model_output.topic),
        "quiz": [item.model_dump() for item in model_output.quiz],
    }


# ---------------------------------------------------------------------------
# 5. MOCK DATA STORE - local SQLite, used only while MOCK_MODE = True
# ---------------------------------------------------------------------------
#
# This is a drop-in stand-in for Firestore: same two "collections" (users,
# curriculums), same field names, just backed by a local file instead of the
# cloud. Every mock-mode branch below talks to this via _get_mock_db_conn(),
# and none of this is ever touched when MOCK_MODE = False.

def _get_mock_db_conn() -> sqlite3.Connection:
    """Opens a connection to the local mock DB with dict-like row access."""
    conn = sqlite3.connect(MOCK_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_mock_db() -> None:
    """
    Creates course_content_creator.db (if it doesn't exist) with the `users` and
    `curriculums` tables, and seeds two demo profiles. Safe to call every
    startup - CREATE TABLE IF NOT EXISTS and an existence check before
    seeding make this idempotent.
    """
    conn = _get_mock_db_conn()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                user_uid TEXT PRIMARY KEY,
                role TEXT NOT NULL,
                name TEXT,
                current_streak INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS curriculums (
                course_id TEXT PRIMARY KEY,
                topic TEXT,
                lesson_text TEXT,
                video_url TEXT,
                quiz_json TEXT,
                status TEXT
            )
            """
        )

        # Seed the two demo profiles only if they aren't already present,
        # so re-running the script doesn't reset a streak you've been
        # incrementing during testing.
        conn.execute(
            """
            INSERT OR IGNORE INTO users (user_uid, role, name, current_streak)
            VALUES (?, ?, ?, ?)
            """,
            ("admin-uid-demo", "admin", "Demo Admin", 0),
        )
        conn.execute(
            """
            INSERT OR IGNORE INTO users (user_uid, role, name, current_streak)
            VALUES (?, ?, ?, ?)
            """,
            ("student-uid-demo", "student", "Demo Student", 3),
        )
        conn.commit()
    finally:
        conn.close()


if MOCK_MODE:
    _init_mock_db()

_MOCK_LESSON_TEXT = (
    "Machine Learning (ML) is a branch of Artificial Intelligence where "
    "computers learn patterns from data instead of following manually "
    "written rules. There are three broad types: Supervised Learning "
    "(learns from labeled examples), Unsupervised Learning (finds structure "
    "in unlabeled data), and Reinforcement Learning (learns via trial, "
    "error, and rewards)."
)

_MOCK_QUIZ = [
    QuizItem(
        question="What is the main difference between traditional programming and ML?",
        options=[
            "ML requires no data at all",
            "Traditional programming uses manual rules; ML learns patterns from data",
            "They are exactly the same",
            "ML only works on images",
        ],
        correct_answer="Traditional programming uses manual rules; ML learns patterns from data",
    ),
    QuizItem(
        question="Which type of ML learns from labeled examples?",
        options=["Unsupervised Learning", "Reinforcement Learning", "Supervised Learning", "Manual Learning"],
        correct_answer="Supervised Learning",
    ),
    QuizItem(
        question="An AI that learns to play a game via trial, error, and rewards uses:",
        options=["Supervised Learning", "Unsupervised Learning", "Reinforcement Learning", "Static Learning"],
        correct_answer="Reinforcement Learning",
    ),
]


# ---------------------------------------------------------------------------
# 6. ROLE-BASED ACCESS CONTROL
# ---------------------------------------------------------------------------

def verify_user_role(user_uid: str, required_role: str) -> bool:
    """
    Looks up user_uid in the Firestore `users` collection and checks whether
    their "role" field matches required_role exactly.

    Returns False (never raises) for a missing user, a missing role field,
    or any lookup failure - callers that need to enforce access should use
    _assert_role()/_assert_admin() below, which raise PermissionError.
    """
    if MOCK_MODE:
        conn = _get_mock_db_conn()
        try:
            row = conn.execute(
                "SELECT role FROM users WHERE user_uid = ?", (user_uid,)
            ).fetchone()
            return bool(row and row["role"] == required_role)
        finally:
            conn.close()

    try:
        snapshot = firestore_db.collection("users").document(user_uid).get()
        if not snapshot.exists:
            return False
        data = snapshot.to_dict() or {}
        return data.get("role") == required_role
    except Exception as e:
        print(f"[verify_user_role] Firestore lookup failed for {user_uid}: {e}")
        return False


def _assert_admin(user_uid: str) -> None:
    """Raises PermissionError if user_uid is not verified as an admin."""
    if not verify_user_role(user_uid, "admin"):
        raise PermissionError(f"User '{user_uid}' is not authorized as an admin for this action.")


# ---------------------------------------------------------------------------
# 7. CORE SERVICE LAYER FUNCTIONS
# ---------------------------------------------------------------------------

def generate_initial_draft(admin_uid: str, topic: str) -> dict:
    """
    Admin-only. Generates a brand-new curriculum draft (lesson + 3-question
    quiz + matched video) for the given topic.

    Raises:
        PermissionError: if admin_uid is not a verified admin.
        RuntimeError: if the AI call fails or returns unparsable output.
    """
    _assert_admin(admin_uid)

    if MOCK_MODE:
        mock_output = ModelCurriculumOutput(topic=topic, lesson_text=_MOCK_LESSON_TEXT, quiz=_MOCK_QUIZ)
        return _assemble_curriculum_payload(mock_output)

    try:
        response = genai_client.models.generate_content(
            model=TEXT_MODEL,
            contents=f"Course topic: {topic}",
            config=types.GenerateContentConfig(
                system_instruction=CURRICULUM_ARCHITECT_SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=ModelCurriculumOutput,
                temperature=0.4,
            ),
        )
        model_output: ModelCurriculumOutput | None = response.parsed
        if model_output is None:
            raise RuntimeError("Model returned output that could not be parsed into the expected schema.")
        return _assemble_curriculum_payload(model_output)

    except genai_errors.APIError as e:
        raise RuntimeError(f"AI curriculum generation failed (status={getattr(e, 'code', 'unknown')}): {e}") from e
    except Exception as e:
        raise RuntimeError(f"Unexpected error generating curriculum draft: {e}") from e


def refine_curriculum_draft(admin_uid: str, current_draft: dict, admin_feedback: str) -> dict:
    """
    Admin-only. Takes an existing curriculum draft plus free-text admin
    feedback (e.g. from a chat panel) and returns a fully revised draft in
    the same JSON shape, preserving the original course_id.

    Raises:
        PermissionError: if admin_uid is not a verified admin.
        RuntimeError: if the AI call fails or returns unparsable output.
    """
    _assert_admin(admin_uid)

    course_id = current_draft.get("course_id")

    if MOCK_MODE:
        revised_text = (
            _MOCK_LESSON_TEXT
            + f"\n\n[MOCK REVISION APPLIED based on feedback: \"{admin_feedback}\"]"
        )
        mock_output = ModelCurriculumOutput(
            topic=current_draft.get("topic", "Untitled Topic"),
            lesson_text=revised_text,
            quiz=_MOCK_QUIZ,
        )
        return _assemble_curriculum_payload(mock_output, course_id=course_id)

    try:
        prompt = (
            f"CURRENT LESSON + QUIZ (JSON):\n{current_draft}\n\n"
            f"ADMIN FEEDBACK:\n{admin_feedback}"
        )
        response = genai_client.models.generate_content(
            model=TEXT_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=CURRICULUM_REFINER_SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=ModelCurriculumOutput,
                temperature=0.4,
            ),
        )
        model_output: ModelCurriculumOutput | None = response.parsed
        if model_output is None:
            raise RuntimeError("Model returned output that could not be parsed into the expected schema.")
        return _assemble_curriculum_payload(model_output, course_id=course_id)

    except genai_errors.APIError as e:
        raise RuntimeError(f"AI curriculum refinement failed (status={getattr(e, 'code', 'unknown')}): {e}") from e
    except Exception as e:
        raise RuntimeError(f"Unexpected error refining curriculum draft: {e}") from e


def ask_student_tutor(lesson_text: str, student_question: str) -> str:
    """
    Open to any authenticated student - no admin check. Answers a student's
    question using ONLY the supplied lesson_text as grounding context, via
    an isolated system instruction (the model has no memory of anything
    outside this single call).

    Raises:
        RuntimeError: if the AI call fails.
    """
    if MOCK_MODE:
        return (
            f"(mock tutor) Great question about \"{student_question[:60]}\" - "
            f"based on the lesson, focus on how the core concept was defined "
            f"in the text above. Try re-reading that section once more, and "
            f"feel free to ask me to break it down further!"
        )

    try:
        system_instruction = STUDENT_TUTOR_SYSTEM_INSTRUCTION_TEMPLATE.format(lesson_text=lesson_text)
        response = genai_client.models.generate_content(
            model=TEXT_MODEL,
            contents=student_question,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3,
            ),
        )
        return response.text or "I couldn't come up with an answer just now - try rephrasing your question?"

    except genai_errors.APIError as e:
        raise RuntimeError(f"AI tutor call failed (status={getattr(e, 'code', 'unknown')}): {e}") from e
    except Exception as e:
        raise RuntimeError(f"Unexpected error in student tutor call: {e}") from e


# ---------------------------------------------------------------------------
# 8. FIRESTORE DATABASE INTEGRATION
# ---------------------------------------------------------------------------

def save_or_update_curriculum(admin_uid: str, course_data: dict, status: str) -> dict:
    """
    Admin-only. Writes course_data into the `curriculums` collection, keyed
    by course_data["course_id"]. status must be "draft" (admin-only visible)
    or "published" (visible to students).

    Raises:
        PermissionError: if admin_uid is not a verified admin.
        ValueError: if course_data has no course_id, or status is invalid.
        RuntimeError: if the Firestore write fails.
    """
    _assert_admin(admin_uid)

    if status not in ("draft", "published"):
        raise ValueError(f"status must be 'draft' or 'published', got: '{status}'")

    course_id = course_data.get("course_id")
    if not course_id:
        raise ValueError("course_data must include a 'course_id' key.")

    payload = {**course_data, "status": status}

    if MOCK_MODE:
        conn = _get_mock_db_conn()
        try:
            conn.execute(
                """
                INSERT INTO curriculums (course_id, topic, lesson_text, video_url, quiz_json, status)
                VALUES (:course_id, :topic, :lesson_text, :video_url, :quiz_json, :status)
                ON CONFLICT(course_id) DO UPDATE SET
                    topic = excluded.topic,
                    lesson_text = excluded.lesson_text,
                    video_url = excluded.video_url,
                    quiz_json = excluded.quiz_json,
                    status = excluded.status
                """,
                {
                    "course_id": course_id,
                    "topic": payload.get("topic"),
                    "lesson_text": payload.get("lesson_text"),
                    "video_url": payload.get("video_url"),
                    "quiz_json": json.dumps(payload.get("quiz", [])),
                    "status": status,
                },
            )
            conn.commit()
        finally:
            conn.close()
        print(f"[save_or_update_curriculum] MOCK_MODE: saved '{course_id}' with status='{status}' to {MOCK_DB_PATH.name}")
        return {"success": True, "course_id": course_id, "status": status}

    try:
        firestore_db.collection("curriculums").document(course_id).set(payload, merge=True)
        return {"success": True, "course_id": course_id, "status": status}
    except Exception as e:
        raise RuntimeError(f"Failed to save curriculum '{course_id}' to Firestore: {e}") from e


def update_student_streak(user_uid: str) -> int:
    """
    Increments a student's current_streak counter in the `users` collection
    when they complete a module. Runs as a Firestore transaction so
    concurrent completions (e.g. multiple tabs) can't cause a lost update.

    Returns the new streak value.

    Raises:
        RuntimeError: if the user doesn't exist or the transaction fails.

    Production note: real streak logic usually also needs to check the
    student's *last active date* (increment only if yesterday was active,
    reset to 1 if there was a gap, no-op if already counted today). That
    date-comparison logic is intentionally left out here to match the scope
    requested - the atomic-increment mechanics below are what matters and
    that comparison can be added inside the same transaction function later.
    """
    if MOCK_MODE:
        conn = _get_mock_db_conn()
        try:
            existing = conn.execute(
                "SELECT current_streak FROM users WHERE user_uid = ?", (user_uid,)
            ).fetchone()
            if existing is None:
                raise RuntimeError(f"User '{user_uid}' not found.")

            conn.execute(
                "UPDATE users SET current_streak = current_streak + 1 WHERE user_uid = ?",
                (user_uid,),
            )
            conn.commit()

            new_value = conn.execute(
                "SELECT current_streak FROM users WHERE user_uid = ?", (user_uid,)
            ).fetchone()["current_streak"]
        finally:
            conn.close()

        print(f"[update_student_streak] MOCK_MODE: '{user_uid}' streak -> {new_value}")
        return new_value

    try:
        user_ref = firestore_db.collection("users").document(user_uid)
        transaction = firestore_db.transaction()

        @admin_firestore.transactional
        def _increment_in_transaction(txn) -> int:
            snapshot = user_ref.get(transaction=txn)
            if not snapshot.exists:
                raise RuntimeError(f"User '{user_uid}' not found.")
            current = (snapshot.to_dict() or {}).get("current_streak", 0)
            new_value = current + 1
            txn.update(user_ref, {"current_streak": new_value})
            return new_value

        return _increment_in_transaction(transaction)

    except Exception as e:
        raise RuntimeError(f"Failed to update streak for '{user_uid}': {e}") from e


# ---------------------------------------------------------------------------
# 9. DEMO / MANUAL TEST ENTRY POINT
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    ADMIN_UID = "admin-uid-demo"
    STUDENT_UID = "student-uid-demo"
    IMPOSTOR_UID = "student-uid-demo"  # a student trying to hit an admin-only function

    print("=" * 70)
    print("STEP 1: Admin generates an initial curriculum draft")
    print("=" * 70)
    draft = generate_initial_draft(ADMIN_UID, "Introduction to Machine Learning")
    print(f"Draft course_id: {draft['course_id']}")
    print(f"Video URL: {draft['video_url']}")

    print("\n" + "=" * 70)
    print("STEP 2: Admin refines the draft based on feedback")
    print("=" * 70)
    revised = refine_curriculum_draft(ADMIN_UID, draft, "Make the tone more beginner-friendly")
    print(f"Revised course_id (should match original): {revised['course_id']}")

    print("\n" + "=" * 70)
    print("STEP 3: Admin publishes the curriculum")
    print("=" * 70)
    save_result = save_or_update_curriculum(ADMIN_UID, revised, status="published")
    print(save_result)

    print("\n" + "=" * 70)
    print("STEP 4: A student asks the AI tutor a question")
    print("=" * 70)
    answer = ask_student_tutor(revised["lesson_text"], "What's the difference between supervised and unsupervised learning?")
    print(f"Tutor answer: {answer}")

    print("\n" + "=" * 70)
    print("STEP 5: Student completes the module, streak increments")
    print("=" * 70)
    new_streak = update_student_streak(STUDENT_UID)
    print(f"New streak: {new_streak}")

    print("\n" + "=" * 70)
    print("STEP 6: RBAC check - a student tries an admin-only action")
    print("=" * 70)
    try:
        generate_initial_draft(IMPOSTOR_UID, "Should not be allowed")
    except PermissionError as e:
        print(f"Correctly blocked: {e}")

    print("\nAll steps complete.")
