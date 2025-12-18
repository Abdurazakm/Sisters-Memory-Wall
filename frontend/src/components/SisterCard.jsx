import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";

export default function SisterCard({ sister }) {
  const [showSurprise, setShowSurprise] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [bounce, setBounce] = useState(true);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [isSwapping, setIsSwapping] = useState(false);
  
  const intervalRef = useRef(null);
  const galleryIntervalRef = useRef(null);
  const audioRef = useRef(null);
  const swapAudioRef = useRef(null); 

  const today = new Date().toISOString().split("T")[0];
  const unlocked = sister.graduationDate && today >= sister.graduationDate;

  const gallery = sister.gallery || [sister.photo];
  const captions = sister.galleryCaptions || [
    sister.caption || "🎓 Congratulations!",
  ];

  const fireConfetti = () => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
  };

  const startSlowConfetti = () => {
    intervalRef.current = setInterval(() => {
      confetti({
        particleCount: 5,
        spread: 60,
        origin: { y: 0 },
        gravity: 0.4,
        scalar: 0.7,
      });
    }, 1500);
  };

  const stopConfetti = () => clearInterval(intervalRef.current);

  const startGallery = () => {
    fireConfetti();
    clearInterval(galleryIntervalRef.current);
    
    galleryIntervalRef.current = setInterval(() => {
      // 1. Play Swap Sound
      if (swapAudioRef.current) {
        swapAudioRef.current.volume = 0.2; // Set it lower so it's a subtle "pop"
        swapAudioRef.current.currentTime = 0; // Reset to start
        swapAudioRef.current.play().catch(() => {});
      }
      
      // 2. Trigger Animation
      setIsSwapping(true);
      setTimeout(() => setIsSwapping(false), 500);

      // 3. Change Photo
      setCurrentPhoto((prev) => {
        const next = (prev + 1) % gallery.length;
        fireConfetti();
        return next;
      });
    }, 4000); // Increased to 4 seconds for a better "mobile viewing" pace
  };

  const checkPassword = () => {
    if (password.toLowerCase() === "surprise") {
      setShowPasswordPrompt(false);
      setShowSurprise(true);
      setBounce(true);
      fireConfetti();
      startSlowConfetti();
      
      if (audioRef.current) {
        audioRef.current.volume = 0.4;
        audioRef.current.play().catch(() => {});
      }

      setTimeout(() => {
        setBounce(false);
        startGallery();
      }, 5000);
    } else {
      alert("Wrong password (try 'surprise')");
    }
  };

  const closeSurprise = () => {
    setShowSurprise(false);
    stopConfetti();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    clearInterval(galleryIntervalRef.current);
    setCurrentPhoto(0);
  };

  useEffect(() => {
    return () => {
      stopConfetti();
      clearInterval(galleryIntervalRef.current);
    };
  }, []);

  return (
    <>
      {/* Main Card */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-purple-50 p-6 text-center hover:shadow-xl transition-all duration-300">
        <div className="w-20 h-20 bg-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-4xl">
          👩‍🎓
        </div>
        <h3 className="text-xl font-black text-gray-800 tracking-tight">
          {sister.name}
        </h3>
        <p className="text-gray-500 mt-2 text-sm leading-relaxed px-2">
          {sister.note}
        </p>

        {sister.graduated && (
          <div className="mt-6 space-y-3">
            <span className="inline-block bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
              🎓 Graduated
            </span>
            <button
              disabled={!unlocked}
              onClick={() => setShowPasswordPrompt(true)}
              className={`w-full py-4 rounded-2xl shadow-lg text-white font-black text-sm uppercase tracking-widest transition-all active:scale-95 ${
                unlocked
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600"
                  : "bg-gray-200 text-gray-400 shadow-none cursor-not-allowed"
              }`}
            >
              {unlocked ? "🎁 Open Surprise" : "🔒 Unlocks Soon"}
            </button>
          </div>
        )}
      </div>

      {/* Password Prompt */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-purple-900/40 backdrop-blur-sm flex items-center justify-center z-[110] p-6">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-gray-800">Secret Key</h2>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-4 p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-center focus:border-purple-500 outline-none font-bold"
              placeholder="Enter password..."
              autoFocus
            />
            <button
              onClick={checkPassword}
              className="w-full mt-6 bg-purple-600 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all"
            >
              Unlock 🤍
            </button>
          </div>
        </div>
      )}

      {/* Surprise Modal */}
      {showSurprise && (
        <div className="fixed inset-0 bg-purple-950/60 backdrop-blur-md flex items-center justify-center z-[120] p-4">
          <div
            className={`bg-white rounded-[3rem] p-6 sm:p-10 max-w-md w-full text-center shadow-2xl relative overflow-hidden ${
              bounce ? "animate-bounce" : ""
            }`}
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>
            <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
              Mabrook! 🎉
            </h2>

            <div className={`relative mt-6 aspect-square overflow-hidden rounded-[2rem] shadow-inner bg-gray-50 transition-all duration-300 ${isSwapping ? 'scale-95 opacity-80' : 'scale-100 opacity-100'}`}>
                <img
                src={gallery[currentPhoto]}
                alt="Celebration"
                className="w-full h-full object-cover"
                key={currentPhoto}
                />
            </div>

            <div className="mt-6 min-h-[3rem]">
                <p className="text-gray-700 font-bold text-lg italic leading-tight">
                "{captions[currentPhoto]}"
                </p>
            </div>

            <button
              onClick={closeSurprise}
              className="mt-8 w-full bg-gray-900 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all"
            >
              Close 🤍
            </button>
          </div>
        </div>
      )}

      <audio ref={audioRef} src="/celebration.mp3" preload="auto" />
      <audio ref={swapAudioRef} src="/swap-sound.mp3" preload="auto" />
    </>
  );
}
