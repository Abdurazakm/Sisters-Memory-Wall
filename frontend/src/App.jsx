import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import MessageBoardPage from "./pages/MessageBoardPage";
import FeedPage from "./pages/FeedPage";
import ProfilePage from "./pages/ProfilePage"; 
import SettingsPage from "./pages/SettingsPage"; 
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token")); 

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login setToken={setToken} />} />
        
        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><MessageBoardPage /></ProtectedRoute>} />
        
        {/* Updated Profile Routes */}
        {/* This one is for the user's own profile */}
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        
        {/* 👈 THIS IS THE KEY CHANGE: Added :username parameter */}
        <Route path="/profile/:username" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

        {/* Catch-all: Redirect to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}