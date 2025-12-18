import { useEffect, useState } from "react";
import Header from "../components/Header";
import SisterCard from "../components/SisterCard";
import DuaSection from "../components/DuaSection";
import sisters from "../data/sisters";
import { useNavigate } from "react-router-dom";
import { FiLayout, FiMessageCircle, FiLogOut, FiZap, FiLoader, FiPlusCircle } from "react-icons/fi";
import { FaPrayingHands } from "react-icons/fa";
import DuaCard from "../components/DuaCard";

const BACKEND_URL = "http://localhost:4000";

export default function Home() {
  const navigate = useNavigate();
  const [latestDua, setLatestDua] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentUser = localStorage.getItem("username");

  const fetchLatestDua = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/posts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      
      // Get the most recent Dua
      const dua = data.find((p) => p.type === "dua");
      setLatestDua(dua);
    } catch (err) {
      console.error("Error fetching latest dua:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestDua();
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        <Header />

        {/* Dashboard Actions */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8 bg-white p-4 rounded-2xl shadow-sm border border-purple-100">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/feed")}
              className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700 transition shadow-lg shadow-purple-200"
            >
              <FiLayout /> Family Feed
            </button>
            
            {/* NEW: Request Dua Shortcut */}
            <button
              onClick={() => navigate("/feed", { state: { openDuaModal: true } })}
              className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
            >
              <FaPrayingHands /> Request Dua
            </button>

            <button
              onClick={() => navigate("/messages")}
              className="flex items-center gap-2 bg-white text-purple-600 border border-purple-200 px-5 py-2.5 rounded-xl hover:bg-purple-50 transition"
            >
              <FiMessageCircle /> Open Chat
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition font-medium"
          >
            <FiLogOut /> Logout
          </button>
        </div>

        {/* LATEST DUA SPOTLIGHT SECTION */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2 text-emerald-700">
              <div className="bg-emerald-100 p-1.5 rounded-lg">
                <FiZap className={`${loading ? 'animate-pulse' : ''} fill-emerald-500 text-emerald-600`} size={18} />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight">Active Dua Request</h2>
            </div>
            {!loading && latestDua && (
               <button 
               onClick={() => navigate("/feed")}
               className="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition"
             >
               View all →
             </button>
            )}
          </div>

          {loading ? (
            <div className="w-full h-40 bg-white/50 border-2 border-dashed border-emerald-200 rounded-3xl flex flex-col items-center justify-center text-emerald-600 animate-pulse">
              <FiLoader className="animate-spin mb-2" size={24} />
              <span className="text-sm font-bold italic">Gathering prayers...</span>
            </div>
          ) : latestDua ? (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              <DuaCard 
                post={latestDua} 
                currentUser={currentUser} 
                onRefresh={fetchLatestDua} 
                isMine={latestDua.author === currentUser}
              />
            </div>
          ) : (
            <div 
              onClick={() => navigate("/feed", { state: { openDuaModal: true } })}
              className="group cursor-pointer text-center py-10 bg-white/40 rounded-3xl border-2 border-dashed border-purple-200 hover:border-emerald-300 transition-all"
            >
              <FiPlusCircle className="mx-auto text-purple-300 group-hover:text-emerald-500 transition-colors mb-2" size={32} />
              <p className="italic text-gray-400 text-sm font-medium">No active Dua requests. Tap to create one.</p>
            </div>
          )}
        </div>

        {/* Sister Cards Section */}
        <div className="mb-6 px-2 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">Our Sisters</h2>
            <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                    {sisters.length} Connected
                </span>
            </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {sisters.map((s) => (
            <SisterCard key={s.id} sister={s} />
          ))}
        </div>

        <div className="mt-12 pt-12 border-t border-purple-100">
          <DuaSection />
        </div>

      </div>
    </div>
  );
}