import Header from "../components/Header";
import SisterCard from "../components/SisterCard";
import DuaSection from "../components/DuaSection";
import sisters from "../data/sisters";
import { useNavigate } from "react-router-dom";
import { FiLayout, FiMessageCircle, FiLogOut } from "react-icons/fi";

export default function Home() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        <Header />

        {/* Dashboard Actions */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8 bg-white p-4 rounded-2xl shadow-sm border border-purple-100">
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/feed")}
              className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700 transition shadow-lg shadow-purple-200"
            >
              <FiLayout /> Family Feed
            </button>
            <button
              onClick={() => navigate("/messages")}
              className="flex items-center gap-2 bg-white text-purple-600 border border-purple-200 px-5 py-2.5 rounded-xl hover:bg-purple-50 transition"
            >
              <FiMessageCircle /> Open Chat
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition font-medium"
          >
            <FiLogOut /> Logout
          </button>
        </div>

        {/* Sister Cards Section */}
        <h2 className="text-2xl font-bold text-gray-800 mb-6 px-2">Our Sisters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {sisters.map((s) => (
            <SisterCard key={s.id} sister={s} />
          ))}
        </div>

        {/* Dua Section */}
        <div className="mt-12">
          <DuaSection />
        </div>

      </div>
    </div>
  );
}
