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
            <input
              id="password"
              type="password"
              className="form-control"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
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
