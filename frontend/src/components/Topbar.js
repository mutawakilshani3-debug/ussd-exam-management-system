import { useAuth } from '../context/AuthContext';
import { buildFileUrl } from '../utils/buildFileUrl';

export default function Topbar({ title }) {
  const { user } = useAuth();
  const avatarUrl = user?.profile_picture ? buildFileUrl(user.profile_picture) : null;

  return (
    <div className="topbar">
      <div>
        <h2 style={{ margin: 0 }}>{title}</h2>
      </div>
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600 }}>{user.full_name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', textTransform: 'capitalize' }}>{user.role}</div>
          </div>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--gold-600)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              {user.full_name
                ?.split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
