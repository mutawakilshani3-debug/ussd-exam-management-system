import { useAuth } from '../context/AuthContext';

export default function Topbar({ title }) {
  const { user } = useAuth();
  return (
    <div className="topbar">
      <div>
        <h2 style={{ margin: 0 }}>{title}</h2>
      </div>
      {user && (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 600 }}>{user.full_name}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', textTransform: 'capitalize' }}>{user.role}</div>
        </div>
      )}
    </div>
  );
}
