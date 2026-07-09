import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../api/axios';

export default function NationalServiceManager() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [replaceAll, setReplaceAll] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [debugText, setDebugText] = useState('');
  const [debugging, setDebugging] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get('/national-service')
      .then((res) => setRows(res.data.data))
      .catch(() => toast.error('Failed to load national service records.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please choose a CSV, Excel, or PDF file first.');
      return;
    }

    const data = new FormData();
    data.append('file', file);

    setUploading(true);
    try {
      const res = await api.post(
        `/national-service/upload?replaceAll=${replaceAll}`,
        data,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      toast.success(res.data.message);
      setFile(null);
      setReplaceAll(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed. Please check the file format.');
    } finally {
      setUploading(false);
    }
  };

  const handleDebugParse = async () => {
    if (!file) {
      toast.error('Please choose the PDF file first, then tap this button.');
      return;
    }
    const data = new FormData();
    data.append('file', file);

    setDebugging(true);
    setDebugText('');
    try {
      const res = await api.post('/national-service/debug-parse', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDebugText(res.data.textSample);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Debug parse failed.');
    } finally {
      setDebugging(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('This will delete ALL national service records. Are you sure?')) return;
    try {
      await api.delete('/national-service');
      toast.success('All records cleared.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear records.');
    }
  };

  return (
    <DashboardLayout title="National Service Records Manager">
      <div className="card" style={{ marginBottom: 20, maxWidth: 600 }}>
        <h3>Import class list</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
          Upload a CSV, Excel (.xlsx/.xls), or PDF file. CSV/Excel should have columns:
          <code style={{ display: 'block', marginTop: 4 }}>index_no, surname, other_names, date_of_birth, course_of_study, qualification</code>
        </p>
        <form onSubmit={handleUpload}>
          <div className="form-group">
            <label>Class list file</label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.pdf"
              onChange={(e) => setFile(e.target.files[0])}
              disabled={uploading}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <input
              type="checkbox"
              id="replaceAll"
              checked={replaceAll}
              onChange={(e) => setReplaceAll(e.target.checked)}
              disabled={uploading}
            />
            <label htmlFor="replaceAll" style={{ marginBottom: 0, fontSize: '0.85rem' }}>
              Replace all existing records with this file (use this for a fresh service year)
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload & Import'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleDebugParse}
              disabled={debugging}
            >
              {debugging ? 'Checking...' : 'Debug: Show Raw PDF Text'}
            </button>
          </div>
        </form>

        {debugText && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>Raw extracted text (first 3000 chars) — copy this to share:</p>
            <textarea
              readOnly
              value={debugText}
              rows={12}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.7rem' }}
              onFocus={(e) => e.target.select()}
            />
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Current records ({rows.length})</h3>
          {rows.length > 0 && (
            <button className="btn btn-outline btn-sm" onClick={handleClearAll}>
              Clear all
            </button>
          )}
        </div>

        {loading && <p>Loading...</p>}
        {!loading && rows.length === 0 && (
          <p style={{ color: 'var(--ink-soft)' }}>No records yet. Upload a file above to get started.</p>
        )}

        {!loading && rows.length > 0 && (
          <div className="table-wrap" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Index No.</th>
                  <th>Surname</th>
                  <th>Date of Birth</th>
                  <th>Course of Study</th>
                  <th>Qualification</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.index_no}</td>
                    <td>{r.surname}</td>
                    <td>{r.date_of_birth}</td>
                    <td>{r.course_of_study}</td>
                    <td>{r.qualification}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
