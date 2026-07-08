import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LINKS = {
  admin: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/students', label: 'Students' },
    { to: '/admin/examiners', label: 'Examiners' },
    { to: '/admin/invigilators', label: 'Invigilators' },
    { to: '/admin/courses', label: 'Courses' },
    { to: '/admin/academic', label: 'Academic Structure' },
    { to: '/admin/timetable', label: 'Timetable' },
    { to: '/admin/timetable-documents', label: 'Timetable Documents' },
    { to: '/admin/general-timetable', label: 'General Timetable Manager' },
    { to: '/admin/bulk-upload', label: 'Bulk Upload' },
    { to: '/admin/reports', label: 'Reports' },
    { to: '/admin/settings', label: 'Site Settings' },
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

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    if (onClose) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (!user) return null;
  const links = LINKS[user.role] || [];

  const currentLink = links.find((l) =>
    l.end ? location.pathname === l.to : location.pathname.startsWith(l.to)
  );

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand">MUTA</div>
      <span className="brand-sub">Exam Management System</span>

      <div ref={ref} style={{ position: 'relative', marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            background: 'var(--gold-600)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 12px',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          {currentLink ? currentLink.label : 'Menu'}
          <span style={{ marginLeft: 8 }}>{menuOpen ? '▴' : '▾'}</span>
        </button>

        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              top: '110%',
              left: 0,
              right: 0,
              background: 'var(--navy-900)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
              zIndex: 20,
              overflow: 'hidden',
            }}
          >
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                style={{
                  display: 'block',
                  padding: '10px 14px',
                  color: 'var(--navy-100)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>

      <nav>
        <NavLink to="/profile">Profile</NavLink>
        <NavLink to="/notifications">Notifications</NavLink>
        <button onClick={logout}>Log out</button>
      </nav>
    </aside>
  );
}
