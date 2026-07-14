"""
EdTech Curriculum Platform - Flask Backend Service
=====================================================

Flask backend for the Subhanu AI Academy frontend (React + Vite).

  - Admin:   drafts a curriculum with AI, iteratively refines it via
             chat-style feedback, and approves/publishes it.
  - Student: browses published courses, enrolls in the ones they want,
             tracks progress/XP/streak, and asks an AI "study buddy"
             questions scoped strictly to the lesson they're reading.

WHAT CHANGED IN THIS REWRITE
-----------------------------
The previous version of this file only implemented the admin-side
curriculum-generation endpoints (/api/generate, /api/refine, /api/publish)
plus /api/ask-tutor and /api/streak. It had NO auth, NO course listing
endpoint, and NO enrollment concept at all.

The frontend (src/services/api.js) has always expected a much larger API
surface - /auth/login, /auth/register, /courses, /courses/<id>, /enroll,
/progress, /admin/stats, /admin/students, /learning-path. Because those
routes didn't exist on the backend, every admin-published course showed up
fine in the admin dashboard (which reads directly from the curriculums
table) but never appeared for students, and there was no way to enroll at
all - hence "the student page doesn't show the update, and there is no
enroll flow".

This file adds:
  - A real `users` table with email/password (hashed) auth, XP, level,
    streak, and profile fields.
  - An `enrollments` table (many-to-many between users and curriculums)
    that powers "Explore Courses" (all published courses) vs "My Courses"
    (only ones the student enrolled in) vs the enroll button itself.
  - GET /api/courses (optionally scoped with ?user_uid=... so the response
    includes an `enrolled` flag + `progress` per course).
  - GET /api/courses/<id>, DELETE /api/courses/<id>.
  - POST /api/enroll, POST /api/progress (updates enrollment progress +
    awards XP/levels/streak on the user).
  - GET /api/learning-path?user_uid=...
  - GET /api/admin/stats, GET /api/admin/students.
  - POST /api/auth/register, POST /api/auth/login.

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
  NOTE: the new auth/enrollment/progress/admin endpoints added in this
  rewrite are currently SQLite-only. If you flip USE_FIRESTORE on, the
  curriculum generation endpoints will still write to Firestore as before,
  but you'll need to port `_init_mock_db`'s three tables (users,
  curriculums, enrollments) and the functions in section 8b over to
  Firestore collections before auth/enroll/progress will work there too.
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
from urllib.error import URLError
from urllib.request import Request, urlopen
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from flask import Flask, request, jsonify
from flask_cors import CORS
from pydantic import BaseModel, Field
from werkzeug.security import generate_password_hash, check_password_hash

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
#         MOCK_MODE is False - the two are unrelated. See the module
#         docstring above for the caveat re: auth/enroll/progress/admin.
USE_FIRESTORE: bool = False

# Only used if USE_FIRESTORE = True.
GCP_PROJECT_ID = "intern-bnmit-july-2026"

TEXT_MODEL = "gemini-flash-latest"

# Shared code a registrant must supply to sign up as an admin/educator.
# Change this to whatever you want to share with your actual admins, or
# read it from an environment variable in production.
ADMIN_ACCESS_CODE = os.environ.get("ADMIN_ACCESS_CODE", "SUBHANU-ADMIN-2026")

# Local SQLite file used whenever USE_FIRESTORE = False (the default). Lives
# next to this script regardless of the working directory the app is
# launched from.
MOCK_DB_PATH = Path(__file__).resolve().parent / "course_content_creator.db"

# XP required to go from level N to level N+1.
XP_PER_LEVEL = 500

# Default icons cycled through for generated courses that don't specify one.
COURSE_ICONS = ["🧠", "🚀", "📊", "🐍", "⚡", "🎯", "🔬", "💡"]


# A narrow, source-backed profile: it must never be used for another class,
# board, or AI subject. The URL is CBSE's official curriculum PDF.
CBSE_CLASS_9_AI_PROFILE = "cbse_class_9_artificial_intelligence_417"
CBSE_CLASS_9_AI_SOURCE = "https://cbseacademic.nic.in/web_material/Curriculum27/sec/417-AI-IX.pdf"
CBSE_CLASS_9_AI_SESSION = "2026-2027"
CBSE_CLASS_9_AI_UNITS = [
    {"title": "AI Reflection, Project Cycle and Ethics", "hours": "30 theory + 25 practical hours · 10 marks", "required": "AI in daily life; Data, Computer Vision and Natural Language Processing; problem scoping with 4Ws; data acquisition, exploration, modeling, evaluation and deployment; ethics, bias and access.", "workflow": ["Problem scoping (4Ws)", "Data acquisition", "Data exploration", "Modeling", "Evaluation", "Deployment", "Ethics review"], "video": {"video_id": "aircAruvnKk", "title": "A visual introduction to AI models"}},
    {"title": "Data Literacy", "hours": "22 theory + 28 practical hours · 10 marks", "required": "Data literacy process; reliable data and cyber safety; types of data; acquisition, preprocessing, processing and interpretation; trends and visualisation.", "workflow": ["Ask a question", "Acquire reliable data", "Prepare data", "Interpret patterns", "Visualise and communicate"], "video": {"video_id": "yhO_t-c3yJY", "title": "Data literacy companion video"}},
    {"title": "Math for AI (Statistics & Probability)", "hours": "12 theory + 13 practical hours · 7 marks", "required": "Patterns; the role of statistics, linear algebra, probability and calculus in AI; statistics in daily life; probability, types of events and real-life applications.", "workflow": ["Collect observations", "Find a pattern", "Summarise with statistics", "Estimate probability", "Make a careful prediction"], "video": {"video_id": "aircAruvnKk", "title": "Patterns and models in AI"}},
]

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

Given a course topic and a target difficulty level, produce ONE focused,
well-structured lesson aimed at that difficulty level, plus exactly 3
multiple-choice quiz questions (4 options each) that test understanding of
that lesson.

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

CBSE_CLASS_9_AI_SYSTEM_INSTRUCTION = """\
You are the CBSE Class IX Artificial Intelligence curriculum-validation agent.
Create content ONLY for CBSE Artificial Intelligence (subject code 417), Class IX,
session 2026-2027. Do not add Class X, XI, XII, board-exam coaching, neural
networks, advanced machine learning, or unsourced topics.

