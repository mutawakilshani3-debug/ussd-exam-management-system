import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LINKS = {
  admin: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/students', label: 'Students' },
    { to: '/admin/examiners', label: 'Examiners' },
    { to: '/admin/invigilators', label: 'Invigilators' },
    { to: '/admin/courses', label: 'Courses' },
    { to: '/admin/academic', label: 'Academic Strure' },
    { to: '/admin/timetable', label: 'Timetable' },
    { to: '/admin/bulk-upload', label: 'Bulk Upload' },
    { to: '/admin/reports', label: 'Reports' },
  ],
  examiner: [
    { to: '/examiner', label: 'Dashboard', end: true },
    { to: '/examiner/courses', label: 'My Courses' },
    { to: '/examiner/timetable', label: 'Exam Schedule' },
  ],
  invigilator: [
    { to: '/invigilator', label: 'Dashboard', end: true },
    { to: '/invigilator/assignments', label: 'My Assignments' },
  ],
  student: [
    { to: '/student', label: 'Dashboard', end: true },
    { to: '/student/timetable', label: 'Exam Timetable' },
  ],
};

export default function Sidebar({ open }) {
  const { user, logout } = useAuth();
  if (!user) return null;
  const links = LINKS[user.role] || [];

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand">MUTA</div>
      <span className="brand-sub">Exam Management System</span>
      <nav>
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end}>
            {link.label}
          </NavLink>
        ))}
        <NavLink to="/profile">Profile</NavLink>
        <NavLink to="/notifications">Notifications</NavLink>
        <button onClick={logout}>Log out</button>
      </nav>
    </aside>
  );
}
