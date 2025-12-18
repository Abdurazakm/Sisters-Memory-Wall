import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import MessageBoardPage from "./pages/MessageBoardPage";
import FeedPage from "./pages/FeedPage";
import ProfilePage from "./pages/ProfilePage"; // 👈 New
import SettingsPage from "./pages/SettingsPage"; // 👈 New
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token")); 

  return (
    <Router>
      {/* Optional: You can keep this nav, but since we have 
         buttons on the Home page, many modern apps move 
         this into the pages or use a cleaner Sidebar.
      */}
      {/* <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 flex justify-center gap-8 shadow-sm sticky top-0 z-50">
        <Link to="/" className="text-gray-600 hover:text-purple-600 font-bold text-sm transition">Home</Link>
        <Link to="/feed" className="text-gray-600 hover:text-purple-600 font-bold text-sm transition">Feed</Link>
        <Link to="/messages" className="text-gray-600 hover:text-purple-600 font-bold text-sm transition">Chat</Link>
      </nav> */}

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login setToken={setToken} />} />
        
        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><MessageBoardPage /></ProtectedRoute>} />
        
        {/* 👈 NEW: Profile and Settings Routes */}
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

        {/* Catch-all: Redirect to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}