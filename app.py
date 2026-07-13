"""
Productivity Guard / Course Content Creator - Backend
======================================================

Generates a complete multimedia lesson package for a given course topic:
  1. Lesson text + a structured 3-question quiz (gemini-2.5-flash, JSON schema output)
  2. A cover image for the topic     (gemini-2.5-flash-image, aka "Nano Banana")
  3. A relevant tutorial video, chosen from a hardcoded, hand-verified mapping
     of categories to public YouTube embed URLs (no live scraping, no
     third-party search library, no external API calls of any kind for this
     feature - matches strict corporate evaluation requirements)

IMPORTANT SETUP NOTES (read before running)
--------------------------------------------
1. Auth: this assumes you've already run, on Windows:
       gcloud auth application-default login --no-launch-browser
   which puts Application Default Credentials on disk. The client below
   picks these up automatically - no API key needed.

2. Backend routing: there are two different "GOOGLE_GENAI_USE_*" flags and
   they are NOT interchangeable:
       - GOOGLE_GENAI_USE_VERTEXAI=True   -> standard Vertex AI (this is almost
         certainly what you want for a hackathon project tied to a GCP project ID)
       - GOOGLE_GENAI_USE_ENTERPRISE=True -> Gemini Enterprise Agent Platform,
         a separate enterprise product. Only use this if you specifically
         provisioned that platform.
   This file defaults to standard Vertex AI. Swap the commented block below
   if you actually intend to target Enterprise Agent Platform.

3. Imagen note: `imagen-3.0-generate-002` is being deprecated/shut down by
   Google (Aug 17, 2026). This code uses the current recommended model,
   gemini-2.5-flash-image, via the standard generate_content call.

4. Video mapping note: VIDEO_LIBRARY below currently ships with ONE
   hand-verified video per category (chosen from well-known, reputable
   educational channels - 3Blue1Brown, freeCodeCamp, TED, etc). Before your
   evaluation, you should:
     a) Watch each linked video yourself and confirm it's still public and
        still says what you expect (public videos can be taken down, or a
        channel can update an old video's content).
     b) Add more entries per category if you want variety instead of always
        showing the same video for a given topic.
   Every ID below was checked against a live source at the time this file
   was written, but "verified" is a snapshot in time - re-check before you
   present this.
5. Offline / no-billing-yet development: set MOCK_MODE = True below to run
   the entire pipeline without touching the network or needing Vertex AI
   enabled at all. Every function checks MOCK_MODE first and, if set,
   returns realistic hardcoded sample data instead of calling the GenAI
   client. Flip it back to False once your project admin has Vertex AI
   billing/permissions sorted.
"""

import os
import time
import base64
from io import BytesIO
from typing import List

from pydantic import BaseModel, Field
from PIL import Image as PILImage, ImageDraw, ImageFont

from google import genai
from google.genai import types
from google.genai import errors as genai_errors


# ---------------------------------------------------------------------------
# 1. CONFIGURATION & CLIENT INITIALIZATION
# ---------------------------------------------------------------------------

# Set this to True to develop/test the whole pipeline (and your frontend
# integration) completely offline, with no Vertex AI calls and no billing
# needed. Every generate_* function checks this flag first. Set back to
# False once Vertex AI is enabled on the project.
MOCK_MODE = True

GCP_PROJECT_ID = "intern-bnmit-july-2026"
GCP_LOCATION = "us-central1"  # standard Vertex AI region; "global" also works for some models

# --- Standard Vertex AI routing (default, recommended for this setup) ---
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"
os.environ["GOOGLE_CLOUD_PROJECT"] = GCP_PROJECT_ID
os.environ["GOOGLE_CLOUD_LOCATION"] = GCP_LOCATION

# --- Alternative: Gemini Enterprise Agent Platform routing ---
# Only uncomment this (and comment out the block above) if your hackathon
# project is specifically provisioned on the Enterprise Agent Platform.
# os.environ["GOOGLE_GENAI_USE_ENTERPRISE"] = "True"
# os.environ["GOOGLE_CLOUD_PROJECT"] = GCP_PROJECT_ID
# os.environ["GOOGLE_CLOUD_LOCATION"] = "global"

OUTPUT_DIR = "output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Client reads ADC automatically - no key passed in. Skipped entirely in
# MOCK_MODE so this file runs with zero cloud auth/permissions required.
client = None if MOCK_MODE else genai.Client()


# ---------------------------------------------------------------------------
# 2. STRUCTURED SCHEMAS FOR QUIZ OUTPUT
# ---------------------------------------------------------------------------

