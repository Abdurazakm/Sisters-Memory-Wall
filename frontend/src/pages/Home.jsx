import Header from "../components/Header";
import SisterCard from "../components/SisterCard";
import DuaSection from "../components/DuaSection";
import sisters from "../data/sisters";

export default function Home() {
  function handleLogout() {
    localStorage.removeItem("token");
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">

        <Header />

        {/* Logout Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>

        {/* Sister Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
          {sisters.map((s) => (
            <SisterCard key={s.id} sister={s} />
          ))}
        </div>

        {/* Dua Section */}
        <DuaSection />

      </div>
    </div>
  );
}
