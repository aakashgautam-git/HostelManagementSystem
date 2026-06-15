import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { apiError } from '../api';

const EMPTY = {
  name: '', email: '', password: '', phone: '',
  gender: 'other', course: '', year_of_study: '',
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await register({
        ...form,
        year_of_study: form.year_of_study ? Number(form.year_of_study) : null,
      });
      navigate('/student');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Create account</h1>
        <p className="auth-sub">Register as a hostel student</p>

        {error && <div className="message message-error">{error}</div>}

        <div className="field">
          <label>Full name</label>
          <input value={form.name} onChange={set('name')} required />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={set('email')} required />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={form.password} onChange={set('password')} required />
        </div>
        <div className="row">
          <div className="field">
            <label>Phone</label>
            <input value={form.phone} onChange={set('phone')} />
          </div>
          <div className="field">
            <label>Gender</label>
            <select value={form.gender} onChange={set('gender')}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Course</label>
            <input value={form.course} onChange={set('course')} />
          </div>
          <div className="field">
            <label>Year</label>
            <input type="number" min="1" max="6" value={form.year_of_study} onChange={set('year_of_study')} />
          </div>
        </div>
        <button className="btn w-full" disabled={busy}>{busy ? 'Creating…' : 'Register'}</button>

        <p className="auth-foot">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
