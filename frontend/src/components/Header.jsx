import React from "react";
import { FiSearch, FiX, FiHeart, FiHome, FiMessageCircle, FiUser, FiLayout } from "react-icons/fi";
import { FaPrayingHands } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";

export default function Header({ searchQuery, setSearchQuery, filterType, setFilterType, showControls = false }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <header className="text-center mb-8 pt-8 px-4 animate-fade-in relative max-w-2xl mx-auto">
      
      {/* --- DESKTOP NAVIGATION --- */}
      <nav className="hidden sm:flex items-center justify-center gap-8 mb-10">
        {[
          { path: "/", icon: <FiHome />, label: "Home" },
          { path: "/feed", icon: <FiLayout />, label: "Feed" },
          { path: "/messages", icon: <FiMessageCircle />, label: "Chat" },
          { path: "/profile", icon: <FiUser />, label: "Me" },
        ].map((item) => (
          <Link 
            key={item.path}
            to={item.path} 
            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 hover:scale-110 ${
              isActive(item.path) ? "text-purple-600" : "text-gray-400 hover:text-purple-400"
            }`}
          >
            {item.icon} {item.label}
          </Link>
        ))}
      </nav>

      {/* --- TITLE SECTION --- */}
      <div className="relative inline-block mb-3 group cursor-default">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-emerald-600 to-indigo-700 transition-transform duration-500 group-hover:scale-105">
          Sisters’ Memory Wall
        </h1>
        {/* Animated Underline */}
        <div className="h-1.5 w-24 bg-gradient-to-r from-purple-400 to-emerald-400 mx-auto rounded-full mt-2 opacity-40 group-hover:w-full transition-all duration-700"></div>
      </div>
      
      <p className="text-gray-500 text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] mb-10 italic opacity-80">
        "To my Four sisters — always proud of you" 🤍
      </p>

      {/* --- SEARCH & FILTERS --- */}
      {showControls && (
        <div className="max-w-md mx-auto space-y-5 animate-in slide-in-from-bottom-4 duration-700">
          
          {/* Enhanced Search Bar */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-purple-500 group-focus-within:scale-110 transition-all duration-300">
              <FiSearch size={20} />
            </div>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories..."
              className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-transparent rounded-[1.5rem] outline-none focus:bg-white focus:border-purple-200 focus:ring-8 focus:ring-purple-500/5 shadow-sm transition-all duration-300 text-sm font-semibold placeholder:text-gray-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors p-1"
              >
                <FiX size={20} />
              </button>
            )}
          </div>

          {/* Interactive Filter Pills */}
          <div className="flex items-center justify-center gap-2 p-1.5 bg-gray-100 rounded-[1.2rem] w-fit mx-auto border border-gray-200/50">
            <button 
              onClick={() => setFilterType("all")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 ${
                filterType === 'all' 
                ? "bg-white text-gray-900 shadow-md shadow-gray-200/50 scale-105" 
                : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <FiHeart size={14} className={filterType === 'all' ? "text-purple-500 fill-purple-500" : ""} />
              All Feed
            </button>
            
            <button 
              onClick={() => setFilterType("dua")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 ${
                filterType === 'dua' 
                ? "bg-white text-emerald-700 shadow-md shadow-emerald-200/50 scale-105" 
                : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <FaPrayingHands size={14} className={filterType === 'dua' ? "text-emerald-500" : ""} />
              Only Duas
            </button>
          </div>
        </div>
      )}
    </header>
  );
}