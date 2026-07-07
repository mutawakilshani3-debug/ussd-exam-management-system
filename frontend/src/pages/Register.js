import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import PasswordInput from '../components/PasswordInput';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await register(form);
      toast.success('Account created. Welcome!');
      navigate('/student');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <span className="eyebrow">Student Registration</span>
        <h1>Create your account</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full name</label>
            <input className="form-control" required value={form.fullName} onChange={update('fullName')} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email address</label>
              <input type="email" className="form-control" required value={form.email} onChange={update('email')} />
            </div>
            <div className="form-group">
              <label>Phone number</label>
              <input className="form-control" required value={form.phone} onChange={update('phone')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Password</label>
              <PasswordInput required value={form.password} onChange={update('password')} />
            </div>
            <div className="form-group">
              <label>Confirm password</label>
              <PasswordInput required value={form.confirmPassword} onChange={update('confirmPassword')} />
            </div>
          </div>
          <div className="form-hint" style={{ marginBottom: 16 }}>
            At least 8 characters, with an uppercase letter, a lowercase letter, and a number.
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
