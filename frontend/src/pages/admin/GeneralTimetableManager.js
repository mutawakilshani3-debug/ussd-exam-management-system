import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../api/axios';

export default function GeneralTimetableManager() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [replaceAll, setReplaceAll] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get('/general-timetable')
      .then((res) => setRows(res.data.data))
      .catch(() => toast.error('Failed to load timetable entries.'))
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
        `/general-timetable/upload?replaceAll=${replaceAll}`,
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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await api.delete(`/general-timetable/${id}`);
      toast.success('Entry deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('This will delete ALL timetable entries. Are you sure?')) return;
    try {
      await api.delete('/general-timetable');
      toast.success('All entries cleared.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear entries.');
    }
  };

  return (
    <DashboardLayout title="General Timetable Manager">
      <div className="card" style={{ marginBottom: 20, maxWidth: 600 }}>
        <h3>Import timetable</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
          Upload a CSV, Excel (.xlsx/.xls), or PDF file. CSV/Excel should have columns:
          <code style={{ display: 'block', marginTop: 4 }}>course_code, day, start_time, end_time, venue, lecturer</code>
        </p>
        <form onSubmit={handleUpload}>
          <div className="form-group">
            <label>Timetable file</label>
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
              Replace all existing entries with this file (use this for a fresh semester)
            </label>
          </div>
          <button className="btn btn-primary" disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload & Import'}
          </button>
        </form>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Current entries ({rows.length})</h3>
          {rows.length > 0 && (
            <button className="btn btn-outline btn-sm" onClick={handleClearAll}>
              Clear all
            </button>
          )}
        </div>

        {loading && <p>Loading...</p>}
        {!loading && rows.length === 0 && (
          <p style={{ color: 'var(--ink-soft)' }}>No timetable entries yet. Upload a file above to get started.</p>
        )}

        {!loading && rows.length > 0 && (
          <div className="table-wrap" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Day</th>
                  <th>Time</th>
                  <th>Venue</th>
                  <th>Lecturer</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.course_code}</td>
                    <td>{r.day}</td>
                    <td>{r.start_time} - {r.end_time}</td>
                    <td>{r.venue}</td>
                    <td>{r.lecturer || '-'}</td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => handleDelete(r.id)}>
                        Delete
                      </button>
                    </td>
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
