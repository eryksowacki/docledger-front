import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import LoginForm from "./components/LoginForm";
import Dashboard from "./components/Dashboard";
import CompanyDetails from "./components/CompanyDetails";

import type { User } from "./types";
import { me, logoutRequest } from "./authService";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const location = useLocation();

  useEffect(() => {
    (async () => {
      try {
        const current = await me();
        setUser(current);
      } catch {
        setUser(null);
      } finally {
        setCheckingSession(false);
      }
    })();
  }, []);

  const handleLoginSuccess = (loggedUser: User) => {
    setUser(loggedUser);
  };

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {
    } finally {
      setUser(null);
    }
  };

  if (checkingSession) {
    return <div style={{ padding: 24 }}>Ładowanie…</div>;
  }

  const requireAuth = (element: React.ReactElement) => {
    if (user) return element;
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <LoginForm onLoginSuccess={handleLoginSuccess} />
          )
        }
      />

      <Route
        path="/"
        element={requireAuth(
          <Dashboard user={user as User} onLogout={handleLogout} />
        )}
      />

      <Route
        path="/admin/companies/:id"
        element={requireAuth(
          <CompanyDetails user={user as User} onLogout={handleLogout} />
        )}
      />

      <Route
        path="*"
        element={<Navigate to={user ? "/" : "/login"} replace />}
      />
    </Routes>
  );
};

export default App;
