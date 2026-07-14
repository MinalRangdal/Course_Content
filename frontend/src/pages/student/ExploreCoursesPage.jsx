import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Compass } from "lucide-react";
import CourseCard from "../../components/CourseCard";
import EmptyState from "../../components/EmptyState";
import { SkeletonCard } from "../../components/LoadingSkeleton";
import { getExploreCourses, enrollInCourse } from "../../services/api";

export default function ExploreCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    const data = await getExploreCourses();
    setCourses(data);
    setLoading(false);
  }

  async function handleEnroll(course) {
    if (course.enrolled) {
      navigate(`/student/course?id=${course.id}`);
      return;
    }
    await enrollInCourse(course.id);
    navigate("/student/my-courses");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Explore Courses</h1>
        <p className="mt-1 text-ink/50">Discover new topics and start learning today.</p>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : courses.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onClick={() => handleEnroll(course)}
              actionLabel={course.enrolled ? "Continue Learning" : "Enroll Now"}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Compass}
          title="No courses available"
          description="There are currently no published courses. Check back later!"
        />
      )}
    </div>
  );
}
