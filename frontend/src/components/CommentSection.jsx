import React, { useState } from "react";
import { FiSend, FiX, FiEdit2, FiTrash2, FiCornerDownRight } from "react-icons/fi";
import { deleteComment, updateComment } from "../api"; // Added updateComment

export default function CommentSection({ postId, comments, onAddComment, onRefresh }) {
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [activeEditId, setActiveEditId] = useState(null);
  const username = localStorage.getItem("username") || "Sister";

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

  const handleUpdate = async (commentId, newText) => {
    try {
      await updateComment(commentId, newText);
      handleActionComplete();
    } catch (err) {
      console.error("Failed to update comment:", err);
    }
  };

  return (
    <div className="border-t bg-gray-50/50 p-4 animate-in fade-in duration-300">
      {/* 1. List of Comments */}
      <div className="space-y-6 mb-6">
        {comments && comments.map((comment) => (
          <div key={comment.id} className="group">
            <div className="flex gap-3">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                {comment.author ? comment.author[0].toUpperCase() : "?"}
              </div>

              <div className="flex-1">
                {/* Comment Bubble */}
                <div className="relative inline-block max-w-[95%]">
                  {activeEditId === comment.id ? (
                    <div className="min-w-[250px] mt-1">
                      <CommentInput
                        initialValue={comment.text}
                        onSubmit={(val) => handleUpdate(comment.id, val)}
                        onCancel={() => setActiveEditId(null)}
                      />
                    </div>
                  ) : (
                    <div className="bg-white px-4 py-2.5 rounded-2xl rounded-tl-none border border-gray-200 shadow-sm transition-all hover:border-purple-200">
                      <div className="flex justify-between items-center gap-4 mb-1">
                        <p className="text-[11px] font-black text-purple-600 uppercase tracking-tight">
                          {comment.author}
                        </p>
                        {comment.author === username && (
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setActiveEditId(comment.id)} className="text-gray-400 hover:text-blue-500 transition-colors">
                              <FiEdit2 size={12} />
                            </button>
                            <button onClick={() => handleDelete(comment.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                              <FiTrash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Meta-info for replies */}
                      {comment.reply_to_name && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mb-1 italic">
                          <FiCornerDownRight /> replying to {comment.reply_to_name}
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                    </div>
                  )}

                  {/* Action Buttons (Reply / Time) */}
                  {!activeEditId && (
                    <div className="flex items-center gap-3 mt-1 ml-2">
                      <button
                        onClick={() => setActiveReplyId(activeReplyId === comment.id ? null : comment.id)}
                        className="text-[10px] text-gray-500 hover:text-purple-600 font-black uppercase tracking-widest transition-colors"
                      >
                        Reply
                      </button>
                      <span className="text-[9px] text-gray-300 font-medium">
                        {new Date(comment.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. NESTED REPLY FORM */}
                {activeReplyId === comment.id && (
                  <div className="mt-3 ml-4 flex gap-2 items-start border-l-2 border-purple-200 pl-4 animate-in slide-in-from-top-1 duration-200">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-purple-600">
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

      {/* 3. MAIN INPUT (Bottom) */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex gap-3 items-start">
           <div className="w-8 h-8 rounded-full bg-purple-600 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-md">
              {username[0].toUpperCase()}
           </div>
           <div className="flex-1">
              <CommentInput 
                placeholder="Share your thoughts..." 
                onSubmit={(val) => {
                  onAddComment(postId, val, null);
                  onRefresh();
                }} 
              />
           </div>
        </div>
      </div>
    </div>
  );
}

function CommentInput({ onSubmit, onCancel, initialValue = "", placeholder = "Write a comment..." }) {
  const [val, setVal] = useState(initialValue);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!val.trim()) return;
    onSubmit(val);
    setVal("");
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center gap-2 w-full animate-in fade-in zoom-in-95 duration-200">
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all shadow-inner"
      />
      <div className="flex items-center gap-1 pr-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
            <FiX size={16} />
          </button>
        )}
        <button 
          type="submit" 
          disabled={!val.trim()}
          className="p-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400 transition-all active:scale-90 shadow-md"
        >
          <FiSend size={16} />
        </button>
      </div>
    </form>
  );
}