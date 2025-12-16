import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";

export default function Login({ setToken }) {
  // State for managing UI feedback
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    // Get form values using the input names
    const username = e.target.u.value;
    const password = e.target.p.value;

    try {
      const res = await fetch("http://localhost:4000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        // Handle error response from the backend (e.g., Invalid credentials)
        setError(data.error || "Login failed");
        return;
      }
      
      // Success: Save token and username
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", username); // 👈 Important: Save username for author
      
      // Update state in App.js to trigger a re-render
      setToken(data.token); 
      
      // Navigate to the protected page after successful login
      navigate("/messages", { replace: true });

    } catch (err) {
      // Handle network or other unexpected errors
      console.error("Login failed:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-2xl">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to the Memory Wall
        </h2>
        
        <form className="mt-8 space-y-6" onSubmit={submit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                id="username"
                name="u"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                placeholder="Username (e.g., sister1)"
              />
            </div>
            <div>
              <input
                id="password"
                name="p"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>
          
          {error && (
            <div className="text-red-600 text-sm text-center font-medium p-2 bg-red-100 border border-red-300 rounded-md">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-400"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}