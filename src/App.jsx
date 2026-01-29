import { Navigate, Route, Routes } from 'react-router-dom'
import { roles } from './constants/roles'
import AdminPanelLayout from './components/layouts/AdminPanelLayout'
import CoachPanelLayout from './components/layouts/CoachPanelLayout'
import StudentPanelLayout from './components/layouts/StudentPanelLayout'
import ProtectedRoute from './components/common/ProtectedRoute'
import Login from './pages/auth/Login'
import AdminDashboard from './pages/admin/Dashboard'
import AdminPrograms from './pages/admin/Programs'
import AdminUsers from './pages/admin/Users'
import AdminApplications from './pages/admin/Applications'
import Placeholder from './pages/admin/Placeholder'
import AdminProjects from './pages/admin/Projects'
import AdminMatching from './pages/admin/Matching'
import CoachDashboard from './pages/coach/Dashboard'
import CoachProjects from './pages/coach/Projects'
import CoachPrograms from './pages/coach/Programs'
import CoachSessions from './pages/coach/Sessions'
import CoachDeliverables from './pages/coach/Deliverables'
import CoachStudents from './pages/coach/Students'
import CoachMessages from './pages/coach/Messages'
import CoachTasks from './pages/coach/Tasks'
import StudentDashboard from './pages/student/Dashboard'
import StudentProjects from './pages/student/Projects'
import StudentPrograms from './pages/student/Programs'
import StudentApplications from './pages/student/Applications'
import StudentDeliverables from './pages/student/Deliverables'
import StudentTasks from './pages/student/Tasks'
import StudentSessions from './pages/student/Sessions'
import StudentAnalytics from './pages/student/Analytics'
import Messages from './components/common/Messages'
import Profile from './components/common/Profile'
import Unauthorized from './pages/Unauthorized'
import NotFound from './pages/NotFound'
import { useAuth } from './hooks/useAuth'

function RootRedirect() {
  const { isAuthenticated, role } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (role === roles.admin) return <Navigate to="/admin" replace />
  if (role === roles.coach) return <Navigate to="/coach" replace />
  return <Navigate to="/student" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={[roles.admin]}>
            <AdminPanelLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="projects" element={<AdminProjects />} />
        <Route path="programs" element={<AdminPrograms />} />
        <Route path="applications" element={<AdminApplications />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="matching" element={<AdminMatching />} />
        <Route
          path="sessions"
          element={<Placeholder title="Sessions overview" message="Coming next." />}
        />
        <Route
          path="reports"
          element={<Placeholder title="Reports" message="System analytics coming soon." />}
        />
        <Route
          path="communications"
          element={<Placeholder title="Communications" message="Platform messaging center." />}
        />
        <Route
          path="settings"
          element={<Placeholder title="Settings" message="Platform configuration." />}
        />
      </Route>

      <Route
        path="/coach"
        element={
          <ProtectedRoute allowedRoles={[roles.coach]}>
            <CoachPanelLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CoachDashboard />} />
        <Route path="projects" element={<CoachProjects />} />
        <Route path="tasks" element={<CoachTasks />} />
        <Route path="students" element={<CoachStudents />} />
        <Route path="programs" element={<CoachPrograms />} />
        <Route path="sessions" element={<CoachSessions />} />
        <Route path="deliverables" element={<CoachDeliverables />} />
        <Route path="messages" element={<CoachMessages />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={[roles.student]}>
            <StudentPanelLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="projects" element={<StudentProjects />} />
        <Route path="tasks" element={<StudentTasks />} />
        <Route path="programs" element={<StudentPrograms />} />
        <Route path="analytics" element={<StudentAnalytics />} />
        <Route path="applications" element={<StudentApplications />} />
        <Route path="deliverables" element={<StudentDeliverables />} />
        <Route path="sessions" element={<StudentSessions />} />
        <Route path="messages" element={<Messages />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

