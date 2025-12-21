import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiHome, FiMessageCircle, FiMessageSquare, FiUser, FiSettings } from "react-icons/fi";
import { getUnreadCounts, markMessagesAsRead } from "../api"; 
import io from "socket.io-client";

// --- UPDATED INTERACTIVE NAV ITEM ---
function NavItem({ to, icon: Icon, label, active, badgeCount }) {
  return (
    <Link 
      to={to} 
      className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all duration-300 active:scale-90`}
    >
      {/* Icon Container with background circle that appears when active */}
      <div className={`relative p-2 rounded-2xl transition-all duration-500 transform ${
        active 
          ? 'bg-purple-100 text-purple-600 shadow-inner -translate-y-1' 
          : 'text-gray-400 hover:text-purple-300'
      }`}>
        <Icon size={22} strokeWidth={active ? 2.5 : 2} />
        
        {/* Badge - Positioned relative to the icon */}
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white border-2 border-white shadow-lg animate-bounce">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </div>

      {/* Label - Slides up and fades in */}
      <span className={`text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300 mt-1 ${
        active ? 'opacity-100 translate-y-0 text-purple-600' : 'opacity-0 translate-y-2 text-transparent'
      }`}>
        {label}
      </span>

      {/* Active Indicator Dot (Bottom) */}
      <div className={`w-1 h-1 rounded-full bg-purple-600 transition-all duration-500 mt-0.5 ${
        active ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
      }`} />
    </Link>
  );
}

export default function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;
  const username = localStorage.getItem("username");

  const [unreadChat, setUnreadChat] = useState(0);
  const [unreadFeed, setUnreadFeed] = useState(0);
  const justMarkedRead = useRef({ chat: false, feed: false });

  // API & Socket Logic (Keeping your existing logic)
  const fetchCounts = async () => {
    if (!navigator.onLine) return; 
    try {
      const data = await getUnreadCounts();
      if (!justMarkedRead.current.chat) setUnreadChat(data.unreadChat);
      if (!justMarkedRead.current.feed) setUnreadFeed(data.unreadFeed);
    } catch (err) { console.warn("Poll failed"); }
  };

  useEffect(() => {
    fetchCounts();
    const socket = io(import.meta.env.VITE_API_URL, {
      auth: { token: localStorage.getItem("token") }
    });

    socket.on("newMessage", (msg) => {
      if (currentPath !== "/messages" && msg.author !== username) setUnreadChat(prev => prev + 1);
    });

    socket.on("newPost", (post) => {
      if (currentPath !== "/feed" && post.author !== username) setUnreadFeed(prev => prev + 1);
    });

    const interval = setInterval(fetchCounts, 15000);
    return () => { socket.disconnect(); clearInterval(interval); };
  }, [currentPath, username]);

  useEffect(() => {
    const markAsRead = async () => {
      if (currentPath === "/messages" && unreadChat > 0) {
        justMarkedRead.current.chat = true;
        setUnreadChat(0);
        try { await markMessagesAsRead('chat'); setTimeout(() => { justMarkedRead.current.chat = false; }, 3000); } catch (err) { justMarkedRead.current.chat = false; }
      }
      if (currentPath === "/feed" && unreadFeed > 0) {
        justMarkedRead.current.feed = true;
        setUnreadFeed(0);
        try { await markMessagesAsRead('feed'); setTimeout(() => { justMarkedRead.current.feed = false; }, 3000); } catch (err) { justMarkedRead.current.feed = false; }
      }
    };
    markAsRead();
  }, [currentPath, unreadChat, unreadFeed]);

  return (
    // Glassmorphism Container
    <nav className="fixed bottom-1 left-4 right-4 bg-white/70 backdrop-blur-2xl border border-white/20 px-2 py-2 z-[1000] rounded-[2.5rem] shadow-[0_15px_35px_-5px_rgba(0,0,0,0.1)] sm:hidden">
      <div className="flex justify-between items-end h-14">
        <NavItem to="/" icon={FiHome} label="Home" active={currentPath === "/"} />
        <NavItem to="/feed" icon={FiMessageCircle} label="Feed" active={currentPath === "/feed"} badgeCount={unreadFeed} />
        <NavItem to="/messages" icon={FiMessageSquare} label="Chat" active={currentPath === "/messages"} badgeCount={unreadChat} />
        <NavItem to="/profile" icon={FiUser} label="Me" active={currentPath.startsWith("/profile")} />
        <NavItem to="/settings" icon={FiSettings} label="Setup" active={currentPath === "/settings"} />
      </div>
    </nav>
  );
}