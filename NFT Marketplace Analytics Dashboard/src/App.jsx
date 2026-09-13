import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import './App.css';

function App() {
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <Routes>
      <Route
        path="/"
        element={<LandingPage theme={theme} onToggleTheme={toggleTheme} />}
      />
      <Route
        path="/dashboard"
        element={<DashboardPage theme={theme} onToggleTheme={toggleTheme} />}
      />
      <Route
        path="*"
        element={<LandingPage theme={theme} onToggleTheme={toggleTheme} />}
      />
    </Routes>
  );
}

export default App;