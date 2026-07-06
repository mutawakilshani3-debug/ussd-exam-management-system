import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import TimetableNav from '../components/TimetableNav';

const LABELS = {
  general: 'General Timetable',
  morning: 'Morning Session',
  afternoon: 'Afternoon Session',
};

export default function TimetableDocumentView() {
  const { category } = useParams();
  const [courseCode, setCourseCode] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [docInfo, setDocInfo] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setSearchResult(null);
    setSearchError('');
    setCourseCode('');
    setChecking(true);
    api
      .get('/public/timetable-documents')
      .then((res) => {
        const found = res.data.data.find((d) => d.category === category);
        setDocInfo(found || null);
      })
      .finally(() => setChecking(false));
  }, [category]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!courseCode.trim()) return setSearchError('Please enter a course code.');
    setSearching(true);
    setSearchError('');
    setSearchResult(null);
    try {
      const res = await api.get(`/public/timetable-documents/${category}/search`, {
        params: { courseCode },
      });
      setSearchResult(res.data);
    } catch (err) {
      setSearchError(err.response?.data?.message || 'Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const downloadUrl = `${api.defaults.baseURL}/public/timetable-documents/${category}/download`;

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 760 }}>
        <TimetableNav />

        <span className="eyebrow">MUTA · {LABELS[category] || 'Timetable'}</span>
        <h1>{LABELS[category] || 'Timetable'}</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: -8 }}>
          No account needed — search by course code or view the full document.
        </p>

        {checking && <p>Checking for uploaded document...</p>}

        {!checking && !docInfo && (
          <div className="card" style={{ marginTop: 20 }}>
            <p style={{ color: 'var(--ink-soft)' }}>
              No document has been uploaded for this category yet. Please check back later.
            </p>
          </div>
        )}

        {!checking && docInfo && (
          <>
            <form onSubmit={handleSearch} style={{ marginTop: 16 }}>
              <div className="form-group">
                <label>Course code</label>
                <input
                  className="form-control mono"
                  placeholder="e.g. DIT202"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={searching}>
                {searching ? 'Searching...' : 'Search'}
              </button>
            </form>

            {searchError && <p className="form-error" style={{ marginTop: 16 }}>{searchError}</p>}

            {searchResult && searchResult.found === false && (
              <div className="card" style={{ marginTop: 20 }}>
                <p style={{ color: 'var(--ink-soft)' }}>{searchResult.message}</p>
              </div>
            )}

            {searchResult && searchResult.found && (
              <div className="card" style={{ marginTop: 20 }}>
                <p style={{ fontWeight: 600, marginBottom: 8 }}>
                  Found {searchResult.matches.length} matching line(s):
                </p>
                {searchResult.matches.map((line, i) => (
                  <p key={i} className="mono" style={{ fontSize: '0.8rem', wordBreak: 'break-word', marginBottom: 6 }}>
                    {line}
                  </p>
                ))}
              </div>
            )}

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                View / Download full PDF
              </a>
              <p style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginTop: 8 }}>
                {docInfo.file_name} · Uploaded {new Date(docInfo.uploaded_at).toLocaleDateString()}
              </p>
            </div>
          </>
        )}

        <div className="auth-footer" style={{ marginTop: 24 }}>
          <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
