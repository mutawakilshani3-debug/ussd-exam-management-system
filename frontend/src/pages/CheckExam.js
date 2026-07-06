import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function CheckExam() {
  const [courseCode, setCourseCode] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.get('/public/check', { params: { courseCode } });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <span className="eyebrow">MUTA · Exam Checker</span>
        <h1>Check your exam details</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: -8 }}>
          No account needed — just enter your course code.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Course code</label>
            <input
              className="form-control mono"
              placeholder="e.g. DIT202"
              required
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Checking...' : 'Check'}
          </button>
        </form>

        {error && <p className="form-error" style={{ marginTop: 16 }}>{error}</p>}

        {result && result.published === false && (
          <div className="card" style={{ marginTop: 20 }}>
            <p style={{ fontWeight: 600 }}>{result.data.course_name} ({result.data.course_code})</p>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>{result.message}</p>
          </div>
        )}

        {result && result.published && (
          <div className="docket" style={{ marginTop: 20 }}>
            <div>
              <div className="docket-code">
                {result.data.course_code} · {result.data.programme_name} · Level {result.data.level}
              </div>
              <div className="docket-title">{result.data.course_name}</div>
              <div className="docket-meta">
                {result.data.venue} · Examiner: {result.data.examiner_name || 'TBA'} · Invigilator: {result.data.invigilator_name || 'TBA'}
              </div>
            </div>
            <div className="docket-time">
              {result.data.exam_date} · {result.data.exam_day}
              <br />
              {result.data.start_time} - {result.data.end_time}
            </div>
          </div>
        )}

        <div className="auth-footer">
          <Link to="/timetable">View full exam timetable</Link> · <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
