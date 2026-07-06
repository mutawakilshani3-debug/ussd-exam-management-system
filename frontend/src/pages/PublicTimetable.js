import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function PublicTimetable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [level, setLevel] = useState('');
  const [semester, setSemester] = useState('');

  const fetchTimetable = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (level) params.level = level;
      if (semester) params.semester = semester;
      const res = await api.get('/public/timetable', { params });
      setRows(res.data.data);
    } catch (err) {
      setError('Failed to load the timetable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 720 }}>
        <span className="eyebrow">MUTA · Exam Timetable</span>
        <h1>Published exam timetable</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: -8 }}>
          No account needed — browse all published exams.
        </p>

        <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
          <input
            className="form-control mono"
            placeholder="Level (e.g. 200)"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          />
          <input
            className="form-control mono"
            placeholder="Semester (e.g. 1)"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          />
          <button className="btn btn-primary" onClick={fetchTimetable} disabled={loading}>
            {loading ? '...' : 'Filter'}
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}

        {!loading && !error && rows.length === 0 && (
          <p style={{ color: 'var(--ink-soft)' }}>No published exams found.</p>
        )}

        {!loading && rows.map((row, idx) => (
          <div className="docket" key={idx} style={{ marginBottom: 12 }}>
            <div>
              <div className="docket-code">
                {row.course_code} · {row.programme_name} · Level {row.level}
              </div>
              <div className="docket-title">{row.course_name}</div>
              <div className="docket-meta">{row.venue}</div>
            </div>
            <div className="docket-time">
              {row.exam_date} · {row.exam_day}
              <br />
              {row.start_time} - {row.end_time}
            </div>
          </div>
        ))}

        <div className="auth-footer">
          <Link to="/check">Check a single course</Link> · <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
