import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { FiUser, FiLock, FiLoader, FiHeart } from "react-icons/fi";

// Get the API URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://4plusone.onrender.com";

export default function Login({ setToken }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    const username = e.target.u.value;
    const password = e.target.p.value;

    try {
      // Use the variable here instead of the hardcoded link
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false); // Stop loading if there is an error
        return;
      }
      
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", username);
      setToken(data.token); 
      navigate("/messages", { replace: true });

    } catch (err) {
      console.error("Login failed:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-white to-pink-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* ... rest of your beautiful UI code remains exactly the same ... */}
      <div className="max-w-md w-full space-y-8 bg-white/80 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-white relative overflow-hidden">
        
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-emerald-500"></div>

        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-4 shadow-inner">
            <FiHeart size={32} />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-gray-500 font-medium">
            Sign in to the Sisters Memory Wall
          </p>
        </div>
        
        <form className="mt-8 space-y-4" onSubmit={submit}>
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <FiUser />
              </div>
              <input
                id="username"
                name="u"
                type="text"
                required
                className="block w-full pl-11 pr-4 py-4 border border-gray-100 rounded-2xl bg-gray-50/50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all sm:text-sm font-bold"
                placeholder="Username"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <FiLock />
              </div>
              <input
                id="password"
                name="p"
                type="password"
                required
                className="block w-full pl-11 pr-4 py-4 border border-gray-100 rounded-2xl bg-gray-50/50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all sm:text-sm font-bold"
                placeholder="Password"
              />
            </div>
          </div>
          
          {error && (
            <div className="text-red-500 text-xs text-center font-black uppercase tracking-widest p-3 bg-red-50 rounded-2xl border border-red-100 animate-shake">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent text-sm font-black uppercase tracking-widest rounded-2xl text-white bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-300 transition-all active:scale-95"
            >
              {loading ? <FiLoader className="animate-spin" size={20} /> : "Enter Wall"}
            </button>
          </div>
        </form>

        <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-8">
          Dedicated to our beloved sisters
        </p>
      </div>
    </div>
  );
}