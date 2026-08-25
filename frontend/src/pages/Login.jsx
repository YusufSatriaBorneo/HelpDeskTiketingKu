import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('USER');
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin ? { email, password } : { email, password, name, role };
    
    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }
      
      if (isLogin) {
        login(data.user, data.token);
        navigate('/');
      } else {
        setIsLogin(true); // Switch to login after successful register
        setError('Registration successful! Please login.');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <div className="card">
        <h2 style={{ textAlign: 'center', color: 'var(--brand-primary)' }}>
          {isLogin ? 'Login to HelpDesk' : 'Register Account'}
        </h2>
        {error && (
          <div style={{ backgroundColor: 'var(--status-open)', color: 'white', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required={!isLogin} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-control" value={role} onChange={e => setRole(e.target.value)}>
                <option value="USER">User (Ticket Creator)</option>
                <option value="HELPDESK">HelpDesk (Dispatcher)</option>
                <option value="ENGINEER">Engineer (Resolver)</option>
              </select>
            </div>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button className="btn btn-outline" style={{ border: 'none', padding: '0' }} onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
