import { useEffect, useState } from "react";
import { Users, Search, MoreVertical } from "lucide-react";
import Input from "../../components/Input";
import { SkeletonRow } from "../../components/LoadingSkeleton";
import { getStudentDirectory } from "../../services/api";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getStudentDirectory().then((res) => {
      setStudents(res);
      setLoading(false);
    });
  }, []);

  const filtered = students.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="mt-1 text-ink/50">Manage all users enrolled in the academy.</p>
        </div>
        <div className="w-full max-w-xs">
          <Input icon={Search} placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rounded-xl3 bg-surface shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-canvas/50 text-ink/50 font-semibold">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Level</th>
                <th className="px-6 py-4">Total XP</th>
                <th className="px-6 py-4">Streak</th>
                <th className="px-6 py-4">Enrolled courses</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan="7" className="p-4"><SkeletonRow /></td>
                  </tr>
                ))
              ) : filtered.length > 0 ? (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-canvas/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas text-lg">
                          {s.avatar}
                        </div>
                        <div>
                          <p className="font-bold text-ink">{s.name}</p>
                          <p className="text-xs text-ink/50">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-primary">Level {s.level}</td>
                    <td className="px-6 py-4 font-medium">{s.xp.toLocaleString()}</td>
                    <td className="px-6 py-4 font-medium text-orange-500">{s.streak} 🔥</td>
                    <td className="px-6 py-4"><p className="font-semibold">{s.enrolledCourses || 0}</p><p className="max-w-48 truncate text-xs text-ink/50" title={(s.enrolledCourseNames || []).join(", ")}>{(s.enrolledCourseNames || []).join(", ") || "No courses yet"}</p></td>
                    <td className="px-6 py-4 text-ink/60">{s.joinDate ? new Date(s.joinDate).toLocaleDateString() : "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-ink/40 hover:text-ink"><MoreVertical size={18} /></button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-ink/50">
                    No students found matching "{search}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}