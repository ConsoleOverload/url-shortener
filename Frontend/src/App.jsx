import { useState } from 'react';
import LoginSignup from './components/LoginSignup';
import Dashboard from './components/Dashboard';

function App() {
  const [token, setToken] = useState(localStorage.getItem('ziplink_token') || null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ziplink_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const handleAuthSuccess = (newToken, newUser) => {
    localStorage.setItem('ziplink_token', newToken);
    localStorage.setItem('ziplink_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('ziplink_token');
    localStorage.removeItem('ziplink_user');
    setToken(null);
    setUser(null);
  };

  if (!token || !user) {
    return <LoginSignup onAuthSuccess={handleAuthSuccess} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default App;