import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import SessionWelcome from './components/SessionWelcome';
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FoodProducts = lazy(() => import('./pages/FoodProducts'));
const LogFood = lazy(() => import('./pages/LogFood'));
const PhotoLog = lazy(() => import('./pages/PhotoLog'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Profile = lazy(() => import('./pages/Profile'));

function SessionStatus() {
  const { authError, retryAuth } = useAuth();
  return <div className="loading" role="status">{authError
    ? <><p>Your session couldn’t load. Please try again.</p><button type="button" className="btn btn-primary" onClick={retryAuth}>Try again</button></>
    : <><div className="spinner" />Loading...</>}</div>;
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <SessionStatus />;
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <SessionStatus />;
  return user ? <Navigate to="/dashboard" /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SessionWelcome>
        <Suspense fallback={<div className="loading" role="status"><div className="spinner" />Loading...</div>}>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/auth/google" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="food-products" element={<FoodProducts />} />
            <Route path="log-food" element={<PhotoLog />} />
            <Route path="log-food/manual" element={<LogFood />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
        </Suspense>
        </SessionWelcome>
      </BrowserRouter>
    </AuthProvider>
  );
}
