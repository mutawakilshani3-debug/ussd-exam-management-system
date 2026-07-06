import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  { to: '/timetable', label: 'General Timetable' },
  { to: '/timetable-documents/morning', label: 'Morning Session' },
  { to: '/timetable-documents/afternoon', label: 'Afternoon Session' },
];

export default function TimetableNav() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (to) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn btn-outline btn-sm"
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
      >
        Timetable ▾
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '110%',
            right: 0,
            background: '#fff',
            border: '1px solid var(--border, #e2e2e2)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: 200,
            overflow: 'hidden',
          }}
        >
          {CATEGORIES.map((c) => (
            <button
              key={c.to}
              type="button"
              onClick={() => handleSelect(c.to)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 14px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '0.85rem',
                color: 'var(--ink, #0B2545)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
