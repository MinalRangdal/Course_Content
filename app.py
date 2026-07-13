"""
EdTech Curriculum Platform - Flask Backend Service
=====================================================

Flask backend for a two-role EdTech platform:

  - Admin:   drafts a curriculum with AI, iteratively refines it via
             chat-style feedback, and approves/publishes it.
  - Student: reads published modules, builds a daily streak, and asks
             an AI "study buddy" questions scoped strictly to the
             lesson they're reading.

Design notes
------------
- AI provider: the Gemini Developer API (Google AI Studio), NOT Vertex AI.
  This means no GCP project, no billing account, and no enterprise admin
  approval needed - just a free API key from https://aistudio.google.com.
  The client picks the key up automatically from the GEMINI_API_KEY
  environment variable (see section 1 below).
- Database backend and AI provider are INDEPENDENT switches:
    - MOCK_MODE      controls the AI calls only (mock text vs real Gemini).
    - USE_FIRESTORE  controls the database only (local SQLite vs Firestore).
  This means you can run real Gemini generations while still using the
  local SQLite file, without needing a Firebase project or `gcloud` ADC set
  up at all - which is the expected setup for a hackathon timeline. Only
  flip USE_FIRESTORE to True once you actually have a Firebase project and
  have run `gcloud auth application-default login`.
- Error handling philosophy: RBAC failures raise PermissionError, and
  AI/database failures raise RuntimeError with a descriptive message. Flask
  routes catch these and translate them into the correct HTTP status codes
  (403 / 400 / 500) rather than leaking raw tracebacks to the frontend.
"""

from __future__ import annotations

import os
import json
import sqlite3
import uuid
from pathlib import Path
from typing import List, Optional

from flask import Flask, request, jsonify
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# 1. CONFIGURATION & GLOBAL STATE
# ---------------------------------------------------------------------------

# Controls AI calls ONLY: True = hardcoded mock text, False = real Gemini
# Developer API calls (needs GEMINI_API_KEY set in your environment).
MOCK_MODE: bool = False

# Controls the DATABASE backend ONLY, independent of MOCK_MODE above.
# False (default) = local SQLite file, no cloud setup needed at all.
# True  = Firestore via firebase-admin - only flip this once you have a
#         real Firebase project AND have run:
#             gcloud auth application-default login
#         Leave this False for local/hackathon development even after
#         MOCK_MODE is False - the two are unrelated.
USE_FIRESTORE: bool = False

# Only used if USE_FIRESTORE = True.
GCP_PROJECT_ID = "intern-bnmit-july-2026"

TEXT_MODEL = "gemini-3.5-flash"

# Local SQLite file used whenever USE_FIRESTORE = False (the default). Lives
# next to this script regardless of the working directory the app is
# launched from.
MOCK_DB_PATH = Path(__file__).resolve().parent / "course_content_creator.db"


# --- Gemini Developer API client init (skipped while MOCK_MODE = True) ---
genai_client = None

if not MOCK_MODE:
    # Imports are deferred into this branch so MOCK_MODE=True never requires
    # google-genai to even be importable, let alone configured - useful if
    # your frontend teammate hasn't installed it yet.
    from google import genai
    from google.genai import types
    from google.genai import errors as genai_errors

    # Gemini Developer API (free tier via Google AI Studio) - NOT Vertex AI.
    # genai.Client() automatically reads the API key from the GEMINI_API_KEY
    # environment variable when no explicit vertexai/project/location config
    # is passed in, so make sure that's set before running with MOCK_MODE=False:
    #     $env:GEMINI_API_KEY="your-api-key-here"   (Windows PowerShell)
    #     export GEMINI_API_KEY="your-api-key-here"  (Mac/Linux)
    # Get a free key at: https://aistudio.google.com/app/apikey
    genai_client = genai.Client()


# --- Firestore client init (skipped entirely unless USE_FIRESTORE = True) ---
firestore_db = None

if USE_FIRESTORE:
    # Also deferred - firebase-admin doesn't need to be installed or
    # configured at all while USE_FIRESTORE = False.
    import firebase_admin
    from firebase_admin import credentials, firestore as admin_firestore

    if not firebase_admin._apps:
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
- Write the lesson in Markdown (headings, bold, bullet lists where useful).
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
- Write the lesson in Markdown (headings, bold, bullet lists where useful).
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


