import React from "react";
import { FiSearch, FiX, FiHeart, FiHome, FiMessageCircle, FiUser, FiLayout } from "react-icons/fi";
import { FaPrayingHands } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";

export default function Header({ searchQuery, setSearchQuery, filterType, setFilterType, showControls = false }) {
  const location = useLocation();

  // Helper to check if a link is active for desktop styling
  const isActive = (path) => location.pathname === path;

  return (
    <header className="text-center mb-8 pt-8 px-4 animate-fade-in relative">
      
      {/* --- DESKTOP NAVIGATION MENU --- */}
      {/* Visible only on tablets and desktops (sm and up) */}
      <nav className="hidden sm:flex items-center justify-center gap-8 mb-8">
        <Link to="/" className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors ${isActive("/") ? "text-purple-600" : "text-gray-400 hover:text-purple-500"}`}>
          <FiHome size={16} /> Home
        </Link>
        <Link to="/feed" className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors ${isActive("/feed") ? "text-purple-600" : "text-gray-400 hover:text-purple-500"}`}>
          <FiLayout size={16} /> Feed
        </Link>
        <Link to="/messages" className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors ${isActive("/messages") ? "text-purple-600" : "text-gray-400 hover:text-purple-500"}`}>
          <FiMessageCircle size={16} /> Chat
        </Link>
        <Link to="/profile" className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors ${isActive("/profile") ? "text-purple-600" : "text-gray-400 hover:text-purple-500"}`}>
          <FiUser size={16} /> Me
        </Link>
      </nav>

      <div className="inline-block relative mb-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-emerald-600 to-indigo-700 drop-shadow-sm">
          Sisters’ Memory Wall
        </h1>
        <div className="h-1 w-32 bg-gradient-to-r from-purple-400 via-emerald-300 to-indigo-400 mx-auto rounded-full mt-2 opacity-60"></div>
      </div>
      
      <p className="text-gray-600 text-sm sm:text-base font-medium italic mb-8">
        "To my three sisters — always proud of you" 🤍
      </p>

      {/* Only show search and filters if we are on the Feed page */}
      {showControls && (
        <div className="max-w-xl mx-auto space-y-4">
          <div className="relative group">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors" size={18} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories or requests..."
              className="w-full pl-12 pr-12 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-300 transition-all text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 p-1">
                <FiX size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 p-1 bg-gray-200/50 rounded-xl w-fit mx-auto border border-gray-200">
            <button 
              onClick={() => setFilterType("all")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'all' ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <FiHeart size={14} className={filterType === 'all' ? "text-purple-500" : ""} />
              All Feed
            </button>
            <button 
              onClick={() => setFilterType("dua")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'dua' ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
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