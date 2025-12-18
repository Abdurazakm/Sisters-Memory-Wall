import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FiHome, FiMessageCircle, FiMessageSquare, FiUser, FiSettings } from "react-icons/fi";

function NavItem({ to, icon: Icon, label, active }) {
  return (
    <Link to={to} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-purple-600 scale-110' : 'text-gray-400 hover:text-purple-400'}`}>
      <div className={`p-2 rounded-2xl transition-all ${active ? 'bg-purple-100' : 'hover:bg-gray-100'}`}>
        <Icon size={24} />
      </div>
      <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
    </Link>
  );
}

export default function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-6 py-3 z-[1000] shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)]">
      <div className="max-w-lg mx-auto flex justify-between items-center">
        <NavItem to="/" icon={FiHome} label="Home" active={currentPath === "/"} />
        <NavItem to="/feed" icon={FiMessageCircle} label="Feed" active={currentPath === "/feed"} />
        <NavItem to="/messages" icon={FiMessageSquare} label="Chat" active={currentPath === "/messages"} />
        <NavItem to="/profile" icon={FiUser} label="Me" active={currentPath.startsWith("/profile")} />
        <NavItem to="/settings" icon={FiSettings} label="Setup" active={currentPath === "/settings"} />
      </div>
    </nav>
  );
}