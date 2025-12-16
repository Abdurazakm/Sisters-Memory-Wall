import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";

export default function SisterCard({ sister }) {
  const [showSurprise, setShowSurprise] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [bounce, setBounce] = useState(true);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const intervalRef = useRef(null);
  const galleryIntervalRef = useRef(null);
  const audioRef = useRef(null);

  const today = new Date().toISOString().split("T")[0];
  const unlocked = sister.graduationDate && today >= sister.graduationDate;

  const gallery = sister.gallery || [sister.photo];
  const captions = sister.galleryCaptions || [
    sister.caption || "🎓 Congratulations!",
  ];

  const fireConfetti = () => {
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
  };

  const startSlowConfetti = () => {
    intervalRef.current = setInterval(() => {
      confetti({
        particleCount: 8,
        spread: 70,
        origin: { y: 0 },
        gravity: 0.3,
        scalar: 0.7,
      });
    }, 1200);
  };

  const stopConfetti = () => clearInterval(intervalRef.current);

  const startGallery = () => {
    // fire confetti for first photo
    fireConfetti();
    // clear previous interval if any
    clearInterval(galleryIntervalRef.current);

    galleryIntervalRef.current = setInterval(() => {
      setCurrentPhoto((prev) => {
        const next = (prev + 1) % gallery.length;
        fireConfetti(); // confetti on each photo swap
        return next;
      });
    }, 3000); // swap every 4 seconds
  };

  const openSurprise = () => {
    setShowPasswordPrompt(true);
  };

  const checkPassword = () => {
    if (password === "surprise") {
      setShowPasswordPrompt(false);
      setShowSurprise(true);
      setBounce(true);
      fireConfetti();
      startSlowConfetti();
      audioRef.current.volume = 0.3;
      audioRef.current.play();

      // stop bounce after 7 seconds and start gallery
      setTimeout(() => {
        setBounce(false);
        startGallery();
      }, 7000);
    } else {
      alert("Wrong password");
    }
  };
  const closeSurprise = () => {
    setShowSurprise(false);
    stopConfetti();
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    clearInterval(galleryIntervalRef.current);
    setCurrentPhoto(0);
  };

  useEffect(() => {
    // cleanup
    return () => {
      stopConfetti();
      clearInterval(galleryIntervalRef.current);
    };
  }, []);

  return (
    <>
      <div className="bg-white rounded-3xl shadow-xl p-6 text-center hover:scale-105 transition-transform duration-300">
        <div className="text-4xl sm:text-5xl mb-2">👩‍🎓</div>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800">
          {sister.name}
        </h3>
        <p className="text-gray-500 mt-2 text-sm sm:text-base">{sister.note}</p>

        {sister.graduated && (
          <div className="mt-4">
            <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs sm:text-sm">
              🎓 Graduated
            </span>

            <button
              disabled={!unlocked}
              onClick={openSurprise}
              className={`mt-4 px-5 sm:px-6 py-2 rounded-full shadow-lg text-white font-semibold transition-all duration-300 ${
                unlocked
                  ? "bg-gradient-to-r from-pink-500 to-purple-500 hover:scale-105"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              {unlocked ? "🎁 Surprise" : "🔒 Locked"}
            </button>

            {!unlocked && (
              <p className="text-xs text-gray-400 mt-2">
                Unlocks on graduation day
              </p>
            )}
          </div>
        )}
      </div>

      {/* Password Prompt Modal */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-purple-600">
              Set Password
            </h2>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-4 p-2 border rounded w-full"
              placeholder="Set password"
            />
            <button
              onClick={checkPassword}
              className="mt-4 bg-purple-500 text-white px-5 py-2 rounded-full hover:bg-purple-600 transition"
            >
              Set Password
            </button>
          </div>
        </div>
      )}

      {/* Surprise Modal */}
      {showSurprise && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl ${
              bounce ? "animate-bounce" : ""
            }`}
          >
            <h2 className="text-2xl sm:text-3xl font-extrabold text-purple-600">
              🎉 Congratulations!
            </h2>

            <img
              src={gallery[currentPhoto]}
              alt={`Graduation ${currentPhoto + 1}`}
              className="rounded-2xl mt-4 shadow-lg mx-auto w-48 sm:w-64 transition-opacity duration-700"
            />

            <p className="mt-4 text-gray-600 text-sm sm:text-base">
              {captions[currentPhoto]}
            </p>

            <button
              onClick={closeSurprise}
              className="mt-6 bg-purple-500 text-white px-5 sm:px-6 py-2 rounded-full hover:bg-purple-600 transition"
            >
              Close 🤍
            </button>
          </div>
        </div>
      )}

      <audio ref={audioRef} src="/celebration.mp3" />
    </>
  );
}
