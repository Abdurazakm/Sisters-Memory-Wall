import { useEffect, useState, useRef } from "react";
import Header from "../components/Header";
import SisterCard from "../components/SisterCard";
import DuaSection from "../components/DuaSection";
import BottomNav from "../components/BottomNav";
import sistersData from "../data/sisters"; 
import { useNavigate } from "react-router-dom";
import { 
  FiLayout, FiMessageCircle, FiLogOut, FiZap, 
  FiLoader, FiPlusCircle, FiArrowRight, FiUser, FiChevronDown, FiSettings 
} from "react-icons/fi";
import { FaPrayingHands } from "react-icons/fa";
import DuaCard from "../components/DuaCard";
import { getUserProfile } from "../api"; 

const BACKEND_URL = import.meta.env.VITE_API_URL;

export default function Home() {
  const navigate = useNavigate();
  const [latestDua, setLatestDua] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [userPhoto, setUserPhoto] = useState(null);
  const dropdownRef = useRef(null);
  
  const currentUser = localStorage.getItem("username");

  const fetchHeaderProfile = async () => {
    try {
      if (currentUser) {
        const profile = await getUserProfile(currentUser);
        if (profile?.profile_photo) {
          const fullUrl = profile.profile_photo.startsWith('http') 
            ? profile.profile_photo 
            : `${BACKEND_URL}${profile.profile_photo}`;
          setUserPhoto(fullUrl);
        }
      }
    } catch (err) { console.error("Profile fetch error:", err); }
  };

  const fetchLatestDua = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/posts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const dua = data.find((p) => p.type === "dua");
      setLatestDua(dua);
    } catch (err) { console.error("Dua fetch error:", err); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchLatestDua();
    fetchHeaderProfile();
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    localStorage.clear();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-[#fafafa] pb-32 overflow-x-hidden">
      {/* Premium Gradient Background Blob for Mobile */}
      <div className="fixed top-0 left-0 w-full h-64 bg-gradient-to-b from-purple-100/50 to-transparent -z-10" />

      <div className="max-w-6xl mx-auto px-4 pt-4">
        
        <Header />

        {/* --- MOBILE OPTIMIZED USER BAR --- */}
        <div className="flex items-center justify-between mb-8 mt-2 bg-white p-2 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 pl-2">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white overflow-hidden shadow-lg ring-2 ring-white">
              {userPhoto ? <img src={userPhoto} className="w-full h-full object-cover" /> : <FiUser size={20} />}
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Assalamu Alaikum,</p>
              <p className="text-sm font-black text-gray-800">{currentUser || "Sister"}</p>
            </div>
          </div>
          
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-3 text-gray-400 hover:text-purple-600 transition-colors"
            >
              <FiSettings size={20} className={showDropdown ? 'rotate-90 transition-transform' : ''} />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-3 w-48 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 z-[100] py-2 animate-in fade-in slide-in-from-top-2">
                <button onClick={() => navigate("/profile")} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-gray-600 hover:bg-purple-50 transition-colors uppercase tracking-widest"><FiUser size={14} /> Profile</button>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-red-500 hover:bg-red-50 transition-colors uppercase tracking-widest"><FiLogOut size={14} /> Logout</button>
              </div>
            )}
          </div>
        </div>

        {/* --- HORIZONTAL ACTION SCROLLER (Best for Mobile Thumbs) --- */}
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => navigate("/feed")}
            className="flex-shrink-0 flex items-center gap-3 bg-purple-600 text-white px-6 py-4 rounded-[1.8rem] shadow-xl shadow-purple-200 active:scale-95 transition-all"
          >
            <FiLayout size={18}/> 
            <span className="font-black text-xs uppercase tracking-widest">Feed</span>
          </button>
          
          <button
            onClick={() => navigate("/feed", { state: { openDuaModal: true } })}
            className="flex-shrink-0 flex items-center gap-3 bg-emerald-500 text-white px-6 py-4 rounded-[1.8rem] shadow-xl shadow-emerald-100 active:scale-95 transition-all"
          >
            <FaPrayingHands size={18}/> 
            <span className="font-black text-xs uppercase tracking-widest">Dua</span>
          </button>

          <button
            onClick={() => navigate("/messages")}
            className="flex-shrink-0 flex items-center gap-3 bg-white text-gray-700 px-6 py-4 rounded-[1.8rem] shadow-sm border border-gray-100 active:scale-95 transition-all"
          >
            <FiMessageCircle size={18} className="text-purple-500" />
            <span className="font-black text-xs uppercase tracking-widest">Chat</span>
          </button>
        </div>

        {/* --- LATEST DUA SECTION --- */}
        <section className="mt-8 mb-10">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Latest Dua request</h2>
            </div>
            {latestDua && (
               <button onClick={() => navigate("/feed")} className="text-[10px] font-black text-purple-600 flex items-center gap-1 uppercase">
                 All <FiArrowRight />
               </button>
            )}
          </div>

          {loading ? (
            <div className="w-full h-32 bg-white rounded-3xl border border-gray-100 flex items-center justify-center">
              <FiLoader className="animate-spin text-purple-200" size={24} />
            </div>
          ) : latestDua ? (
            <div className="transform scale-[0.98] sm:scale-100">
               <DuaCard post={latestDua} currentUser={currentUser} onRefresh={fetchLatestDua} isMine={latestDua.author === currentUser} />
            </div>
          ) : (
            <div onClick={() => navigate("/feed", { state: { openDuaModal: true } })} className="py-8 bg-white rounded-[2rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-purple-300 transition-colors">
              <FiPlusCircle size={24} className="mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest">Ask for a Dua</p>
            </div>
          )}
        </section>

        {/* --- SISTERS GALLERY --- */}
        <section className="mt-12">
          <div className="mb-6 flex items-end justify-between px-1">
              <div>
                <h2 className="text-2xl font-black text-gray-900 leading-none">Sisters</h2>
                <div className="h-1 w-6 bg-purple-500 rounded-full mt-2"></div>
              </div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  {sistersData.length} total
              </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sistersData.map((s) => (
              <SisterCard key={s.id} sister={s} />
            ))}
          </div>
        </section>

        {/* Footer/Bottom Dua Component */}
        <div className="mt-16 pt-10 border-t border-gray-100">
          <DuaSection />
          <p className="text-center text-gray-300 text-[8px] font-black mt-10 uppercase tracking-[0.4em] pb-10">
            Sisters Memory Wall &copy; 2024
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}