import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import TimetableNav from '../components/TimetableNav';
import api from '../api/axios';

const ROLE_HOME = { admin: '/admin', examiner: '/examiner', invigilator: '/invigilator', student: '/student' };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState({
    show_register_link: true,
    show_check_exam_link: true,
    show_timetable_link: true,
  });

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => setSettings(res.data.settings))
      .catch(() => {
        // if settings fetch fails, fall back to showing all links (fail-open, non-blocking)
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}`);
      navigate(ROLE_HOME[user.role] || '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const hasAnyFooterLink =
    settings.show_register_link || settings.show_check_exam_link || settings.show_timetable_link;

  return (
    <div className="auth-page">
      <TimetableNav />
      <div className="auth-card">
        <span className="eyebrow">MUTA · Registrar</span>
        <h1>Sign in to your account</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className="form-control"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--ink-soft)',
                }}
              >
                {showPassword ? (
                  // eye-off icon
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  // eye icon
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div style={{ textAlign: 'right', marginBottom: 16 }}>
            <Link to="/forgot-password" style={{ fontSize: '0.85rem' }}>Forgot password?</Link>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        {hasAnyFooterLink && (
          <div className="auth-footer">
            {settings.show_register_link && (
              <>
                Student? <Link to="/register">Create an account</Link>
                <br />
              </>
            )}
            {settings.show_check_exam_link && (
              <>
                <Link to="/check">Check exam details without signing in</Link>
                <br />
              </>
            )}
            {settings.show_timetable_link && (
              <Link to="/timetable">View full exam timetable</Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
