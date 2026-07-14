import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertTriangle, BookOpen, Bot, Check, ChevronDown, ChevronUp, Code2,
  Edit2, ExternalLink, FileQuestion, Layers, Save, Send, Sparkles,
  Target, Trash2, Video, X,
} from "lucide-react";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import { SkeletonCard } from "../../components/LoadingSkeleton";
import { useToast } from "../../components/Toast";
import Modal from "../../components/Modal";
import { deleteCourse, getCourseDetail, getAllCourses, refineCourseCurriculum, reviewCourseAction } from "../../services/api";

const dateLabel = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : "Not available";

function LessonNotes({ content }) {
  if (!content) return <p className="text-sm text-ink/60">No lesson explanation available.</p>;
  return <article className="space-y-2 text-sm leading-6 text-ink/75">
    {content.split("\n").map((line, index) => {
      if (line.startsWith("## ")) return <h3 key={index} className="mt-4 text-lg font-bold text-ink first:mt-0">{line.slice(3)}</h3>;
      if (line.startsWith("### ")) return <h4 key={index} className="mt-4 font-bold text-primary">{line.slice(4)}</h4>;
      if (line.startsWith("- ")) return <p key={index} className="pl-4 before:mr-2 before:text-primary before:content-['•']">{line.slice(2)}</p>;
      if (/^\d+\. /.test(line)) return <p key={index} className="rounded-lg bg-canvas px-3 py-1.5">{line}</p>;
      return line ? <p key={index}>{line}</p> : <div key={index} className="h-1" />;
    })}
  </article>;
}

