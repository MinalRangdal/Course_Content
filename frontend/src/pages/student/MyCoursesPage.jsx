import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CourseCard from "../../components/CourseCard";
import EmptyState from "../../components/EmptyState";
import { SkeletonCard } from "../../components/LoadingSkeleton";
import { getMyCourses } from "../../services/api";

export default function MyCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getMyCourses().then((data) => {
      setCourses(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Courses</h1>
        <p className="mt-1 text-ink/50">Pick up where you left off.</p>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : courses.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onClick={() => navigate(`/student/course?id=${course.id}`)}
              actionLabel="Continue"
              showProgress
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="No enrolled courses"
          description="You haven't enrolled in any courses yet. Visit Explore Courses to start learning!"
        />
      )}
    </div>
  );
}