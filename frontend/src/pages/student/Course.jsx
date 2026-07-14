import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Lock, Loader2 } from "lucide-react";
import PathNode from "../../components/PathNode";
import Button from "../../components/Button";
import {
  getLearningPath,
  submitQuiz,
  getCourseDetail,
  enrollInCourse,
} from "../../services/api";

// Fallback quiz used only for the generic "learning path" nodes below, which
// aren't tied to a specific course_id yet. Course-specific pages (reached
// via ?id=...) always use the real quiz generated for that course instead.
const genericPathQuiz = [
  {
    id: "q1",
    question: "What is the main purpose of a neural network's activation function?",
    options: ["Store data", "Introduce non-linearity", "Speed up training only", "Reduce dataset size"],
    answer: 1,
  },
  {
    id: "q2",
    question: "Which of these best describes 'training' a model?",
    options: [
      "Deploying it to production",
      "Adjusting its parameters using data to reduce error",
      "Deleting unused layers",
      "Renaming the model file",
    ],
    answer: 1,
  },
  {
    id: "q3",
    question: "What does XP typically represent on Subhanu AI Academy?",
    options: ["Your account age", "Progress and mastery earned by completing lessons", "A currency for buying courses", "Server load"],
    answer: 1,
  },
];

export default function StudentCourse() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("id");
  const navigate = useNavigate();

  // --- Generic learning-path view (no ?id= in the URL) ---
  const [path, setPath] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);

  // --- Specific-course view (?id=... in the URL) ---
  const [course, setCourse] = useState(null);
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseError, setCourseError] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  // --- Shared quiz-runner state (works for either flow) ---
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [xpGained, setXpGained] = useState(0);

  useEffect(() => {
    if (!courseId) getLearningPath().then(setPath);
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    setCourseLoading(true);
    setCourseError("");
    getCourseDetail(courseId)
      .then(setCourse)
      .catch((err) => setCourseError(err.message || "Could not load this course."))
      .finally(() => setCourseLoading(false));
  }, [courseId]);

  async function handleEnroll() {
    setEnrolling(true);
    setCourseError("");
    try {
      await enrollInCourse(courseId);
      const updated = await getCourseDetail(courseId);
      setCourse(updated);
    } catch (err) {
      setCourseError(err.message || "Could not enroll in this course.");
    } finally {
      setEnrolling(false);
    }
  }

  // --- Path-node flow (legacy, generic quiz) ---
  function startLesson(node) {
    setActiveLesson(node);
    setQuizQuestions(genericPathQuiz.map((q) => ({ ...q, correctIndex: q.answer })));
    setStep(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  }

  // --- Course-specific flow (real quiz from the generated lesson) ---
  function startCourseQuiz() {
    const lesson = course?.modules?.[0]?.lessons?.[0];
    const questions = (lesson?.quiz?.questions || []).map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctIndex: q.options.indexOf(q.correctAnswer),
    }));
    setQuizQuestions(questions);
    setStep(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
    setShowQuiz(true);
  }

  async function handleNext() {
    const correct = selected === quizQuestions[step].correctIndex;
    const finalScore = correct ? score + 1 : score;
    if (correct) setScore(finalScore);

    if (step < quizQuestions.length - 1) {
      setStep((s) => s + 1);
      setSelected(null);
      return;
    }

    const targetCourseId = courseId || activeLesson?.id;
    const xpEarned = Math.round((finalScore / quizQuestions.length) * 100);
    try {
      const res = await submitQuiz(targetCourseId, xpEarned);
      setXpGained(res?.xpEarned ?? xpEarned);
    } catch {
      setXpGained(xpEarned);
    }
    setFinished(true);
  }

  function backFromQuiz() {
    if (courseId) {
      setShowQuiz(false);
      getCourseDetail(courseId).then(setCourse);
    } else {
      setActiveLesson(null);
    }
  }

  const inQuiz = showQuiz || activeLesson;

  if (inQuiz && quizQuestions.length > 0) {
    return (
      <div className="mx-auto max-w-xl">
        <button onClick={backFromQuiz} className="mb-4 flex items-center gap-1 text-sm font-semibold text-ink/50 hover:text-ink">
          <ArrowLeft size={16} /> Back
        </button>

        <AnimatePresence mode="wait">
          {!finished ? (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              className="rounded-xl3 bg-surface p-6 shadow-card"
            >
              <p className="text-xs font-bold text-primary">Question {step + 1} of {quizQuestions.length}</p>
              <h2 className="mt-2 text-xl font-bold">{quizQuestions[step].question}</h2>

              <div className="mt-5 space-y-3">
                {quizQuestions[step].options.map((option, i) => (
                  <button
                    key={option}
                    onClick={() => setSelected(i)}
                    className={`w-full rounded-2xl border-2 p-4 text-left text-sm font-semibold transition-colors ${
                      selected === i ? "border-primary bg-primary-50" : "border-black/5 hover:border-primary/30"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <Button fullWidth className="mt-6" disabled={selected === null} onClick={handleNext}>
                {step < quizQuestions.length - 1 ? "Next question" : "Submit quiz"}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl3 bg-surface p-8 text-center shadow-card"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 10, delay: 0.1 }}
                className="text-6xl"
              >
                🎉
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 text-2xl font-bold text-gold-dark"
              >
                +{xpGained} XP
              </motion.p>
              <p className="mt-1 text-ink/60">
                You scored {score}/{quizQuestions.length} on "{course?.title || activeLesson?.title}"
              </p>
              <Button className="mt-6" icon={Check} onClick={backFromQuiz}>
                Continue
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // --- Specific-course view ---
  if (courseId) {
    return (
      <div className="mx-auto max-w-2xl">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm font-semibold text-ink/50 hover:text-ink">
          <ArrowLeft size={16} /> Back
        </button>

        {courseLoading && (
          <div className="flex items-center gap-2 text-ink/50">
            <Loader2 size={18} className="animate-spin" /> Loading course...
          </div>
        )}

        {!courseLoading && courseError && (
          <div className="rounded-xl3 bg-surface p-6 text-red-500 shadow-card">{courseError}</div>
        )}

        {!courseLoading && course && (
          <div className="rounded-xl3 bg-surface p-6 shadow-card">
            <div className="flex items-start gap-4">
              <div className="text-4xl">{course.icon}</div>
              <div>
                <h1 className="text-2xl font-bold text-ink">{course.title}</h1>
                <p className="mt-1 text-sm text-ink/50">{course.description}</p>
              </div>
            </div>

            {!course.enrolled ? (
              <div className="mt-6 flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-black/10 py-10 text-center">
                <Lock size={28} className="text-ink/30" />
                <p className="text-sm text-ink/60">Enroll in this course to unlock the lesson, video, and quiz.</p>
                <Button onClick={handleEnroll} disabled={enrolling}>
                  {enrolling ? "Enrolling..." : "Enroll now"}
                </Button>
              </div>
            ) : (
              <>
                {course.video_url && (
                  <div className="mt-6 aspect-video overflow-hidden rounded-xl2">
                    <iframe
                      src={course.video_url}
                      title={course.title}
                      className="h-full w-full"
                      allowFullScreen
                    />
                  </div>
                )}

                <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
                  {course.lesson_text}
                </div>

                <Button
                  fullWidth
                  className="mt-6"
                  disabled={!course.modules?.[0]?.lessons?.[0]?.quiz?.questions?.length}
                  onClick={startCourseQuiz}
                >
                  Take the quiz
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // --- Generic learning-path view ---
  return (
    <div>
      <h1 className="text-2xl font-bold">Your learning path</h1>
      <p className="mt-1 text-ink/50">Complete lessons in order to unlock the next step.</p>

      <div className="mt-10 flex flex-col items-center gap-8 px-4">
        {path.map((node, i) => (
          <div key={node.id} className="flex w-full max-w-md flex-col items-center">
            <PathNode node={node} index={i} onClick={() => startLesson(node)} />
            {i < path.length - 1 && <div className="h-8 w-1 rounded-full bg-black/10" />}
          </div>
        ))}
      </div>
    </div>
  );
}