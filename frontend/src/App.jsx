import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster, toast } from 'react-hot-toast';
import { scheduleDailyDua } from "./utils/reminder"; // 👈 Import your new utility
import Home from "./pages/Home";
import MessageBoardPage from "./pages/MessageBoardPage";
import FeedPage from "./pages/FeedPage";
import ProfilePage from "./pages/ProfilePage"; 
import SettingsPage from "./pages/SettingsPage"; 
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token")); 

  useEffect(() => {
    const initNotifications = async () => {
      const isEnabled = localStorage.getItem("dua_reminder") === "true";
      
      if (isEnabled && "Notification" in window && "serviceWorker" in navigator) {
        try {
          let permission = Notification.permission;
          
          if (permission === "default") {
            permission = await Notification.requestPermission();
          }

          if (permission === "granted") {
            // 1. Show the session toast
            const isConfirmed = sessionStorage.getItem("notif_session_confirmed");
            if (!isConfirmed) {
              toast.success("Reminders Active 🔔", {
                style: {
                  borderRadius: '15px',
                  background: '#1e1b4b',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }
              });
              sessionStorage.setItem("notif_session_confirmed", "true");
            }

            // 2. Trigger the Daily Dua Logic 👈 NEW
            // This checks if a notification is due for today
            await scheduleDailyDua(); 
          }
        } catch (error) {
          console.error("Notification initialization failed", error);
        }
      }
    };

    if (token) {
      initNotifications();
    }
  }, [token]);

  return (
    <Router>
      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        <Route path="/login" element={<Login setToken={setToken} />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><MessageBoardPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/profile/:username" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}