import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import CheckExam from './pages/CheckExam';
import PublicTimetable from './pages/PublicTimetable';
import TimetableDocumentView from './pages/TimetableDocumentView';
import GeneralTimetable from './pages/GeneralTimetable';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';

import AdminDashboard from './pages/admin/AdminDashboard';
import Students from './pages/admin/Students';
import Examiners from './pages/admin/Examiners';
import Invigilators from './pages/admin/Invigilators';
import Courses from './pages/admin/Courses';
import AcademicStructure from './pages/admin/AcademicStrure';
import AdminTimetable from './pages/admin/Timetable';
import TimetableDocuments from './pages/admin/TimetableDocuments';
import BulkUpload from './pages/admin/BulkUpload';
import Reports from './pages/admin/Reports';
import SiteSettings from './pages/admin/SiteSettings';
import GeneralTimetableManager from './pages/admin/GeneralTimetableManager';

import ExaminerDashboard from './pages/examiner/ExaminerDashboard';
import MyCourses from './pages/examiner/MyCourses';
import ExamSchedule from './pages/examiner/ExamSchedule';

import InvigilatorDashboard from './pages/invigilator/InvigilatorDashboard';
import Assignments from './pages/invigilator/Assignments';

import StudentDashboard from './pages/student/StudentDashboard';
import MyTimetable from './pages/student/MyTimetable';

const ROLE_HOME = { admin: '/admin', examiner: '/examiner', invigilator: '/invigilator', student: '/student' };

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastContainer position="top-right" autoClose={3500} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/check" element={<CheckExam />} />
          <Route path="/timetable" element={<PublicTimetable />} />
          <Route path="/timetable-documents/:category" element={<TimetableDocumentView />} />
          <Route path="/general-timetable" element={<GeneralTimetable />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute roles={['admin']}><Students /></ProtectedRoute>} />
          <Route path="/admin/examiners" element={<ProtectedRoute roles={['admin']}><Examiners /></ProtectedRoute>} />
          <Route path="/admin/invigilators" element={<ProtectedRoute roles={['admin']}><Invigilators /></ProtectedRoute>} />
          <Route path="/admin/courses" element={<ProtectedRoute roles={['admin']}><Courses /></ProtectedRoute>} />
          <Route path="/admin/academic" element={<ProtectedRoute roles={['admin']}><AcademicStructure /></ProtectedRoute>} />
          <Route path="/admin/timetable" element={<ProtectedRoute roles={['admin']}><AdminTimetable /></ProtectedRoute>} />
          <Route path="/admin/timetable-documents" element={<ProtectedRoute roles={['admin']}><TimetableDocuments /></ProtectedRoute>} />
          <Route path="/admin/bulk-upload" element={<ProtectedRoute roles={['admin']}><BulkUpload /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute roles={['admin']}><Reports /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute roles={['admin']}><SiteSettings /></ProtectedRoute>} />
          <Route path="/admin/general-timetable" element={<ProtectedRoute roles={['admin']}><GeneralTimetableManager /></ProtectedRoute>} />

          {/* Examiner */}
          <Route path="/examiner" element={<ProtectedRoute roles={['examiner']}><ExaminerDashboard /></ProtectedRoute>} />
          <Route path="/examiner/courses" element={<ProtectedRoute roles={['examiner']}><MyCourses /></ProtectedRoute>} />
          <Route path="/examiner/timetable" element={<ProtectedRoute roles={['examiner']}><ExamSchedule /></ProtectedRoute>} />

          {/* Invigilator */}
          <Route path="/invigilator" element={<ProtectedRoute roles={['invigilator']}><InvigilatorDashboard /></ProtectedRoute>} />
          <Route path="/invigilator/assignments" element={<ProtectedRoute roles={['invigilator']}><Assignments /></ProtectedRoute>} />

          {/* Student */}
          <Route path="/student" element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/timetable" element={<ProtectedRoute roles={['student']}><MyTimetable /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
