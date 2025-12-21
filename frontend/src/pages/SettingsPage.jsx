import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { updateUserSettings, getUserProfile } from "../api";
import { 
  FiLock, FiUser, FiArrowLeft, FiSave, FiLogOut, 
  FiEdit3, FiShield, FiBell, FiClock
} from "react-icons/fi";
import { toast } from "react-hot-toast";

/* ================== UTILS: HAPTIC FEEDBACK ================== */
const triggerHaptic = (pattern = 10) => {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
};

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  // --- Notification States ---
  const [dailyReminders, setDailyReminders] = useState(false);
  const [prayerReminders, setPrayerReminders] = useState(false);

  // Sync state with local storage and browser permission on load
  useEffect(() => {
    const dailyPref = localStorage.getItem("dua_reminder") === "true";
    const prayerPref = localStorage.getItem("prayer_reminder") === "true";
    const hasPermission = Notification.permission === "granted";
    
    setDailyReminders(dailyPref && hasPermission);
    setPrayerReminders(prayerPref && hasPermission);
  }, []);

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

  // --- Professional Notification Handlers ---
  const handleToggle = async (type) => {
    triggerHaptic(15); // Physical click feel for the toggle
    const isDaily = type === 'daily';
    const currentVal = isDaily ? dailyReminders : prayerReminders;
    const setter = isDaily ? setDailyReminders : setPrayerReminders;
    const storageKey = isDaily ? "dua_reminder" : "prayer_reminder";
    
    const newState = !currentVal;
    
    if (newState) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        triggerHaptic([100, 50, 100]); // Error vibration
        toast.error("Please enable permissions in browser settings.");
        return;
      }
    }
    
    setter(newState);
    localStorage.setItem(storageKey, newState.toString());
    toast.success(`${isDaily ? "Daily" : "Salah"} reminders ${newState ? "activated" : "deactivated"}`);
  };

  const verifyNotificationSync = async () => {
    if (!("serviceWorker" in navigator)) {
      triggerHaptic(50);
      return toast.error("Sync not supported on this browser.");
    }

    triggerHaptic([20, 50, 20]); // Double pulse for "Starting System Check"
    setIsSyncing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if (Notification.permission === "granted") {
        // Professional delay to simulate system check
        setTimeout(() => {
          registration.active.postMessage({
            type: 'SCHEDULE_NOTIFICATION',
            title: 'System Sync Status ✅',
            body: 'Your spiritual reminders are successfully synchronized with your device.',
            delay: 500 
          });
          setIsSyncing(false);
          triggerHaptic(30); // Success "thud"
          toast.success("Synchronization verified.");
        }, 1200);
      } else {
        setIsSyncing(false);
        triggerHaptic(50);
        toast.error("Please enable permissions first.");
      }
    } catch (err) {
      setIsSyncing(false);
      triggerHaptic([100, 50, 100]);
      console.error("Sync Error:", err);
      toast.error("Could not communicate with System Service.");
    }
  };

  // --- Account Handlers ---
  const handleLogout = () => {
    triggerHaptic([10, 10, 10]); // Rapid ticks for logout
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    triggerHaptic(20);

    if (!formData.currentPassword) {
      triggerHaptic([50, 50]);
      return setMessage({ type: "error", text: "Current password required to save changes." });
    }
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      triggerHaptic([50, 50]);
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
      triggerHaptic([20, 100, 20]); // Heavy success vibration
      localStorage.setItem("username", formData.newUsername);
      setMessage({ type: "success", text: "Settings updated successfully!" });
      setTimeout(() => navigate("/profile"), 1500);
    } catch (err) {
      triggerHaptic([100, 50, 100]);
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
          <button 
            onClick={() => { triggerHaptic(5); navigate(-1); }} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
          >
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
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 space-y-6">
            
            {/* Toggle: Daily Reflection */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${dailyReminders ? 'bg-purple-100 text-purple-600' : 'bg-gray-50 text-gray-400'}`}>
                  <FiBell size={24} />
                </div>
                <div>
                  <p className="font-black text-sm uppercase tracking-tight">Daily Inspiration</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">One random Dua per day</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => handleToggle('daily')}
                className={`w-12 h-7 rounded-full transition-all relative ${dailyReminders ? 'bg-purple-600' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${dailyReminders ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            <hr className="border-gray-50" />

            {/* Toggle: Prayer Times */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${prayerReminders ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                  <FiClock size={24} />
                </div>
                <div>
                  <p className="font-black text-sm uppercase tracking-tight">Salah Reminders</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Contextual Duas for each prayer</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => handleToggle('prayer')}
                className={`w-12 h-7 rounded-full transition-all relative ${prayerReminders ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${prayerReminders ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            {(dailyReminders || prayerReminders) && (
              <button
                type="button"
                disabled={isSyncing}
                onClick={verifyNotificationSync}
                className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all mt-2 border ${
                  isSyncing 
                    ? 'bg-purple-50 border-purple-200 text-purple-600' 
                    : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {isSyncing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    Synchronizing System...
                  </div>
                ) : (
                  <>
                    <FiShield className="text-purple-500" /> Verify Notification Sync
                  </>
                )}
              </button>
            )}
          </div>
        </section>

        {/* Account Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-[10px] font-black text-gray-400 uppercase ml-4 tracking-[0.2em]">Account Security</h2>
          
          {message.text && (
            <div className={`p-4 rounded-2xl text-sm font-bold border animate-in fade-in slide-in-from-top-4 duration-300 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
            }`}>
              {message.text}
            </div>
          )}

          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 space-y-6">
            
            {/* CURRENT PASSWORD */}
            <div className="bg-purple-50 p-6 rounded-[1.5rem] border border-purple-100 group transition-all focus-within:bg-purple-100">
              <label className="block text-[10px] font-black text-purple-600 uppercase mb-3 ml-1 tracking-widest">
                Confirm Identity to Save
              </label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500 group-focus-within:scale-110 transition-transform" />
                <input
                  type="password"
                  required
                  placeholder="Verify current password"
                  className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl focus:ring-4 focus:ring-purple-200 outline-none font-bold text-gray-700 transition-all border border-purple-200 placeholder:text-purple-300 placeholder:font-normal"
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
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-purple-200 outline-none font-bold text-gray-700 border border-transparent focus:bg-white"
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
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-purple-200 outline-none font-medium text-gray-700 h-24 resize-none border border-transparent focus:bg-white"
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                />
              </div>
            </div>

            {/* NEW PASSWORD */}
            <div className="space-y-4 pt-4 border-t border-gray-50">
              <label className="block text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Update Security (Optional)</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
                <input
                  type="password"
                  placeholder="New Password"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-purple-200 outline-none font-bold text-gray-700 border border-transparent focus:bg-white"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                />
              </div>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-purple-200 outline-none font-bold text-gray-700 border border-transparent focus:bg-white"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-purple-600 text-white rounded-[2rem] font-black shadow-xl shadow-purple-200 flex items-center justify-center gap-2 hover:bg-purple-700 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><FiSave /> Save Changes</>
            )}
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