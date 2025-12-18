import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { updateUserSettings, getUserProfile } from "../api";
import { FiLock, FiUser, FiArrowLeft, FiSave, FiLogOut, FiEdit3 } from "react-icons/fi";

export default function SettingsPage() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");

  const [formData, setFormData] = useState({
    newUsername: username || "",
    bio: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Load existing bio on mount
  useEffect(() => {
    const fetchCurrentBio = async () => {
      try {
        const profile = await getUserProfile(username);
        setFormData(prev => ({ ...prev, bio: profile.bio || "" }));
      } catch (err) {
        console.error("Failed to fetch bio", err);
      }
    };
    fetchCurrentBio();
  }, [username]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      return setMessage({ type: "error", text: "Passwords do not match!" });
    }

    setLoading(true);
    try {
      await updateUserSettings({
        newUsername: formData.newUsername,
        bio: formData.bio,
        newPassword: formData.newPassword || undefined
      });
      
      localStorage.setItem("username", formData.newUsername);
      setMessage({ type: "success", text: "Settings updated successfully!" });
      
      // Redirect back to profile after a short delay
      setTimeout(() => navigate("/profile"), 1500);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to update settings." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* --- HEADER --- */}
      <div className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
            <FiArrowLeft size={24} />
          </button>
          <h1 className="font-black text-gray-800 uppercase tracking-widest text-sm">Account Settings</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {message.text && (
            <div className={`p-4 rounded-2xl text-sm font-bold border animate-pulse ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
            }`}>
              {message.text}
            </div>
          )}

          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 space-y-6">
            {/* USERNAME FIELD */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-2 tracking-widest">Sister Name</label>
              <div className="relative">
                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
                <input
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-purple-200 outline-none font-bold text-gray-700 transition-all"
                  value={formData.newUsername}
                  onChange={(e) => setFormData({...formData, newUsername: e.target.value})}
                />
              </div>
            </div>

            {/* BIO FIELD (NEW) */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-2 tracking-widest">Sister Bio / Status</label>
              <div className="relative">
                <FiEdit3 className="absolute left-4 top-6 text-purple-400" />
                <textarea
                  placeholder="Share what's on your heart..."
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-purple-200 outline-none font-medium text-gray-700 h-32 resize-none transition-all"
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                />
              </div>
            </div>

            <hr className="border-gray-50" />

            {/* PASSWORD FIELDS */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-2 tracking-widest">Change Password (Optional)</label>
              <div className="relative mb-4">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
                <input
                  type="password"
                  placeholder="New Password"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-purple-200 outline-none font-bold text-gray-700 transition-all"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                />
              </div>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-purple-200 outline-none font-bold text-gray-700 transition-all"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* SAVE BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black shadow-lg shadow-purple-100 flex items-center justify-center gap-2 hover:bg-purple-700 active:scale-95 transition-all disabled:opacity-50"
          >
            <FiSave /> {loading ? "Saving..." : "Save Changes"}
          </button>

          {/* LOGOUT BUTTON */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-4 text-red-500 font-bold flex items-center justify-center gap-2 hover:bg-red-50 rounded-2xl transition-all"
          >
            <FiLogOut /> Logout
          </button>
        </form>
      </div>
    </div>
  );
}