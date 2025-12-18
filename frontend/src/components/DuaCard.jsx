import React, { useState } from "react";
import { FiMoreVertical, FiEdit2, FiTrash2, FiCheck, FiCheckCircle, FiUsers } from "react-icons/fi";
import { FaPrayingHands } from "react-icons/fa";
import { updatePost, deletePost } from "../api";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export default function DuaCard({ post, currentUser, onRefresh, isMine }) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  
  const prayedByMe = post.confirmations?.some(c => c.username === currentUser);

  const handleAmeen = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/dua/confirm/${post.id}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem("token")}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) onRefresh();
    } catch (err) { console.error(err); }
  };

  const handleSayAmin = async (confId) => {
    if (!confId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/dua/thank/${confId}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem("token")}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) onRefresh();
    } catch (err) { 
      console.error("Error saying Amin:", err); 
    }
  };

  const handleSaveEdit = async () => {
    await updatePost(post.id, editText);
    setIsEditing(false);
    onRefresh();
  };

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-100 rounded-3xl p-6 shadow-sm mb-6 relative overflow-hidden transition-all hover:shadow-md">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <FaPrayingHands size={80} className="text-emerald-900" />
      </div>
      
      <div className="flex justify-between items-start mb-4 relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <FaPrayingHands size={24} />
          </div>
          <div>
            <h3 className="font-extrabold text-emerald-900 leading-tight">Dua Request</h3>
            <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest">{post.author}</p>
          </div>
        </div>

        {isMine && (
          <div className="relative z-30">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-full transition-colors">
              <FiMoreVertical size={20}/>
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                <div className="absolute right-0 mt-2 w-32 bg-white border rounded-xl shadow-xl z-50 overflow-hidden text-sm font-bold">
                   <button onClick={() => { setIsEditing(true); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-emerald-50 border-b border-gray-50">
                    <FiEdit2 size={14} /> Edit
                   </button>
                   <button onClick={() => { if(window.confirm("Delete request?")) deletePost(post.id).then(onRefresh); }} className="w-full flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50">
                    <FiTrash2 size={14} /> Delete
                   </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="relative z-10 mb-6">
        {isEditing ? (
          <div className="bg-white rounded-2xl p-4 border-2 border-emerald-200">
            <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full border-none focus:ring-0 text-gray-800 text-lg italic font-serif resize-none outline-none" rows="3" />
            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-emerald-50">
               <button onClick={() => setIsEditing(false)} className="text-xs font-bold text-gray-400 px-3 py-1">Cancel</button>
               <button onClick={handleSaveEdit} className="bg-emerald-600 text-white text-xs font-bold px-4 py-1 rounded-full"><FiCheck /> Save</button>
            </div>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-emerald-50 shadow-inner text-center">
            <p className="text-gray-800 text-xl italic font-serif leading-relaxed">"{post.text}"</p>
          </div>
        )}
      </div>

      <div className="border-t border-emerald-100 pt-5 relative z-10 space-y-4">
        {!isMine && (
          <button 
            onClick={handleAmeen}
            disabled={prayedByMe}
            className={`w-full flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 ${
              prayedByMe 
              ? "bg-emerald-100 text-emerald-600 border border-emerald-200" 
              : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {prayedByMe ? <FiCheckCircle size={20} /> : <FaPrayingHands size={20} />}
            {prayedByMe ? "You have made Dua" : "I have made Dua"}
          </button>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-700 px-1">
            <FiUsers size={14}/>
            <span className="text-[11px] font-black uppercase tracking-wider">{post.confirmations?.length || 0} family members prayed</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {post.confirmations?.map((person, i) => (
              <div key={i} className={`flex items-center justify-between border rounded-xl p-2 transition-all ${person.is_thanked ? 'bg-emerald-50 border-emerald-200' : 'bg-white/50 border-emerald-50'}`}>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-[10px] font-bold text-emerald-700 border-2 border-white">
                      {person.username?.[0].toUpperCase()}
                    </div>
                    {person.is_thanked && (
                      <div className="absolute -top-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 border border-white">
                        <FiCheckCircle size={10} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-700">{person.username}</span>
                    {person.is_thanked && <span className="text-[9px] text-emerald-600 font-bold italic">{post.author} said Amin</span>}
                  </div>
                </div>

                {isMine ? (
                  <button 
                    disabled={person.is_thanked}
                    className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase transition-all ${
                      person.is_thanked 
                      ? "text-emerald-400" 
                      : "bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white active:scale-90"
                    }`}
                    onClick={() => handleSayAmin(person.id)}
                  >
                    {person.is_thanked ? "Amin Sent" : "Say Amin"}
                  </button>
                ) :null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}