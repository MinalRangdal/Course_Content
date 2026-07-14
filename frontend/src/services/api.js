const BASE_URL = "http://127.0.0.1:5000/api";

const STORAGE = {
  // AuthProvider owns this key. Keeping the API client aligned with it makes
  // course generation continue to work after a browser refresh.
  CURRENT_USER: "learnly_user",
};

export function getCurrentUser() {
  if (typeof window === "undefined") return null;
  try {
    // Accept the previous key once so existing signed-in users do not need to
    // sign in again after this update.
    const val = localStorage.getItem(STORAGE.CURRENT_USER) || localStorage.getItem("learnly_current_user");
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

function setDb(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Helper for fetch
async function fetchApi(endpoint, { timeoutMs = 45000, ...options } = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      signal: options.signal || controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The curriculum could not finish within 8 minutes. Please try again or check the backend console for the Gemini error.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

// --- Auth ---
export async function login(email, password) {
  const data = await fetchApi("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  setDb(STORAGE.CURRENT_USER, data.user);
  return data;
}

export async function register(payload) {
  const data = await fetchApi("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  setDb(STORAGE.CURRENT_USER, data.user);
  return data;
}

export function signOut() {
  localStorage.removeItem(STORAGE.CURRENT_USER);
}

export async function updateProfile(updates) {
  // Mock profile update for now, or implement backend route
  const currentUser = getCurrentUser();
  if (!currentUser) throw new Error("Not logged in");
  const updated = { ...currentUser, ...updates };
  setDb(STORAGE.CURRENT_USER, updated);
  return updated;
}

// --- Admin / Courses ---
export async function getAdminStats() {
  const data = await fetchApi("/admin/stats");
  const currentUser = getCurrentUser();
  return {
    ...data,
    adminName: currentUser?.name || "Admin",
    courseCompletionPercentage: 0,
  };
}

export async function getAdminAnalytics() {
  const [data, students, courses] = await Promise.all([fetchApi("/admin/stats"), getStudentDirectory(), getAllCourses()]);
  return {
    ...data,
    students,
    courses: courses.filter((course) => course.status === "published"),
  };
}

export async function getAllCourses() {
  const currentUser = getCurrentUser();
  return await fetchApi(`/courses${currentUser ? `?user_uid=${currentUser.id}` : ''}`);
}

export async function generateCourse(topic, difficulty, curriculumProfile = null) {
  const currentUser = getCurrentUser();
  if (!currentUser?.id) throw new Error("Your session has expired. Please sign in again before generating a course.");
  const data = await fetchApi("/generate", {
    method: "POST",
    // The CBSE Class IX profile creates three detailed, source-aligned units.
    // On free-tier Gemini this can take longer than the generic one-lesson
    // generation, so do not cancel a valid server-side generation at 2 min.
    timeoutMs: 8 * 60 * 1000,
    body: JSON.stringify({
      admin_uid: currentUser.id,
      topic,
      difficulty,
      curriculum_profile: curriculumProfile,
    })
  });
  data.id = data.course_id;
  return data;
}

export async function getCourseDetail(courseId) {
  const currentUser = getCurrentUser();
  return await fetchApi(`/courses/${courseId}${currentUser ? `?user_uid=${currentUser.id}` : ''}`);
}

export async function deleteCourse(courseId) {
  const currentUser = getCurrentUser();
  if (!currentUser?.id) throw new Error("Your session has expired. Please sign in again.");
  return await fetchApi(`/courses/${courseId}`, {
    method: "DELETE",
    body: JSON.stringify({ admin_uid: currentUser.id }),
  });
}

// Kept for existing draft-review callers.
export const deleteDraftCourse = deleteCourse;

export async function refineCourseCurriculum(currentDraft, instruction) {
  const currentUser = getCurrentUser();
  if (!currentUser?.id) throw new Error("Your session has expired. Please sign in again.");
  return await fetchApi("/refine", {
    method: "POST",
    // Refinement sends the current curriculum as context, so it gets the same
    // bounded AI-request window as course generation.
    timeoutMs: 2 * 60 * 1000,
    body: JSON.stringify({
      admin_uid: currentUser.id,
      current_draft: { ...currentDraft, course_id: currentDraft.course_id || currentDraft.id },
      admin_feedback: instruction,
    }),
  });
}

export async function reviewCourseAction(courseId, action, courseData = null) {
  const currentUser = getCurrentUser();
  if (!currentUser?.id) throw new Error("Your session has expired. Please sign in again.");
  if (action === "approve") {
    // Need to get course details first to publish
    const course = courseData || await getCourseDetail(courseId);
    return await fetchApi("/publish", {
      method: "POST",
      body: JSON.stringify({
        admin_uid: currentUser.id,
        course_data: { ...course, course_id: course.course_id || course.id }
      })
    });
  }
  return { success: true };
}

export async function getStudentDirectory() {
  return await fetchApi("/admin/students");
}

// --- Student Courses & Dashboard ---
export async function getExploreCourses() {
  const courses = await getAllCourses();
  return courses.filter(c => c.status === "published");
}

export async function getMyCourses() {
  const courses = await getAllCourses();
  return courses.filter(c => c.status === "published" && c.enrolled);
}

export async function enrollInCourse(courseId) {
  const currentUser = getCurrentUser();
  if (!currentUser) throw new Error("Must be logged in.");
  return await fetchApi("/enroll", {
    method: "POST",
    body: JSON.stringify({
      user_uid: currentUser.id,
      course_id: courseId
    })
  });
}

export async function getStudentDashboard() {
  const currentUser = getCurrentUser();
  const myCourses = await getMyCourses();
  const explore = await getExploreCourses();
  const recommended = explore.filter(c => !c.enrolled).slice(0, 3);
  
  return {
    student: currentUser,
    activeCourses: myCourses,
    recommendedCourses: recommended,
    path: [
      { id: "1", title: "Introduction", status: "completed", xp: 50, icon: "🎯" },
      { id: "2", title: "Core Concepts", status: "active", xp: 100, icon: "🧠" },
      { id: "3", title: "Advanced Methods", status: "locked", xp: 150, icon: "⚡" },
    ]
  };
}

export async function getStudentProfile() {
  return getCurrentUser();
}

export async function submitQuiz(courseId, xpEarned) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const result = await fetchApi("/progress", {
    method: "POST",
    body: JSON.stringify({
      user_uid: currentUser.id,
      course_id: courseId,
      xp_earned: xpEarned
    })
  });
  
  if (result.user) setDb(STORAGE.CURRENT_USER, result.user);
  return result;
}

// --- Code step visualizer (used by both admin and student dashboards) ---
export async function visualizeCode(code) {
  return await fetchApi("/visualize-code", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

// --- Leaderboard & Badges ---
export async function getLeaderboard() {
  // Mock leaderboard for now
  const users = await getStudentDirectory();
  const currentUser = getCurrentUser();
  return users
    .sort((a, b) => b.xp - a.xp)
    .map((u, i) => ({ ...u, rank: i + 1, isCurrentUser: u.id === currentUser?.id }));
}

export async function getBadges() {
  const currentUser = getCurrentUser();
  const xp = currentUser?.xp || 0;
  return [
    { id: 1, name: "First Steps", description: "Start your journey", icon: "🌱", earned: xp >= 0 },
    { id: 2, name: "Fast Learner", description: "Earn 100 XP", icon: "🚀", earned: xp >= 100 },
    { id: 3, name: "Dedicated", description: "Earn 500 XP", icon: "🔥", earned: xp >= 500, goal: "500 XP" },
    { id: 4, name: "Scholar", description: "Reach Level 5", icon: "🎓", earned: currentUser?.level >= 5, goal: "Level 5" },
  ];
}

// --- Social (Friends & Messaging) ---
// Keep social mock methods since backend doesn't have them yet, to avoid breaking frontend pages
export async function getFriends() { return { friends: [], suggestions: [], requests: [] }; }
export async function sendFriendRequest(userId) { return { success: true }; }
export async function acceptFriendRequest(senderId) {}
export async function rejectFriendRequest(senderId) {}
export async function getConversations() { return []; }
export async function getMessages(friendId) { return []; }
export async function sendMessage(friendId, payload) {}
export async function getNotifications() { return []; }
export async function markNotificationsRead() {}

// --- AI Tutor ---
export async function sendAdminChatMessage(message) {
  // The actual implementation should probably be passing draft state, but let's mock it for now since the frontend page might be generic
  return { reply: "I've noted that requirement. Is there anything else you need?" };
}

export async function askTutor(lesson_text, student_question) {
  return await fetchApi("/ask-tutor", {
    method: "POST",
    body: JSON.stringify({ lesson_text, student_question })
  });
}

export async function getLearningPath() {
  const currentUser = getCurrentUser();
  if (!currentUser?.id) throw new Error("Your session has expired. Please sign in again.");
  const data = await fetchApi(`/learning-path?user_uid=${encodeURIComponent(currentUser.id)}`);
  return data.path;
}
