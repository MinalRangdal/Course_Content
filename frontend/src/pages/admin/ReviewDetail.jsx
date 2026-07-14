import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Pencil, X, Layers, ListChecks } from "lucide-react";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import { getCourseDetail, reviewCourseAction } from "../../services/api";

export default function ReviewDetail() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [modal, setModal] = useState(null); // "approve" | "changes" | "reject"
  const navigate = useNavigate();

  useEffect(() => {
    getCourseDetail(id).then(setCourse);
  }, [id]);

  async function handleAction(action) {
    await reviewCourseAction(id, action); // TODO: connect real review endpoint
    setModal(null);
    navigate("/admin/review");
  }

  if (!course) return <div className="text-ink/40">Loading course…</div>;

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm font-semibold text-ink/50 hover:text-ink">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="rounded-xl3 bg-surface p-6 shadow-card">
        <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-gold-dark">{course.difficulty}</span>
        <h1 className="mt-3 text-2xl font-bold">{course.title}</h1>
        <p className="mt-1 text-ink/60">{course.description}</p>
        <p className="mt-2 text-xs font-medium text-ink/40">Created {course.createdAt}</p>
      </div>

      <div className="mt-6 space-y-4">
        {course.modules.map((module, i) => (
          <motion.div
            key={module.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl3 bg-surface p-5 shadow-card"
          >
            <div className="flex items-center gap-2 font-bold">
              <Layers size={18} className="text-primary" />
              {module.title}
            </div>
            <ul className="mt-3 space-y-2">
              {module.lessons.map((lesson) => (
                <li key={lesson.id} className="flex items-center justify-between rounded-xl bg-black/[0.03] px-4 py-2.5 text-sm">
                  <span>{lesson.title}</span>
                  <span className="font-bold text-gold-dark">+{lesson.xp} XP</span>
                </li>
              ))}
            </ul>
            {module.quiz.questions.length > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-ink/50">
                <ListChecks size={14} /> {module.quiz.questions.length} quiz question{module.quiz.questions.length > 1 ? "s" : ""}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="sticky bottom-4 mt-8 flex flex-wrap gap-3 rounded-xl3 bg-surface p-4 shadow-pop">
        <Button variant="success" icon={Check} onClick={() => setModal("approve")}>Approve Course</Button>
        <Button variant="outline" icon={Pencil} onClick={() => setModal("changes")}>Request Changes</Button>
        <Button variant="danger" icon={X} onClick={() => setModal("reject")}>Reject</Button>
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={
          modal === "approve" ? "Approve this course?" : modal === "changes" ? "Request changes" : "Reject this course?"
        }
      >
        <p className="text-sm text-ink/60">
          {modal === "approve" && "This course will be published and made available to students."}
          {modal === "changes" && "The AI assistant will be notified to revise this course based on your feedback."}
          {modal === "reject" && "This course will be discarded and won't be published."}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          <Button
            variant={modal === "reject" ? "danger" : "primary"}
            onClick={() => handleAction(modal)}
          >
            Confirm
          </Button>
        </div>
      </Modal>
    </div>
  );
}