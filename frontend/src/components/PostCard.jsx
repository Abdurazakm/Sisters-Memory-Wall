import React, { useState } from "react";
import { FiMoreVertical, FiEdit2, FiTrash2, FiCheck, FiMessageCircle, FiMaximize2 } from "react-icons/fi";
import { deletePost, updatePost } from "../api";
import { getFileType } from "./SharedComponents";
import CommentSection from "./CommentSection"; // We will create this next

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export default function PostCard({ post, isMine, onRefresh, onOpenMedia }) {
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [showMenu, setShowMenu] = useState(false);
  const files = post.files || [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden transition-all hover:shadow-md">
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-sm">
              {post.author ? post.author[0].toUpperCase() : "?"}
            </div>
            <div>
              <p className="font-bold text-gray-900 leading-none mb-1">{post.author}</p>
              <p className="text-[10px] text-gray-400 font-medium">{new Date(post.time).toLocaleString()}</p>
            </div>
          </div>
          {isMine && (
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                <FiMoreVertical size={20} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                  <div className="absolute right-0 mt-2 w-32 bg-white border rounded-xl shadow-lg z-20 overflow-hidden">
                    <button onClick={() => { setIsEditing(true); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-purple-50 flex items-center gap-2"><FiEdit2 size={14} /> Edit</button>
                    <button onClick={() => { if(window.confirm("Delete post?")) deletePost(post.id).then(onRefresh); }} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><FiTrash2 size={14} /> Delete</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="mb-4">
            <textarea className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-300 outline-none" value={editText} onChange={e => setEditText(e.target.value)} rows="3" />
            <div className="flex gap-2 mt-2">
              <button onClick={async () => { await updatePost(post.id, editText); setIsEditing(false); onRefresh(); }} className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"><FiCheck /> Save</button>
              <button onClick={() => setIsEditing(false)} className="bg-gray-100 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        ) : (
          <p className="text-gray-800 mb-4 whitespace-pre-wrap leading-relaxed">{post.text}</p>
        )}
        
        {files.length > 0 && (
          <div className={`grid gap-1 rounded-2xl overflow-hidden border mb-4 shadow-sm ${files.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {files.map((file, idx) => (
              <div key={idx} className="relative aspect-square bg-gray-100 flex items-center justify-center overflow-hidden cursor-pointer group" onClick={() => onOpenMedia(`${BACKEND_URL}${file.file_url}`, getFileType(file.file_type))}>
                {getFileType(file.file_type) === "image" ? (
                  <img src={`${BACKEND_URL}${file.file_url}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="post" />
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <video src={`${BACKEND_URL}${file.file_url}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <FiMaximize2 className="text-white drop-shadow-lg" size={24} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setShowComments(!showComments)} className={`flex items-center gap-2 text-sm font-semibold p-2 rounded-lg transition-colors ${showComments ? 'text-purple-600 bg-purple-50 shadow-inner' : 'text-gray-500 hover:bg-gray-50'}`}>
          <FiMessageCircle size={20} /> {post.comments?.length || 0} Comments
        </button>
      </div>
      {showComments && <CommentSection postId={post.id} comments={post.comments} onRefresh={onRefresh} />}
    </div>
  );
}