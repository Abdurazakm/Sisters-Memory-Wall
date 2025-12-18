import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiHome, FiMessageCircle, FiMessageSquare, FiUser, FiSettings } from "react-icons/fi";
import { getUnreadCounts, markMessagesAsRead } from "../api"; 

function NavItem({ to, icon: Icon, label, active, badgeCount }) {
  return (
    <Link to={to} className={`flex flex-col items-center gap-1 transition-all relative ${active ? 'text-purple-600 scale-110' : 'text-gray-400 hover:text-purple-400'}`}>
      <div className={`p-2 rounded-2xl transition-all ${active ? 'bg-purple-100' : 'hover:bg-gray-100'}`}>
        <Icon size={24} />
      </div>
      {badgeCount > 0 && (
        <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white border-2 border-white animate-pulse shadow-sm">
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      )}
      <span className={`text-[10px] font-black uppercase tracking-widest transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0'}`}>
        {label}
      </span>
    </Link>
  );
}

export default function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  const [unreadChat, setUnreadChat] = useState(0);
  const [unreadFeed, setUnreadFeed] = useState(0);

  const fetchCounts = async () => {
    if (!navigator.onLine) return; 
    try {
      const data = await getUnreadCounts();
      setUnreadChat(data.unreadChat);
      setUnreadFeed(data.unreadFeed);
    } catch (err) {
      console.warn("Notification poll failed");
    }
  };

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const syncReadStatus = async () => {
      // HANDLE CHAT NOTIFICATIONS
      if (currentPath === "/messages" && unreadChat > 0) {
        const prevChat = unreadChat;
        setUnreadChat(0); // Optimistic clear
        try {
          await markMessagesAsRead('chat');
        } catch (err) {
          setUnreadChat(prevChat); // Revert if failed
        }
      }

      // HANDLE FEED NOTIFICATIONS
      if (currentPath === "/feed" && unreadFeed > 0) {
        const prevFeed = unreadFeed;
        setUnreadFeed(0); // Optimistic clear
        try {
          await markMessagesAsRead('feed');
        } catch (err) {
          setUnreadFeed(prevFeed); // Revert if failed
        }
      }
    };

    syncReadStatus();
  }, [currentPath, unreadChat, unreadFeed]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-6 py-3 z-[1000] shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)] sm:hidden">
      <div className="max-w-lg mx-auto flex justify-between items-center">
        <NavItem to="/" icon={FiHome} label="Home" active={currentPath === "/"} />
        <NavItem to="/feed" icon={FiMessageCircle} label="Feed" active={currentPath === "/feed"} badgeCount={unreadFeed} />
        <NavItem to="/messages" icon={FiMessageSquare} label="Chat" active={currentPath === "/messages"} badgeCount={unreadChat} />
        <NavItem to="/profile" icon={FiUser} label="Me" active={currentPath.startsWith("/profile")} />
        <NavItem to="/settings" icon={FiSettings} label="Setup" active={currentPath === "/settings"} />
      </div>
    </nav>
  );
}