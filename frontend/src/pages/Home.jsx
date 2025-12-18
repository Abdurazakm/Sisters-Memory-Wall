import { useEffect, useState, useRef } from "react";
import Header from "../components/Header";
import SisterCard from "../components/SisterCard";
import DuaSection from "../components/DuaSection";
import sistersData from "../data/sisters"; 
import { useNavigate } from "react-router-dom";
import { 
  FiLayout, FiMessageCircle, FiLogOut, FiZap, 
  FiLoader, FiPlusCircle, FiArrowRight, FiUser, FiChevronDown, FiSettings 
} from "react-icons/fi";
import { FaPrayingHands } from "react-icons/fa";
import DuaCard from "../components/DuaCard";
import { getUserProfile } from "../api"; 

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

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
        if (profile.profile_photo) {
          const fullUrl = profile.profile_photo.startsWith('http') 
            ? profile.profile_photo 
            : `${BACKEND_URL}${profile.profile_photo}`;
          setUserPhoto(fullUrl);
        }
      }
    } catch (err) {
      console.error("Error fetching header profile photo:", err);
    }
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
    } catch (err) {
      console.error("Error fetching latest dua:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestDua();
    fetchHeaderProfile();

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-emerald-50 p-3 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        <Header />

        {/* --- QUICK ACTION DASHBOARD --- */}
        {/* Adjusted padding and gap for mobile (p-4 and gap-3) */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-8 bg-white/80 backdrop-blur-md p-4 rounded-3xl shadow-sm border border-purple-100 relative z-40">
          
          {/* Action Buttons: Stack on mobile, row on desktop */}
          <div className="flex flex-col xs:flex-row flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => navigate("/feed")}
              className="flex-1 group flex items-center justify-center sm:justify-start gap-2 bg-purple-600 text-white px-5 py-3 rounded-2xl hover:bg-purple-700 transition-all shadow-md active:scale-95"
            >
              <FiLayout className="transition-transform" /> 
              <span className="font-bold text-sm">Feed</span>
            </button>
            
            <button
              onClick={() => navigate("/feed", { state: { openDuaModal: true } })}
              className="flex-1 flex items-center justify-center sm:justify-start gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl hover:bg-emerald-700 transition-all shadow-md active:scale-95"
            >
              <FaPrayingHands /> 
              <span className="font-bold text-sm">Request Dua</span>
            </button>

            <button
              onClick={() => navigate("/messages")}
              className="flex-1 flex items-center justify-center sm:justify-start gap-2 bg-white text-gray-700 border border-gray-200 px-5 py-3 rounded-2xl hover:bg-gray-50 transition-all font-bold text-sm shadow-sm"
            >
              <FiMessageCircle className="text-purple-500" /> Chat
            </button>
          </div>

          {/* --- USER DROPDOWN --- */}
          <div className="relative mt-2 sm:mt-0" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full flex items-center justify-between sm:justify-start gap-2 bg-white border border-gray-100 p-1.5 pr-4 rounded-2xl hover:shadow-md transition-all active:scale-95"
            >
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white overflow-hidden shadow-inner border border-purple-100">
                  {userPhoto ? (
                    <img src={userPhoto} alt="Me" className="w-full h-full object-cover" />
                  ) : (
                    <FiUser size={20} />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Signed in</p>
                  <p className="text-sm font-black text-gray-800 leading-none truncate max-w-[100px]">{currentUser || "Sister"}</p>
                </div>
              </div>
              <FiChevronDown className={`text-gray-400 transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu - Mobile optimized positioning */}
            {showDropdown && (
              <div className="absolute right-0 left-0 sm:left-auto mt-2 sm:w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[100] py-2 animate-in fade-in slide-in-from-top-2 ring-1 ring-black/5">
                <button 
                  onClick={() => { navigate("/profile"); setShowDropdown(false); }}
                  className="w-full flex items-center gap-3 px-4 py-4 sm:py-3 text-sm font-bold text-gray-700 hover:bg-purple-50 transition-colors"
                >
                  <FiUser className="text-purple-500" size={18} /> View Profile
                </button>
                <button 
                  onClick={() => { navigate("/settings"); setShowDropdown(false); }}
                  className="w-full flex items-center gap-3 px-4 py-4 sm:py-3 text-sm font-bold text-gray-700 hover:bg-purple-50 transition-colors"
                >
                  <FiSettings className="text-gray-400" size={18} /> Settings
                </button>
                <div className="h-px bg-gray-100 my-1 mx-2"></div>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-4 sm:py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                >
                  <FiLogOut size={18} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* --- DUA SPOTLIGHT SECTION --- */}
        <section className="mb-10 relative z-10 px-1">
          <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between mb-5 gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-2 rounded-xl shadow-md">
                <FiZap className={`${loading ? 'animate-pulse' : ''} text-white`} size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-800 leading-none">Latest Dua</h2>
                <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1">From the Family</p>
              </div>
            </div>
            {!loading && latestDua && (
               <button 
                 onClick={() => navigate("/feed")}
                 className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-3 py-2 rounded-full flex items-center gap-1"
               >
                 VIEW ALL <FiArrowRight />
               </button>
            )}
          </div>

          {loading ? (
            <div className="w-full h-40 bg-white/50 border-2 border-dashed border-emerald-200 rounded-3xl flex flex-col items-center justify-center text-emerald-600 animate-pulse">
              <FiLoader className="animate-spin mb-2" size={24} />
              <span className="text-xs font-bold">Loading...</span>
            </div>
          ) : latestDua ? (
            <DuaCard 
              post={latestDua} 
              currentUser={currentUser} 
              onRefresh={fetchLatestDua} 
              isMine={latestDua.author === currentUser}
            />
          ) : (
            <div 
              onClick={() => navigate("/feed", { state: { openDuaModal: true } })}
              className="text-center py-10 bg-white/40 rounded-3xl border-2 border-dashed border-purple-200"
            >
              <FiPlusCircle className="text-purple-300 mx-auto mb-2" size={28} />
              <p className="text-gray-500 text-sm font-bold">Ask for a Dua</p>
            </div>
          )}
        </section>

        {/* --- SISTERS GALLERY --- */}
        <section className="relative z-0 px-1">
          <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900 leading-none">Sisters</h2>
                <div className="h-1 w-8 bg-purple-500 rounded-full mt-2"></div>
              </div>
              <span className="text-gray-400 text-[9px] font-black uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm">
                  {sistersData.length} Sisters
              </span>
          </div>
          
          {/* Grid: 1 column on phone, 2 on tablet, 3 on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {sistersData.map((s) => (
              <SisterCard key={s.id} sister={s} />
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="mt-16 pt-10 border-t border-purple-100">
          <DuaSection />
          <p className="text-center text-gray-400 text-[9px] font-bold mt-10 uppercase tracking-[0.3em] pb-10">
            Sisters Memory Wall &copy; 2024
          </p>
        </div>

      </div>
    </div>
  );
}