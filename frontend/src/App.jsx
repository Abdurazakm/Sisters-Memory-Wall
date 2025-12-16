import React, { useState } from 'react'; // 👈 Import useState
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import MessageBoardPage from "./pages/MessageBoardPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login"; // 👈 Import the Login component

export default function App() {
  // 1. Initialize state with the token from localStorage
  const [token, setToken] = useState(localStorage.getItem("token")); 

  return (
    <Router>
      {/* Navigation */}
      <nav className="bg-purple-500 p-4 text-white flex justify-center gap-6">
        <Link to="/" className="hover:underline">Home</Link>
        <Link to="/messages" className="hover:underline">Shared Messages</Link>
        {/* You could add a logout button here based on the token state */}
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        
        {/* 2. Add the /login route */}
        <Route 
          path="/login" 
          element={<Login setToken={setToken} />} // Pass setToken
        />
        
        {/* 3. The protected route (no changes needed here) */}
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MessageBoardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}