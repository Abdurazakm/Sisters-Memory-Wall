import React, { useEffect, useState, useRef } from "react";
import { getPosts, createPost, addComment, deletePost, deleteComment, updatePost, updateComment } from "../api";
import { 
  FiImage, FiSend, FiTrash2, FiMessageCircle, FiX, FiEdit2, 
  FiMaximize2, FiCheck, FiMoreVertical, FiCheckCircle, FiUsers 
} from "react-icons/fi";
import { FaPrayingHands } from "react-icons/fa";
import { AudioPlayer, getFileType } from "../components/SharedComponents";
import DuaCard from "../components/DuaCard"; // ADJUST THIS PATH TO YOUR FILE LOCATION

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [postText, setPostText] = useState("");
  const [postType, setPostType] = useState("post"); 
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null); 
  
  const username = localStorage.getItem("username");
  const fileInputRef = useRef();

  useEffect(() => { loadPosts(); }, []);

  const loadPosts = async () => {
    const data = await getPosts();
    setPosts(data || []);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postText.trim() && selectedFiles.length === 0) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("text", postText);
    formData.append("type", postType); 
    selectedFiles.forEach((file) => formData.append("files", file));

    try {
      await createPost(formData);
      setPostText("");
      setSelectedFiles([]);
      setPostType("post"); 
      loadPosts();
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* 1. MEDIA LIGHTBOX */}
      {previewMedia && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setPreviewMedia(null)}>
          <button className="absolute top-6 right-6 text-white hover:text-emerald-400 z-[110] transition-transform hover:scale-110">
            <FiX size={35} />
          </button>
          <div className="max-w-5xl w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {previewMedia.type === "image" ? (
              <img src={previewMedia.url} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" alt="Preview" />
            ) : (
              <video src={previewMedia.url} controls autoPlay className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
            )}
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto p-4">
        {/* CREATE POST BOX */}
        <div className={`bg-white rounded-2xl shadow-sm border p-5 mb-6 transition-all duration-300 ${postType === 'dua' ? 'ring-2 ring-emerald-400 border-emerald-100' : ''}`}>
          <div className="flex gap-4 mb-4 border-b pb-2">
            <button 
              onClick={() => setPostType("post")}
              className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all ${postType === 'post' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              Normal Post
            </button>
            <button 
              onClick={() => setPostType("dua")}
              className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all flex items-center gap-2 ${postType === 'dua' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              <FaPrayingHands size={14}/> Dua Request
            </button>
          </div>

          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder={postType === 'dua' ? "What would you like the family to make Dua for?" : "What's on your mind, sister?"}
            className="w-full border-none focus:ring-0 text-lg resize-none outline-none placeholder-gray-300 mb-2"
            rows="3"
          />

          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-emerald-700 truncate max-w-[150px]">{file.name}</span>
                  <button onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))} className="text-emerald-400 hover:text-emerald-600"><FiX size={14} /></button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center mt-2 border-t pt-4">
            <button 
              onClick={() => fileInputRef.current.click()} 
              className={`flex items-center gap-2 font-semibold px-3 py-1 rounded-lg transition-colors ${postType === 'dua' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-purple-600 hover:bg-purple-50'}`}
            >
              <FiImage size={22} /> <span className="text-sm">Media</span>
            </button>
            <input type="file" hidden multiple ref={fileInputRef} onChange={handleFileChange} />
            <button 
              onClick={handleCreatePost} 
              disabled={loading} 
              className={`${postType === 'dua' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-purple-600 hover:bg-purple-700'} text-white px-8 py-2.5 rounded-full font-bold shadow-md active:scale-95 disabled:bg-gray-200 disabled:shadow-none`}
            >
              {loading ? "Posting..." : "Share with Family"}
            </button>
          </div>
        </div>

        {/* FEED LIST */}
        <div className="space-y-6">
          {posts.map((post) => (
            post.type === 'dua' ? (
              <DuaCard key={post.id} post={post} currentUser={username} onRefresh={loadPosts} isMine={post.author === username} />
            ) : (
              <PostCard 
                key={post.id} 
                post={post} 
                isMine={post.author === username} 
                onRefresh={loadPosts}
                onOpenMedia={(url, type) => setPreviewMedia({ url, type })}
              />
            )
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- POST CARD COMPONENT ---------------- */
function PostCard({ post, isMine, onRefresh, onOpenMedia }) {
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
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-sm">{post.author[0].toUpperCase()}</div>
            <div>
              <p className="font-bold text-gray-900 leading-none mb-1">{post.author}</p>
              <p className="text-[10px] text-gray-400 font-medium">{new Date(post.time).toLocaleString()}</p>
            </div>
          </div>
          {isMine && (
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><FiMoreVertical size={20} /></button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                  <div className="absolute right-0 mt-2 w-32 bg-white border rounded-xl shadow-lg z-20 overflow-hidden">
                    <button onClick={() => { setIsEditing(true); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-purple-50 text-gray-700 font-medium"><FiEdit2 size={14} /> Edit</button>
                    <button onClick={() => { if(window.confirm("Delete post?")) deletePost(post.id).then(onRefresh); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 font-medium"><FiTrash2 size={14} /> Delete</button>
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

/* ---------------- COMMENT SECTION ---------------- */
function CommentSection({ postId, comments, onRefresh }) {
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [activeEditId, setActiveEditId] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const username = localStorage.getItem("username");

  return (
    <div className="bg-gray-50/80 p-5 border-t space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex-shrink-0 flex items-center justify-center text-xs font-bold text-purple-700 shadow-sm">{comment.author[0].toUpperCase()}</div>
          <div className="flex-1 min-w-0">
            {activeEditId === comment.id ? (
              <div className="mb-2">
                <CommentInput initialValue={comment.text} onSubmit={async (val) => { await updateComment(comment.id, val); setActiveEditId(null); onRefresh(); }} />
                <button onClick={() => setActiveEditId(null)} className="text-[10px] text-red-500 font-bold mt-1 ml-2 uppercase tracking-tighter">Cancel Edit</button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2 w-full group">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none border shadow-sm inline-block max-w-[85%]">
                  <p className="text-[11px] font-bold text-purple-600 mb-0.5">{comment.author}</p>
                  <p className="text-sm text-gray-800 break-words">{comment.text}</p>
                </div>
                {comment.author === username && (
                  <div className="relative flex-shrink-0">
                    <button onClick={() => setActiveMenuId(activeMenuId === comment.id ? null : comment.id)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"><FiMoreVertical size={16} /></button>
                    {activeMenuId === comment.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)}></div>
                        <div className="absolute right-0 mt-1 w-32 bg-white border rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                          <button onClick={() => { setActiveEditId(comment.id); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-purple-50 flex items-center gap-2 font-medium text-gray-700"><FiEdit2 size={14}/> Edit</button>
                          <button onClick={() => { if(window.confirm("Delete comment?")) deleteComment(comment.id).then(onRefresh); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"><FiTrash2 size={14}/> Delete</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            {!activeEditId && (
              <div className="mt-1 flex gap-3 ml-2">
                <button onClick={() => setActiveReplyId(activeReplyId === comment.id ? null : comment.id)} className="text-[10px] text-gray-500 font-bold hover:text-purple-600 uppercase tracking-tighter">Reply</button>
                <span className="text-[10px] text-gray-300">{new Date(comment.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            )}
            {activeReplyId === comment.id && (
              <div className="mt-2 ml-2 border-l-2 border-purple-200 pl-4 py-1">
                <CommentInput placeholder={`Reply to ${comment.author}...`} onSubmit={async (val) => { await addComment(postId, val, comment.id); setActiveReplyId(null); onRefresh(); }} />
              </div>
            )}
          </div>
        </div>
      ))}
      <div className="pt-2"><CommentInput onSubmit={async (val) => { await addComment(postId, val); onRefresh(); }} /></div>
    </div>
  );
}

function CommentInput({ onSubmit, initialValue = "", placeholder = "Write a comment..." }) {
  const [val, setVal] = useState(initialValue);
  const handleSubmit = (e) => { e.preventDefault(); if (!val.trim()) return; onSubmit(val); setVal(""); };
  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center bg-white p-1.5 rounded-xl border shadow-sm">
      <input value={val} onChange={(e) => setVal(e.target.value)} placeholder={placeholder} className="flex-1 bg-transparent px-3 py-1.5 text-sm outline-none" />
      <button type="submit" className="bg-purple-600 text-white p-2.5 rounded-lg hover:bg-purple-700 active:scale-90 transition-all shadow-sm"><FiSend size={16} /></button>
    </form>
  );
}