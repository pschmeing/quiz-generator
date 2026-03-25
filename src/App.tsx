import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import StudentHome from './pages/StudentHome'
import JoinQuiz from './pages/JoinQuiz'
import Login from './pages/Login'
import TeacherLayout from './pages/teacher/TeacherLayout'
import TeacherTests from './pages/teacher/TeacherTests'
import QuizCreate from './pages/teacher/QuizCreate'
import QuizDetail from './pages/teacher/QuizDetail'
import QuizEdit from './pages/teacher/QuizEdit'
import AdminPage from './pages/admin/AdminPage'
import QuizTake from './pages/QuizTake'
import QuizResults from './pages/QuizResults'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public routes */}
        <Route index element={<StudentHome />} />
        <Route path="join/:code" element={<JoinQuiz />} />
        <Route path="login" element={<Login />} />
        <Route path="quiz/:id/take" element={<QuizTake />} />
        <Route path="quiz/:id/results" element={<QuizResults />} />

        {/* Teacher routes */}
        <Route path="teacher" element={
          <ProtectedRoute requireTeacher requireApproved>
            <TeacherLayout />
          </ProtectedRoute>
        }>
          <Route index element={<TeacherTests />} />
          <Route path="new" element={<QuizCreate />} />
          <Route path="quiz/:id" element={<QuizDetail />} />
          <Route path="quiz/:id/edit" element={<QuizEdit />} />
        </Route>

        {/* Admin routes */}
        <Route path="admin" element={
          <ProtectedRoute requireAdmin>
            <AdminPage />
          </ProtectedRoute>
        }>
        </Route>
      </Route>
    </Routes>
  )
}
