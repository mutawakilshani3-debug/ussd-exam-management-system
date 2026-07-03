import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../api/axios';
import { toast } from 'react-toastify';

const EMPTY_FORM = { fullName: '', email: '', phone: '', indexNumber: '', staffId: '', level: '' };

/**
 * Generic CRUD screen for a single role: 'student' | 'examiner' | 'invigilator'.
 * Mirrors the backend's shared user.controller.js factory.
 */
export default function UserManagement({ role, title }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const endpoint = `/${role}s`;

  const load = () => {
    api.get(endpoint, { params: { search } }).then((res) => setUsers(res.data.data));
  };

  useEffect(() => { load(); }, [search]);  // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (user) => {
    setEditingId(user.id);
    setForm({
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      indexNumber: user.index_number || '',
      staffId: user.staff_id || '',
      level: user.level || '',
    });
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`${endpoint}/${editingId}`, form);
        toast.success(`${title.slice(0, -1)} updated.`);
      } else {
        await api.post(endpoint, form);
        toast.success(`${title.slice(0, -1)} created. Temporary password emailed.`);
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    }
  };

  const remove = async (id) => {
    if (!window.confirm(`Delete this ${role}? This cannot be undone.`)) return;
    try {
      await api.delete(`${endpoint}/${id}`);
      toast.success(`${title.slice(0, -1)} deleted.`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    }
  };

  const toggleStatus = async (user) => {
    try {
      await api.patch(`${endpoint}/${user.id}/status`, { isActive: !user.is_active });
      load();
    } catch (err) {
      toast.error('Could not update status.');
    }
  };

  const resetPassword = async (id) => {
    if (!window.confirm('Send a new temporary password to this user by email?')) return;
    try {
      await api.post(`${endpoint}/${id}/reset-password`);
      toast.success('Temporary password sent.');
    } catch (err) {
      toast.error('Reset failed.');
    }
  };

  return (
    <DashboardLayout title={title}>
      <div className="toolbar">
        <input
          className="form-control"
          placeholder={`Search ${title.toLowerCase()}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-gold" onClick={openCreate}>+ Add {title.slice(0, -1)}</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20, maxWidth: 560 }}>
          <h3>{editingId ? 'Edit' : 'Add'} {title.slice(0, -1)}</h3>
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Full name</label>
              <input className="form-control" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="form-control" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input className="form-control" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            {role === 'student' && (
              <div className="form-row">
                <div className="form-group">
                  <label>Index number</label>
                  <input className="form-control" value={form.indexNumber} onChange={(e) => setForm({ ...form, indexNumber: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Level</label>
                  <input className="form-control" placeholder="e.g. 200" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
                </div>
              </div>
            )}
            {role !== 'student' && (
              <div className="form-group">
                <label>Staff ID</label>
                <input className="form-control" value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary">{editingId ? 'Save changes' : 'Create'}</button>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name}</td>
                <td>{u.email}</td>
                <td>{u.phone}</td>
                <td><span className={`badge ${u.is_active ? 'active' : 'inactive'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(u)}>Edit</button>
                    <button className="btn btn-outline btn-sm" onClick={() => toggleStatus(u)}>{u.is_active ? 'Deactivate' : 'Activate'}</button>
                    <button className="btn btn-outline btn-sm" onClick={() => resetPassword(u.id)}>Reset password</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(u.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div className="empty-state">No {title.toLowerCase()} found.</div>}
      </div>
    </DashboardLayout>
  );
}