class QuizQuestion(BaseModel):
    question: str = Field(description="The quiz question text")
    options: List[str] = Field(description="Exactly 4 multiple-choice options")
    correct_answer: str = Field(description="The correct option, must exactly match one entry in 'options'")
    explanation: str = Field(description="One-sentence explanation of why the answer is correct")


class LessonPackage(BaseModel):
    lesson_title: str
    lesson_text: str = Field(description="The full lesson content, written for a student, in plain language")
    quiz: List[QuizQuestion] = Field(description="Exactly 3 quiz questions evaluating the lesson content")


# ---------------------------------------------------------------------------
# 3. FEATURE 1: LESSON TEXT + STRUCTURED QUIZ GENERATION
# ---------------------------------------------------------------------------

def generate_lesson_and_quiz(topic: str) -> LessonPackage | None:
    """
    Uses gemini-2.5-flash to generate lesson content plus a 3-question quiz,
    forced into structured JSON via a Pydantic response_schema so the model
    cannot return loose markdown.
    """
    if MOCK_MODE:
        return LessonPackage(
            lesson_title="Introduction to Machine Learning",
            lesson_text=(
                "Machine Learning (ML) is a branch of Artificial Intelligence where "
                "computers learn patterns from data instead of following manually "
                "written rules. Rather than a programmer specifying every decision "
                "(like 'if X then Y'), an ML model is shown many examples and learns "
                "the underlying pattern on its own.\n\n"
                "There are three broad types of ML:\n"
                "1. Supervised Learning - the model learns from labeled examples "
                "(e.g. photos labeled 'cat' or 'dog').\n"
                "2. Unsupervised Learning - the model finds structure in unlabeled "
                "data (e.g. grouping customers by purchase behavior).\n"
                "3. Reinforcement Learning - an agent learns by trial and error, "
                "receiving rewards or penalties for its actions (e.g. a game-playing AI).\n\n"
                "This is a placeholder lesson generated in MOCK_MODE for offline "
                "frontend/backend integration testing - once Vertex AI is enabled, "
                "this same field will contain real, topic-specific content generated "
                "by gemini-2.5-flash."
            ),
            quiz=[
                QuizQuestion(
                    question="What is the main difference between traditional programming and machine learning?",
                    options=[
                        "Machine learning requires no data at all",
                        "Traditional programming uses manually written rules; ML learns patterns from data",
                        "They are exactly the same thing",
                        "Machine learning only works on images",
                    ],
                    correct_answer="Traditional programming uses manually written rules; ML learns patterns from data",
                    explanation="ML models infer patterns from examples rather than following hardcoded if/else rules.",
                ),
                QuizQuestion(
                    question="Which type of ML learns from labeled examples?",
                    options=["Unsupervised Learning", "Reinforcement Learning", "Supervised Learning", "Manual Learning"],
                    correct_answer="Supervised Learning",
                    explanation="Supervised learning uses input-output pairs (labels) to teach the model.",
                ),
                QuizQuestion(
                    question="An AI that learns to play a game through trial, error, and rewards is an example of:",
                    options=["Supervised Learning", "Unsupervised Learning", "Reinforcement Learning", "Static Learning"],
                    correct_answer="Reinforcement Learning",
                    explanation="Reinforcement learning agents improve by receiving rewards/penalties for their actions.",
                ),
            ],
        )

    prompt = f"""You are an expert curriculum designer.

Course topic / structure provided by the student:
\"\"\"{topic}\"\"\"

Break this down and write ONE clear, well-organized lesson (aimed at a
beginner-to-intermediate learner) covering the most foundational sub-topic
implied above. Then write exactly 3 multiple-choice quiz questions
(4 options each) that test understanding of that lesson."""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=LessonPackage,
                temperature=0.4,
            ),
        )
        lesson_package: LessonPackage = response.parsed
        if lesson_package is None:
            print("[generate_lesson_and_quiz] Model returned no parsable structured output.")
            return None
        return lesson_package

    except genai_errors.APIError as e:
        print(f"[generate_lesson_and_quiz] API error (status={getattr(e, 'code', 'unknown')}): {e}")
        return None
    except Exception as e:
        print(f"[generate_lesson_and_quiz] Unexpected error: {e}")
        return None


# ---------------------------------------------------------------------------
# 4. FEATURE 2: EDUCATIONAL COVER IMAGE GENERATION
# ---------------------------------------------------------------------------

