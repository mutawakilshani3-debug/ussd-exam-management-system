import { NavLink } from 'react-router-dom';

const CATEGORIES = [
  { to: '/timetable-documents/general', label: 'General Timetable' },
  { to: '/timetable-documents/morning', label: 'Morning Session' },
  { to: '/timetable-documents/afternoon', label: 'Afternoon Session' },
];

export default function TimetableNav() {
  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 20,
        padding: '14px 0',
        borderBottom: '1px solid var(--border, #e2e2e2)',
        marginBottom: 24,
        flexWrap: 'wrap',
      }}
    >
      {CATEGORIES.map((c) => (
        <NavLink
          key={c.to}
          to={c.to}
          style={({ isActive }) => ({
            fontSize: '0.9rem',
            fontWeight: 600,
            color: isActive ? 'var(--gold, #C99A3E)' : 'var(--ink, #0B2545)',
            textDecoration: 'none',
          })}
        >
          {c.label}
        </NavLink>
      ))}
    </nav>
  );
}
