import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { ToastProvider } from "./components/Toast";
import ProtectedRoute from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";

import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import GenerateCourse from "./pages/admin/Generate";
import ReviewCourses from "./pages/admin/Review";
import PublishedCourses from "./pages/admin/Published";
import AdminChatbotPage from "./pages/admin/ChatbotPage";
import StudentsPage from "./pages/admin/StudentsPage";
import AnalyticsPage from "./pages/admin/AnalyticsPage";
import AdminCodeVisualizer from "./pages/admin/CodeVisualizer";

import StudentLayout from "./layouts/StudentLayout";
import StudentDashboard from "./pages/student/Dashboard";
import StudentCourse from "./pages/student/Course";
import ExploreCoursesPage from "./pages/student/ExploreCoursesPage";
import MyCoursesPage from "./pages/student/MyCoursesPage";
import FriendsPage from "./pages/student/FriendsPage";
import MessagesPage from "./pages/student/MessagesPage";
import Leaderboard from "./pages/student/Leaderboard";
import Profile from "./pages/student/Profile";
import SettingsPage from "./pages/student/SettingsPage";
import HelpSupportPage from "./pages/student/HelpSupportPage";
import CertificatesPage from "./pages/student/CertificatesPage";
import StudentCodeVisualizer from "./pages/student/CodeVisualizer";

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="my-courses" element={<MyCoursesPage />} />
            <Route path="generate" element={<GenerateCourse />} />
            <Route path="review" element={<ReviewCourses />} />
            <Route path="review/:id" element={<ReviewCourses />} />
            <Route path="published" element={<PublishedCourses />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="chatbot" element={<AdminChatbotPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="visualizer" element={<AdminCodeVisualizer />} />
          </Route>

          <Route
            path="/student"
            element={
              <ProtectedRoute role="student">
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="my-courses" element={<MyCoursesPage />} />
            <Route path="explore" element={<ExploreCoursesPage />} />
            <Route path="friends" element={<FriendsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="course" element={<StudentCourse />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="certificates" element={<CertificatesPage />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="help" element={<HelpSupportPage />} />
            <Route path="visualizer" element={<StudentCodeVisualizer />} />
          </Route>
        </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}