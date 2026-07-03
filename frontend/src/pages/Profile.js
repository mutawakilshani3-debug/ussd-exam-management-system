import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/axios';
import { toast } from 'react-toastify';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ fullName: '', phone: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const load = () => {
    api.get('/profile').then((res) => {
      setProfile(res.data.data);
      setForm({ fullName: res.data.data.full_name, phone: res.data.data.phone });
    });
  };

  useEffect(() => { load(); }, []); 

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      await api.put('/profile', form);
      toast.success('Profile updated.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    }
  };

  const uploadPicture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const data = new FormData();
    data.append('picture', file);
    try {
      await api.post('/profile/picture', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Profile picture updated.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed.');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    try {
      await api.put('/auth/change-password', pwForm);
      toast.success('Password changed.');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Change failed.');
    }
  };

  if (!profile) return <DashboardLayout title="Profile">Loading...</DashboardLayout>;

  return (
    <DashboardLayout title="My Profile">
      <div className="card" style={{ marginBottom: 20, maxWidth: 520 }}>
        <h3>Personal information</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>{profile.email} · {profile.role}</p>
        <div className="form-group">
          <label>Profile picture</label>
          <input type="file" accept="image/*" onChange={uploadPicture} />
        </div>
        <form onSubmit={saveProfile}>
          <div className="form-group">
            <label>Full name</label>
            <input className="form-control" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <button className="btn btn-primary">Save changes</button>
        </form>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <h3>Change password</h3>
        <form onSubmit={changePassword}>
          <div className="form-group">
            <label>Current password</label>
            <input type="password" className="form-control" required value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>New password</label>
              <input type="password" className="form-control" required value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Confirm new password</label>
              <input type="password" className="form-control" required value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-gold">Update password</button>
        </form>
      </div>
    </DashboardLayout>
  );
}
