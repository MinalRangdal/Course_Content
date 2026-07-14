# Subhanu AI Academy — Frontend

A premium, gamified frontend for an AI-powered learning platform, built with React, Vite, Tailwind CSS, React Router, and Framer Motion.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL. Use the register page to create a student account or an admin account. Admin registration requires the shared access code. Role-based login and protected routes are enforced in the app.

## Folder structure

```
src/
  components/   Reusable UI: Button, Input, Modal, ProgressBar, CourseCard,
                XPCard, BadgeCard, LeaderboardCard, Navbar, Sidebar, Chatbot,
                PathNode, SharedCards (RoleCard, StatCard), ProtectedRoute
  layouts/      AdminLayout (sidebar + chatbot), StudentLayout (navbar + mobile tabs)
  pages/        Landing, Login, Register, admin/*, student/*
  data/         Dummy JSON-shaped data (courses.js, students.js)
  hooks/        useAuth.jsx — role-based auth context (localStorage-backed)
  services/     api.js — every API call the UI needs, dummy for now
```

## Connecting the real backend

Open `src/services/api.js`. Each exported function currently resolves with
data imported from `src/data/`, after an artificial delay. Replace the body
of a function with a real `fetch`/`axios` call to the endpoint noted in its
`// TODO` comment — no component code needs to change, since components only
ever import from this file.

## Routes

```
/               Landing
/login          Login
/register       Register (role selection)

/admin/dashboard
/admin/generate
/admin/review
/admin/review/:id
/admin/published
/admin/chatbot

/student/dashboard
/student/course
/student/leaderboard
/student/profile
```

Admin and student routes are role-protected via `ProtectedRoute` and the
`useAuth` hook.