class GeneratedLessonContent(BaseModel):
    """
    The EXACT shape we force the model to return via structured output -
    only two keys, matching the API contract the frontend consumes:
      - lesson_text: the lesson, formatted in Markdown
      - quiz_json:   exactly 3 multiple-choice quiz items

    topic, course_id, and video_url are deliberately NOT part of this
    schema - topic is supplied by the caller (not hallucinated), course_id
    is generated by our own code (uuid), and video_url comes from our own
    deterministic mapping service below. Keeping the model's structured
    output narrow makes it more reliable and keeps IDs/links out of the
    model's hands entirely.
    """
    lesson_text: str = Field(description="The full lesson content, formatted in Markdown")
    quiz_json: List[QuizItem] = Field(description="Exactly 3 multiple-choice quiz questions")


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
    """Returns a valid, embeddable YouTube URL for the closest matching category, or a default."""
    topic_lower = topic.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in topic_lower for keyword in keywords):
            return f"https://www.youtube.com/embed/{VIDEO_LIBRARY[category]['video_id']}"
    return f"https://www.youtube.com/embed/{DEFAULT_VIDEO['video_id']}"


def _assemble_curriculum_payload(topic: str, content: GeneratedLessonContent, course_id: Optional[str] = None) -> dict:
    """
    Attaches a deterministic course_id and video_url to the model's output.
    The resulting keys match the SQLite/Firestore schema 1:1 (minus status,
    which is only added at save time).
    """
    return {
        "course_id": course_id or f"course_{uuid.uuid4().hex[:12]}",
        "topic": topic,
        "lesson_text": content.lesson_text,
        "video_url": _match_video_for_topic(topic),
        "quiz_json": [item.model_dump() for item in content.quiz_json],
    }


# ---------------------------------------------------------------------------
# 5. LOCAL DATA STORE - SQLite, used whenever USE_FIRESTORE = False
# ---------------------------------------------------------------------------
#
# This is a drop-in stand-in for Firestore: same two "collections" (users,
# curriculums), same field names, just backed by a local file instead of the
# cloud. Every DB-facing function below talks to this via _get_mock_db_conn()
# when USE_FIRESTORE is False, and none of this is ever touched otherwise.

