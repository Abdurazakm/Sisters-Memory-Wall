import React, { useState } from "react";
import { FiSend, FiX, FiEdit2, FiTrash2, FiCornerDownRight } from "react-icons/fi";
import { deleteComment, updateComment } from "../api";

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
    <div className="border-t bg-gray-50/30 p-4 animate-in fade-in duration-300">
      {/* 1. List of Comments */}
      <div className="space-y-5 mb-6">
        {comments && comments.map((comment) => {
          const isReply = !!comment.reply_to_name;
          
          return (
            <div key={comment.id} className={`group ${isReply ? 'ml-8' : ''}`}>
              <div className="flex gap-3">
                {/* Avatar: Smaller for replies */}
                <div className={`rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white shadow-sm transition-transform group-hover:scale-105 
                  ${isReply 
                    ? 'w-6 h-6 bg-indigo-400 text-[8px]' 
                    : 'w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 text-[10px]'
                  }`}>
                  {comment.author ? comment.author[0].toUpperCase() : "?"}
                </div>

                <div className="flex-1 relative">
                  {/* Decorative line for replies */}
                  {isReply && (
                    <div className="absolute -left-5 top-3 w-4 h-px bg-gray-200" />
                  )}

                  {/* Comment Bubble */}
                  <div className="relative inline-block max-w-full">
                    {activeEditId === comment.id ? (
                      <div className="min-w-[280px] mt-1">
                        <CommentInput
                          initialValue={comment.text}
                          onSubmit={(val) => handleUpdate(comment.id, val)}
                          onCancel={() => setActiveEditId(null)}
                        />
                      </div>
                    ) : (
                      <div className={`px-4 py-2.5 rounded-2xl border transition-all 
                        ${isReply 
                          ? 'bg-indigo-50/50 border-indigo-100 rounded-tl-none hover:border-indigo-300' 
                          : 'bg-white border-gray-200 rounded-tl-none shadow-sm hover:border-purple-200'
                        }`}>
                        
                        <div className="flex justify-between items-center gap-4 mb-1">
                          <p className={`text-[10px] font-black uppercase tracking-tight 
                            ${isReply ? 'text-indigo-600' : 'text-purple-600'}`}>
                            {comment.author}
                          </p>
                          
                          {comment.author === username && (
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setActiveEditId(comment.id)} className="text-gray-400 hover:text-blue-500 transition-colors">
                                <FiEdit2 size={11} />
                              </button>
                              <button onClick={() => handleDelete(comment.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                <FiTrash2 size={11} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Reply tag within the bubble */}
                        {comment.reply_to_name && (
                          <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold mb-1 italic opacity-80">
                            <FiCornerDownRight size={10} /> replied to {comment.reply_to_name}
                          </div>
                        )}

                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                          {comment.text}
                        </p>
                      </div>
                    )}

                    {/* Action Row */}
                    {!activeEditId && (
                      <div className="flex items-center gap-3 mt-1 ml-2">
                        <button
                          onClick={() => setActiveReplyId(activeReplyId === comment.id ? null : comment.id)}
                          className="text-[9px] text-gray-400 hover:text-purple-600 font-bold uppercase tracking-wider transition-colors"
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
                    <div className="mt-3 ml-2 flex gap-2 items-start border-l-2 border-purple-100 pl-4 animate-in slide-in-from-top-1 duration-200">
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
          );
        })}
      </div>

      {/* 3. MAIN INPUT (Bottom) */}
      <div className="pt-4 border-t border-gray-100">
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
        className="w-full text-sm py-2 px-4 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all shadow-sm"
      />
      <div className="flex items-center gap-1 pr-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
            <FiX size={14} />
          </button>
        )}
        <button 
          type="submit" 
          disabled={!val.trim()}
          className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400 transition-all active:scale-95 shadow-sm"
        >
          <FiSend size={14} />
        </button>
      </div>
    </form>
  );
}