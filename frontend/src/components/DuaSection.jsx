import { useState } from "react";
import duas from "../data/duas";

export default function DuaSection() {
  const [dua, setDua] = useState("");
  const [fade, setFade] = useState(false);

  const randomDua = () => {
    setFade(true); // start fade out
    setTimeout(() => {
      const i = Math.floor(Math.random() * duas.length);
      setDua(duas[i]);
      setFade(false); // fade in new dua
    }, 300); // fade out duration
  };

  return (
    <section className="mt-12 px-2 sm:px-0 text-center">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-700 mb-6">
        🤲 Duas
      </h2>
      {dua && (
        <div
          className={`mt-6 max-w-md mx-auto p-6 bg-gradient-to-r from-purple-100 via-pink-100 to-purple-100 rounded-2xl shadow-xl transition-opacity duration-500 ${
            fade ? "opacity-0" : "opacity-100"
          }`}
        >
          <p className="text-gray-800 text-base sm:text-lg font-semibold">
            {dua}
          </p>
        </div>
      )}

      <button
        onClick={randomDua}
        className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-2 my-4 rounded-full shadow-lg hover:scale-105 transition transform duration-300"
      >
        Show Random Dua
      </button>

      
    </section>
  );
}