def _generate_placeholder_image(topic: str, output_path: str) -> str:
    """
    Draws a simple, clean placeholder cover image locally with PIL - no
    network call, no model, used only when MOCK_MODE is True so the frontend
    always has a real PNG file to render while offline.
    """
    width, height = 1024, 576  # 16:9, matches the real model's aspect ratio
    background_color = (41, 98, 255)   # a pleasant blue banner background
    text_color = (255, 255, 255)

    img = PILImage.new("RGB", (width, height), color=background_color)
    draw = ImageDraw.Draw(img)

    try:
        title_font = ImageFont.truetype("DejaVuSans-Bold.ttf", 46)
        subtitle_font = ImageFont.truetype("DejaVuSans.ttf", 26)
    except OSError:
        # Falls back to PIL's built-in bitmap font if DejaVu isn't available
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()

    title_text = "MOCK COVER IMAGE"
    subtitle_text = (topic[:70] + "...") if len(topic) > 70 else topic

    title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
    title_w = title_bbox[2] - title_bbox[0]
    draw.text(((width - title_w) / 2, height / 2 - 60), title_text, font=title_font, fill=text_color)

    subtitle_bbox = draw.textbbox((0, 0), subtitle_text, font=subtitle_font)
    subtitle_w = subtitle_bbox[2] - subtitle_bbox[0]
    draw.text(((width - subtitle_w) / 2, height / 2 + 10), subtitle_text, font=subtitle_font, fill=text_color)

    img.save(output_path)
    print(f"[generate_cover_image] MOCK_MODE: saved placeholder image to {output_path}")
    return output_path


def generate_cover_image(topic: str, output_path: str = f"{OUTPUT_DIR}/cover_image.png") -> str | None:
    """
    Uses gemini-2.5-flash-image (current recommended image model - Imagen is
    being deprecated) to generate a cover illustration for the course topic.
    Saves the PNG to disk and returns the file path.
    """
    if MOCK_MODE:
        return _generate_placeholder_image(topic, output_path)

    prompt = (
        f"A clean, modern, flat-illustration style educational cover image "
        f"representing the course topic: '{topic}'. Bright, friendly colors, "
        f"simple iconography suitable for an e-learning platform banner. No text."
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(aspect_ratio="16:9"),
            ),
        )

        for part in response.parts:
            if part.inline_data is not None:
                image_bytes = part.inline_data.data
                img = PILImage.open(BytesIO(image_bytes))
                img.save(output_path)
                print(f"[generate_cover_image] Saved cover image to {output_path}")
                return output_path

        print("[generate_cover_image] No image data returned in response.")
        return None

    except genai_errors.APIError as e:
        print(f"[generate_cover_image] API error (status={getattr(e, 'code', 'unknown')}): {e}")
        return None
    except Exception as e:
        print(f"[generate_cover_image] Unexpected error: {e}")
        return None


# ---------------------------------------------------------------------------
# 5. FEATURE 3: HARDCODED VIDEO MAPPING SERVICE (no scraping, no external API)
# ---------------------------------------------------------------------------

class VideoResult(BaseModel):
    video_id: str
    embed_url: str
    watch_url: str
    title: str
    channel: str
    matched_category: str


# Each category maps to a list of hand-picked, publicly embeddable YouTube
# videos from reputable, well-established educational channels. Add more
# entries to any list below for variety - the lookup always uses list[0]
# unless you change _select_from_category to rotate/randomize.
#
# NOTE: every video_id here was checked against a live YouTube source at the
# time of writing. Re-verify (watch the video, confirm it's still public)
# before a formal evaluation - public videos can occasionally be removed or
# re-uploaded under a new ID.
VIDEO_LIBRARY: dict[str, list[dict]] = {
    "Machine Learning": [
        {
            "video_id": "aircAruvnKk",
            "title": "But what is a neural network? | Deep learning chapter 1",
            "channel": "3Blue1Brown",
        },
    ],
    "Deep Work": [
        {
            "video_id": "gTaJhjQHcf8",
            "title": "Success in a Distracted World: DEEP WORK by Cal Newport",
            "channel": "Productivity Game",
        },
    ],
    "Programming Basics": [
        {
            "video_id": "eWRfhZUzrAc",
            "title": "Python for Beginners - Full Course",
            "channel": "freeCodeCamp.org",
        },
    ],
    "General Productivity": [
        {
            "video_id": "arj7oStGLkU",
            "title": "Inside the mind of a master procrastinator",
            "channel": "TED",
        },
    ],
}

