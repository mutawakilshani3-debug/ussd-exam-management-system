import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';

// Resizes and compresses an image in the browser before upload. This makes
// uploads reliable across every device (some Android cameras produce much
// larger files than iPhone's, which could exceed the server's size limit
// before an error even had a chance to come back).
function resizeImage(file, maxDim = 500, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height >= width && height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Could not process that image.'));
            resolve(blob);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Could not read that image file.'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

export default function Profile() {
  const { setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ fullName: '', phone: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [uploading, setUploading] = useState(false);

  const load = () => {
    api.get('/profile').then((res) => {
      setProfile(res.data.data);
      setForm({ fullName: res.data.data.full_name, phone: res.data.data.phone });
    });
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    e.target.value = ''; // allow re-selecting the same file again later
    if (!file) {
      toast.error('No file was selected. Please try picking the photo again.');
      return;
    }

    setUploading(true);
    try {
      const compressed = await resizeImage(file);
      const data = new FormData();
      data.append('picture', compressed, 'profile.jpg');

      const res = await api.post('/profile/picture', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Profile picture updated.');
      load();
      setUser((prev) => {
        const updated = { ...prev, profile_picture: res.data.data.profilePicture };
        localStorage.setItem('user', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          {profile.profile_picture ? (
            <img
              src={profile.profile_picture}
              alt="Profile"
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--line)' }}
            />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'var(--navy-950)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: '1.4rem',
              }}
            >
              {profile.full_name
                ?.split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Profile picture</label>
            <input type="file" accept="image/*" onChange={uploadPicture} disabled={uploading} />
            {uploading && <div className="form-hint">Uploading...</div>}
          </div>
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
            <PasswordInput required value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>New password</label>
              <PasswordInput required value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Confirm new password</label>
              <PasswordInput required value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-gold">Update password</button>
        </form>
      </div>
    </DashboardLayout>
  );
}
