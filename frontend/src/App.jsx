import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import MessageBoardPage from "./pages/MessageBoardPage";
import FeedPage from "./pages/FeedPage"; // 👈 Import your new FeedPage
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token")); 

  return (
    <Router>
      {/* Navigation */}
      <nav className="bg-purple-600 p-4 text-white flex justify-center gap-8 shadow-md sticky top-0 z-50">
        <Link to="/" className="hover:text-purple-200 font-medium transition">Home</Link>
        <Link to="/feed" className="hover:text-purple-200 font-medium transition">Family Feed</Link>
        <Link to="/messages" className="hover:text-purple-200 font-medium transition">Chat</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        
        <Route 
          path="/login" 
          element={<Login setToken={setToken} />} 
        />
        
        {/* Protected Chat Route */}
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MessageBoardPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Feed Route */}
        <Route
          path="/feed"
          element={
            <ProtectedRoute>
              <FeedPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}