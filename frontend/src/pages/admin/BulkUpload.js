import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../api/axios';
import { toast } from 'react-toastify';

const TYPES = [
  { value: 'students', label: 'Students' },
  { value: 'examiners', label: 'Examiners' },
  { value: 'invigilators', label: 'Invigilators' },
];

export default function BulkUpload() {
  const [type, setType] = useState('students');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const downloadTemplate = () => {
    window.open(`${api.defaults.baseURL}/uploads/${type}/template`, '_blank');
  };

  const runPreview = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Choose a CSV or Excel file first.');
    setLoading(true);
    setResult(null);
    try {
      const data = new FormData();
      data.append('file', file);
      const res = await api.post(`/uploads/${type}/preview`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPreview(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Preview failed.');
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/uploads/${type}/import`, { fileName: preview.fileName });
      setResult(res.data);
      toast.success(res.data.message);
      setPreview(null);
      setFile(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Bulk Upload">
      <div className="card" style={{ maxWidth: 720 }}>
        <div className="form-group">
          <label>Import type</label>
          <select className="form-control" value={type} onChange={(e) => { setType(e.target.value); setPreview(null); setResult(null); }}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <button type="button" className="btn btn-outline btn-sm" style={{ marginBottom: 16 }} onClick={downloadTemplate}>
          Download sample template
        </button>
        <form onSubmit={runPreview}>
          <div className="form-group">
            <label>CSV or Excel file</label>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files[0])} />
          </div>
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Processing...' : 'Preview import'}</button>
        </form>
      </div>

      {preview && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3>Preview: {preview.validRows} valid / {preview.invalidRows} invalid of {preview.totalRows} rows</h3>
          <div className="table-wrap" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Row</th><th>Name</th><th>Email</th><th>Phone</th><th>Status</th></tr></thead>
              <tbody>
                {preview.data.map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>
                    <td>{row.fullName}</td>
                    <td>{row.email}</td>
                    <td>{row.phone}</td>
                    <td>{row.valid ? <span className="badge active">Valid</span> : <span className="badge inactive" title={row.errors.join(', ')}>{row.errors.join(', ')}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn btn-gold" style={{ marginTop: 16 }} disabled={loading || preview.validRows === 0} onClick={confirmImport}>
            {loading ? 'Importing...' : `Import ${preview.validRows} valid record(s)`}
          </button>
        </div>
      )}

      {result && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3>Import report</h3>
          <p>{result.successCount} imported successfully, {result.errorCount} failed.</p>
          {result.errors.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Row</th><th>Email</th><th>Error</th></tr></thead>
                <tbody>
                  {result.errors.map((e, i) => <tr key={i}><td>{e.rowNumber}</td><td>{e.email}</td><td>{e.error}</td></tr>)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
