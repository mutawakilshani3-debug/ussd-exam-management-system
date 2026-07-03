import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../api/axios';

export default function Notifications() {
  const [items, setItems] = useState([]);

  const load = () => api.get('/notifications').then((res) => setItems(res.data.data));
  useEffect(() => { load(); }, []); 

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    load();
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    load();
  };

  return (
    <DashboardLayout title="Notifications">
      <div className="toolbar">
        <button className="btn btn-outline btn-sm" onClick={markAllRead}>Mark all as read</button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {items.length === 0 && <div className="empty-state">No notifications yet.</div>}
        {items.map((n) => (
          <div key={n.id} className={`notif-item ${n.is_read ? '' : 'unread'}`} onClick={() => !n.is_read && markRead(n.id)} style={{ cursor: n.is_read ? 'default' : 'pointer' }}>
            <strong>{n.title}</strong>
            <div>{n.message}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