Write one age-appropriate, self-contained lesson in Markdown. Include: a clear
learning goal, a short explain-and-try activity, a real-life Indian school-level
example, a responsible-AI note where relevant, and a recap. Use the supplied
official unit requirements exactly. The quiz must have exactly 3 questions with
4 choices each and one unambiguous correct answer. Do not invent syllabus marks
or claim that a companion video is an official CBSE video.
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


class CodeStepAnalysis(BaseModel):
    """
    Structured output for the "code step visualizer" feature: given a code
    snippet, extract a single small integer that represents how many
    discrete steps it takes (loop iterations, recursive calls, etc.), plus
    a short label so the animation reads naturally ("iteration", "call",
    "step"...).
    """
    steps: int = Field(description="How many discrete steps/iterations the code performs, between 1 and 12")
    unit: str = Field(description="Singular noun for one step, e.g. 'iteration', 'call', 'step', 'swap'")
    summary: str = Field(description="One short sentence (under 20 words) describing what happens each step")


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


def _match_video_for_topic(topic: str) -> dict:
    """Returns the matched (or default) video's id, embed URL, watch URL, and title."""
    topic_lower = topic.lower()
    match = DEFAULT_VIDEO
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in topic_lower for keyword in keywords):
            match = VIDEO_LIBRARY[category]
            break
    video_id = match["video_id"]
    return {
        "video_id": video_id,
        "embed_url": f"https://www.youtube.com/embed/{video_id}",
        "watch_url": f"https://www.youtube.com/watch?v={video_id}",
        "title": match["title"],
    }


def _icon_for_index(index: int) -> str:
    return COURSE_ICONS[index % len(COURSE_ICONS)]


def _short_description(lesson_text: str, topic: str, limit: int = 180) -> str:
    """Derives a one-line course description from the generated lesson's first paragraph."""
    for raw_line in lesson_text.split("\n"):
        line = raw_line.strip().lstrip("#").strip()
        if line and not line.startswith("-"):
            return (line[:limit] + "…") if len(line) > limit else line
    return f"An AI-generated lesson on {topic}."


def _build_modules(course_id: str, topic: str, lesson_text: str, quiz_items: List[dict], video: dict) -> List[dict]:
    """
    Wraps the single generated lesson + quiz into the modules -> lessons ->
    quiz.questions structure the admin review UI (src/pages/admin/Review.jsx)
    renders. The AI only ever generates ONE lesson per course today, so this
    is always a single module with a single lesson - but nesting it this way
    (instead of returning the flat lesson_text/quiz_json alone) is what makes
    the course actually render instead of showing a blank review page.
    """
    questions = [
        {
            "id": f"{course_id}-q{i + 1}",
            "question": item.get("question"),
            "options": item.get("options", []),
            "correctAnswer": item.get("correct_answer"),
            "explanation": "",
        }
        for i, item in enumerate(quiz_items)
    ]
    lesson = {
        "id": f"{course_id}-lesson-1",
        "title": topic,
        "content": lesson_text,
        "workflow": [],
        "objectives": [],
        "examples": [],
        "codeSnippets": [],
        "youtubeUrl": video["watch_url"],
        "videoTitle": video["title"],
        "videoChannel": "YouTube",
        "quiz": {"questions": questions},
    }
    return [
        {
            "id": f"{course_id}-module-1",
            "title": f"Module 1: {topic}",
            "description": _short_description(lesson_text, topic),
            "lessons": [lesson],
        }
    ]


def _assemble_curriculum_payload(
    topic: str,
    content: GeneratedLessonContent,
    course_id: Optional[str] = None,
    difficulty: str = "Beginner",
) -> dict:
    """
    Attaches a deterministic course_id, video_url, difficulty, and display
    metadata to the model's output, PLUS the nested `modules` shape the
    admin review page needs (see _build_modules above). The flat keys
    (course_id, topic, lesson_text, video_url, quiz_json, difficulty, icon,
    modules_count) still match the SQLite/Firestore schema 1:1 for storage;
    `modules` and `description` are derived and not persisted separately.
    """
    final_id = course_id or f"course_{uuid.uuid4().hex[:12]}"
    quiz_items = [item.model_dump() for item in content.quiz_json]
    video = _match_video_for_topic(topic)
    return {
        "course_id": final_id,
        "id": final_id,
        "topic": topic,
        "title": topic,
        "lesson_text": content.lesson_text,
        "video_url": video["embed_url"],
        "quiz_json": quiz_items,
        "difficulty": difficulty,
        "icon": _icon_for_index(abs(hash(final_id))),
        "modules_count": 1,
        "modulesCount": 1,
        "description": _short_description(content.lesson_text, topic),
        "modules": _build_modules(final_id, topic, content.lesson_text, quiz_items, video),
    }


# ---------------------------------------------------------------------------
# 5. LOCAL DATA STORE - SQLite, used whenever USE_FIRESTORE = False
# ---------------------------------------------------------------------------
#
# This is a drop-in stand-in for Firestore: same "collections" (users,
# curriculums, enrollments), same field names, just backed by a local file
# instead of the cloud. Every DB-facing function below talks to this via
# _get_mock_db_conn() when USE_FIRESTORE is False.