# Keyword signals used to route a free-text sub-course topic to a category.
# Checked in this order; first category with a keyword hit wins.
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "Machine Learning": [
        "machine learning", "ml", "deep learning", "dl", "neural network",
        "nlp", "genai", "generative ai", "agentic ai", "artificial intelligence",
        "ai", "computer vision", "reinforcement learning",
    ],
    "Programming Basics": [
        "programming", "coding", "python", "java", "javascript", "c++",
        "data structures", "algorithms", "software development", "web development",
    ],
    "Deep Work": [
        "deep work", "focus", "concentration", "distraction", "flow state",
    ],
    "General Productivity": [
        "productivity", "time management", "habits", "organization",
        "procrastination", "planning",
    ],
}

# Used when no category keyword matches at all.
DEFAULT_VIDEO = {
    "video_id": "arj7oStGLkU",
    "title": "Inside the mind of a master procrastinator",
    "channel": "TED",
}
DEFAULT_CATEGORY_LABEL = "General (default)"


def _match_category(topic: str) -> str | None:
    """Returns the first category whose keyword list matches the topic text."""
    topic_lower = topic.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in topic_lower for keyword in keywords):
            return category
    return None


def get_video_for_topic(topic: str) -> VideoResult:
    """
    Maps a generated sub-course topic to a verified, hardcoded YouTube video.
    Always returns a VideoResult - falls back to DEFAULT_VIDEO if no category
    matches, so the frontend never has to handle a missing video case.
    """
    category = _match_category(topic)

    if category and VIDEO_LIBRARY.get(category):
        entry = VIDEO_LIBRARY[category][0]
        matched_label = category
    else:
        entry = DEFAULT_VIDEO
        matched_label = DEFAULT_CATEGORY_LABEL

    return VideoResult(
        video_id=entry["video_id"],
        embed_url=f"https://www.youtube.com/embed/{entry['video_id']}",
        watch_url=f"https://www.youtube.com/watch?v={entry['video_id']}",
        title=entry["title"],
        channel=entry["channel"],
        matched_category=matched_label,
    )


# ---------------------------------------------------------------------------
# 6. ENTRY POINT - RUNS ALL THREE FEATURES SEQUENTIALLY ON A SAMPLE TOPIC
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    sample_topic = (
        "aiml as main course that has sub topics like ml dl nlp genai and "
        "agentic ai. in ml the sub topics or chapters will be types of ml, "
        "introduction to ml etc. after completing each chapter a quiz comes up."
    )

    print("=" * 70)
    print("STEP 1: Generating lesson text + structured quiz...")
    print("=" * 70)
    lesson_package = generate_lesson_and_quiz(sample_topic)
    if lesson_package:
        print(f"\nLesson title: {lesson_package.lesson_title}\n")
        print(lesson_package.lesson_text[:500] + "...\n")
        for i, q in enumerate(lesson_package.quiz, start=1):
            print(f"Q{i}: {q.question}")
            for opt in q.options:
                marker = "*" if opt == q.correct_answer else " "
                print(f"   [{marker}] {opt}")
        # Save full structured output for later use by the frontend
        with open(f"{OUTPUT_DIR}/lesson_and_quiz.json", "w", encoding="utf-8") as f:
            f.write(lesson_package.model_dump_json(indent=2))
    else:
        print("Lesson/quiz generation failed - see error above.")

    print("\n" + "=" * 70)
    print("STEP 2: Generating course cover image...")
    print("=" * 70)
    image_path = generate_cover_image("AI/ML course: Machine Learning fundamentals")
    if image_path:
        print(f"Cover image saved at: {image_path}")
    else:
        print("Cover image generation failed - see error above.")

    print("\n" + "=" * 70)
    print("STEP 3: Mapping topic to an in-app tutorial video...")
    print("=" * 70)
    video_result = get_video_for_topic(sample_topic)
    print(f"Matched category: {video_result.matched_category}")
    print(f"Video: {video_result.title} ({video_result.channel})")
    print(f"Embed URL for frontend <iframe>: {video_result.embed_url}")

    # ---- Package everything into one combined JSON response for the frontend ----
    combined_response = {
        "lesson": lesson_package.model_dump() if lesson_package else None,
        "cover_image_path": image_path,
        "video": video_result.model_dump(),
    }
    with open(f"{OUTPUT_DIR}/course_package.json", "w", encoding="utf-8") as f:
        import json
        json.dump(combined_response, f, indent=2)

    print(f"\nCombined course package saved to {OUTPUT_DIR}/course_package.json")
    print("All steps complete. Check the 'output/' folder for saved artifacts.")
