import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPosts, getUserProfile, updateProfilePhoto } from "../api";
import { 
  FiCamera, FiChevronLeft, FiChevronRight, FiEdit, 
  FiClock, FiGrid, FiArrowLeft, FiLoader, FiHeart 
} from "react-icons/fi";
import DuaCard from "../components/DuaCard";
import PostCard from "../components/PostCard";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ProfilePage() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");
  
  // State
  const [myPosts, setMyPosts] = useState([]);
  const [photoHistory, setPhotoHistory] = useState([]);
  const [bio, setBio] = useState(""); // Added bio state
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Profile and History
      const profile = await getUserProfile(username);
      
      // Update bio from profile data
      setBio(profile.bio || ""); 
      
      // 2. Format history URLs
      const historyArr = [];
      
      // Add current photo first
      if (profile.profile_photo) {
        historyArr.push(`${BACKEND_URL}${profile.profile_photo}`);
      } else {
        historyArr.push(`https://ui-avatars.com/api/?name=${username}&background=random`);
      }

      // Add historical photos
      if (profile.history && profile.history.length > 0) {
        profile.history.forEach(h => {
          historyArr.push(`${BACKEND_URL}${h.photo_url}`);
        });
      }
      
      setPhotoHistory(historyArr);

      // 3. Fetch Posts
      const allPosts = await getPosts();
      const filtered = (allPosts || []).filter(p => p.author === username);
      setMyPosts(filtered);
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("photo", file); 

    try {
      await updateProfilePhoto(formData);
      await loadProfileData();
      setCurrentPhotoIdx(0); 
    } catch (err) {
      console.error(err);
      alert("Failed to upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const nextPhoto = () => setCurrentPhotoIdx((prev) => (prev + 1) % photoHistory.length);
  const prevPhoto = () => setCurrentPhotoIdx((prev) => (prev - 1 + photoHistory.length) % photoHistory.length);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <FiLoader className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* --- TOP HEADER NAVIGATION --- */}
      <div className="bg-white border-b sticky top-0 z-30 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-purple-600 font-bold transition-colors">
            <FiArrowLeft size={20} /> Back
          </button>
          <h1 className="text-lg font-black text-gray-800 tracking-tight">Sister Profile</h1>
          <div className="w-10"></div> 
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* --- LEFT COLUMN: IDENTITY & PHOTO HISTORY --- */}
          <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-purple-100 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
              
              {/* Photo Slider */}
              <div className="relative group mx-auto w-40 h-40 mb-6">
                <div className="w-full h-full rounded-[2rem] overflow-hidden border-4 border-white shadow-xl bg-gray-100 relative">
                  {uploading && (
                    <div className="absolute inset-0 z-10 bg-black/20 flex items-center justify-center backdrop-blur-sm">
                        <FiLoader className="animate-spin text-white" size={24} />
                    </div>
                  )}
                  <img 
                    src={photoHistory[currentPhotoIdx]} 
                    className="w-full h-full object-cover transition-opacity duration-500" 
                    alt="Profile" 
                  />
                </div>
                
                {/* Upload Button */}
                <label className="absolute bottom-2 right-2 bg-purple-600 p-3 rounded-2xl text-white shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all z-20">
                  <FiCamera size={20} />
                  <input type="file" hidden onChange={handlePhotoUpload} accept="image/*" disabled={uploading} />
                </label>

                {/* Navigation Arrows */}
                {photoHistory.length > 1 && (
                  <>
                    <button onClick={prevPhoto} className="absolute left-[-20px] top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-md text-gray-400 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-all">
                      <FiChevronLeft size={20}/>
                    </button>
                    <button onClick={nextPhoto} className="absolute right-[-20px] top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-md text-gray-400 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-all">
                      <FiChevronRight size={20}/>
                    </button>
                  </>
                )}
              </div>

              <h2 className="text-2xl font-black text-gray-800">{username}</h2>
              
              {/* --- BIO SECTION --- */}
              <div className="mt-2 mb-6">
                {bio ? (
                  <p className="text-sm text-purple-600 font-bold leading-relaxed px-4">
                    <FiHeart className="inline mb-1 mr-1" size={12}/> {bio}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 font-medium italic">"Part of the Sisterhood"</p>
                )}
              </div>
              
              <button 
                onClick={() => navigate("/settings")}
                className="w-full py-3 bg-gray-50 text-gray-600 rounded-2xl font-bold text-sm hover:bg-purple-50 hover:text-purple-600 transition-all flex items-center justify-center gap-2"
              >
                <FiEdit size={16} /> Edit Details
              </button>
            </div>

            {/* Photo History List (Mini Gallery) */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FiClock /> Photo Journey
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {photoHistory.map((url, i) => (
                  <button 
                    key={i} 
                    onClick={() => setCurrentPhotoIdx(i)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${currentPhotoIdx === i ? 'border-purple-500 scale-95' : 'border-transparent opacity-40 hover:opacity-100'}`}
                  >
                    <img src={url} className="w-full h-full object-cover" alt={`History ${i}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* --- RIGHT COLUMN: PERSONAL FEED --- */}
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <FiGrid className="text-purple-500" /> My Contributions
              </h2>
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                {myPosts.length} Posts
              </span>
            </div>

            {myPosts.length > 0 ? (
              <div className="space-y-6">
                {myPosts.map((post) => (
                  post.type === 'dua' ? (
                    <DuaCard 
                        key={post.id} 
                        post={post} 
                        currentUser={username} 
                        onRefresh={loadProfileData} 
                        isMine={true} 
                    />
                  ) : (
                    <PostCard 
                        key={post.id} 
                        post={post} 
                        isMine={true} 
                        onRefresh={loadProfileData} 
                    />
                  )
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] border-2 border-dashed border-gray-200 py-20 text-center">
                <p className="text-gray-400 font-bold">You haven't shared any memories yet.</p>
                <button onClick={() => navigate("/feed")} className="mt-4 text-purple-600 font-black text-sm hover:underline">
                  Go to Feed to share →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}