'use client';

import { useState, useRef, useEffect } from 'react';
import { Compass, Users, PlusCircle, Bookmark, User, Heart, MessageCircle, Share2, Music2, Upload, Film, LogOut, Send, PenTool } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  // Navigasyon ve Sekme Yönetimi (Sayfa yenilense de son kalınan sekmeyi hatırlar)
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeTab') || 'kesfet';
    }
    return 'kesfet';
  });

  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName);
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeTab', tabName);
    }
  };
  
  // Video Akış Listesi (Başlangıçta boş)
  const [videos, setVideos] = useState<any[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  // Takip Kısmı İçin Metin/Yazı Paylaşım Listesi
  const [posts, setPosts] = useState<any[]>([]);
  const [postText, setPostText] = useState('');

  // Supabase Oturum ve Kimlik Doğrulama Durumları
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Video Yükleme ve Form Alanları
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Yorum Sistemi Durumları
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [videoComments, setVideoComments] = useState<{ [key: number]: string[] }>({});

  // Sayfa yüklendiğinde Supabase oturum kontrolü
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Giriş / Kayıt İşlemi Yönetimi
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
  };

  // Çıkış Yapma İşlemi
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const currentVideo = videos[currentVideoIndex];

  // Sonraki videoya geçiş fonksiyonu
  const handleNextVideo = () => {
    if (videos.length === 0) return;
    setCurrentVideoIndex((prev) => (prev + 1) % videos.length);
  };

  // Beğeni (Kalp) Butonu Etkileşimi
  const handleLikeToggle = () => {
    if (!currentVideo) return;
    setVideos(prevVideos => prevVideos.map((vid, idx) => {
      if (idx === currentVideoIndex) {
        const newLikedState = !vid.liked;
        return {
          ...vid,
          liked: newLikedState,
          likes: newLikedState ? vid.likes + 1 : vid.likes - 1
        };
      }
      return vid;
    }));
  };

  // Favori (Yer İmi) Butonu Etkileşimi
  const handleFavoriteToggle = () => {
    if (!currentVideo) return;
    setVideos(prevVideos => prevVideos.map((vid, idx) => {
      if (idx === currentVideoIndex) {
        return { ...vid, favorited: !vid.favorited };
      }
      return vid;
    }));
  };

  // Yorum Gönderme Fonksiyonu
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentVideo) return;

    const videoId = currentVideo.id;
    setVideoComments(prev => ({
      ...prev,
      [videoId]: [...(prev[videoId] || []), commentText]
    }));

    setVideos(prevVideos => prevVideos.map((vid, idx) => {
      if (idx === currentVideoIndex) {
        return { ...vid, comments: vid.comments + 1 };
      }
      return vid;
    }));

    setCommentText('');
  };

  // 60 Saniye Süre Sınırı Kontrolü
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      
      videoElement.onloadedmetadata = function () {
        window.URL.revokeObjectURL(videoElement.src);
        
        if (videoElement.duration > 60) {
          alert(`Seçtiğiniz video ${Math.round(videoElement.duration)} saniye. Mini dizi videoları en fazla 1 dakika (60 saniye) olabilir!`);
          if (fileInputRef.current) fileInputRef.current.value = '';
          setSelectedVideoUrl(null);
        } else {
          const url = URL.createObjectURL(file);
          setSelectedVideoUrl(url);
        }
      };

      videoElement.src = URL.createObjectURL(file);
    }
  };

  // Video Paylaşım Gönderimi
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTitle) {
      alert("Lütfen bir dizi başlığı yazın!");
      return;
    }
    if (!selectedVideoUrl) {
      alert("Lütfen geçerli sürede (en fazla 60 saniye) bir video dosyası seçin!");
      return;
    }

    setIsUploading(true);

    setTimeout(() => {
      const newLocalVideo = {
        id: Date.now(),
        title: videoTitle,
        creator: user ? `@${user.email?.split('@')[0]}` : "@benim_dizim",
        desc: videoDesc || "Yeni yüklenen mini dizi bölümü!",
        likes: 0,
        comments: 0,
        favorited: false,
        liked: false,
        videoUrl: selectedVideoUrl
      };

      setVideos([newLocalVideo, ...videos]);
      setIsUploading(false);
      setCurrentVideoIndex(0);
      handleTabChange('kesfet');
      setVideoTitle('');
      setVideoDesc('');
      setSelectedVideoUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert("Video başarıyla akışa eklendi!");
    }, 500);
  };

  // Takip Kısmı İçin Yazı Paylaşma Fonksiyonu
  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim()) return;

    const newPost = {
      id: Date.now(),
      creator: user ? `@${user.email?.split('@')[0]}` : "@anonim_yazar",
      content: postText,
      time: "Şimdi"
    };

    setPosts([newPost, ...posts]);
    setPostText('');
  };

  return (
    <main className="flex h-screen w-full items-center justify-center bg-zinc-950 text-white font-sans overflow-hidden select-none">
      
      {/* Mobil Çerçeve Ana Konteyner */}
      <div className="relative h-full w-full max-w-[430px] md:h-[90vh] md:rounded-[40px] border-0 md:border-[8px] border-zinc-800 bg-black overflow-hidden shadow-2xl flex flex-col justify-between">
        
        {/* Üst Logo ve Durum Çubuğu */}
        <div className="absolute top-0 left-0 right-0 z-30 flex justify-between items-center p-4 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none">
          <span className="font-extrabold text-xl tracking-wider text-red-600 pointer-events-auto">MINIDIZI</span>
          <div className="flex items-center gap-2 pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
            <span className="text-xs font-semibold text-zinc-300">CANLI AKIŞ</span>
          </div>
        </div>

        {/* ORTA İÇERİK ALANI */}
        <div className="flex-1 overflow-y-auto relative pb-20 pt-14">
          
          {/* ================= 1. KEŞFET SEKMESİ ================= */}
          {activeTab === 'kesfet' && (
            <div className="relative w-full h-full bg-zinc-900 flex items-center justify-center">
              {videos.length > 0 && currentVideo ? (
                <div className="relative w-full h-full cursor-pointer" onClick={handleNextVideo}>
                  <video
                    src={currentVideo.videoUrl}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                    onError={(e) => console.error("Video yüklenemedi:", e)}
                  />

                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90 pointer-events-none" />

                  {/* Sağ Etkileşim Butonları */}
                  <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-20" onClick={(e) => e.stopPropagation()}>
                    <button onClick={handleLikeToggle} className="flex flex-col items-center group">
                      <div className={`p-3 rounded-full backdrop-blur-md transition-all duration-300 ${currentVideo.liked ? 'bg-red-600 text-white scale-110' : 'bg-black/40 text-white group-hover:bg-black/60'}`}>
                        <Heart className={`w-6 h-6 ${currentVideo.liked ? 'fill-white' : ''}`} />
                      </div>
                      <span className="text-xs font-semibold mt-1 shadow-sm">{currentVideo.likes}</span>
                    </button>

                    <button onClick={() => setShowComments(true)} className="flex flex-col items-center group">
                      <div className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white group-hover:bg-black/60 transition">
                        <MessageCircle className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-semibold mt-1 shadow-sm">{currentVideo.comments}</span>
                    </button>

                    <button onClick={handleFavoriteToggle} className="flex flex-col items-center group">
                      <div className={`p-3 rounded-full backdrop-blur-md transition-all duration-300 ${currentVideo.favorited ? 'bg-amber-500 text-white scale-110' : 'bg-black/40 text-white group-hover:bg-black/60'}`}>
                        <Bookmark className={`w-6 h-6 ${currentVideo.favorited ? 'fill-white' : ''}`} />
                      </div>
                      <span className="text-xs font-semibold mt-1 shadow-sm">Favori</span>
                    </button>

                    <button onClick={() => alert("Video bağlantısı kopyalandı!")} className="flex flex-col items-center group">
                      <div className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white group-hover:bg-black/60 transition">
                        <Share2 className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-semibold mt-1 shadow-sm">Paylaş</span>
                    </button>
                  </div>

                  {/* Sol Alt Dizi Detayları */}
                  <div className="absolute left-4 bottom-20 right-20 z-20 text-left pointer-events-none">
                    <p className="font-bold text-base text-white mb-1 drop-shadow-md">{currentVideo.creator}</p>
                    <p className="text-sm text-zinc-200 line-clamp-2 mb-2 drop-shadow-sm">{currentVideo.title}</p>
                    <p className="text-xs text-zinc-400 line-clamp-1 mb-2">{currentVideo.desc}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Music2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Orijinal Dizi Müzikleri</span>
                    </div>
                  </div>

                  {/* Yorumlar Paneli */}
                  {showComments && (
                    <div 
                      className="absolute inset-x-0 bottom-0 top-1/3 bg-zinc-900/95 backdrop-blur-xl rounded-t-3xl p-4 flex flex-col justify-between z-40 border-t border-zinc-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                        <h3 className="text-sm font-bold text-white">Yorumlar ({currentVideo.comments})</h3>
                        <button onClick={() => setShowComments(false)} className="text-zinc-400 text-xs hover:text-white">Kapat</button>
                      </div>

                      <div className="flex-1 overflow-y-auto my-3 space-y-3">
                        {(videoComments[currentVideo.id] || []).length > 0 ? (
                          (videoComments[currentVideo.id] || []).map((c, i) => (
                            <div key={i} className="bg-zinc-800/50 p-2.5 rounded-xl text-xs text-zinc-300 text-left">
                              <span className="font-bold text-red-500 mr-2">@izleyici</span>
                              {c}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-10 text-zinc-500 text-xs">Henüz yorum yapılmamış. İlk yorumu sen yap!</div>
                        )}
                      </div>

                      <form onSubmit={handleAddComment} className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Yorum yap..." 
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                        />
                        <button type="submit" className="bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-xs">
                          Gönder
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <Film className="w-16 h-16 text-zinc-700 mb-4 animate-pulse" />
                  <h3 className="text-lg font-bold text-zinc-300 mb-1">Henüz bir yapım yok</h3>
                  <p className="text-xs text-zinc-500 max-w-[260px] mb-6">Keşfet akışında gösterilecek video bulunmuyor. Paylaş sekmesinden ilk 1 dakikalık dizini yükle!</p>
                  <button 
                    type="button"
                    onClick={() => handleTabChange('paylasim')} 
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer"
                  >
                    Hemen Video Yükle
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= 2. PAYLAŞIM SEKMESİ ================= */}
          {activeTab === 'paylasim' && (
            <div className="p-6 bg-zinc-950">
              <h2 className="text-xl font-bold mb-1 text-red-500">1 Dakikalık Dizi Yükle</h2>
              <p className="text-xs text-zinc-400 mb-6">Uygulama içine dikey video ekle (Maksimum 60 saniye).</p>

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <input 
                  type="file" 
                  accept="video/*" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-36 border-2 border-dashed border-zinc-700 hover:border-red-500 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition bg-zinc-900/50"
                >
                  <Upload className="w-8 h-8 text-zinc-400 mb-2" />
                  <span className="text-xs font-medium text-zinc-300">
                    {selectedVideoUrl ? "✅ Video Seçildi ve Süresi Uygun" : "Dikey Video Dosyası Seç (.mp4)"}
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">Dizi / Bölüm Başlığı</label>
                  <input 
                    type="text" 
                    placeholder="Örn: Bölüm #1 - Beklenmeyen An" 
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">Açıklama / Etiketler</label>
                  <textarea 
                    placeholder="Bölüm hakkında kısa bilgi..." 
                    value={videoDesc}
                    onChange={(e) => setVideoDesc(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 h-20 resize-none"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isUploading}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 font-bold rounded-xl text-sm transition shadow-lg shadow-red-900/30 mt-2 disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? "Yükleniyor..." : "Yayınla ve Keşfet'te Gör"}
                </button>
              </form>
            </div>
          )}

          {/* ================= 3. TAKİP SEKMESİ (YAZI / METİN PAYLAŞIMI) ================= */}
          {activeTab === 'takip' && (
            <div className="p-4 bg-zinc-950 flex flex-col min-h-full space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <PenTool className="w-5 h-5 text-red-500" />
                <h2 className="text-base font-bold text-white">Takip Akışı ve Yazılar</h2>
              </div>

              {/* Yazı Paylaşım Formu */}
              <form onSubmit={handlePostSubmit} className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl space-y-3">
                <textarea 
                  placeholder="Aklındakileri veya yeni duyuruları takipçilerinle paylaş..." 
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500 h-20 resize-none"
                />
                <div className="flex justify-end">
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Send className="w-3.5 h-3.5" /> Yazı Yayınla
                  </button>
                </div>
              </form>

              {/* Paylaşılan Yazıların Listesi */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <div key={post.id} className="bg-zinc-900/80 border border-zinc-800/80 p-3.5 rounded-2xl text-left space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs text-red-500">{post.creator}</span>
                        <span className="text-[10px] text-zinc-500">{post.time}</span>
                      </div>
                      <p className="text-xs text-zinc-200 leading-relaxed">{post.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 text-zinc-500 text-xs">
                    Henüz takip akışında paylaşılan bir yazı yok. İlk yazıyı sen paylaş!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= 4. FAVORİLER SEKMESİ ================= */}
          {activeTab === 'favoriler' && (
            <div className="p-6 bg-zinc-950">
              <h2 className="text-xl font-bold mb-4 text-red-500">Favori Dizilerim</h2>
              <div className="space-y-3">
                {videos.filter(v => v.favorited).length > 0 ? (
                  videos.filter(v => v.favorited).map((fav) => (
                    <div key={fav.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">{fav.title}</p>
                        <p className="text-xs text-zinc-400">{fav.creator}</p>
                      </div>
                      <span className="text-xs text-amber-500 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-full">Favoride</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 text-zinc-500 text-xs">
                    Henüz favorilere dizi eklemedin. Keşfet sekmesinde sarı yer imi butonuna basabilirsin!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= 5. PROFİL SEKMESİ ================= */}
          {activeTab === 'profil' && (
            <div className="p-6 bg-zinc-950">
              {user ? (
                <div className="w-full space-y-6">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-tr from-red-600 to-amber-500 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto text-white font-black text-2xl shadow-lg shadow-red-900/40">
                      {user.email?.[0].toUpperCase()}
                    </div>
                    <h2 className="text-lg font-bold text-white mt-3">@{user.email?.split('@')[0]}</h2>
                    <p className="text-xs text-zinc-400">{user.email}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-zinc-900 p-3 rounded-2xl border border-zinc-800 text-center">
                    <div>
                      <p className="text-sm font-bold text-white">{videos.length}</p>
                      <p className="text-[10px] text-zinc-400">Dizi/Bölüm</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">0</p>
                      <p className="text-[10px] text-zinc-400">Takipçi</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">0</p>
                      <p className="text-[10px] text-zinc-400">Beğeni</p>
                    </div>
                  </div>

                  <button 
                    onClick={handleLogout}
                    className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-red-500 font-semibold rounded-xl border border-zinc-800 transition text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" /> Çıkış Yap
                  </button>
                </div>
              ) : (
                <div className="w-full my-auto text-center py-6">
                  <h2 className="text-xl font-bold mb-1 text-red-500">{isSignUp ? "Hesap Oluştur" : "Giriş Yap"}</h2>
                  <p className="text-xs text-zinc-400 mb-6">Mini dizi dünyasına katılmak için giriş yap.</p>
                  
                  <form onSubmit={handleAuth} className="space-y-4 text-left">
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 block mb-1">E-posta Adresi</label>
                      <input 
                        type="email" 
                        placeholder="ornek@mail.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-400 block mb-1">Şifre</label>
                      <input 
                        type="password" 
                        placeholder="******" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                        required
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="w-full py-3 bg-red-600 hover:bg-red-700 font-bold rounded-xl text-sm transition shadow-lg shadow-red-900/30 mt-2 cursor-pointer"
                    >
                      {isSignUp ? "Kayıt Ol" : "Giriş Yap"}
                    </button>
                  </form>

                  <button 
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="mt-4 text-xs text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    {isSignUp ? "Zaten hesabın var mı? Giriş yap" : "Hesabın yok mu? Kayıt ol"}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ALT GEZİNTİ BARI - KESİNTİSİZ VE GARANTİLİ TIKLAMA KATMANI */}
        <div className="absolute bottom-0 left-0 right-0 z-50 h-16 bg-black border-t border-zinc-800 flex items-center justify-around px-2 select-none shadow-2xl">
          
          <button 
            type="button"
            onClick={() => handleTabChange('kesfet')} 
            className={`flex flex-col items-center gap-1 p-2 cursor-pointer transition ${activeTab === 'kesfet' ? 'text-red-500 scale-105' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[10px] font-medium">Keşfet</span>
          </button>

          <button 
            type="button"
            onClick={() => handleTabChange('takip')} 
            className={`flex flex-col items-center gap-1 p-2 cursor-pointer transition ${activeTab === 'takip' ? 'text-red-500 scale-105' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-medium">Takip</span>
          </button>

          <button 
            type="button"
            onClick={() => handleTabChange('paylasim')} 
            className="flex flex-col items-center -mt-5 cursor-pointer z-50 group"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-600 to-red-500 flex items-center justify-center shadow-lg shadow-red-600/50 border-2 border-black group-hover:scale-110 transition duration-200">
              <PlusCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-[9px] font-semibold text-zinc-400 mt-0.5">Paylaş</span>
          </button>

          <button 
            type="button"
            onClick={() => handleTabChange('favoriler')} 
            className={`flex flex-col items-center gap-1 p-2 cursor-pointer transition ${activeTab === 'favoriler' ? 'text-red-500 scale-105' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Bookmark className="w-5 h-5" />
            <span className="text-[10px] font-medium">Favoriler</span>
          </button>

          <button 
            type="button"
            onClick={() => handleTabChange('profil')} 
            className={`flex flex-col items-center gap-1 p-2 cursor-pointer transition ${activeTab === 'profil' ? 'text-red-500 scale-105' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Profil</span>
          </button>
        </div>

      </div>
    </main>
  );
}