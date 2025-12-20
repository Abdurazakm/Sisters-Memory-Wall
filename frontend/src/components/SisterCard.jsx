import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { FiLock, FiUnlock, FiX } from "react-icons/fi";

export default function SisterCard({ sister }) {
  const [showSurprise, setShowSurprise] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [bounce, setBounce] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [isSwapping, setIsSwapping] = useState(false);
  
  const slowConfettiInterval = useRef(null);
  const galleryIntervalRef = useRef(null);
  const audioRef = useRef(null);
  const swapAudioRef = useRef(null); 

  const today = new Date().toISOString().split("T")[0];
  const unlocked = sister.graduationDate && today >= sister.graduationDate;
  const gallery = sister.gallery || [sister.photo];
  const captions = sister.galleryCaptions || [sister.caption || "🎓 Congratulations!"];

  // 1. BIG FRONT BURST (Large particles, highest Z-index)
  const fireBurst = () => {
    const common = {
      particleCount: 60,
      spread: 90,
      scalar: 1.5, // Makes confetti 50% larger
      zIndex: 2000,
      colors: ['#a855f7', '#fb7185', '#ffffff', '#FFD700', '#4ade80']
    };

    confetti({ ...common, angle: 60, origin: { x: 0, y: 0.7 } });
    confetti({ ...common, angle: 120, origin: { x: 1, y: 0.7 } });
  };

  // 2. CONTINUOUS CELEBRATION RAIN (Large falling pieces)
  const startContinuousRain = () => {
    stopConfettiTimers(); 
    slowConfettiInterval.current = setInterval(() => {
      confetti({
        particleCount: 5,
        startVelocity: 0,
        ticks: 300,
        gravity: 1.2, // Faster fall
        origin: { x: Math.random(), y: -0.1 },
        zIndex: 2000,
        scalar: 1.2, // Larger pieces
        colors: ['#a855f7', '#ffffff', '#fb7185'],
      });
    }, 400); 
  };

  const stopConfettiTimers = () => {
    if (slowConfettiInterval.current) clearInterval(slowConfettiInterval.current);
  };

  const startGallery = () => {
    clearInterval(galleryIntervalRef.current);
    galleryIntervalRef.current = setInterval(() => {
      setIsSwapping(true);
      if (swapAudioRef.current) {
        swapAudioRef.current.currentTime = 0;
        swapAudioRef.current.play().catch(() => {});
      }
      setTimeout(() => {
        setCurrentPhoto((prev) => (prev + 1) % gallery.length);
        setIsSwapping(false);
        fireBurst(); // Celeberate the swap in the front
      }, 500);
    }, 4500); 
  };

  const checkPassword = () => {
    if (password.toLowerCase() === "surprisefromabdurazak") {
      setShowPasswordPrompt(false);
      setShowSurprise(true);
      setBounce(true); 
      fireBurst();
      startContinuousRain();
      if (audioRef.current) audioRef.current.play().catch(() => {});
      setTimeout(() => {
        setBounce(false);
        startGallery();
      }, 5000);
    } else {
      alert("Try again!");
    }
  };

  const closeSurprise = () => {
    setShowSurprise(false);
    stopConfettiTimers();
    clearInterval(galleryIntervalRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentPhoto(0);
  };

  useEffect(() => () => {
    stopConfettiTimers();
    clearInterval(galleryIntervalRef.current);
  }, []);

  return (
    <>
      {/* Main Card */}
      <div className="group bg-white rounded-[2.5rem] shadow-sm border border-purple-50 p-6 text-center hover:shadow-xl transition-all duration-500 hover:-translate-y-2 animate-bounce-subtle">
        <div className="w-20 h-20 bg-purple-50 rounded-[2rem] flex items-center justify-center mx-auto mb-4 text-4xl group-hover:scale-110 transition-transform">
          {sister.emoji || "👩‍🎓"}
        </div>
        <h3 className="text-xl font-black text-gray-800 tracking-tight uppercase">{sister.name}</h3>
        <p className="text-gray-500 mt-2 text-xs italic leading-relaxed px-2 line-clamp-2">"{sister.note}"</p>
        <div className="mt-6">
          <button
            disabled={!unlocked}
            onClick={() => setShowPasswordPrompt(true)}
            className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 ${
              unlocked ? "bg-purple-600 text-white shadow-lg shadow-purple-100" : "bg-gray-100 text-gray-400"
            }`}
          >
            {unlocked ? "🎁 Open Surprise" : "🔒 Locked"}
          </button>
        </div>
      </div>

      {/* Password Prompt */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-purple-900/40 backdrop-blur-md" onClick={() => setShowPasswordPrompt(false)} />
          <div className="relative bg-white rounded-[2.5rem] p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Secret Key</h2>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-6 p-4 bg-gray-50 border-2 border-transparent focus:border-purple-500 rounded-2xl text-center outline-none font-bold text-lg"
              placeholder="••••"
              autoFocus
            />
            <button onClick={checkPassword} className="w-full mt-6 bg-purple-600 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95">
              Unlock 🤍
            </button>
          </div>
        </div>
      )}

      {/* Surprise Modal */}
      {showSurprise && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={closeSurprise} />
          <div className={`relative bg-white rounded-[3rem] p-6 max-w-md w-full text-center shadow-2xl overflow-hidden transition-all duration-500 ${bounce ? "animate-bounce" : ""}`}>
            <button onClick={closeSurprise} className="absolute top-5 right-5 z-[1200] p-2 bg-gray-100 rounded-full text-gray-500 active:scale-75"><FiX /></button>
            <h2 className="text-3xl font-black text-purple-600 mb-2 tracking-tighter uppercase">Mabrook! 🎉</h2>
            <div className={`relative mt-4 aspect-square overflow-hidden rounded-[2.5rem] bg-gray-100 shadow-inner transition-all duration-500 ${isSwapping ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}`}>
                <img src={gallery[currentPhoto]} alt="Celebration" className="w-full h-full object-cover" />
            </div>
            <p className="mt-6 text-gray-800 font-bold italic text-lg leading-tight">"{captions[currentPhoto]}"</p>
            <button onClick={closeSurprise} className="mt-8 w-full bg-gray-900 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest">
              Close 🤍
            </button>
          </div>
        </div>
      )}

      <audio ref={audioRef} src="/celebration.mp3" />
      <audio ref={swapAudioRef} src="/swap-sound.mp3" />
    </>
  );
}