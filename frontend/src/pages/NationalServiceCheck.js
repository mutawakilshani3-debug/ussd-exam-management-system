import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function NationalServiceCheck() {
  const [indexNo, setIndexNo] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!indexNo.trim()) {
      setError('Please enter your index number.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.get('/national-service/public/search', {
        params: { indexNo },
      });
      setResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <span className="eyebrow">MUTA · National Service</span>
        <h1>Check your National Service details</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: -8 }}>
          Enter your index number to see your National Service posting record.
        </p>

        <form onSubmit={handleSearch} style={{ marginTop: 16 }}>
          <div className="form-group">
            <label>Index number</label>
            <input
              className="form-control mono"
              placeholder="e.g. 20240212023"
              value={indexNo}
              onChange={(e) => setIndexNo(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Searching...' : 'Check my details'}
          </button>
        </form>

        {error && <p className="form-error" style={{ marginTop: 16 }}>{error}</p>}

        {result && (
          <div className="card" style={{ marginTop: 20 }}>
            <div className="docket-code">{result.index_no}</div>
            <div className="docket-title" style={{ fontSize: '1.1rem', marginTop: 4 }}>
              {result.surname} {result.other_names}
            </div>
            <div style={{ marginTop: 12, fontSize: '0.9rem' }}>
              <div><strong>Course of Study:</strong> {result.course_of_study}</div>
              <div><strong>Qualification:</strong> {result.qualification}</div>
              <div><strong>Service Year:</strong> {result.service_year}</div>
            </div>
          </div>
        )}

        <div className="auth-footer" style={{ marginTop: 24 }}>
          <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
