import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  getPosts, createPost, addComment, deletePost, deleteComment, updatePost, updateComment, getUserProfile 
} from "../api";
import { 
  FiImage, FiSend, FiTrash2, FiMessageCircle, FiX, FiEdit2, 
  FiMaximize2, FiCheck, FiMoreVertical 
} from "react-icons/fi";
import { FaPrayingHands } from "react-icons/fa";
import { getFileType } from "../components/SharedComponents";
import DuaCard from "../components/DuaCard";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav"; // Imported reusable component

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

/* ================== AVATAR HELPER ================== */
function UserAvatar({ username, size = "w-10 h-10", fontSize = "text-base" }) {
  const [photo, setPhoto] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPhoto = async () => {
      try {
        const profile = await getUserProfile(username);
        if (profile?.profile_photo) {
          const url = profile.profile_photo.startsWith('http') 
            ? profile.profile_photo 
            : `${BACKEND_URL}${profile.profile_photo}`;
          setPhoto(url);
        }
      } catch (err) { console.error("Avatar error", err); }
    };
    if (username) fetchPhoto();
  }, [username]);

  return (
    <div 
      onClick={(e) => { e.stopPropagation(); navigate(`/profile/${username}`); }}
      className={`${size} rounded-full overflow-hidden cursor-pointer bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm hover:ring-2 ring-purple-300 transition-all`}
    >
      {photo ? <img src={photo} alt={username} className="w-full h-full object-cover" /> : <span className={fontSize}>{username ? username[0].toUpperCase() : "?"}</span>}
    </div>
  );
}