function VisualWorkflow({ lesson }) {
  const visual = lesson.visuals?.[0];
  const steps = visual?.steps?.length ? visual.steps : (lesson.workflow || []);
  if (!steps.length) return null;
  return <section>
    <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink/45"><Sparkles size={14} /> Visual workflow</p>
    <div className="overflow-hidden rounded-xl3 border border-primary/15 bg-gradient-to-br from-primary-50 via-surface to-gold/10 p-5">
      <p className="font-bold text-primary">{visual?.title || `${lesson.title} learning path`}</p>
      {visual?.description && <p className="mt-1 text-sm text-ink/60">{visual.description}</p>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{steps.map((step, index) => <div key={`${step}-${index}`} className="relative flex min-h-20 items-center gap-3 rounded-xl bg-surface/90 p-4 shadow-soft"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{index + 1}</span><span className="text-sm font-semibold text-ink/80">{step}</span>{index < steps.length - 1 && <span className="absolute -bottom-3 left-8 z-10 text-primary sm:hidden">↓</span>}</div>)}</div>
    </div>
  </section>;
}

function LessonReview({ lesson, number, editable, onChange }) {
  const [open, setOpen] = useState(false);
  const change = (key, value) => onChange?.({ ...lesson, [key]: value });
  const embedUrl = lesson.youtubeUrl?.replace("watch?v=", "embed/").replace("youtu.be/", "www.youtube.com/embed/");

  return <div className="border-t border-border first:border-t-0">
    <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-canvas/40">
      <BookOpen size={17} className="shrink-0 text-primary" />
      <span className="flex-1 font-semibold">Lesson {number}: {lesson.title}</span>
      {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
    </button>
    {open && <div className="space-y-6 bg-canvas/25 px-5 pb-6 pt-1">
      <section>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/45">Lesson title</p>
        {editable ? <input value={lesson.title || ""} onChange={(e) => change("title", e.target.value)} className="w-full rounded-xl border border-border bg-surface px-3 py-2 font-semibold" /> : <p className="font-semibold">{lesson.title}</p>}
      </section>
      {(lesson.workflow || []).length > 0 && <section>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink/45">Learning workflow</p>
        <div className="flex flex-wrap items-center gap-2">{lesson.workflow.map((step, i) => <div key={`${step}-${i}`} className="flex items-center gap-2"><span className="rounded-xl bg-primary-50 px-3 py-2 text-sm font-semibold text-primary">{i + 1}. {step}</span>{i < lesson.workflow.length - 1 && <span className="text-primary/45">→</span>}</div>)}</div>
      </section>}
      <VisualWorkflow lesson={lesson} />
      <section>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/45">Lesson explanation</p>
        {editable ? <textarea value={lesson.content || ""} onChange={(e) => change("content", e.target.value)} rows={9} className="w-full rounded-xl border border-border bg-surface p-3 text-sm leading-6" /> : <div className="rounded-xl border border-border bg-surface p-4"><LessonNotes content={lesson.content} /></div>}
      </section>
      <section>
        <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink/45"><Target size={14} /> Learning objectives</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink/75">{(lesson.objectives || []).map((item, i) => <li key={i}>{item}</li>)}</ul>
      </section>
      <section>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/45">Examples</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink/75">{(lesson.examples || []).map((item, i) => <li key={i}>{item}</li>)}</ul>
      </section>
      {(lesson.codeSnippets || []).length > 0 && <section>
        <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink/45"><Code2 size={14} /> Code snippets</p>
        {lesson.codeSnippets.map((snippet, i) => <pre key={i} className="overflow-x-auto rounded-xl bg-ink p-4 text-xs leading-5 text-white"><code>{snippet}</code></pre>)}
      </section>}
      <section className="rounded-xl3 border border-border bg-surface p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Video size={17} className="text-primary" /> Video resource</p>
        {lesson.youtubeUrl ? <div className="grid gap-4 md:grid-cols-[180px_1fr]">
          {lesson.videoThumbnail && <img className="h-28 w-full rounded-lg object-cover" src={lesson.videoThumbnail} alt="Video thumbnail" />}
          <div><p className="font-semibold">{lesson.videoTitle || "YouTube lesson"}</p><p className="mt-1 text-sm text-ink/55">{lesson.videoChannel || "YouTube"}</p><a className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline" href={lesson.youtubeUrl} target="_blank" rel="noreferrer">Watch Video <ExternalLink size={14} /></a></div>
          {embedUrl && <iframe className="aspect-video w-full rounded-lg md:col-span-2" src={embedUrl} title={lesson.videoTitle || lesson.title} allowFullScreen />}
        </div> : <p className="flex items-center gap-2 text-sm font-medium text-amber-700"><AlertTriangle size={16} /> No video resource available</p>}
      </section>
      <section>
        <p className="mb-3 flex items-center gap-2 text-sm font-bold"><FileQuestion size={17} className="text-primary" /> Quiz review</p>
        <div className="space-y-3">{(lesson.quiz?.questions || []).map((question, i) => <div key={question.id || i} className="rounded-xl border border-border bg-surface p-4 text-sm"><p className="font-semibold">{i + 1}. {question.question}</p><ol className="mt-3 space-y-1 pl-5 text-ink/70" type="A">{(question.options || []).map((option) => <li key={option}>{option}</li>)}</ol><p className="mt-3 text-success"><strong>Correct answer:</strong> {question.correctAnswer}</p><p className="mt-1 text-ink/60"><strong>Explanation:</strong> {question.explanation}</p></div>)}</div>
      </section>
      {lesson.exercise && <section className="rounded-xl3 border border-primary/15 bg-primary-50/50 p-4">
        <p className="mb-3 flex items-center gap-2 font-bold"><Code2 size={17} className="text-primary" /> Coding exercise <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{lesson.exercise.difficulty}</span></p>
        <div className="space-y-3 text-sm"><p><strong>Problem:</strong> {lesson.exercise.problemStatement}</p><p className="whitespace-pre-wrap"><strong>Input/output examples:</strong> {lesson.exercise.inputOutputExamples}</p><p className="whitespace-pre-wrap"><strong>Expected solution:</strong> {lesson.exercise.expectedSolution}</p></div>
      </section>}
    </div>}
  </div>;
}

export default function ReviewCourse() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [pending, setPending] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [editing, setEditing] = useState(false);
  const [chat, setChat] = useState([]);
  const [instruction, setInstruction] = useState("");
  const [refining, setRefining] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => { if (id) getCourseDetail(id).then(setCourse); else getAllCourses().then((all) => setPending(all.filter((c) => c.status === "draft" || c.status === "pending_review"))); }, [id]);
  const lessons = useMemo(() => course?.modules?.reduce((count, module) => count + (module.lessons?.length || 0), 0) || 0, [course]);
  const updateModule = (index, module) => setCourse((current) => ({ ...current, modules: current.modules.map((item, i) => i === index ? module : item) }));
  const updateLesson = (moduleIndex, lessonIndex, lesson) => updateModule(moduleIndex, { ...course.modules[moduleIndex], lessons: course.modules[moduleIndex].lessons.map((item, i) => i === lessonIndex ? lesson : item) });
  const isPublished = course?.status === "published";
  async function approve() { await reviewCourseAction(id, "approve", course); navigate("/admin/published"); }
  async function deleteCourseAction() {
    if (!draftToDelete) return;
    setDeleting(true);
    try {
      await deleteCourse(draftToDelete.id);
      setPending((items) => items.filter((item) => item.id !== draftToDelete.id));
      addToast("Course deleted.");
      setDraftToDelete(null);
      if (id) navigate("/admin/review");
    } catch (error) {
      addToast(error.message || "Unable to delete the draft.", "info");
    } finally {
      setDeleting(false);
    }
  }
  async function sendInstruction() {
    const text = instruction.trim(); if (!text || refining) return;
    setChat((items) => [...items, { from: "admin", text }]); setInstruction(""); setRefining(true);
    try { const updated = await refineCourseCurriculum(course, text); setCourse({ ...updated, id: updated.course_id, title: updated.title || updated.topic, createdAt: updated.createdAt || course.createdAt }); setExpanded(new Set((updated.modules || []).map((_, index) => index))); const message = updated.refinementNotice || "Curriculum updated. The revised modules are now open for review."; setChat((items) => [...items, { from: "ai", text: message }]); addToast(updated.refinementNotice || "Curriculum updated successfully.", updated.refinementNotice ? "info" : undefined); }
    catch (error) { setChat((items) => [...items, { from: "ai", text: error.message || "I couldn't update this curriculum." }]); addToast(error.message || "Unable to update the curriculum.", "info"); }
    finally { setRefining(false); }
  }

  if (!id) return <div className="space-y-8"><div><h1 className="text-3xl font-bold">Review Courses</h1><p className="mt-1 text-ink/50">Inspect complete AI-generated curricula before publishing.</p></div>{pending.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{pending.map((item) => <div key={item.id} className="rounded-xl3 bg-surface p-6 shadow-card"><Layers className="text-primary" /><h3 className="mt-4 text-lg font-bold">{item.title}</h3><p className="mt-1 text-sm text-ink/50">{item.modulesCount} modules · {item.difficulty}</p><div className="mt-6 flex gap-2"><Button className="flex-1" onClick={() => navigate(`/admin/review/${item.id}`)}>Review</Button><Button variant="danger" icon={Trash2} className="px-3" onClick={() => setDraftToDelete(item)} aria-label={`Delete ${item.title}`} /></div></div>)}</div> : <EmptyState icon={Layers} title="All caught up" description="There are no pending courses to review." />}<Modal open={!!draftToDelete} onClose={() => !deleting && setDraftToDelete(null)} title="Delete course?"><p className="text-sm leading-6 text-ink/65">Delete “{draftToDelete?.title}”? This removes its generated curriculum permanently.</p><div className="mt-6 flex justify-end gap-3"><Button variant="ghost" onClick={() => setDraftToDelete(null)} disabled={deleting}>Cancel</Button><Button variant="danger" icon={Trash2} onClick={deleteCourseAction} disabled={deleting}>{deleting ? "Deleting…" : "Delete course"}</Button></div></Modal></div>;
  if (!course) return <div className="space-y-6"><SkeletonCard /><SkeletonCard /></div>;

  return <div className="mx-auto max-w-5xl space-y-6 pb-24">
    <button onClick={() => navigate(isPublished ? "/admin/published" : "/admin/review")} className="text-sm font-semibold text-ink/50 hover:text-ink">← Back to {isPublished ? "published courses" : "review queue"}</button>
    <div className="rounded-xl4 bg-surface p-6 shadow-card md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-gold-dark">{course.difficulty}</span>{editing ? <input value={course.title || ""} onChange={(e) => setCourse({ ...course, title: e.target.value, courseTitle: e.target.value, topic: e.target.value })} className="mt-4 block w-full rounded-xl border border-border px-3 py-2 text-2xl font-bold" /> : <h1 className="mt-4 text-3xl font-bold">{course.title}</h1>}</div><Button variant={editing ? "success" : "outline"} icon={editing ? Save : Edit2} onClick={() => setEditing(!editing)}>{editing ? "Save local edits" : "Edit manually"}</Button></div>
      {editing ? <textarea value={course.description || ""} onChange={(e) => setCourse({ ...course, description: e.target.value })} rows={3} className="mt-4 w-full rounded-xl border border-border p-3 text-ink/70" /> : <p className="mt-4 leading-6 text-ink/70">{course.description}</p>}
      <div className="mt-6 grid grid-cols-2 gap-3 text-sm md:grid-cols-4"><div className="rounded-xl bg-canvas p-3"><b>Created</b><br /><span className="text-ink/60">{dateLabel(course.createdAt || course.created_at)}</span></div><div className="rounded-xl bg-canvas p-3"><b>Modules</b><br /><span className="text-ink/60">{course.modules?.length || 0}</span></div><div className="rounded-xl bg-canvas p-3"><b>Lessons</b><br /><span className="text-ink/60">{lessons}</span></div><div className="rounded-xl bg-canvas p-3"><b>Duration</b><br /><span className="text-ink/60">{course.estimatedDuration || "Not estimated"}</span></div></div>
    </div>
    <div className="rounded-xl3 bg-surface shadow-card"><div className="border-b border-border px-6 py-4"><h2 className="font-bold">Complete curriculum</h2><p className="mt-1 text-sm text-ink/50">Expand every module and lesson to verify generated content.</p></div>{(course.modules || []).map((module, moduleIndex) => <div key={module.id || moduleIndex} className="border-b border-border last:border-b-0"><button onClick={() => setExpanded((items) => { const next = new Set(items); if (next.has(moduleIndex)) next.delete(moduleIndex); else next.add(moduleIndex); return next; })} className="flex w-full items-center gap-3 p-5 text-left hover:bg-canvas/40"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">{moduleIndex + 1}</span><span className="flex-1"><b>Module {moduleIndex + 1}: {module.title}</b><span className="mt-1 block text-sm text-ink/55">{module.description}</span></span>{expanded.has(moduleIndex) ? <ChevronUp /> : <ChevronDown />}</button>{expanded.has(moduleIndex) && <div>{(module.lessons || []).map((lesson, lessonIndex) => <LessonReview key={lesson.id || lessonIndex} lesson={lesson} number={lessonIndex + 1} editable={editing} onChange={(value) => updateLesson(moduleIndex, lessonIndex, value)} />)}</div>}</div>)}</div>
    <div className="rounded-xl3 bg-surface shadow-card"><div className="flex items-center gap-2 border-b border-border px-5 py-4"><Bot className="text-primary" size={19} /><div><h2 className="font-bold">AI curriculum editor</h2><p className="text-sm text-ink/50">Send the current curriculum and your instruction to Gemini.</p></div><Sparkles className="ml-auto text-primary" size={18} /></div><div className="max-h-48 space-y-2 overflow-y-auto p-4">{chat.length ? chat.map((message, i) => <div key={i} className={`rounded-xl px-3 py-2 text-sm ${message.from === "admin" ? "ml-auto max-w-[80%] bg-primary text-white" : "mr-auto max-w-[80%] bg-canvas"}`}>{message.text}</div>) : <p className="text-sm text-ink/50">Try: “Make Module 2 easier for beginners” or “Add more examples to lesson 1.”</p>}{refining && <p className="text-sm text-ink/45">Gemini is revising the full curriculum…</p>}</div><div className="flex gap-2 border-t border-border p-4"><input value={instruction} onChange={(e) => setInstruction(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendInstruction()} className="flex-1 rounded-xl bg-canvas px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Describe the curriculum change…" /><Button icon={Send} onClick={sendInstruction} disabled={refining}>Update</Button></div></div>
    <div className="sticky bottom-4 flex flex-wrap justify-end gap-3 rounded-xl3 bg-surface p-4 shadow-pop"><Button variant="danger" icon={Trash2} onClick={() => setDraftToDelete(course)}>Delete course</Button><Button variant="outline" icon={X} onClick={() => navigate(isPublished ? "/admin/published" : "/admin/review")}>{isPublished ? "Back to published" : "Keep as draft"}</Button><Button variant="success" icon={Check} onClick={approve}>{isPublished ? "Update & republish" : "Approve & publish"}</Button></div>
    <Modal open={!!draftToDelete} onClose={() => !deleting && setDraftToDelete(null)} title="Delete course?"><p className="text-sm leading-6 text-ink/65">Delete “{draftToDelete?.title}”? This removes its generated curriculum permanently.</p><div className="mt-6 flex justify-end gap-3"><Button variant="ghost" onClick={() => setDraftToDelete(null)} disabled={deleting}>Cancel</Button><Button variant="danger" icon={Trash2} onClick={deleteCourseAction} disabled={deleting}>{deleting ? "Deleting…" : "Delete course"}</Button></div></Modal>
  </div>;
}