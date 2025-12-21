import React from "react";
import MessageBoard from "../components/MessageBoard";
import { Link } from "react-router-dom";
// import BottomNav from "../components/BottomNav";

export default function MessageBoardPage() {
  return (
    /**
     * Added pb-28 (Padding Bottom) to ensure the MessageBoard's 
     * input area isn't covered by the BottomNav.
     */
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 md:p-6 pb-20">
      
      {/* If your MessageBoard component has its own header, you can keep this simple.
          If not, you might want to wrap it in a max-width container for better 
          desktop viewing.
      */}
      <div className="max-w-4xl mx-auto h-full">
        <MessageBoard />
      </div>

      {/* The Navigation bar stays fixed at the very bottom */}
      {/* <BottomNav /> */}
    </div>
  );
}