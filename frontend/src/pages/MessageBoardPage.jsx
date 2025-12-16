import MessageBoard from "../components/MessageBoard";
import { Link } from "react-router-dom";

export default function MessageBoardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-purple-700 text-center mb-8">
          💌 Shared Messages
        </h1>

        <MessageBoard />

        <div className="mt-8 text-center">
          <Link
            to="/"
            className="inline-block bg-purple-500 text-white px-6 py-3 rounded-full shadow-lg hover:bg-purple-600 transition"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