/* ================== MAIN FEED PAGE ================== */
export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [postText, setPostText] = useState("");
  const [postType, setPostType] = useState("post"); 
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null); 
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); 

  const username = localStorage.getItem("username");
  const fileInputRef = useRef();
  const navigate = useNavigate();

  useEffect(() => { loadPosts(); }, []);

  const loadPosts = async () => {
    const data = await getPosts();
    setPosts(data || []);
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.text?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.author?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || post.type === "dua";
    return matchesSearch && matchesFilter;
  });

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
    <div className="min-h-screen bg-gray-50 pb-32"> {/* Buffer for bottom nav */}
      <Header showControls={true} searchQuery={searchQuery} setSearchQuery={setSearchQuery} filterType={filterType} setFilterType={setFilterType} />

      {/* Media Fullscreen Preview */}
      {previewMedia && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setPreviewMedia(null)}>
          <button className="absolute top-6 right-6 text-white hover:text-purple-400"><FiX size={35} /></button>
          <div className="max-w-5xl w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {previewMedia.type === "image" ? (
              <img src={previewMedia.url} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
            ) : (
              <video src={previewMedia.url} controls autoPlay className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
            )}
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto p-4">
        {/* CREATE POST BOX */}
        <div className={`bg-white rounded-3xl shadow-sm border p-6 mb-8 transition-all ${postType === 'dua' ? 'ring-2 ring-emerald-400 border-emerald-100' : 'border-gray-100'}`}>
          <div className="flex gap-4 mb-4 border-b border-gray-50 pb-3">
            <button onClick={() => setPostType("post")} className={`text-xs font-black px-5 py-2 rounded-xl transition-all ${postType === 'post' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-400'}`}>POST</button>
            <button onClick={() => setPostType("dua")} className={`text-xs font-black px-5 py-2 rounded-xl flex items-center gap-2 transition-all ${postType === 'dua' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}><FaPrayingHands size={14}/> DUA</button>
          </div>

          <textarea value={postText} onChange={(e) => setPostText(e.target.value)} placeholder={postType === 'dua' ? "What can the family pray for?" : "What's on your mind?"} className="w-full border-none focus:ring-0 text-lg resize-none outline-none font-medium mb-2" rows="3" />

          <div className="flex justify-between items-center mt-2 border-t border-gray-50 pt-4">
            <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-purple-600 hover:bg-purple-50 transition-colors">
              <FiImage size={22} /> <span className="text-xs uppercase">Media</span>
            </button>
            <input type="file" hidden multiple ref={fileInputRef} onChange={(e) => setSelectedFiles(Array.from(e.target.files))} />
            <button onClick={handleCreatePost} disabled={loading} className={`${postType === 'dua' ? 'bg-emerald-600' : 'bg-purple-600'} text-white px-8 py-3 rounded-2xl font-black shadow-lg active:scale-95 disabled:opacity-50`}>
              {loading ? "..." : "SHARE"}
            </button>
          </div>
        </div>

        {/* FEED LIST */}
        <div className="space-y-6">
          {filteredPosts.map((post) => (
            post.type === 'dua' ? (
              <DuaCard key={post.id} post={post} currentUser={username} onRefresh={loadPosts} isMine={post.author === username} />
            ) : (
              <PostCard key={post.id} post={post} isMine={post.author === username} onRefresh={loadPosts} onOpenMedia={(url, type) => setPreviewMedia({ url, type })} />
            )
          ))}
        </div>
      </div>

      <BottomNav /> {/* REUSABLE COMPONENT HERE */}
    </div>
  );
}

/* ================== SUB-COMPONENTS ================== */

function PostCard({ post, isMine, onRefresh, onOpenMedia }) {
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <UserAvatar username={post.author} />
            <div onClick={() => navigate(`/profile/${post.author}`)} className="cursor-pointer">
              <p className="font-black text-gray-800 leading-none mb-1 hover:text-purple-600 uppercase text-xs tracking-wider">{post.author}</p>
              <p className="text-[10px] text-gray-400 font-bold">{new Date(post.time).toLocaleDateString()}</p>
            </div>
          </div>
          {isMine && (
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-50 rounded-full text-gray-400"><FiMoreVertical size={20} /></button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 overflow-hidden p-1">
                  <button onClick={() => { setIsEditing(true); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-xs font-bold text-gray-600 hover:bg-purple-50 rounded-xl flex items-center gap-3"><FiEdit2 size={16} /> EDIT</button>
                  <button onClick={() => { if(window.confirm("Delete?")) deletePost(post.id).then(onRefresh); }} className="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl flex items-center gap-3"><FiTrash2 size={16} /> DELETE</button>
                </div>
              )}
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="mb-4">
            <textarea className="w-full border-2 border-purple-100 rounded-2xl p-4 text-sm outline-none" value={editText} onChange={e => setEditText(e.target.value)} rows="3" />
            <div className="flex gap-2 mt-2">
              <button onClick={async () => { await updatePost(post.id, editText); setIsEditing(false); onRefresh(); }} className="bg-purple-600 text-white px-5 py-2 rounded-xl text-xs font-black">SAVE</button>
              <button onClick={() => setIsEditing(false)} className="bg-gray-100 text-gray-500 px-5 py-2 rounded-xl text-xs font-black">CANCEL</button>
            </div>
          </div>
        ) : (
          <p className="text-gray-700 mb-5 whitespace-pre-wrap leading-relaxed font-medium">{post.text}</p>
        )}
        
        {post.files?.length > 0 && (
          <div className={`grid gap-2 rounded-2xl overflow-hidden mb-5 ${post.files.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {post.files.map((file, idx) => (
              <div key={idx} className="relative aspect-square bg-gray-50 flex items-center justify-center cursor-pointer group rounded-2xl overflow-hidden" onClick={() => onOpenMedia(`${BACKEND_URL}${file.file_url}`, getFileType(file.file_type))}>
                {getFileType(file.file_type) === "image" ? (
                  <img src={`${BACKEND_URL}${file.file_url}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="relative w-full h-full">
                    <video src={`${BACKEND_URL}${file.file_url}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><FiMaximize2 className="text-white" size={30} /></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setShowComments(!showComments)} className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${showComments ? 'text-purple-600 bg-purple-50' : 'text-gray-400 hover:bg-gray-50'}`}>
          <FiMessageCircle size={18} /> {post.comments?.length || 0} Comments
        </button>
      </div>
      {showComments && <CommentSection postId={post.id} comments={post.comments} onRefresh={onRefresh} />}
    </div>
  );
}

function CommentSection({ postId, comments, onRefresh }) {
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [activeEditId, setActiveEditId] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const username = localStorage.getItem("username");
  const navigate = useNavigate();

  return (
    <div className="bg-gray-50/50 p-6 border-t border-gray-100 space-y-5">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <UserAvatar username={comment.author} size="w-8 h-8" fontSize="text-[10px]" />
          <div className="flex-1 min-w-0">
            {activeEditId === comment.id ? (
              <CommentInput initialValue={comment.text} onSubmit={async (val) => { await updateComment(comment.id, val); setActiveEditId(null); onRefresh(); }} />
            ) : (
              <div className="flex items-start justify-between gap-2 group">
                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm inline-block max-w-[90%]">
                  <p onClick={() => navigate(`/profile/${comment.author}`)} className="text-[10px] font-black text-purple-600 mb-1 cursor-pointer hover:underline uppercase tracking-wider">{comment.author}</p>
                  <p className="text-sm text-gray-700 font-medium break-words leading-relaxed">{comment.text}</p>
                </div>
                {comment.author === username && (
                  <div className="relative">
                    <button onClick={() => setActiveMenuId(activeMenuId === comment.id ? null : comment.id)} className="p-1 text-gray-300"><FiMoreVertical size={16} /></button>
                    {activeMenuId === comment.id && (
                      <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1">
                        <button onClick={() => { setActiveEditId(comment.id); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">Edit</button>
                        <button onClick={() => { if(window.confirm("Delete?")) deleteComment(comment.id).then(onRefresh); }} className="w-full text-left px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2">Delete</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="mt-2 flex items-center gap-4 ml-2">
              <button onClick={() => setActiveReplyId(activeReplyId === comment.id ? null : comment.id)} className="text-[9px] text-gray-400 font-black uppercase tracking-widest hover:text-purple-600">Reply</button>
              <span className="text-[9px] text-gray-300 font-bold">{new Date(comment.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            {activeReplyId === comment.id && (
              <div className="mt-3 ml-2 border-l-2 border-purple-100 pl-4">
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
    <form onSubmit={handleSubmit} className="flex gap-2 items-center bg-white p-2 rounded-2xl border border-gray-100 shadow-sm focus-within:ring-2 ring-purple-100 transition-all">
      <input value={val} onChange={(e) => setVal(e.target.value)} placeholder={placeholder} className="flex-1 bg-transparent px-3 py-1.5 text-sm outline-none font-medium" />
      <button type="submit" className="bg-purple-600 text-white p-2.5 rounded-xl hover:bg-purple-700 active:scale-90 shadow-md shadow-purple-50"><FiSend size={16} /></button>
    </form>
  );
}