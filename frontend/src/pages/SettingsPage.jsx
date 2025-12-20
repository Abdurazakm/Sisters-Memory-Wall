import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { updateUserSettings, getUserProfile } from "../api";
import { 
  FiLock, FiUser, FiArrowLeft, FiSave, FiLogOut, 
  FiEdit3, FiShield, FiBell, FiSend 
} from "react-icons/fi";
import { toast } from "react-hot-toast"; // Ensure this is installed

export default function SettingsPage() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");

  const [formData, setFormData] = useState({
    newUsername: username || "",
    bio: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  // --- Notification State ---
  const [reminders, setReminders] = useState(localStorage.getItem("dua_reminder") === "true");

  useEffect(() => {
    const fetchCurrentBio = async () => {
      try {
        const profile = await getUserProfile(username);
        setFormData(prev => ({ ...prev, bio: profile.bio || "" }));
      } catch (err) {
        console.error("Failed to fetch bio", err);
      }
    };
    if (username) fetchCurrentBio();
  }, [username]);

  // --- Notification Handlers ---
  const toggleReminders = async () => {
    const newState = !reminders;
    
    if (newState) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notification permission denied!");
        return;
      }
    }
    
    setReminders(newState);
    localStorage.setItem("dua_reminder", newState.toString());
    toast.success(newState ? "Reminders turned on" : "Reminders turned off");
  };

  const sendTestNotification = async () => {
    if (!("serviceWorker" in navigator)) return toast.error("Not supported on this browser");
    
    const registration = await navigator.serviceWorker.ready;
    if (Notification.permission === "granted") {
      registration.showNotification("Sisters’ Wall", {
        body: "Success! Your notifications are configured correctly. ✨",
        icon: "/logo192.png",
        vibrate: [100, 50, 100],
      });
    } else {
      toast.error("Please enable permissions first");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.currentPassword) {
      return setMessage({ type: "error", text: "Current password required to save changes." });
    }
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      return setMessage({ type: "error", text: "New passwords do not match!" });
    }

    setLoading(true);
    try {
      await updateUserSettings({
        currentPassword: formData.currentPassword,
        newUsername: formData.newUsername,
        bio: formData.bio,
        newPassword: formData.newPassword || undefined
      });
      localStorage.setItem("username", formData.newUsername);
      setMessage({ type: "success", text: "Settings updated successfully!" });
      setTimeout(() => navigate("/profile"), 1500);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Incorrect current password.";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-10">
      {/* Header */}
      <div className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
            <FiArrowLeft size={24} />
          </button>
          <h1 className="font-black text-gray-800 uppercase tracking-widest text-sm">Settings</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full p-6 space-y-6">
        
        {/* Notifications Section */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-gray-400 uppercase ml-4 tracking-[0.2em]">Preferences</h2>
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${reminders ? 'bg-purple-100 text-purple-600' : 'bg-gray-50 text-gray-400'}`}>
                  <FiBell size={24} />
                </div>
                <div>
                  <p className="font-black text-sm uppercase tracking-tight">Dua Reminders</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Daily push notifications</p>
                </div>
              </div>
              <button 
                onClick={toggleReminders}
                className={`w-12 h-7 rounded-full transition-all relative ${reminders ? 'bg-purple-600' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${reminders ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            {reminders && (
              <button
                onClick={sendTestNotification}
                className="w-full py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center justify-center gap-2 transition-all"
              >
                <FiSend /> Send Test Notification
              </button>
            )}
          </div>
        </section>

        {/* Account Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-[10px] font-black text-gray-400 uppercase ml-4 tracking-[0.2em]">Account Security</h2>
          
          {message.text && (
            <div className={`p-4 rounded-2xl text-sm font-bold border ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
            }`}>
              {message.text}
            </div>
          )}

          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 space-y-6">
            {/* CURRENT PASSWORD */}
            <div className="bg-purple-50 p-6 rounded-[1.5rem] border border-purple-100">
              <label className="block text-[10px] font-black text-purple-600 uppercase mb-2 ml-2 tracking-widest">Confirm Identity</label>
              <div className="relative">
                <FiShield className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500" />
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl focus:ring-2 focus:ring-purple-300 outline-none font-bold text-gray-700 transition-all border border-purple-200"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                />
              </div>
            </div>

            {/* USERNAME */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-2 tracking-widest">Sister Name</label>
              <div className="relative">
                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
                <input
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-purple-200 outline-none font-bold text-gray-700"
                  value={formData.newUsername}
                  onChange={(e) => setFormData({...formData, newUsername: e.target.value})}
                />
              </div>
            </div>

            {/* BIO */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-2 tracking-widest">Bio / Status</label>
              <div className="relative">
                <FiEdit3 className="absolute left-4 top-6 text-purple-400" />
                <textarea
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-purple-200 outline-none font-medium text-gray-700 h-24 resize-none"
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                />
              </div>
            </div>

            {/* NEW PASSWORD */}
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Change Password (Optional)</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
                <input
                  type="password"
                  placeholder="New Password"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl outline-none font-bold text-gray-700"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                />
              </div>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl outline-none font-bold text-gray-700"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-purple-600 text-white rounded-[2rem] font-black shadow-xl shadow-purple-200 flex items-center justify-center gap-2 hover:bg-purple-700 active:scale-95 transition-all disabled:opacity-50"
          >
            <FiSave /> {loading ? "Saving..." : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-4 text-red-500 font-bold flex items-center justify-center gap-2 hover:bg-red-50 rounded-2xl transition-all mt-4"
          >
            <FiLogOut /> Logout Account
          </button>
        </form>
      </div>
    </div>
  );
}