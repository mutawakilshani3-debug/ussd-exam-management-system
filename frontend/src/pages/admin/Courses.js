import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../api/axios';
import { toast } from 'react-toastify';

const EMPTY = { code: '', name: '', programmeId: '', level: '', semester: '' };

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = () => api.get('/courses', { params: { search } }).then((res) => setCourses(res.data.data));

  useEffect(() => { load(); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.get('/academic/programmes').then((res) => setProgrammes(res.data.data)); }, []);

  const openCreate = () => { setEditingId(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({ code: c.code, name: c.name, programmeId: c.programme_id, level: c.level, semester: c.semester });
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/courses/${editingId}`, form);
        toast.success('Course updated.');
      } else {
        await api.post('/courses', form);
        toast.success('Course created.');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this course?')) return;
    try {
      await api.delete(`/courses/${id}`);
      toast.success('Course deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    }
  };

  return (
    <DashboardLayout title="Courses">
      <div className="toolbar">
        <input className="form-control" placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn btn-gold" onClick={openCreate}>+ Add Course</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20, maxWidth: 560 }}>
          <h3>{editingId ? 'Edit' : 'Add'} Course</h3>
          <form onSubmit={submit}>
            <div className="form-row">
              <div className="form-group">
                <label>Course code</label>
                <input className="form-control mono" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Course name</label>
                <input className="form-control" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Programme</label>
              <select className="form-control" required value={form.programmeId} onChange={(e) => setForm({ ...form, programmeId: e.target.value })}>
                <option value="">Select programme</option>
                {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Level</label>
                <input className="form-control" placeholder="e.g. 200" required value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Semester</label>
                <input className="form-control" placeholder="e.g. 1" required value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary">{editingId ? 'Save changes' : 'Create'}</button>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Code</th><th>Name</th><th>Programme</th><th>Level</th><th>Semester</th><th>Actions</th></tr></thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id}>
                <td className="mono">{c.code}</td>
                <td>{c.name}</td>
                <td>{c.programme_name}</td>
                <td>{c.level}</td>
                <td>{c.semester}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(c.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {courses.length === 0 && <div className="empty-state">No courses found.</div>}
      </div>
    </DashboardLayout>
  );
}
