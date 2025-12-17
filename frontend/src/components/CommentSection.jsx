import React, { useState } from "react";
import { FiSend, FiX, FiEdit2, FiTrash2, FiCornerDownRight } from "react-icons/fi";
import { deleteComment } from "../api";

export default function CommentSection({ postId, comments, onAddComment, onRefresh }) {
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [activeEditId, setActiveEditId] = useState(null);
  const username = localStorage.getItem("username");

  const handleActionComplete = () => {
    setActiveReplyId(null);
    setActiveEditId(null);
    onRefresh();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this comment?")) {
      await deleteComment(id);
      onRefresh();
    }
  };

  return (
    <div className="border-t bg-gray-50/50 p-4">
      {/* 1. List of Comments */}
      <div className="space-y-6 mb-6">
        {comments.map((comment) => (
          <div key={comment.id} className="group">
            <div className="flex gap-3">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-purple-200 flex-shrink-0 flex items-center justify-center text-xs font-bold text-purple-700 shadow-sm">
                {comment.author[0].toUpperCase()}
              </div>

              <div className="flex-1">
                {/* Comment Bubble */}
                <div className="relative inline-block max-w-[95%]">
                  {activeEditId === comment.id ? (
                    <div className="min-w-[200px] mt-1">
                      <CommentInput
                        initialValue={comment.text}
                        onSubmit={() => handleActionComplete()}
                        onCancel={() => setActiveEditId(null)}
                      />
                    </div>
                  ) : (
                    <div className="bg-white px-3 py-2 rounded-2xl border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-center gap-4">
                        <p className="text-[11px] font-bold text-purple-600">{comment.author}</p>
                        {comment.author === username && (
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setActiveEditId(comment.id)} className="text-gray-400 hover:text-blue-500">
                              <FiEdit2 size={12} />
                            </button>
                            <button onClick={() => handleDelete(comment.id)} className="text-gray-400 hover:text-red-500">
                              <FiTrash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Meta-info for replies */}
                      {comment.reply_to_name && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mb-1">
                          <FiCornerDownRight /> replying to {comment.reply_to_name}
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-800 leading-relaxed">{comment.text}</p>
                    </div>
                  )}

                  {/* Reply Button (Only if not editing) */}
                  {!activeEditId && (
                    <button
                      onClick={() => setActiveReplyId(activeReplyId === comment.id ? null : comment.id)}
                      className="text-[11px] text-gray-500 hover:text-purple-600 font-bold mt-1 ml-2 transition-colors"
                    >
                      Reply
                    </button>
                  )}
                </div>

                {/* 2. NESTED REPLY FORM (Directly under the specific bubble) */}
                {activeReplyId === comment.id && (
                  <div className="mt-3 ml-4 flex gap-2 items-start border-l-2 border-purple-100 pl-4 animate-in fade-in slide-in-from-top-1">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-gray-400">
                      {username[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <CommentInput
                        placeholder={`Reply to ${comment.author}...`}
                        onSubmit={(val) => {
                          onAddComment(postId, val, comment.id);
                          handleActionComplete();
                        }}
                        onCancel={() => setActiveReplyId(null)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. MAIN INPUT (Bottom of section) */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex gap-3">
           <div className="w-8 h-8 rounded-full bg-purple-600 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white">
              {username[0].toUpperCase()}
           </div>
           <div className="flex-1">
              <CommentInput 
                placeholder="Write a comment..." 
                onSubmit={(val) => onAddComment(postId, val, null)} 
              />
           </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- INTERNAL REUSABLE INPUT ---------------- */
function CommentInput({ onSubmit, onCancel, initialValue = "", placeholder = "Write a comment..." }) {
  const [val, setVal] = useState(initialValue);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!val.trim()) return;
    onSubmit(val);
    setVal("");
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center gap-2 w-full">
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm p-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
      />
      <div className="flex items-center gap-1 pr-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-full transition">
            <FiX size={16} />
          </button>
        )}
        <button type="submit" className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-full transition">
          <FiSend size={18} />
        </button>
      </div>
    </form>
  );
}