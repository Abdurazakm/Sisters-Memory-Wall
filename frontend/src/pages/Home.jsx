import { useEffect, useState } from "react";
import Header from "../components/Header";
import SisterCard from "../components/SisterCard";
import DuaSection from "../components/DuaSection";
import sisters from "../data/sisters";
import { useNavigate } from "react-router-dom";
import { 
  FiLayout, FiMessageCircle, FiLogOut, FiZap, 
  FiLoader, FiPlusCircle, FiArrowRight 
} from "react-icons/fi";
import { FaPrayingHands } from "react-icons/fa";
import DuaCard from "../components/DuaCard";

// Using the same URL logic as FeedPage for consistency
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

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
      
      // Logic: Find the most recent post with type 'dua'
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
    window.location.href = "/login"; // Force redirect to clear state
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-emerald-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Main Brand Header */}
        <Header />

        {/* --- QUICK ACTION DASHBOARD --- */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-10 bg-white/80 backdrop-blur-sm p-5 rounded-3xl shadow-sm border border-purple-100">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/feed")}
              className="group flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-2xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 active:scale-95"
            >
              <FiLayout className="group-hover:rotate-12 transition-transform" /> 
              <span className="font-bold text-sm">Family Feed</span>
            </button>
            
            <button
              onClick={() => navigate("/feed", { state: { openDuaModal: true } })}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
            >
              <FaPrayingHands /> 
              <span className="font-bold text-sm">Request Dua</span>
            </button>

            <button
              onClick={() => navigate("/messages")}
              className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-6 py-3 rounded-2xl hover:bg-gray-50 transition-all font-bold text-sm"
            >
              <FiMessageCircle className="text-purple-500" /> Sisters' Chat
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-400 hover:text-red-500 px-4 py-2 rounded-xl transition-colors text-sm font-bold"
          >
            <FiLogOut /> Logout
          </button>
        </div>

        {/* --- DUA SPOTLIGHT SECTION --- */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-100">
                <FiZap className={`${loading ? 'animate-pulse' : ''} text-white`} size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-800 tracking-tight leading-none">Family Dua Spotlight</h2>
                <p className="text-[11px] text-emerald-600 font-bold uppercase mt-1 tracking-widest">Urgent Requests</p>
              </div>
            </div>
            {!loading && latestDua && (
               <button 
               onClick={() => navigate("/feed")}
               className="flex items-center gap-1 text-xs font-black text-emerald-600 hover:gap-2 transition-all bg-emerald-50 px-3 py-1.5 rounded-full"
             >
               VIEW ALL FEED <FiArrowRight />
             </button>
            )}
          </div>

          {loading ? (
            <div className="w-full h-44 bg-white/50 border-2 border-dashed border-emerald-200 rounded-[2rem] flex flex-col items-center justify-center text-emerald-600 animate-pulse">
              <FiLoader className="animate-spin mb-3" size={30} />
              <span className="text-sm font-bold italic">Gathering family prayers...</span>
            </div>
          ) : latestDua ? (
            <div className="transform hover:scale-[1.01] transition-transform duration-300">
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
              className="group cursor-pointer text-center py-12 bg-white/40 rounded-[2rem] border-2 border-dashed border-purple-200 hover:border-emerald-400 hover:bg-white transition-all duration-300"
            >
              <div className="bg-purple-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-emerald-100 transition-colors">
                <FiPlusCircle className="text-purple-400 group-hover:text-emerald-500 transition-colors" size={32} />
              </div>
              <p className="text-gray-500 font-bold">No active Dua requests</p>
              <p className="text-gray-400 text-xs mt-1 italic">Be the first to ask the family for prayers today.</p>
            </div>
          )}
        </section>

        {/* --- SISTERS GALLERY --- */}
        <section>
          <div className="mb-8 px-2 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Our Sisters</h2>
                <div className="h-1.5 w-12 bg-purple-500 rounded-full mt-1"></div>
              </div>
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
                  <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-gray-600 text-[10px] font-black uppercase tracking-[0.2em]">
                      {sisters.length} Profiles
                  </span>
              </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {sisters.map((s) => (
              <SisterCard key={s.id} sister={s} />
            ))}
          </div>
        </section>

        {/* Footer Section */}
        <div className="mt-20 pt-12 border-t border-purple-100">
          <DuaSection />
          <p className="text-center text-gray-400 text-[10px] font-bold mt-12 uppercase tracking-widest pb-8">
            Created with love for the family &copy; 2024
          </p>
        </div>

      </div>
    </div>
  );
}