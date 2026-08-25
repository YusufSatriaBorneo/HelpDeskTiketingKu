import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import HelpDeskDashboard from './pages/HelpDeskDashboard';
import EngineerDashboard from './pages/EngineerDashboard';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />; // Redirect to their default dashboard
  }

  return children;
};

const DashboardRouter = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;

  if (user.role === 'USER') return <Navigate to="/user-dashboard" />;
  if (user.role === 'HELPDESK') return <Navigate to="/helpdesk-dashboard" />;
  if (user.role === 'ENGINEER') return <Navigate to="/engineer-dashboard" />;
  return <Navigate to="/login" />;
};

const ThemeToggle = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <button className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <a href="/" className="nav-brand">HelpDesk TiketingKu</a>
      <div className="nav-links">
        <span>Hi, {user.name} ({user.role})</span>
        <ThemeToggle />
        <button className="btn btn-outline" onClick={handleLogout} style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>Logout</button>
      </div>
    </nav>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<DashboardRouter />} />
              <Route path="/user-dashboard" element={
                <PrivateRoute allowedRoles={['USER']}><UserDashboard /></PrivateRoute>
              } />
              <Route path="/helpdesk-dashboard" element={
                <PrivateRoute allowedRoles={['HELPDESK']}><HelpDeskDashboard /></PrivateRoute>
              } />
              <Route path="/engineer-dashboard" element={
                <PrivateRoute allowedRoles={['ENGINEER']}><EngineerDashboard /></PrivateRoute>
              } />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
