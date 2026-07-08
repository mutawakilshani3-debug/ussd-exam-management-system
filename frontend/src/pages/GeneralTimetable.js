import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import TimetableNav from '../components/TimetableNav';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function GeneralTimetable() {
  const [courseInput, setCourseInput] = useState('');
  const [rows, setRows] = useState(null);
  const [notFound, setNotFound] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!courseInput.trim()) {
      setError('Please enter at least one course code.');
      return;
    }
    setLoading(true);
    setError('');
    setRows(null);
    try {
      const res = await api.get('/general-timetable/public/search', {
        params: { courses: courseInput },
      });
      setRows(res.data.data);
      setNotFound(res.data.notFound || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Group rows by day, preserving Monday -> Sunday order
  const grouped = {};
  if (rows) {
    rows.forEach((r) => {
      if (!grouped[r.day]) grouped[r.day] = [];
      grouped[r.day].push(r);
    });
  }
  const orderedDays = DAY_ORDER.filter((d) => grouped[d]);

  return (
    <div className="auth-page">
      <TimetableNav />
      <div className="auth-card" style={{ maxWidth: 760 }}>
        <span className="eyebrow">MUTA · My Timetable</span>
        <h1>Build your personal timetable</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: -8 }}>
          Enter your course codes separated by commas (e.g. DIT202, DMG202, DIT206) to see your weekly schedule.
        </p>

        <form onSubmit={handleSearch} style={{ marginTop: 16 }}>
          <div className="form-group">
            <label>Course codes</label>
            <textarea
              className="form-control mono"
              rows={3}
              placeholder="DIT202, DMG202, DIT206, DCS212"
              value={courseInput}
              onChange={(e) => setCourseInput(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Searching...' : 'Build my timetable'}
          </button>
        </form>

        {error && <p className="form-error" style={{ marginTop: 16 }}>{error}</p>}

        {notFound.length > 0 && (
          <div className="card" style={{ marginTop: 20, background: '#fff8e6' }}>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>
              No entries found for: <strong>{notFound.join(', ')}</strong>. Double-check the course code spelling.
            </p>
          </div>
        )}

        {rows && rows.length === 0 && notFound.length === 0 && (
          <p style={{ color: 'var(--ink-soft)', marginTop: 20 }}>No matching timetable entries found.</p>
        )}

        {orderedDays.map((day) => (
          <div key={day} style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 8 }}>{day}</h3>
            {grouped[day].map((r, idx) => (
              <div className="docket" key={idx} style={{ marginBottom: 10 }}>
                <div>
                  <div className="docket-code">{r.course_code}</div>
                  {r.lecturer && <div className="docket-meta">{r.lecturer}</div>}
                </div>
                <div className="docket-time">
                  {r.start_time} - {r.end_time}
                  <br />
                  {r.venue}
                </div>
              </div>
            ))}
          </div>
        ))}

        <div className="auth-footer" style={{ marginTop: 24 }}>
          <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