def _get_mock_db_conn() -> sqlite3.Connection:
    """Opens a connection to the local mock DB with dict-like row access."""
    conn = sqlite3.connect(MOCK_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _init_mock_db() -> None:
    """
    Creates course_content_creator.db (if it doesn't exist) with the
    `users`, `curriculums`, and `enrollments` tables, and seeds two demo
    profiles. Safe to call every startup - CREATE TABLE IF NOT EXISTS,
    ALTER TABLE guards, and existence checks before seeding make this
    idempotent, including for DBs created by the older version of this
    file that only had a couple of columns on `users`.
    """
    conn = _get_mock_db_conn()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                user_uid TEXT PRIMARY KEY,
                email TEXT UNIQUE,
                password_hash TEXT,
                role TEXT NOT NULL,
                name TEXT,
                avatar TEXT,
                level INTEGER NOT NULL DEFAULT 1,
                xp INTEGER NOT NULL DEFAULT 0,
                current_streak INTEGER NOT NULL DEFAULT 0,
                join_date TEXT,
                bio TEXT,
                linkedin TEXT,
                github TEXT,
                facebook TEXT,
                location TEXT,
                contact_number TEXT,
                skills TEXT,
                badges TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS curriculums (
                course_id TEXT PRIMARY KEY,
                admin_uid TEXT,
                topic TEXT,
                lesson_text TEXT,
                video_url TEXT,
                quiz_json TEXT,
                status TEXT,
                difficulty TEXT DEFAULT 'Beginner',
                icon TEXT DEFAULT '📘',
                modules_count INTEGER DEFAULT 1,
                modules_json TEXT,
                created_at TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS enrollments (
                user_uid TEXT NOT NULL,
                course_id TEXT NOT NULL,
                progress INTEGER NOT NULL DEFAULT 0,
                enrolled_at TEXT,
                PRIMARY KEY (user_uid, course_id)
            )
            """
        )

        # --- Backfill columns for DBs created by earlier versions of this file ---
        existing_user_cols = {row["name"] for row in conn.execute("PRAGMA table_info(users)")}
        user_column_defs = {
            "email": "TEXT",
            "password_hash": "TEXT",
            "avatar": "TEXT",
            "level": "INTEGER NOT NULL DEFAULT 1",
            "xp": "INTEGER NOT NULL DEFAULT 0",
            "join_date": "TEXT",
            "bio": "TEXT",
            "linkedin": "TEXT",
            "github": "TEXT",
            "facebook": "TEXT",
            "location": "TEXT",
            "contact_number": "TEXT",
            "skills": "TEXT",
            "badges": "TEXT",
        }
        for col, coltype in user_column_defs.items():
            if col not in existing_user_cols:
                conn.execute(f"ALTER TABLE users ADD COLUMN {col} {coltype}")

        existing_course_cols = {row["name"] for row in conn.execute("PRAGMA table_info(curriculums)")}
        course_column_defs = {
            "topic": "TEXT",
            "lesson_text": "TEXT",
            "video_url": "TEXT",
            "quiz_json": "TEXT",
            "status": "TEXT",
            "admin_uid": "TEXT",
            "difficulty": "TEXT DEFAULT 'Beginner'",
            "icon": "TEXT DEFAULT '📘'",
            "modules_count": "INTEGER DEFAULT 1",
            "modules_json": "TEXT",
            "created_at": "TEXT",
        }
        for col, coltype in course_column_defs.items():
            if col not in existing_course_cols:
                conn.execute(f"ALTER TABLE curriculums ADD COLUMN {col} {coltype}")

        conn.execute(
            """
            INSERT OR IGNORE INTO users
                (user_uid, email, password_hash, role, name, avatar, level, xp,
                 current_streak, join_date, skills, badges)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "admin-uid-demo", "admin@subhanu.ai", generate_password_hash("admin123"),
                "admin", "Demo Admin", "🛡️", 1, 0, 0, _now_iso(), "[]", "[]",
            ),
        )
        conn.execute(
            """
            INSERT OR IGNORE INTO users
                (user_uid, email, password_hash, role, name, avatar, level, xp,
                 current_streak, join_date, skills, badges)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "student-uid-demo", "student@subhanu.ai", generate_password_hash("student123"),
                "student", "Demo Student", "🎓", 1, 150, 3, _now_iso(), "[]", "[]",
            ),
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
# 7. CORE SERVICE LAYER FUNCTIONS - AI curriculum generation
# ---------------------------------------------------------------------------

def _check_cbse_class_9_ai_source() -> bool:
    """Quickly verifies that the pinned official CBSE syllabus is reachable.

    A failed network check does not silently change the syllabus: generation
    continues with the versioned official manifest below and reports that fact.
    """
    try:
        with urlopen(Request(CBSE_CLASS_9_AI_SOURCE, method="HEAD"), timeout=5) as response:
            return 200 <= response.status < 400
    except (URLError, OSError, ValueError):
        return False


def _cbse_video(unit: dict) -> dict:
    video_id = unit["video"]["video_id"]
    return {
        "video_id": video_id,
        "embed_url": f"https://www.youtube.com/embed/{video_id}",
        "watch_url": f"https://www.youtube.com/watch?v={video_id}",
        "title": unit["video"]["title"],
    }


def _generate_cbse_class_9_ai_course(admin_uid: str, difficulty: str) -> dict:
    """Builds the complete Class IX (417) course unit-by-unit from CBSE scope."""
    _assert_admin(admin_uid)
    source_available = _check_cbse_class_9_ai_source()
    course_id = f"course_{uuid.uuid4().hex[:12]}"
    modules = []

    for index, unit in enumerate(CBSE_CLASS_9_AI_UNITS, start=1):
        unit_prompt = (
            f"Official CBSE source: {CBSE_CLASS_9_AI_SOURCE}\n"
            f"Session: {CBSE_CLASS_9_AI_SESSION}\n"
            f"Unit: {unit['title']}\nHours and marks: {unit['hours']}\n"
            f"Required scope: {unit['required']}\n"
            f"Target level: Class IX; requested difficulty: {difficulty}."
        )
        if MOCK_MODE:
            generated = GeneratedLessonContent(lesson_text=_MOCK_LESSON_TEXT, quiz_json=_MOCK_QUIZ)
        else:
            try:
                response = genai_client.models.generate_content(
                    model=TEXT_MODEL,
                    contents=unit_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=CBSE_CLASS_9_AI_SYSTEM_INSTRUCTION,
                        response_mime_type="application/json",
                        response_schema=GeneratedLessonContent,
                        temperature=0.25,
                    ),
                )
                generated = response.parsed
                if generated is None:
                    raise RuntimeError(f"No structured lesson returned for '{unit['title']}'.")
            except genai_errors.APIError as e:
                raise RuntimeError(f"CBSE curriculum generation failed for '{unit['title']}': {e}") from e

        video = _cbse_video(unit)
        quiz = [
            {"id": f"{course_id}-u{index}-q{question_index + 1}", "question": item.question,
             "options": item.options, "correctAnswer": item.correct_answer, "explanation": "Review the lesson recap and workflow."}
            for question_index, item in enumerate(generated.quiz_json)
        ]
        lesson = {
            "id": f"{course_id}-lesson-{index}", "title": unit["title"], "content": generated.lesson_text,
            "objectives": [unit["required"]], "workflow": unit["workflow"],
            "visuals": [{"title": f"{unit['title']} flowchart", "description": "Follow this order while learning and practising.", "steps": unit["workflow"]}],
            "examples": [], "codeSnippets": [], "youtubeUrl": video["watch_url"], "videoTitle": video["title"],
            "videoChannel": "YouTube companion resource", "quiz": {"questions": quiz},
        }
        modules.append({"id": f"{course_id}-module-{index}", "title": unit["title"],
                        "description": f"CBSE Class IX (417) · {unit['hours']}", "lessons": [lesson]})

    first_lesson = modules[0]["lessons"][0]
    return {
        "course_id": course_id, "id": course_id, "topic": "CBSE Class IX Artificial Intelligence (417)",
        "title": "CBSE Class IX Artificial Intelligence (417)", "lesson_text": first_lesson["content"],
        "video_url": _cbse_video(CBSE_CLASS_9_AI_UNITS[0])["embed_url"],
        "quiz_json": [{"question": q["question"], "options": q["options"], "correct_answer": q["correctAnswer"]} for q in first_lesson["quiz"]["questions"]],
        "difficulty": difficulty, "icon": "🧠", "modules_count": len(modules), "modulesCount": len(modules),
        "description": "A complete CBSE Class IX Artificial Intelligence (417) course aligned to the official 2026-27 syllabus.",
        "modules": modules, "curriculumProfile": CBSE_CLASS_9_AI_PROFILE,
        "syllabusSource": CBSE_CLASS_9_AI_SOURCE, "syllabusSession": CBSE_CLASS_9_AI_SESSION,
        "generationNotice": "Official CBSE Class IX AI (417) 2026-27 scope checked" if source_available else "Generated from the pinned official CBSE Class IX AI (417) 2026-27 syllabus; the live source was unavailable during this request.",
    }

def generate_initial_draft(admin_uid: str, topic: str, difficulty: str = "Beginner", curriculum_profile: Optional[str] = None) -> dict:
    """
    Admin-only. Generates a brand-new curriculum draft (Markdown lesson +
    3-question quiz + matched video) for the given topic, via the Gemini
    Developer API's gemini-2.5-flash model with strict structured output.

    Raises:
        PermissionError: if admin_uid is not a verified admin.
        RuntimeError: if the AI call fails or returns unparsable output.
    """
    _assert_admin(admin_uid)

    if curriculum_profile == CBSE_CLASS_9_AI_PROFILE:
        return _generate_cbse_class_9_ai_course(admin_uid, difficulty)

    if MOCK_MODE:
        mock_content = GeneratedLessonContent(lesson_text=_MOCK_LESSON_TEXT, quiz_json=_MOCK_QUIZ)
        return _assemble_curriculum_payload(topic, mock_content, difficulty=difficulty)

    try:
        response = genai_client.models.generate_content(
            model=TEXT_MODEL,
            contents=f"Course topic: {topic}\nTarget difficulty: {difficulty}",
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
        return _assemble_curriculum_payload(topic, content, difficulty=difficulty)

    except genai_errors.APIError as e:
        raise RuntimeError(f"AI curriculum generation failed (status={getattr(e, 'code', 'unknown')}): {e}") from e
    except Exception as e:
        raise RuntimeError(f"Unexpected error generating curriculum draft: {e}") from e


def refine_curriculum_draft(admin_uid: str, current_draft: dict, admin_feedback: str) -> dict:
    """
    Admin-only. Takes an existing curriculum draft plus free-text admin
    feedback (e.g. from a chat panel) and returns a fully revised draft in
    the same JSON shape, preserving the original course_id, topic, and
    difficulty.

    Raises:
        PermissionError: if admin_uid is not a verified admin.
        RuntimeError: if the AI call fails or returns unparsable output.
    """
    _assert_admin(admin_uid)

    course_id = current_draft.get("course_id") or current_draft.get("id")
    topic = current_draft.get("topic") or current_draft.get("title", "Untitled Topic")
    difficulty = current_draft.get("difficulty", "Beginner")

    if MOCK_MODE:
        revised_text = (
            _MOCK_LESSON_TEXT
            + f"\n\n> _MOCK REVISION APPLIED based on feedback: \"{admin_feedback}\"_"
        )
        mock_content = GeneratedLessonContent(lesson_text=revised_text, quiz_json=_MOCK_QUIZ)
        return _assemble_curriculum_payload(topic, mock_content, course_id=course_id, difficulty=difficulty)

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
        return _assemble_curriculum_payload(topic, content, course_id=course_id, difficulty=difficulty)

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


CODE_STEP_SYSTEM_INSTRUCTION = """\
You analyze short code snippets for an educational "step visualizer" that
animates a moving object (like a bus on a track) taking N discrete steps.

Given a code snippet, figure out how many discrete steps/iterations it
performs (loop count, recursive call count, etc). If the code has no clear
finite step count, pick a small illustrative number based on what it seems
to be demonstrating. Always return between 1 and 12 steps - if the true
count would be larger, cap it at 12 and say so in the summary.
"""

# Cheap regex-first patterns tried before ever calling the AI - covers the
# large majority of simple teaching snippets without spending an API call.
import re as _re

_STEP_PATTERNS = [
    _re.compile(r"range\(\s*(\d+)\s*\)"),                # for i in range(5)
    _re.compile(r"range\(\s*\d+\s*,\s*(\d+)\s*\)"),       # for i in range(1, 5)
    _re.compile(r"\bsteps?\s*=\s*(\d+)"),                 # steps = 2
    _re.compile(r"\bn\s*=\s*(\d+)"),                      # n = 4
]


def _try_regex_step_count(code: str) -> Optional[int]:
    for pattern in _STEP_PATTERNS:
        match = pattern.search(code)
        if match:
            value = int(match.group(1))
            if value > 0:
                return value
    return None


def analyze_code_steps(code: str) -> dict:
    """
    Open to any authenticated user (admin or student) - no role check.
    Extracts a small step count (1-12) from a code snippet to drive the
    step-by-step animation widget. Tries a handful of regex patterns first
    (covers `range(N)`, `steps = N`, `n = N`) since that's instant and free;
    only falls back to the AI for snippets that don't match any of those.

    Raises:
        RuntimeError: if the AI fallback call fails.
    """
    regex_hit = _try_regex_step_count(code)
    if regex_hit is not None:
        steps = max(1, min(12, regex_hit))
        return {
            "steps": steps,
            "unit": "iteration",
            "summary": f"The code repeats {steps} time{'s' if steps != 1 else ''}.",
        }

    if MOCK_MODE:
        return {"steps": 3, "unit": "step", "summary": "(mock) Estimated step count from the snippet."}

    try:
        response = genai_client.models.generate_content(
            model=TEXT_MODEL,
            contents=f"Code snippet:\n{code}",
            config=types.GenerateContentConfig(
                system_instruction=CODE_STEP_SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=CodeStepAnalysis,
                temperature=0.2,
            ),
        )
        analysis: CodeStepAnalysis | None = response.parsed
        if analysis is None:
            raise RuntimeError("Model returned output that could not be parsed into the expected schema.")
        steps = max(1, min(12, analysis.steps))
        return {"steps": steps, "unit": analysis.unit, "summary": analysis.summary}

    except genai_errors.APIError as e:
        raise RuntimeError(f"AI code analysis failed (status={getattr(e, 'code', 'unknown')}): {e}") from e
    except Exception as e:
        raise RuntimeError(f"Unexpected error analyzing code: {e}") from e


# ---------------------------------------------------------------------------
# 8. DATABASE INTEGRATION - curriculum persistence (SQLite / Firestore)
# ---------------------------------------------------------------------------

def save_or_update_curriculum(admin_uid: str, course_data: dict, status: str) -> dict:
    """
    Admin-only. Writes course_data into the `curriculums` table/collection,
    keyed by course_data["course_id"]. status must be "draft" (admin-only
    visible) or "published" (visible to students, i.e. what makes it show
    up in the student's Explore Courses page).

    Raises:
        PermissionError: if admin_uid is not a verified admin.
        ValueError: if course_data has no course_id, or status is invalid.
        RuntimeError: if the database write fails.
    """
    _assert_admin(admin_uid)

    if status not in ("draft", "published"):
        raise ValueError(f"status must be 'draft' or 'published', got: '{status}'")

    course_id = course_data.get("course_id") or course_data.get("id")
    if not course_id:
        raise ValueError("course_data must include a 'course_id' key.")

    payload = {**course_data, "course_id": course_id, "status": status}

    if not USE_FIRESTORE:
        conn = _get_mock_db_conn()
        try:
            existing = conn.execute(
                "SELECT created_at FROM curriculums WHERE course_id = ?", (course_id,)
            ).fetchone()
            created_at = (existing["created_at"] if existing and existing["created_at"] else None) or _now_iso()

            conn.execute(
                """
                INSERT INTO curriculums
                    (course_id, admin_uid, topic, lesson_text, video_url, quiz_json,
                     status, difficulty, icon, modules_count, modules_json, created_at)
                VALUES
                    (:course_id, :admin_uid, :topic, :lesson_text, :video_url, :quiz_json,
                     :status, :difficulty, :icon, :modules_count, :modules_json, :created_at)
                ON CONFLICT(course_id) DO UPDATE SET
                    topic = excluded.topic,
                    lesson_text = excluded.lesson_text,
                    video_url = excluded.video_url,
                    quiz_json = excluded.quiz_json,
                    status = excluded.status,
                    difficulty = excluded.difficulty,
                    icon = excluded.icon,
                    modules_count = excluded.modules_count,
                    modules_json = excluded.modules_json
                """,
                {
                    "course_id": course_id,
                    "admin_uid": admin_uid,
                    "topic": payload.get("topic"),
                    "lesson_text": payload.get("lesson_text"),
                    "video_url": payload.get("video_url"),
                    "quiz_json": json.dumps(payload.get("quiz_json", [])),
                    "status": status,
                    "difficulty": payload.get("difficulty", "Beginner"),
                    "icon": payload.get("icon", "📘"),
                    "modules_count": payload.get("modules_count", 1),
                    "modules_json": json.dumps(payload.get("modules", [])),
                    "created_at": created_at,
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


def delete_curriculum(admin_uid: str, course_id: str) -> dict:
    """Admin-only. Deletes a curriculum (draft or published) and its enrollments."""
    _assert_admin(admin_uid)

    if not USE_FIRESTORE:
        conn = _get_mock_db_conn()
        try:
            conn.execute("DELETE FROM curriculums WHERE course_id = ?", (course_id,))
            conn.execute("DELETE FROM enrollments WHERE course_id = ?", (course_id,))
            conn.commit()
        finally:
            conn.close()
        return {"success": True, "course_id": course_id}

    try:
        firestore_db.collection("curriculums").document(course_id).delete()
        return {"success": True, "course_id": course_id}
    except Exception as e:
        raise RuntimeError(f"Failed to delete curriculum '{course_id}' from Firestore: {e}") from e


def _row_to_course_dict(row: sqlite3.Row, enrolled_map: dict, students_count_map: dict) -> dict:
    course_id = row["course_id"]
    enrollment = enrolled_map.get(course_id)
    topic = row["topic"]
    lesson_text = row["lesson_text"] or ""
    quiz_items = json.loads(row["quiz_json"]) if row["quiz_json"] else []
    stored_modules = json.loads(row["modules_json"]) if "modules_json" in row.keys() and row["modules_json"] else []
    video_embed_url = row["video_url"] or ""
    video_id = video_embed_url.rsplit("/", 1)[-1] if video_embed_url else DEFAULT_VIDEO["video_id"]
    video = {
        "video_id": video_id,
        "embed_url": video_embed_url or f"https://www.youtube.com/embed/{video_id}",
        "watch_url": f"https://www.youtube.com/watch?v={video_id}",
        "title": DEFAULT_VIDEO["title"],
    }
    return {
        "id": course_id,
        "course_id": course_id,
        "title": topic,
        "topic": topic,
        "description": _short_description(lesson_text, topic or ""),
        "lesson_text": lesson_text,
        "video_url": video_embed_url,
        "quiz_json": quiz_items,
        "status": row["status"],
        "difficulty": row["difficulty"] or "Beginner",
        "icon": row["icon"] or "📘",
        "modulesCount": row["modules_count"] or 1,
        "createdAt": row["created_at"],
        "studentsEnrolled": students_count_map.get(course_id, 0),
        "enrolled": enrollment is not None,
        "progress": (enrollment["progress"] if enrollment else 0),
        "modules": stored_modules or _build_modules(course_id, topic or "", lesson_text, quiz_items, video),
    }


def get_all_courses(user_uid: Optional[str] = None) -> List[dict]:
    """
    Returns every curriculum (draft + published) with display metadata.
    When user_uid is supplied, each course also carries `enrolled` (bool)
    and `progress` (0-100) scoped to that student - this is what lets the
    frontend distinguish "Explore Courses" (all published) from
    "My Courses" (published AND enrolled) and drive the Enroll button.
    """
    if USE_FIRESTORE:
        raise RuntimeError("get_all_courses is not yet implemented for Firestore - see module docstring.")

    conn = _get_mock_db_conn()
    try:
        course_rows = conn.execute(
            "SELECT * FROM curriculums ORDER BY created_at DESC"
        ).fetchall()

        students_count_map: dict[str, int] = {}
        for r in conn.execute(
            "SELECT course_id, COUNT(*) as cnt FROM enrollments GROUP BY course_id"
        ).fetchall():
            students_count_map[r["course_id"]] = r["cnt"]

        enrolled_map: dict[str, sqlite3.Row] = {}
        if user_uid:
            for r in conn.execute(
                "SELECT course_id, progress FROM enrollments WHERE user_uid = ?", (user_uid,)
            ).fetchall():
                enrolled_map[r["course_id"]] = r

        return [_row_to_course_dict(row, enrolled_map, students_count_map) for row in course_rows]
    finally:
        conn.close()


def get_course_by_id(course_id: str, user_uid: Optional[str] = None) -> Optional[dict]:
    if USE_FIRESTORE:
        raise RuntimeError("get_course_by_id is not yet implemented for Firestore - see module docstring.")

    conn = _get_mock_db_conn()
    try:
        row = conn.execute("SELECT * FROM curriculums WHERE course_id = ?", (course_id,)).fetchone()
        if row is None:
            return None

        students_count = conn.execute(
            "SELECT COUNT(*) as cnt FROM enrollments WHERE course_id = ?", (course_id,)
        ).fetchone()["cnt"]

        enrolled_map = {}
        if user_uid:
            e = conn.execute(
                "SELECT course_id, progress FROM enrollments WHERE user_uid = ? AND course_id = ?",
                (user_uid, course_id),
            ).fetchone()
            if e:
                enrolled_map[course_id] = e

        return _row_to_course_dict(row, enrolled_map, {course_id: students_count})
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# 8b. DATABASE INTEGRATION - auth, enrollment, progress, admin (SQLite)
# ---------------------------------------------------------------------------

def _xp_to_next_level(level: int) -> int:
    return level * XP_PER_LEVEL


def _user_row_to_dict(row: sqlite3.Row) -> dict:
    level = row["level"] or 1
    return {
        "id": row["user_uid"],
        "email": row["email"],
        "role": row["role"],
        "name": row["name"],
        "avatar": row["avatar"],
        "level": level,
        "xp": row["xp"] or 0,
        "xpToNextLevel": _xp_to_next_level(level),
        "streak": row["current_streak"] or 0,
        "joinDate": row["join_date"],
        "bio": row["bio"],
        "linkedin": row["linkedin"],
        "github": row["github"],
        "facebook": row["facebook"],
        "location": row["location"],
        "contactNumber": row["contact_number"],
        "skills": json.loads(row["skills"]) if row["skills"] else [],
        "badges": json.loads(row["badges"]) if row["badges"] else [],
    }


def register_user(name: str, email: str, password: str, role: str, admin_code: Optional[str] = None) -> dict:
    """
    Creates a new user. Students can register freely; admins must supply
    the correct ADMIN_ACCESS_CODE.

    Raises:
        ValueError: for bad input (missing fields, wrong admin code, duplicate email).
        RuntimeError: on unexpected DB failure.
    """
    if not name or not email or not password:
        raise ValueError("name, email, and password are all required.")
    if role not in ("student", "admin"):
        raise ValueError("role must be 'student' or 'admin'.")
    if role == "admin" and admin_code != ADMIN_ACCESS_CODE:
        raise ValueError("Invalid admin access code.")

    conn = _get_mock_db_conn()
    try:
        existing = conn.execute("SELECT user_uid FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            raise ValueError(f"An account with email '{email}' already exists.")

        user_uid = f"user_{uuid.uuid4().hex[:12]}"
        conn.execute(
            """
            INSERT INTO users
                (user_uid, email, password_hash, role, name, avatar, level, xp,
                 current_streak, join_date, skills, badges)
            VALUES (?, ?, ?, ?, ?, ?, 1, 0, 0, ?, '[]', '[]')
            """,
            (user_uid, email, generate_password_hash(password), role, name,
             "🎓" if role == "student" else "🛡️", _now_iso()),
        )
        conn.commit()

        row = conn.execute("SELECT * FROM users WHERE user_uid = ?", (user_uid,)).fetchone()
        return _user_row_to_dict(row)
    finally:
        conn.close()


def login_user(email: str, password: str) -> dict:
    """
    Raises:
        ValueError: if the credentials are missing or incorrect.
    """
    if not email or not password:
        raise ValueError("email and password are both required.")

    conn = _get_mock_db_conn()
    try:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if row is None or not row["password_hash"] or not check_password_hash(row["password_hash"], password):
            raise ValueError("Incorrect email or password.")
        return _user_row_to_dict(row)
    finally:
        conn.close()


def enroll_student_in_course(user_uid: str, course_id: str) -> dict:
    """
    Enrolls a student in a published course. Idempotent - re-enrolling in a
    course you're already enrolled in is a no-op that returns success.

    Raises:
        ValueError: if the user or course doesn't exist, or the course
            isn't published yet.
    """
    conn = _get_mock_db_conn()
    try:
        user = conn.execute("SELECT user_uid FROM users WHERE user_uid = ?", (user_uid,)).fetchone()
        if user is None:
            raise ValueError(f"User '{user_uid}' not found.")

        course = conn.execute(
            "SELECT status FROM curriculums WHERE course_id = ?", (course_id,)
        ).fetchone()
        if course is None:
            raise ValueError(f"Course '{course_id}' not found.")
        if course["status"] != "published":
            raise ValueError("This course is not yet published.")

        conn.execute(
            """
            INSERT OR IGNORE INTO enrollments (user_uid, course_id, progress, enrolled_at)
            VALUES (?, ?, 0, ?)
            """,
            (user_uid, course_id, _now_iso()),
        )
        conn.commit()
        return {"success": True, "course_id": course_id}
    finally:
        conn.close()


def update_student_progress(user_uid: str, course_id: str, xp_earned: int) -> dict:
    """
    Records XP earned toward a course, bumps the enrollment's progress
    percentage, and applies XP/level/streak updates to the user. Runs as a
    single connection/transaction so concurrent submissions can't cause a
    lost update.

    Returns the updated user dict.

    Raises:
        ValueError: if the user isn't enrolled in the course.
        RuntimeError: if the user doesn't exist.
    """
    conn = _get_mock_db_conn()
    try:
        user_row = conn.execute("SELECT * FROM users WHERE user_uid = ?", (user_uid,)).fetchone()
        if user_row is None:
            raise RuntimeError(f"User '{user_uid}' not found.")

        enrollment = conn.execute(
            "SELECT progress FROM enrollments WHERE user_uid = ? AND course_id = ?",
            (user_uid, course_id),
        ).fetchone()
        if enrollment is None:
            raise ValueError("You must enroll in this course before submitting progress.")

        new_progress = min(100, (enrollment["progress"] or 0) + 34)
        conn.execute(
            "UPDATE enrollments SET progress = ? WHERE user_uid = ? AND course_id = ?",
            (new_progress, user_uid, course_id),
        )

        new_xp = (user_row["xp"] or 0) + max(0, int(xp_earned or 0))
        new_level = user_row["level"] or 1
        while new_xp >= _xp_to_next_level(new_level):
            new_level += 1
        new_streak = (user_row["current_streak"] or 0) + 1

        conn.execute(
            "UPDATE users SET xp = ?, level = ?, current_streak = ? WHERE user_uid = ?",
            (new_xp, new_level, new_streak, user_uid),
        )
        conn.commit()

        updated_row = conn.execute("SELECT * FROM users WHERE user_uid = ?", (user_uid,)).fetchone()
        return _user_row_to_dict(updated_row)
    finally:
        conn.close()


def get_learning_path_for_user(user_uid: str) -> List[dict]:
    """
    Builds a simple node-per-lesson learning path from the student's
    enrolled courses: completed (progress 100), active (in progress), or
    locked (not yet enrolled / not started), so the "Continue Learning"
    path on the course page reflects real enrollment/progress state
    instead of a hardcoded stand-in.
    """
    conn = _get_mock_db_conn()
    try:
        rows = conn.execute(
            """
            SELECT c.course_id, c.topic, c.icon, e.progress
            FROM enrollments e
            JOIN curriculums c ON c.course_id = e.course_id
            WHERE e.user_uid = ?
            ORDER BY e.enrolled_at ASC
            """,
            (user_uid,),
        ).fetchall()

        path = []
        for row in rows:
            progress = row["progress"] or 0
            status = "completed" if progress >= 100 else ("active" if progress > 0 else "locked")
            path.append({
                "id": row["course_id"],
                "title": row["topic"],
                "status": status,
                "xp": progress * 5,
                "icon": row["icon"] or "📘",
            })
        return path
    finally:
        conn.close()


def get_admin_stats() -> dict:
    conn = _get_mock_db_conn()
    try:
        total_published = conn.execute(
            "SELECT COUNT(*) as cnt FROM curriculums WHERE status = 'published'"
        ).fetchone()["cnt"]
        total_students = conn.execute(
            "SELECT COUNT(*) as cnt FROM users WHERE role = 'student'"
        ).fetchone()["cnt"]
        active_learners = conn.execute(
            "SELECT COUNT(DISTINCT user_uid) as cnt FROM enrollments WHERE progress > 0 AND progress < 100"
        ).fetchone()["cnt"]
        return {
            "totalPublishedCourses": total_published,
            "totalEnrolledStudents": total_students,
            "activeLearners": active_learners,
        }
    finally:
        conn.close()


def get_student_directory() -> List[dict]:
    conn = _get_mock_db_conn()
    try:
        rows = conn.execute("SELECT * FROM users WHERE role = 'student'").fetchall()
        counts = {
            r["user_uid"]: r["cnt"]
            for r in conn.execute(
                "SELECT user_uid, COUNT(*) as cnt FROM enrollments GROUP BY user_uid"
            ).fetchall()
        }
        result = []
        for row in rows:
            d = _user_row_to_dict(row)
            d["enrolledCourses"] = counts.get(row["user_uid"], 0)
            result.append(d)
        return result
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# 9. FLASK APP & ROUTES
# ---------------------------------------------------------------------------

app = Flask(__name__)
CORS(app)  # Frontend runs on a different origin/port (Vite dev server) than Flask.


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


# --- Auth ---

@app.route("/api/auth/register", methods=["POST"])
def api_register():
    """
    POST /api/auth/register
    Body: { "name": str, "email": str, "password": str, "role": "student"|"admin", "adminCode": str? }
    """
    body = request.get_json(silent=True) or {}
    try:
        user = register_user(
            name=body.get("name"),
            email=body.get("email"),
            password=body.get("password"),
            role=body.get("role", "student"),
            admin_code=body.get("adminCode"),
        )
        return jsonify({"user": user})
    except Exception as e:
        return _error_response(e)


@app.route("/api/auth/login", methods=["POST"])
def api_login():
    """
    POST /api/auth/login
    Body: { "email": str, "password": str }
    """
    body = request.get_json(silent=True) or {}
    try:
        user = login_user(body.get("email"), body.get("password"))
        return jsonify({"user": user})
    except Exception as e:
        return _error_response(e)


# --- Courses ---

@app.route("/api/courses", methods=["GET"])
def api_get_courses():
    """
    GET /api/courses?user_uid=optional

    Returns every curriculum. When user_uid is supplied, each course also
    carries `enrolled` and `progress` scoped to that student, which is what
    the student dashboard needs to show "Enroll" vs "Continue Learning".
    """
    user_uid = request.args.get("user_uid")
    try:
        courses = get_all_courses(user_uid=user_uid)
        return jsonify(courses)
    except Exception as e:
        return _error_response(e)


@app.route("/api/courses/<course_id>", methods=["GET"])
def api_get_course_detail(course_id):
    """GET /api/courses/<course_id>?user_uid=optional"""
    user_uid = request.args.get("user_uid")
    try:
        course = get_course_by_id(course_id, user_uid=user_uid)
        if course is None:
            return jsonify({"error": f"Course '{course_id}' not found."}), 404
        return jsonify(course)
    except Exception as e:
        return _error_response(e)


@app.route("/api/courses/<course_id>", methods=["DELETE"])
def api_delete_course(course_id):
    """
    DELETE /api/courses/<course_id>
    Body: { "admin_uid": str }
    """
    body = request.get_json(silent=True) or {}
    admin_uid = body.get("admin_uid")
    if not admin_uid:
        return jsonify({"error": "'admin_uid' is required."}), 400
    try:
        result = delete_curriculum(admin_uid, course_id)
        return jsonify(result)
    except Exception as e:
        return _error_response(e)


@app.route("/api/generate", methods=["POST"])
def api_generate():
    """
    POST /api/generate
    Body: { "admin_uid": str, "topic": str, "difficulty": str? }

    Generates a new curriculum draft via Gemini (structured output:
    lesson_text + quiz_json), persists it to the database as a "draft", and
    returns everything the frontend needs to render it - including a valid
    embeddable video_url for a local <iframe> player.
    """
    body = request.get_json(silent=True) or {}
    admin_uid = body.get("admin_uid")
    topic = body.get("topic")
    difficulty = body.get("difficulty", "Beginner")
    curriculum_profile = body.get("curriculum_profile")

    if not admin_uid or not topic:
        return jsonify({"error": "Both 'admin_uid' and 'topic' are required."}), 400

    try:
        draft = generate_initial_draft(admin_uid, topic, difficulty=difficulty, curriculum_profile=curriculum_profile)
        save_or_update_curriculum(admin_uid, draft, status="draft")

        # Return everything: flat fields for CourseCard-style list views, plus
        # the nested `modules` shape the admin review page renders.
        return jsonify({**draft, "status": "draft", "createdAt": _now_iso()})

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

    Marks a draft as "published", which is what makes it visible in the
    student-facing Explore Courses / My Courses pages.
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


# --- Enrollment & progress ---

@app.route("/api/enroll", methods=["POST"])
def api_enroll():
    """
    POST /api/enroll
    Body: { "user_uid": str, "course_id": str }
    """
    body = request.get_json(silent=True) or {}
    user_uid = body.get("user_uid")
    course_id = body.get("course_id")

    if not user_uid or not course_id:
        return jsonify({"error": "'user_uid' and 'course_id' are both required."}), 400

    try:
        result = enroll_student_in_course(user_uid, course_id)
        return jsonify(result)
    except Exception as e:
        return _error_response(e)


@app.route("/api/progress", methods=["POST"])
def api_progress():
    """
    POST /api/progress
    Body: { "user_uid": str, "course_id": str, "xp_earned": int }
    """
    body = request.get_json(silent=True) or {}
    user_uid = body.get("user_uid")
    course_id = body.get("course_id")
    xp_earned = body.get("xp_earned", 0)

    if not user_uid or not course_id:
        return jsonify({"error": "'user_uid' and 'course_id' are both required."}), 400

    try:
        updated_user = update_student_progress(user_uid, course_id, xp_earned)
        return jsonify({"user": updated_user, "xpEarned": xp_earned})
    except Exception as e:
        return _error_response(e)


@app.route("/api/learning-path", methods=["GET"])
def api_learning_path():
    """GET /api/learning-path?user_uid=..."""
    user_uid = request.args.get("user_uid")
    if not user_uid:
        return jsonify({"error": "'user_uid' query parameter is required."}), 400
    try:
        path = get_learning_path_for_user(user_uid)
        return jsonify({"path": path})
    except Exception as e:
        return _error_response(e)


# --- Admin ---

@app.route("/api/admin/stats", methods=["GET"])
def api_admin_stats():
    try:
        return jsonify(get_admin_stats())
    except Exception as e:
        return _error_response(e)


@app.route("/api/admin/students", methods=["GET"])
def api_admin_students():
    try:
        return jsonify(get_student_directory())
    except Exception as e:
        return _error_response(e)


# --- AI tutor & legacy streak endpoint ---

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


@app.route("/api/visualize-code", methods=["POST"])
def api_visualize_code():
    """
    POST /api/visualize-code
    Body: { "code": str }

    Powers the "code step visualizer" (a bus/car that moves N steps to
    match a code snippet's loop/iteration count). Open to both admin and
    student - no role check, since it's a learning tool either side can use.
    """
    body = request.get_json(silent=True) or {}
    code = body.get("code")

    if not code or not code.strip():
        return jsonify({"error": "'code' is required."}), 400

    try:
        analysis = analyze_code_steps(code)
        return jsonify(analysis)
    except Exception as e:
        return _error_response(e)


@app.route("/api/streak", methods=["POST"])
def api_streak():
    """
    POST /api/streak
    Body: { "user_uid": str }

    Kept for backward compatibility. Prefer POST /api/progress, which also
    updates XP/level as part of completing a module.
    """
    body = request.get_json(silent=True) or {}
    user_uid = body.get("user_uid")

    if not user_uid:
        return jsonify({"error": "'user_uid' is required."}), 400

    conn = _get_mock_db_conn()
    try:
        existing = conn.execute(
            "SELECT current_streak FROM users WHERE user_uid = ?", (user_uid,)
        ).fetchone()
        if existing is None:
            return jsonify({"error": f"User '{user_uid}' not found."}), 400

        conn.execute(
            "UPDATE users SET current_streak = current_streak + 1 WHERE user_uid = ?",
            (user_uid,),
        )
        conn.commit()

        new_value = conn.execute(
            "SELECT current_streak FROM users WHERE user_uid = ?", (user_uid,)
        ).fetchone()["current_streak"]
        return jsonify({"user_uid": user_uid, "current_streak": new_value})
    finally:
        conn.close()


if __name__ == "__main__":
    print(f"Starting Flask app (MOCK_MODE={MOCK_MODE}, USE_FIRESTORE={USE_FIRESTORE})...")
    print("Demo accounts:")
    print("  admin:   admin@subhanu.ai   / admin123")
    print("  student: student@subhanu.ai / student123")
    print("Try it with:")
    print('  curl -X POST http://127.0.0.1:5000/api/auth/login '
          '-H "Content-Type: application/json" '
          '-d \'{"email": "admin@subhanu.ai", "password": "admin123"}\'')
    app.run(debug=True, port=5000)
  
