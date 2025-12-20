import React, { useState, useRef, useEffect } from "react";
import {
  FiHeart, FiDownload, FiRefreshCw,
  FiCopy, FiCheck, FiBell, FiBellOff, FiArrowRight
} from "react-icons/fi";
import { toPng } from "html-to-image";
import confetti from "canvas-confetti";
import toast from "react-hot-toast"; // For pro feedback
import dailyDuas from "../data/duas";

export default function DuaSection() {
  const [dua, setDua] = useState("");
  const [isAmin, setIsAmin] = useState(false);
  const [fade, setFade] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGlobal, setIsGlobal] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [reminders, setReminders] = useState(localStorage.getItem("dua_reminder") === "true");
  
  const cardRef = useRef(null);

  // Logic to get a seeded Dua based on the date
  const getGlobalDua = () => {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    return dailyDuas[seed % dailyDuas.length];
  };

  useEffect(() => {
    setDua(getGlobalDua());
  }, []);

  // System-wide Notification Sync
  const toggleReminders = async () => {
    const newState = !reminders;
    
    if (newState) {
      // Request real browser permission if turning on
      if (!("Notification" in window)) {
        toast.error("Browser does not support notifications");
        return;
      }
      
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Please allow notifications in browser settings");
        return;
      }
    }
    
    // Save to localStorage so App.jsx can read it
    setReminders(newState);
    localStorage.setItem("dua_reminder", newState.toString());
    
    toast.success(newState ? "Daily Reminders Active 🔔" : "Reminders Silenced 🔕", {
      style: {
        borderRadius: '15px',
        background: '#1e1b4b',
        color: '#fff',
        fontSize: '12px'
      }
    });
  };

  const handleRefresh = () => {
    setFade(true);
    setIsGlobal(false);
    setTimeout(() => {
      setDua(dailyDuas[Math.floor(Math.random() * dailyDuas.length)]);
      setIsAmin(false);
      setFade(false);
    }, 300);
  };

  const triggerAmin = () => {
    if(!isAmin) {
      setIsAmin(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.7 },
        zIndex: 2000,
        colors: ['#FF0080', '#7928CA', '#0070F3']
      });
    }
  };

  const handleDownload = async () => {
    if (cardRef.current === null) return;
    setIsDownloading(true);
    
    // Slight delay to ensure UI is ready
    setTimeout(async () => {
      try {
        const dataUrl = await toPng(cardRef.current, { 
          cacheBust: true, 
          backgroundColor: '#0f172a',
          style: { borderRadius: '0' } // Ensure clean edges in file
        });
        const link = document.createElement('a');
        link.download = `Dua-${new Date().getTime()}.png`;
        link.href = dataUrl;
        link.click();
        toast.success("Saved to Gallery");
      } catch (err) {
        console.error('Download failed', err);
        toast.error("Download failed");
      } finally {
        setIsDownloading(false);
      }
    }, 100);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(dua);
    setCopied(true);
    toast.success("Dua copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="h-[100dvh] w-full px-4 flex flex-col max-w-md mx-auto select-none overflow-hidden bg-white animate-fade-in">
      
      {/* 1. Header Area */}
      <div className="flex justify-between items-center pt-6 pb-2 h-[80px]">
        <div className="flex flex-col items-start">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Status</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isGlobal ? 'bg-green-500 animate-pulse' : 'bg-orange-400'}`}></div>
            <span className="text-xs font-black text-gray-800 uppercase">
              {isGlobal ? "የጋራ ዱዓ (Global)" : "የግል (Personal)"}
            </span>
          </div>
        </div>
        
        <button
          onClick={toggleReminders}
          className={`active-haptic p-3 rounded-2xl transition-all ${
            reminders ? "bg-purple-100 text-purple-600 shadow-sm" : "bg-gray-50 text-gray-300"
          }`}
        >
          {reminders ? <FiBell size={20} className="animate-swing" /> : <FiBellOff size={20} />}
        </button>
      </div>

      {/* 2. Card Area */}
      <div className="flex-grow flex items-center justify-center py-2">
        <div className="relative w-full max-h-[55vh] aspect-[4/5]">
          <div
            ref={cardRef}
            className={`w-full h-full flex flex-col items-center justify-center p-8 sm:p-12 bg-gradient-to-br from-[#0f172a] via-[#334155] to-[#1e1b4b] rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden transition-all duration-700 border border-white/10 ${
              fade ? "opacity-0 scale-90 rotate-3" : "opacity-100 scale-100 rotate-0"
            }`}
          >
            {/* Decorative Mesh Blur */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-pink-600/30 rounded-full blur-[100px]"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-600/30 rounded-full blur-[100px]"></div>

            {/* Date Stamp */}
            <div className="absolute top-8 right-8 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
              <span className="text-[9px] font-bold text-white/80 tracking-widest uppercase">
                {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
              </span>
            </div>

            <div className="relative z-10 w-full text-center">
              <div className="mb-6 inline-block p-4 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
                <FiHeart className={`${isAmin ? 'text-pink-500 fill-pink-500 scale-110' : 'text-white/20'} transition-all duration-500`} size={32} />
              </div>
              
              <p className="text-white text-2xl sm:text-3xl font-black leading-[1.7] mb-6 dua-card-text tracking-wide drop-shadow-lg px-2">
                {dua}
              </p>
              
              <div className="flex flex-col items-center gap-1 opacity-30">
                <div className="h-1 w-12 bg-gradient-to-r from-transparent via-white to-transparent rounded-full mb-2"></div>
                <span className="text-white font-bold uppercase tracking-[0.4em] text-[8px]">Sisters Memory Wall</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Action Dock */}
      <div className="flex flex-col gap-4 pt-2 pb-8 h-auto">
        <button
          onClick={triggerAmin}
          className={`active-haptic w-full py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-2xl ${
            isAmin 
            ? "bg-green-500 text-white shadow-green-500/40" 
            : "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-500/40 animate-glow"
          }`}
        >
          <FiHeart className={isAmin ? "fill-current" : "animate-pulse"} />
          {isAmin ? "አሚን ተብሏል" : "አሚን በይ (Say Amin)"}
        </button>

        <div className="flex gap-3">
          <button onClick={copyToClipboard} className="active-haptic flex-1 h-14 flex items-center justify-center bg-gray-50 rounded-2xl text-gray-700 transition-colors">
            {copied ? <FiCheck className="text-green-500" size={20} /> : <FiCopy size={20} />}
          </button>
          
          <button 
            onClick={handleDownload}
            disabled={isDownloading}
            className={`active-haptic flex-1 h-14 bg-gray-50 rounded-2xl flex items-center justify-center transition-all ${
              isDownloading ? "text-gray-400" : "text-blue-600"
            }`}
          >
            {isDownloading ? <FiRefreshCw className="animate-spin" size={20} /> : <FiDownload size={20} />}
          </button>
          
          <button onClick={handleRefresh} className="active-haptic flex-1 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-purple-600 transition-all">
            <FiRefreshCw size={20} className={fade ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Swipe Hint */}
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <span className="text-[10px] font-bold uppercase tracking-widest">Swipe Left for feed</span>
          <FiArrowRight size={12} className="animate-bounce-x" />
        </div>
      </div>

      <style>{`
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(147, 51, 234, 0.3); }
          50% { box-shadow: 0 0 40px rgba(147, 51, 234, 0.6); }
        }
        .animate-glow { animation: glow 3s infinite; }
        
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(5px); }
        }
        .animate-bounce-x { animation: bounce-x 1s infinite; }
      `}</style>
    </section>
  );
}