import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CourseCard from "../../components/CourseCard";
import EmptyState from "../../components/EmptyState";
import { BookCheck, Edit2, Trash2 } from "lucide-react";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { deleteCourse, getAllCourses } from "../../services/api";

export default function PublishedCourses() {
  const [courses, setCourses] = useState([]);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    getAllCourses().then((all) => setCourses(all.filter((c) => c.status === "published")));
  }, []);

  async function removeCourse() {
    if (!courseToDelete) return;
    setDeleting(true);
    try {
      await deleteCourse(courseToDelete.id);
      setCourses((items) => items.filter((course) => course.id !== courseToDelete.id));
      setCourseToDelete(null);
      addToast("Published course deleted.");
    } catch (error) {
      addToast(error.message || "Unable to delete the course.", "info");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Published Courses</h1>
        <p className="mt-1 text-ink/50">Live courses your students are currently learning from.</p>
      </div>

      {courses.length > 0 ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map((course) => (
            <div key={course.id} className="space-y-2">
              <CourseCard course={course} onClick={() => navigate(`/admin/review/${course.id}`)} />
              <div className="flex gap-2"><Button className="flex-1" variant="outline" size="sm" icon={Edit2} onClick={() => navigate(`/admin/review/${course.id}`)}>Edit</Button><Button variant="danger" size="sm" icon={Trash2} onClick={() => setCourseToDelete(course)}>Delete</Button></div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookCheck}
          title="No published courses"
          description="You haven't approved and published any courses yet."
        />
      )}
      <Modal open={!!courseToDelete} onClose={() => !deleting && setCourseToDelete(null)} title="Delete published course?"><p className="text-sm leading-6 text-ink/65">Delete “{courseToDelete?.title}” permanently? Students will no longer be able to access it.</p><div className="mt-6 flex justify-end gap-3"><Button variant="ghost" onClick={() => setCourseToDelete(null)} disabled={deleting}>Cancel</Button><Button variant="danger" icon={Trash2} onClick={removeCourse} disabled={deleting}>{deleting ? "Deleting…" : "Delete course"}</Button></div></Modal>
    </div>
  );
}