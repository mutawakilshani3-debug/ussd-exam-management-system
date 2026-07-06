import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../api/axios';
import { toast } from 'react-toastify';

const CATEGORIES = [
  { value: 'general', label: 'General Timetable' },
  { value: 'morning', label: 'Morning Session' },
  { value: 'afternoon', label: 'Afternoon Session' },
];

export default function TimetableDocuments() {
  const [category, setCategory] = useState('general');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const fetchList = async () => {
    setLoadingList(true);
    try {
      const res = await api.get('/public/timetable-documents');
      setDocuments(res.data.data);
    } catch (err) {
      toast.error('Failed to load current documents.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Choose a PDF file first.');

    setLoading(true);
    try {
      const data = new FormData();
      data.append('file', file);
      const res = await api.post(`/uploads/timetable-documents/${category}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(res.data.message);
      setFile(null);
      fetchList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const getExisting = (cat) => documents.find((d) => d.category === cat);

  return (
    <DashboardLayout title="Timetable Documents">
      <div className="card" style={{ maxWidth: 720 }}>
        <div className="form-group">
          <label>Document category</label>
          <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <form onSubmit={handleUpload}>
          <div className="form-group">
            <label>PDF file</label>
            <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} />
          </div>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Uploading...' : 'Upload / Replace document'}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>Currently uploaded</h3>
        {loadingList && <p>Loading...</p>}
        {!loadingList && documents.length === 0 && <p>No documents uploaded yet.</p>}
        {!loadingList && documents.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Category</th><th>File name</th><th>Size</th><th>Uploaded</th></tr>
              </thead>
              <tbody>
                {CATEGORIES.map((c) => {
                  const doc = getExisting(c.value);
                  return (
                    <tr key={c.value}>
                      <td>{c.label}</td>
                      <td>{doc ? doc.file_name : <span className="badge inactive">Not uploaded</span>}</td>
                      <td>{doc ? `${(doc.file_size / 1024).toFixed(0)} KB` : '-'}</td>
                      <td>{doc ? new Date(doc.uploaded_at).toLocaleString() : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