def _get_mock_db_conn() -> sqlite3.Connection:
    """Opens a connection to the local mock DB with dict-like row access."""
    conn = sqlite3.connect(MOCK_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_mock_db() -> None:
    """
    Creates course_content_creator.db (if it doesn't exist) with the `users`
    and `curriculums` tables, and seeds two demo profiles. Safe to call every
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


if not USE_FIRESTORE:
    _init_mock_db()

_MOCK_LESSON_TEXT = (
    "## Introduction to Machine Learning\n\n"
    "Machine Learning (ML) is a branch of Artificial Intelligence where "
    "computers learn patterns from data instead of following manually "
    "written rules.\n\n"
    "There are three broad types:\n"
    "- **Supervised Learning** - learns from labeled examples\n"
    "- **Unsupervised Learning** - finds structure in unlabeled data\n"
    "- **Reinforcement Learning** - learns via trial, error, and rewards\n"
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
    Looks up user_uid in the `users` table/collection and checks whether
    their "role" field matches required_role exactly.

    Returns False (never raises) for a missing user, a missing role field,
    or any lookup failure - callers that need to enforce access should use
    _assert_admin() below, which raises PermissionError.
    """
    if not USE_FIRESTORE:
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
    Admin-only. Generates a brand-new curriculum draft (Markdown lesson +
    3-question quiz + matched video) for the given topic, via the Gemini
    Developer API's gemini-2.5-flash model with strict structured output.

    Raises:
        PermissionError: if admin_uid is not a verified admin.
        RuntimeError: if the AI call fails or returns unparsable output.
    """
    _assert_admin(admin_uid)

    if MOCK_MODE:
        mock_content = GeneratedLessonContent(lesson_text=_MOCK_LESSON_TEXT, quiz_json=_MOCK_QUIZ)
        return _assemble_curriculum_payload(topic, mock_content)

    try:
        response = genai_client.models.generate_content(
            model=TEXT_MODEL,
            contents=f"Course topic: {topic}",
            config=types.GenerateContentConfig(
                system_instruction=CURRICULUM_ARCHITECT_SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=GeneratedLessonContent,
                temperature=0.4,
            ),
        )
        content: GeneratedLessonContent | None = response.parsed
        if content is None:
            raise RuntimeError("Model returned output that could not be parsed into the expected schema.")
        return _assemble_curriculum_payload(topic, content)

    except genai_errors.APIError as e:
        raise RuntimeError(f"AI curriculum generation failed (status={getattr(e, 'code', 'unknown')}): {e}") from e
    except Exception as e:
        raise RuntimeError(f"Unexpected error generating curriculum draft: {e}") from e


def refine_curriculum_draft(admin_uid: str, current_draft: dict, admin_feedback: str) -> dict:
    """
    Admin-only. Takes an existing curriculum draft plus free-text admin
    feedback (e.g. from a chat panel) and returns a fully revised draft in
    the same JSON shape, preserving the original course_id and topic.

    Raises:
        PermissionError: if admin_uid is not a verified admin.
        RuntimeError: if the AI call fails or returns unparsable output.
    """
    _assert_admin(admin_uid)

    course_id = current_draft.get("course_id")
    topic = current_draft.get("topic", "Untitled Topic")

    if MOCK_MODE:
        revised_text = (
            _MOCK_LESSON_TEXT
            + f"\n\n> _MOCK REVISION APPLIED based on feedback: \"{admin_feedback}\"_"
        )
        mock_content = GeneratedLessonContent(lesson_text=revised_text, quiz_json=_MOCK_QUIZ)
        return _assemble_curriculum_payload(topic, mock_content, course_id=course_id)

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
                response_schema=GeneratedLessonContent,
                temperature=0.4,
            ),
        )
        content: GeneratedLessonContent | None = response.parsed
        if content is None:
            raise RuntimeError("Model returned output that could not be parsed into the expected schema.")
        return _assemble_curriculum_payload(topic, content, course_id=course_id)

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
# 8. DATABASE INTEGRATION (SQLite in mock mode / Firestore in production)
# ---------------------------------------------------------------------------

def save_or_update_curriculum(admin_uid: str, course_data: dict, status: str) -> dict:
    """
    Admin-only. Writes course_data into the `curriculums` table/collection,
    keyed by course_data["course_id"]. status must be "draft" (admin-only
    visible) or "published" (visible to students).

    Raises:
        PermissionError: if admin_uid is not a verified admin.
        ValueError: if course_data has no course_id, or status is invalid.
        RuntimeError: if the database write fails.
    """
    _assert_admin(admin_uid)

    if status not in ("draft", "published"):
        raise ValueError(f"status must be 'draft' or 'published', got: '{status}'")

    course_id = course_data.get("course_id")
    if not course_id:
        raise ValueError("course_data must include a 'course_id' key.")

    payload = {**course_data, "status": status}

    if not USE_FIRESTORE:
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
                    "quiz_json": json.dumps(payload.get("quiz_json", [])),
                    "status": status,
                },
            )
            conn.commit()
        finally:
            conn.close()
        print(f"[save_or_update_curriculum] saved '{course_id}' with status='{status}' to {MOCK_DB_PATH.name}")
        return {"success": True, "course_id": course_id, "status": status}

    try:
        firestore_db.collection("curriculums").document(course_id).set(payload, merge=True)
        return {"success": True, "course_id": course_id, "status": status}
    except Exception as e:
        raise RuntimeError(f"Failed to save curriculum '{course_id}' to Firestore: {e}") from e


def update_student_streak(user_uid: str) -> int:
    """
    Increments a student's current_streak counter in the `users`
    table/collection when they complete a module. Runs as a transaction so
    concurrent completions (e.g. multiple tabs) can't cause a lost update.

    Returns the new streak value.

    Raises:
        RuntimeError: if the user doesn't exist or the transaction fails.
    """
    if not USE_FIRESTORE:
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

        print(f"[update_student_streak] '{user_uid}' streak -> {new_value}")
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
# 9. FLASK APP & ROUTES
# ---------------------------------------------------------------------------

app = Flask(__name__)


def _error_response(e: Exception):
    """Maps our service-layer exceptions to the correct HTTP status code."""
    if isinstance(e, PermissionError):
        return jsonify({"error": str(e)}), 403
    if isinstance(e, ValueError):
        return jsonify({"error": str(e)}), 400
    if isinstance(e, RuntimeError):
        return jsonify({"error": str(e)}), 500
    return jsonify({"error": f"Unexpected server error: {e}"}), 500


@app.route("/api/health", methods=["GET"])
def health_check():
    """Simple liveness check - also reports which mode the backend is running in."""
    return jsonify({"status": "ok", "mock_mode": MOCK_MODE, "use_firestore": USE_FIRESTORE})


@app.route("/api/generate", methods=["POST"])
def api_generate():
    """
    POST /api/generate
    Body: { "admin_uid": str, "topic": str }

    Generates a new curriculum draft via gemini-2.5-flash (structured output:
    lesson_text + quiz_json), persists it to the database as a "draft", and
    returns everything the frontend needs to render it - including a valid
    embeddable video_url for a local <iframe> player.
    """
    body = request.get_json(silent=True) or {}
    admin_uid = body.get("admin_uid")
    topic = body.get("topic")

    if not admin_uid or not topic:
        return jsonify({"error": "Both 'admin_uid' and 'topic' are required."}), 400

    try:
        draft = generate_initial_draft(admin_uid, topic)
        save_or_update_curriculum(admin_uid, draft, status="draft")

        return jsonify({
            "course_id": draft["course_id"],
            "topic": draft["topic"],
            "lesson_text": draft["lesson_text"],
            "quiz_json": draft["quiz_json"],
            "video_url": draft["video_url"],
        })

    except Exception as e:
        return _error_response(e)


@app.route("/api/refine", methods=["POST"])
def api_refine():
    """
    POST /api/refine
    Body: { "admin_uid": str, "current_draft": dict, "admin_feedback": str }
    """
    body = request.get_json(silent=True) or {}
    admin_uid = body.get("admin_uid")
    current_draft = body.get("current_draft")
    admin_feedback = body.get("admin_feedback")

    if not admin_uid or not current_draft or not admin_feedback:
        return jsonify({"error": "'admin_uid', 'current_draft', and 'admin_feedback' are all required."}), 400

    try:
        revised = refine_curriculum_draft(admin_uid, current_draft, admin_feedback)
        save_or_update_curriculum(admin_uid, revised, status="draft")
        return jsonify(revised)
    except Exception as e:
        return _error_response(e)


@app.route("/api/publish", methods=["POST"])
def api_publish():
    """
    POST /api/publish
    Body: { "admin_uid": str, "course_data": dict }
    """
    body = request.get_json(silent=True) or {}
    admin_uid = body.get("admin_uid")
    course_data = body.get("course_data")

    if not admin_uid or not course_data:
        return jsonify({"error": "'admin_uid' and 'course_data' are required."}), 400

    try:
        result = save_or_update_curriculum(admin_uid, course_data, status="published")
        return jsonify(result)
    except Exception as e:
        return _error_response(e)


@app.route("/api/ask-tutor", methods=["POST"])
def api_ask_tutor():
    """
    POST /api/ask-tutor
    Body: { "lesson_text": str, "student_question": str }
    """
    body = request.get_json(silent=True) or {}
    lesson_text = body.get("lesson_text")
    student_question = body.get("student_question")

    if not lesson_text or not student_question:
        return jsonify({"error": "'lesson_text' and 'student_question' are required."}), 400

    try:
        answer = ask_student_tutor(lesson_text, student_question)
        return jsonify({"answer": answer})
    except Exception as e:
        return _error_response(e)


@app.route("/api/streak", methods=["POST"])
def api_streak():
    """
    POST /api/streak
    Body: { "user_uid": str }
    """
    body = request.get_json(silent=True) or {}
    user_uid = body.get("user_uid")

    if not user_uid:
        return jsonify({"error": "'user_uid' is required."}), 400

    try:
        new_streak = update_student_streak(user_uid)
        return jsonify({"user_uid": user_uid, "current_streak": new_streak})
    except Exception as e:
        return _error_response(e)


if __name__ == "__main__":
    print(f"Starting Flask app (MOCK_MODE={MOCK_MODE}, USE_FIRESTORE={USE_FIRESTORE})...")
    print("Try it with:")
    print('  curl -X POST http://127.0.0.1:5000/api/generate '
          '-H "Content-Type: application/json" '
          '-d \'{"admin_uid": "admin-uid-demo", "topic": "Introduction to Machine Learning"}\'')
    app.run(debug=True, port=5000)
