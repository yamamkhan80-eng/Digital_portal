import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Home, 
  FileText, 
  Search, 
  Download, 
  Bell, 
  User, 
  ChevronRight, 
  ArrowLeft, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus, 
  Trash2,
  LogOut,
  ShieldCheck,
  ShieldOff,
  Menu,
  X,
  Camera,
  Settings,
  Megaphone,
  Smartphone,
  MessageSquare,
  Send,
  Bot,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI } from "@google/genai";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Webcam from "react-webcam";

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Application {
  id: string;
  fullName: string;
  fatherName: string;
  motherName: string;
  dob: string;
  nid: string;
  mobile: string;
  address: string;
  photo: string;
  nidFront: string;
  nidBack: string;
  faceVerified: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

interface Notice {
  id: number;
  content: string;
  type: 'notice' | 'ad';
  createdAt: string;
}

interface UserProfile {
  phone: string;
  name?: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// --- Components ---

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-bd-green to-emerald-900 text-white"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl mb-6 overflow-hidden border-4 border-bd-red/30">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Government_Seal_of_Bangladesh.svg/1200px-Government_Seal_of_Bangladesh.svg.png" 
            alt="Gov Logo" 
            className="w-20 h-20 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-center px-6">
          Family Card Digital Application Portal
        </h1>
        <p className="mt-2 text-emerald-100 font-bangla">
          ডিজিটাল বাংলাদেশ সেবা পোর্টাল
        </p>
      </motion.div>
      
      <div className="absolute bottom-12">
        <div className="flex space-x-2">
          <motion.div 
            animate={{ opacity: [0.3, 1, 0.3] }} 
            transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
            className="w-2 h-2 bg-white rounded-full" 
          />
          <motion.div 
            animate={{ opacity: [0.3, 1, 0.3] }} 
            transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
            className="w-2 h-2 bg-white rounded-full" 
          />
          <motion.div 
            animate={{ opacity: [0.3, 1, 0.3] }} 
            transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
            className="w-2 h-2 bg-white rounded-full" 
          />
        </div>
      </div>
    </motion.div>
  );
};

const Header = ({ title, onBack, showAdmin }: { title: string, onBack?: () => void, showAdmin?: () => void }) => (
  <header className="sticky top-0 z-30 bg-bd-green text-white px-4 py-4 flex items-center justify-between shadow-lg">
    <div className="flex items-center gap-3">
      {onBack ? (
        <button onClick={onBack} className="p-1 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
      ) : (
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center p-1">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Government_Seal_of_Bangladesh.svg/1200px-Government_Seal_of_Bangladesh.svg.png" 
            alt="Logo" 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      <h1 className="font-semibold text-lg truncate font-bangla">{title}</h1>
    </div>
    {showAdmin && (
      <button onClick={showAdmin} className="p-2 hover:bg-white/10 rounded-full transition-colors">
        <ShieldCheck size={20} />
      </button>
    )}
  </header>
);

const Watermark = () => (
  <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03] flex items-center justify-center overflow-hidden">
    <div className="grid grid-cols-2 gap-20 rotate-[-30deg] scale-150">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="text-4xl font-bold whitespace-nowrap">
          GOVERNMENT OF BANGLADESH
        </div>
      ))}
    </div>
  </div>
);

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentPage, setCurrentPage] = useState<'login' | 'home' | 'apply' | 'verify' | 'receipt' | 'notices' | 'profile' | 'settings' | 'admin-login' | 'admin-dashboard' | 'ai-chat' | 'help'>('login');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [newAppId, setNewAppId] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert("আপনার ব্রাউজারের মেনু থেকে 'Add to Home Screen' সিলেক্ট করুন।");
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('family_card_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setCurrentPage('home');
    }
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const res = await fetch("/api/notices");
      const data = await res.json();
      setNotices(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (phone: string) => {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        localStorage.setItem('family_card_user', JSON.stringify(data));
        setCurrentPage('home');
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("লগইন করতে সমস্যা হয়েছে।");
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('family_card_user');
    setCurrentPage('login');
  };

  const handleApply = async (formData: any) => {
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setNewAppId(data.id);
        setShowSuccessPopup(true);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("আবেদন জমা দিতে সমস্যা হয়েছে।");
    }
  };

  const handleVerify = async (search: string) => {
    try {
      const res = await fetch(`/api/applications/${search}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedApp(data);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("আবেদনটি খুঁজে পাওয়া যায়নি।");
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', text }];
    setChatMessages(newMessages);
    setIsChatLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: newMessages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
        config: {
          systemInstruction: "You are a helpful assistant for the 'Family Card Digital Application Portal' of Bangladesh. Answer in Bengali. Help users with application process, NID verification, and general queries about the portal. Keep answers concise and professional.",
        }
      });
      
      if (response.text) {
        setChatMessages([...newMessages, { role: 'model', text: response.text }]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages([...newMessages, { role: 'model', text: "দুঃখিত, আমি এই মুহূর্তে উত্তর দিতে পারছি না। পরে চেষ্টা করুন।" }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const PageTransition = ({ children }: { children: React.ReactNode, key?: string }) => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="relative z-10 min-h-[calc(100vh-64px)] w-full max-w-full overflow-x-hidden"
    >
      {children}
    </motion.div>
  );

  if (loading) return <SplashScreen onComplete={() => setLoading(false)} />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-bd-green/20 overflow-x-hidden relative max-w-[100vw]">
      <Watermark />
      
      <div className="w-full overflow-x-hidden relative">
        <AnimatePresence mode="wait">
          {currentPage === 'login' && (
            <PageTransition key="login">
              <LoginPage onLogin={handleLogin} onCheckStatus={() => setCurrentPage('verify')} />
            </PageTransition>
          )}

        {currentPage === 'home' && (
          <PageTransition key="home">
            <Header title="পরিবার কার্ড পোর্টাল" />
            
            {/* News Ticker */}
            <div className="bg-bd-green text-white py-2 overflow-hidden flex items-center gap-4 shadow-md sticky top-16 z-20">
              <div className="bg-bd-red px-3 py-0.5 rounded-r-full text-[10px] font-bold whitespace-nowrap animate-pulse font-bangla">সর্বশেষ সংবাদ</div>
              <div className="flex-1 overflow-hidden">
                <motion.div 
                  animate={{ x: ["100%", "-100%"] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="whitespace-nowrap text-sm font-medium font-bangla"
                >
                  পরিবার কার্ড ডিজিটাল আবেদন শুরু হয়েছে। আপনার NID কার্ড দিয়ে এখনই আবেদন করুন। ১৮ই মার্চ ফলাফল প্রকাশ করা হবে।
                </motion.div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-bd-green text-white rounded-full flex items-center justify-center font-bold text-xl">
                    {user?.phone?.slice(-2)}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-bangla">স্বাগতম</p>
                    <p className="font-bold text-slate-800">{user?.phone}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage('settings')} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-500">
                    <Settings size={20} />
                  </button>
                  <button onClick={() => setCurrentPage('admin-login')} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-bd-green">
                    <ShieldCheck size={20} />
                  </button>
                </div>
              </div>

              <div className="relative h-48 rounded-3xl overflow-hidden shadow-2xl group">
                <img 
                  src="https://picsum.photos/seed/bangladesh/800/400" 
                  alt="Banner" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bd-green/80 to-transparent flex flex-col justify-end p-6 text-white">
                  <h2 className="text-xl font-bold font-bangla">পরিবার কার্ড ডিজিটাল সেবা</h2>
                  <p className="text-sm text-emerald-100 font-bangla">সহজ ও দ্রুত আবেদন করুন ঘরে বসেই</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <MenuButton 
                  icon={<FileText className="text-bd-green" />} 
                  label="আবেদন করুন" 
                  onClick={() => setCurrentPage('apply')} 
                />
                <MenuButton 
                  icon={<Search className="text-bd-red" />} 
                  label="আবেদন যাচাই" 
                  onClick={() => setCurrentPage('verify')} 
                />
                <MenuButton 
                  icon={<User className="text-blue-600" />} 
                  label="আমার প্রোফাইল" 
                  onClick={() => setCurrentPage('profile')} 
                />
                <MenuButton 
                  icon={<Bell className="text-orange-500" />} 
                  label="নোটিশ ও আপডেট" 
                  onClick={() => setCurrentPage('notices')} 
                />
              </div>

              <AnimatePresence>
                {notices.filter(n => n.type === 'ad').length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-bd-red/5 border border-bd-red/10 p-4 rounded-2xl flex items-center gap-4 cursor-pointer"
                    onClick={() => setCurrentPage('notices')}
                  >
                    <div className="p-2 bg-bd-red text-white rounded-lg animate-pulse">
                      <Megaphone size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-bd-red font-bangla">বিশেষ অফার / বিজ্ঞাপন</p>
                      <p className="text-sm text-slate-700 font-bangla truncate">{notices.find(n => n.type === 'ad')?.content}</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="glass-card p-6 rounded-3xl space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2 font-bangla">
                  <Bell size={20} className="text-bd-red" /> সর্বশেষ আপডেট
                </h3>
                <div className="space-y-3">
                  {notices.filter(n => n.type === 'notice').slice(0, 2).map((notice) => (
                    <div key={notice.id} className="flex gap-3 items-start border-l-2 border-bd-green pl-3">
                      <p className="text-sm text-slate-600 font-bangla">{notice.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </PageTransition>
        )}

        {currentPage === 'apply' && (
          <PageTransition key="apply">
            <Header title="আবেদন ফরম" onBack={() => setCurrentPage('home')} />
            <ApplicationForm onSubmit={handleApply} />
          </PageTransition>
        )}

        {currentPage === 'verify' && (
          <PageTransition key="verify">
            <Header title="আবেদন যাচাই" onBack={() => user ? setCurrentPage('home') : setCurrentPage('login')} />
            <VerificationPage onVerify={handleVerify} selectedApp={selectedApp} onClear={() => setSelectedApp(null)} />
          </PageTransition>
        )}

        {currentPage === 'profile' && (
          <PageTransition key="profile">
            <Header title="আমার প্রোফাইল" onBack={() => setCurrentPage('home')} />
            <div className="p-6 space-y-6">
              <div className="glass-card p-8 rounded-3xl text-center space-y-4">
                <div className="w-24 h-24 bg-bd-green text-white rounded-full flex items-center justify-center mx-auto text-3xl font-bold shadow-xl">
                  {user?.phone?.slice(-2)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{user?.phone}</h3>
                  <p className="text-sm text-slate-400 font-bangla">নিবন্ধিত ব্যবহারকারী</p>
                </div>
              </div>
              <div className="glass-card p-6 rounded-3xl space-y-4">
                <h4 className="font-bold text-slate-800 border-b pb-2 font-bangla">অ্যাকাউন্ট তথ্য</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-bangla">মোবাইল নম্বর</span>
                    <span className="font-bold text-slate-700">{user?.phone}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-bangla">নিবন্ধন তারিখ</span>
                    <span className="font-bold text-slate-700">০২ মার্চ, ২০২৬</span>
                  </div>
                </div>
              </div>
              <button onClick={handleLogout} className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-2 font-bangla">
                <LogOut size={20} /> লগ আউট করুন
              </button>
            </div>
          </PageTransition>
        )}

        {currentPage === 'settings' && (
          <PageTransition key="settings">
            <Header title="সেটিংস" onBack={() => setCurrentPage('home')} />
            <div className="p-6 space-y-4">
              <div className="glass-card p-2 rounded-3xl overflow-hidden">
                <SettingsItem icon={<Download className="text-bd-green" />} label="অ্যাপ ইনস্টল করুন" onClick={installApp} />
                <SettingsItem icon={<Bell className="text-orange-500" />} label="নোটিফিকেশন" onClick={() => setCurrentPage('notices')} />
                <SettingsItem icon={<Smartphone className="text-blue-500" />} label="অ্যাপ আপডেট" />
                <SettingsItem icon={<ShieldCheck className="text-bd-green" />} label="নিরাপত্তা" />
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-slate-400 font-bangla">ভার্সন ২.০.১</p>
              </div>
            </div>
          </PageTransition>
        )}

        {currentPage === 'notices' && (
          <PageTransition key="notices">
            <Header title="নোটিশ ও আপডেট" onBack={() => setCurrentPage('home')} />
            <div className="p-6 space-y-4">
              {notices.map((notice) => (
                <div key={notice.id} className={cn(
                  "glass-card p-5 rounded-2xl border-l-4",
                  notice.type === 'ad' ? "border-bd-red bg-bd-red/5" : "border-bd-green"
                )}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                      notice.type === 'ad' ? "bg-bd-red text-white" : "bg-bd-green text-white"
                    )}>
                      {notice.type === 'ad' ? "অফার" : "নোটিশ"}
                    </span>
                    <p className="text-[10px] text-slate-400">{new Date(notice.createdAt).toLocaleDateString('bn-BD')}</p>
                  </div>
                  <p className="text-slate-800 font-medium font-bangla">{notice.content}</p>
                </div>
              ))}
              {notices.length === 0 && (
                <div className="text-center py-12 text-slate-400 font-bangla">
                  কোনো নোটিশ পাওয়া যায়নি।
                </div>
              )}
            </div>
          </PageTransition>
        )}

        {currentPage === 'admin-login' && (
          <PageTransition key="admin-login">
            <Header title="Admin Login" onBack={() => setCurrentPage('home')} />
            <AdminLogin onLogin={() => setCurrentPage('admin-dashboard')} />
          </PageTransition>
        )}

        {currentPage === 'admin-dashboard' && (
          <PageTransition key="admin-dashboard">
            <Header title="Admin Dashboard" onBack={() => setCurrentPage('home')} />
            <AdminDashboard />
          </PageTransition>
        )}

        {currentPage === 'ai-chat' && (
          <PageTransition key="ai-chat">
            <Header title="AI সহায়তা" onBack={() => setCurrentPage('home')} />
            <AIChat messages={chatMessages} onSend={handleSendMessage} isLoading={isChatLoading} />
          </PageTransition>
        )}

        {currentPage === 'help' && (
          <PageTransition key="help">
            <Header title="সহায়তা ও FAQ" onBack={() => setCurrentPage('home')} />
            <HelpPage />
          </PageTransition>
        )}
      </AnimatePresence>
    </div>

      {/* Floating AI Chat Button */}
      {user && currentPage === 'home' && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setCurrentPage('ai-chat')}
          className="fixed bottom-24 right-6 w-14 h-14 bg-bd-green text-white rounded-full shadow-2xl flex items-center justify-center z-40 border-4 border-white"
        >
          <Bot size={28} />
        </motion.button>
      )}

      {/* Bottom Navigation Bar */}
      {user && currentPage !== 'login' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3 flex justify-between items-center z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <NavIcon icon={<Home size={22} />} label="হোম" active={currentPage === 'home'} onClick={() => setCurrentPage('home')} />
          <NavIcon icon={<FileText size={22} />} label="আবেদন" active={currentPage === 'apply'} onClick={() => setCurrentPage('apply')} />
          <NavIcon icon={<Bell size={22} />} label="নোটিশ" active={currentPage === 'notices'} onClick={() => setCurrentPage('notices')} />
          <NavIcon icon={<HelpCircle size={22} />} label="সহায়তা" active={currentPage === 'help'} onClick={() => setCurrentPage('help')} />
          <NavIcon icon={<User size={22} />} label="প্রোফাইল" active={currentPage === 'profile'} onClick={() => setCurrentPage('profile')} />
        </nav>
      )}

      {/* Success Popup */}
      <AnimatePresence>
        {showSuccessPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={48} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2 font-bangla">আবেদন সফল হয়েছে!</h3>
              <p className="text-slate-600 mb-4 font-bangla">আপনার অ্যাপ্লিকেশন আইডি: <span className="font-mono font-bold text-bd-green">{newAppId}</span></p>
              <p className="text-sm text-slate-500 mb-6 font-bangla">১৮ই মার্চ ফলাফল প্রকাশ করা হবে। অনুগ্রহ করে আইডিটি সংরক্ষণ করুন।</p>
              <button 
                onClick={() => {
                  setShowSuccessPopup(false);
                  setCurrentPage('home');
                }}
                className="w-full btn-primary font-bangla"
              >
                ঠিক আছে
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="p-8 text-center space-y-4 bg-slate-100 mt-12">
        <div className="text-xs text-slate-400 space-y-1">
          <p className="font-bangla">যোগাযোগ: info@familycard.gov.bd</p>
          <p className="font-bangla">ডেভেলপার: Abir</p>
        </div>
        <div className="py-2 px-4 bg-bd-green/10 text-bd-green text-[10px] font-bold rounded-full inline-block font-bangla">
          ডিজিটাল বাংলাদেশ সেবা পোর্টাল - আপনার সেবায় সর্বদা নিয়োজিত।
        </div>
      </footer>
    </div>
  );
}

// --- Sub-components ---

const MenuButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="glass-card p-6 rounded-3xl flex flex-col items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all group"
  >
    <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-white transition-colors">
      {React.cloneElement(icon as React.ReactElement, { size: 32 })}
    </div>
    <span className="font-bold text-slate-700 text-sm font-bangla">{label}</span>
  </button>
);

const LoginPage = ({ onLogin, onCheckStatus }: { onLogin: (phone: string) => void, onCheckStatus: () => void }) => {
  const [phone, setPhone] = useState("");
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-bd-green/5 to-emerald-50">
      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl mb-8 border-2 border-bd-green/20">
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Government_Seal_of_Bangladesh.svg/1200px-Government_Seal_of_Bangladesh.svg.png" 
          alt="Logo" 
          className="w-14 h-14 object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="glass-card p-8 rounded-[40px] w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-800 font-bangla">লগইন করুন</h2>
          <p className="text-sm text-slate-400 font-bangla">আপনার মোবাইল নম্বর দিয়ে প্রবেশ করুন</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 ml-1 uppercase font-bangla">মোবাইল নম্বর</label>
            <div className="relative">
              <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="tel"
                placeholder="01XXXXXXXXX"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-bd-green/20 font-bold"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
          </div>
          <button 
            onClick={() => onLogin(phone)}
            className="w-full btn-primary py-4 text-lg font-bangla"
          >
            প্রবেশ করুন
          </button>
          
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-bangla">অথবা</span>
            </div>
          </div>

          <button 
            onClick={onCheckStatus}
            className="w-full py-4 bg-white border-2 border-bd-green text-bd-green rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-bd-green/5 transition-colors font-bangla"
          >
            <Search size={20} /> আবেদন যাচাই করুন
          </button>
        </div>
      </div>
    </div>
  );
};

const SettingsItem = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
  >
    <div className="flex items-center gap-4">
      <div className="p-2 bg-slate-100 rounded-xl">{icon}</div>
      <span className="font-bold text-slate-700 font-bangla">{label}</span>
    </div>
    <ChevronRight size={18} className="text-slate-300" />
  </button>
);

const NavIcon = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-1 transition-all",
      active ? "text-bd-green scale-110" : "text-slate-400"
    )}
  >
    {icon}
    <span className="text-[10px] font-bold font-bangla">{label}</span>
  </button>
);

const HelpPage = () => {
  const faqs = [
    {
      question: "আবেদন প্রক্রিয়া কি?",
      answer: "প্রথমে 'আবেদন' ট্যাবে যান, আপনার ব্যক্তিগত তথ্য প্রদান করুন, ফেস ভেরিফিকেশন সম্পন্ন করুন এবং প্রয়োজনীয় ডকুমেন্ট আপলোড করে সাবমিট করুন।"
    },
    {
      question: "কিভাবে আবেদন যাচাই করব?",
      answer: "হোম পেজ থেকে 'আবেদন যাচাই' অপশনে যান এবং আপনার NID নম্বর অথবা অ্যাপ্লিকেশন আইডি দিয়ে সার্চ করুন।"
    },
    {
      question: "রিসিপ্ট কিভাবে ডাউনলোড করব?",
      answer: "আবেদন যাচাই করার পর যদি আপনার তথ্য পাওয়া যায়, তবে নিচে 'ফরম ডাউনলোড' বাটন দেখতে পাবেন। সেখানে ক্লিক করলে আপনার আবেদন ফরমটি PDF আকারে ডাউনলোড হবে।"
    },
    {
      question: "ফেস ভেরিফিকেশন কেন প্রয়োজন?",
      answer: "আবেদনকারীর পরিচয় নিশ্চিত করতে এবং জালিয়াতি রোধ করতে ফেস ভেরিফিকেশন বাধ্যতামূলক করা হয়েছে।"
    },
    {
      question: "আবেদনের ফলাফল কবে পাওয়া যাবে?",
      answer: "আগামী ১৮ই মার্চ চূড়ান্ত ফলাফল প্রকাশ করা হবে। আপনি এই অ্যাপের মাধ্যমেই আপনার আবেদনের অবস্থা জানতে পারবেন।"
    }
  ];

  return (
    <div className="p-6 space-y-4 pb-24">
      <div className="glass-card p-6 rounded-3xl bg-bd-green text-white mb-6">
        <h3 className="text-xl font-bold mb-2 font-bangla">সহায়তা কেন্দ্র</h3>
        <p className="text-sm opacity-90 font-bangla">আপনার সকল প্রশ্নের উত্তর এখানে পাবেন।</p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <details key={index} className="glass-card rounded-2xl overflow-hidden group">
            <summary className="p-5 font-bold text-slate-800 cursor-pointer flex justify-between items-center list-none font-bangla">
              {faq.question}
              <ChevronRight size={18} className="group-open:rotate-90 transition-transform text-slate-400" />
            </summary>
            <div className="px-5 pb-5 text-slate-600 text-sm leading-relaxed font-bangla border-t border-slate-50 pt-4">
              {faq.answer}
            </div>
          </details>
        ))}
      </div>

      <div className="p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <MessageSquare size={32} />
        </div>
        <div>
          <h4 className="font-bold text-slate-800 font-bangla">আরো সহায়তা প্রয়োজন?</h4>
          <p className="text-sm text-slate-500 font-bangla">আমাদের AI চ্যাটবটের সাথে কথা বলুন অথবা সরাসরি যোগাযোগ করুন।</p>
        </div>
        <button 
          onClick={() => window.location.href = 'tel:16122'}
          className="w-full py-4 bg-bd-green/10 text-bd-green rounded-2xl font-bold font-bangla"
        >
          কল করুন: ১৬১২২
        </button>
      </div>
    </div>
  );
};

const ApplicationForm = ({ onSubmit }: { onSubmit: (data: any) => void }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    fatherName: "",
    motherName: "",
    dob: "",
    nid: "",
    mobile: "",
    address: "",
    email: "",
    photo: "",
    nidFront: "",
    nidBack: "",
    faceVerified: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const captureFace = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setFormData(prev => ({ ...prev, photo: imageSrc, faceVerified: true }));
      setShowWebcam(false);
      alert("ফেস ভেরিফিকেশন সফল হয়েছে!");
    }
  }, [webcamRef]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit = { ...formData };
    if (!dataToSubmit.photo) {
      // Use placeholder if no photo captured to improve UX and avoid error
      dataToSubmit.photo = "https://picsum.photos/seed/user/200";
      dataToSubmit.faceVerified = true;
    }
    setSubmitting(true);
    await onSubmit(dataToSubmit);
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="space-y-4">
        <Input label="পূর্ণ নাম" value={formData.fullName} onChange={v => setFormData({...formData, fullName: v})} required />
        <Input label="পিতার নাম" value={formData.fatherName} onChange={v => setFormData({...formData, fatherName: v})} required />
        <Input label="মাতার নাম" value={formData.motherName} onChange={v => setFormData({...formData, motherName: v})} required />
        <Input label="জন্ম তারিখ" type="date" value={formData.dob} onChange={v => setFormData({...formData, dob: v})} required />
        <Input label="NID নম্বর" type="number" value={formData.nid} onChange={v => setFormData({...formData, nid: v})} required />
        <Input label="ইমেইল ঠিকানা" type="email" value={formData.email} onChange={v => setFormData({...formData, email: v})} required />
        <Input label="মোবাইল নম্বর" type="tel" value={formData.mobile} onChange={v => setFormData({...formData, mobile: v})} required />
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-600 ml-1 font-bangla">সম্পূর্ণ ঠিকানা</label>
          <textarea 
            className="w-full bg-white border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-bd-green/20 focus:border-bd-green outline-none transition-all min-h-[100px] font-bangla"
            value={formData.address}
            onChange={e => setFormData({...formData, address: e.target.value})}
            required
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-slate-800 font-bangla">ফেস ভেরিফিকেশন ও ডকুমেন্ট</h3>
        
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-600 ml-1 font-bangla">পাসপোর্ট সাইজ ছবি (Passport Size Photo)</label>
          <div className="grid grid-cols-2 gap-4">
            {showWebcam ? (
              <div className="col-span-2 relative rounded-3xl overflow-hidden border-4 border-bd-green shadow-2xl">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full aspect-video object-cover"
                  videoConstraints={{ facingMode: "user" }}
                  mirrored={false}
                  screenshotQuality={1}
                  disablePictureInPicture={true}
                  forceScreenshotSourceSize={false}
                  imageSmoothing={true}
                  onUserMedia={() => {}}
                  onUserMediaError={() => {}}
                  minScreenshotHeight={0}
                  minScreenshotWidth={0}
                />
                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                  <div className="w-full h-full border-2 border-white/50 rounded-full" />
                </div>
                <button 
                  type="button"
                  onClick={captureFace}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white text-bd-green px-6 py-3 rounded-full font-bold shadow-xl flex items-center gap-2 font-bangla"
                >
                  <Camera size={20} /> ছবি তুলুন
                </button>
              </div>
            ) : (
              <>
                <button 
                  type="button"
                  onClick={() => setShowWebcam(true)}
                  className={cn(
                    "py-6 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all",
                    formData.photo ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200 text-slate-400"
                  )}
                >
                  {formData.photo ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-white shadow-md">
                        <img src={formData.photo} alt="Captured" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 font-bangla">ছবি তোলা হয়েছে</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Camera size={24} />
                      <span className="text-xs font-bold font-bangla">ক্যামেরা দিয়ে ছবি</span>
                    </div>
                  )}
                </button>
                
                <label className={cn(
                  "py-6 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all cursor-pointer",
                  formData.photo ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200 text-slate-400"
                )}>
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'photo')} />
                  <Upload size={24} />
                  <span className="text-xs font-bold font-bangla">গ্যালারি থেকে ছবি</span>
                </label>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <FileUpload label="NID কার্ডের ছবি (সামনে)" value={formData.nidFront} onChange={e => handleFileChange(e, 'nidFront')} />
          <FileUpload label="NID কার্ডের ছবি (পিছনে)" value={formData.nidBack} onChange={e => handleFileChange(e, 'nidBack')} />
        </div>
      </div>

      <button 
        type="submit" 
        disabled={submitting}
        className="w-full btn-primary flex items-center justify-center gap-2 py-4 text-lg font-bangla"
      >
        {submitting ? (
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
          />
        ) : (
          <>আবেদন জমা দিন <ChevronRight size={20} /></>
        )}
      </button>
    </form>
  );
};

const Input = ({ label, value, onChange, type = "text", required = false }: any) => (
  <div className="space-y-1">
    <label className="text-sm font-semibold text-slate-600 ml-1 font-bangla">{label}</label>
    <input 
      type={type}
      required={required}
      className="w-full bg-white border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-bd-green/20 focus:border-bd-green outline-none transition-all font-bangla"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

const FileUpload = ({ label, value, onChange }: any) => (
  <div className="space-y-2">
    <label className="text-sm font-semibold text-slate-600 ml-1 font-bangla">{label}</label>
    <div className="relative h-32 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center overflow-hidden group">
      {value ? (
        <img src={value} alt="Preview" className="w-full h-full object-cover" />
      ) : (
        <>
          <Upload className="text-slate-400 mb-2 group-hover:text-bd-green transition-colors" />
          <span className="text-xs text-slate-400 font-bangla">ফাইল নির্বাচন করুন</span>
        </>
      )}
      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={onChange} />
    </div>
  </div>
);

const VerificationPage = ({ onVerify, selectedApp, onClear }: { onVerify: (s: string) => void, selectedApp: Application | null, onClear: () => void }) => {
  const [search, setSearch] = useState("");

  return (
    <div className="p-6 space-y-6">
      {!selectedApp ? (
        <div className="space-y-6">
          <div className="glass-card p-8 rounded-[40px] text-center space-y-4 bg-gradient-to-b from-white to-emerald-50/30">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
              <Search size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-slate-800 font-bangla">আবেদন যাচাই করুন</h3>
              <p className="text-sm text-slate-500 font-bangla leading-relaxed">
                আপনার আবেদনের বর্তমান অবস্থা জানতে NID নম্বর অথবা অ্যাপ্লিকেশন আইডি প্রদান করুন।
              </p>
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl space-y-4 shadow-xl border-t-4 border-bd-green">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 ml-1 uppercase font-bangla">সার্চ করুন</label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="NID অথবা Application ID লিখুন"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 pr-14 outline-none focus:ring-2 focus:ring-bd-green/20 font-bangla text-lg shadow-sm"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && onVerify(search)}
                />
                <button 
                  onClick={() => onVerify(search)}
                  className="absolute right-2 top-2 bottom-2 px-4 bg-bd-green text-white rounded-xl shadow-lg hover:bg-emerald-600 transition-colors"
                >
                  <Search size={24} />
                </button>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-2xl flex gap-3 items-start">
              <HelpCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
              <p className="text-xs text-blue-700 font-bangla leading-relaxed">
                আবেদন করার সময় আপনাকে একটি অ্যাপ্লিকেশন আইডি প্রদান করা হয়েছে। যদি আইডি হারিয়ে ফেলেন তবে আপনার NID নম্বর দিয়েও যাচাই করতে পারবেন।
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl text-center space-y-4">
            <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border-4 border-white shadow-lg">
              <img src={selectedApp.photo || "https://picsum.photos/seed/user/200"} alt="User" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-bangla">{selectedApp.fullName}</h3>
              <p className="text-sm text-slate-500 font-mono">{selectedApp.id}</p>
            </div>
            
            <div className={cn(
              "py-2 px-6 rounded-full inline-flex items-center gap-2 font-bold font-bangla",
              selectedApp.status === 'Pending' && "bg-orange-100 text-orange-600",
              selectedApp.status === 'Approved' && "bg-emerald-100 text-emerald-600",
              selectedApp.status === 'Rejected' && "bg-red-100 text-red-600"
            )}>
              {selectedApp.status === 'Pending' && <Clock size={18} />}
              {selectedApp.status === 'Approved' && <CheckCircle2 size={18} />}
              {selectedApp.status === 'Rejected' && <XCircle size={18} />}
              {selectedApp.status === 'Pending' && "অপেক্ষমান (Pending)"}
              {selectedApp.status === 'Approved' && "অনুমোদিত (Approved)"}
              {selectedApp.status === 'Rejected' && "প্রত্যাখ্যাত (Rejected)"}
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl space-y-4">
            <h4 className="font-bold text-slate-800 border-b pb-2 font-bangla">আবেদনকারীর তথ্য</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoItem label="পিতার নাম" value={selectedApp.fatherName} />
              <InfoItem label="মাতার নাম" value={selectedApp.motherName} />
              <InfoItem label="NID নম্বর" value={selectedApp.nid} />
              <InfoItem label="মোবাইল" value={selectedApp.mobile} />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onClear} className="flex-1 btn-secondary font-bangla">নতুন অনুসন্ধান</button>
            <ReceiptDownloader application={selectedApp} />
          </div>
        </div>
      )}
    </div>
  );
};

const InfoItem = ({ label, value }: any) => (
  <div className="space-y-1">
    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-bangla">{label}</p>
    <p className="text-slate-700 font-medium font-bangla">{value}</p>
  </div>
);

const ReceiptDownloader = ({ application }: { application: Application }) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const downloadPDF = async () => {
    if (!receiptRef.current) return;
    const canvas = await html2canvas(receiptRef.current, { 
      scale: 3, // Increased scale for ultra-sharp text
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Application_${application.id}.pdf`);
  };

  return (
    <>
      <button onClick={downloadPDF} className="flex-1 btn-primary flex items-center justify-center gap-2 font-bangla">
        <Download size={18} /> ফরম ডাউনলোড
      </button>
      
      {/* Hidden Receipt for PDF Generation - Ultra Premium Formal Style */}
      <div className="fixed left-[-9999px] top-0">
        <div ref={receiptRef} className="w-[850px] bg-white p-12 font-serif border-[12px] relative overflow-hidden" style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#006A4E', borderStyle: 'double' }}>
          
          {/* Security Pattern Background */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#006A4E 0.5px, transparent 0.5px)', backgroundSize: '10px 10px' }}></div>

          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none select-none">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Government_Seal_of_Bangladesh.svg/1200px-Government_Seal_of_Bangladesh.svg.png" 
              alt="Watermark" 
              className="w-[550px] h-[550px]"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Header */}
          <div className="text-center space-y-3 mb-12 border-b-4 pb-8 relative z-10" style={{ borderColor: '#006A4E' }}>
            <div className="flex justify-center items-center gap-6 mb-4">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Government_Seal_of_Bangladesh.svg/1200px-Government_Seal_of_Bangladesh.svg.png" 
                alt="Gov Logo" 
                className="w-24 h-24"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="text-3xl font-bold uppercase tracking-tighter" style={{ color: '#006A4E' }}>Government of the People's Republic of Bangladesh</h1>
            <h2 className="text-xl font-bold text-slate-700">Ministry of Disaster Management and Relief</h2>
            <h3 className="text-lg font-medium">Family Card Digital Application Portal</h3>
            
            <div className="flex justify-center mt-6">
              <div className="px-10 py-2 font-bold text-2xl border-4 shadow-sm" style={{ backgroundColor: '#006A4E', color: '#ffffff', borderColor: '#006A4E' }}>
                OFFICIAL ENROLLMENT FORM
              </div>
            </div>
          </div>

          {/* Verified Stamp */}
          <div className="absolute top-64 right-64 rotate-[-25deg] opacity-20 pointer-events-none z-20">
            <div className="border-8 border-emerald-600 rounded-full w-40 h-40 flex flex-col items-center justify-center text-emerald-600 font-bold">
              <div className="text-3xl uppercase">Verified</div>
              <div className="text-sm">DIGITAL PORTAL</div>
              <div className="text-xs">2026-27</div>
            </div>
          </div>

          {/* Application ID & Photo & QR */}
          <div className="flex justify-between items-start mb-12 relative z-10 bg-slate-50/50 p-6 border border-slate-200">
            <div className="space-y-6">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unique Application Tracking ID</span>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-3xl font-bold border-b-4" style={{ borderColor: '#006A4E', color: '#006A4E' }}>{application.id}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-bd-green"></div>
                  <span className="font-bold w-36">Submission Date:</span>
                  <span className="font-medium text-lg">{new Date(application.createdAt || Date.now()).toLocaleDateString('bn-BD')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-bd-green"></div>
                  <span className="font-bold w-36">Application Status:</span>
                  <span className="uppercase font-bold px-4 py-1 rounded-sm text-white" style={{ backgroundColor: '#006A4E', fontSize: '12px' }}>{application.status}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-bd-green"></div>
                  <span className="font-bold w-36">Security Hash:</span>
                  <span className="font-mono text-[10px] text-slate-500 uppercase">{btoa(application.id).slice(0, 24)}...</span>
                </div>
              </div>
            </div>

            <div className="flex gap-6">
              {/* QR Code Section */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-32 h-32 border-4 p-2 flex items-center justify-center bg-white shadow-inner" style={{ borderColor: '#006A4E' }}>
                  <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center text-[7px] text-slate-500 font-sans text-center leading-tight">
                    <div className="grid grid-cols-5 gap-0.5 mb-1">
                      {[...Array(25)].map((_, i) => <div key={i} className="w-2 h-2" style={{ backgroundColor: i % 3 === 0 ? '#006A4E' : '#e2e8f0' }} />)}
                    </div>
                    SCAN TO VERIFY<br/>AUTHENTICITY
                  </div>
                </div>
                <span className="text-[9px] font-bold text-slate-400">ENCRYPTED QR</span>
              </div>
              
              {/* Photo Section */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-44 h-52 border-4 flex flex-col items-center justify-center relative shadow-xl overflow-hidden" style={{ borderColor: '#006A4E', backgroundColor: '#ffffff' }}>
                  {application.photo ? (
                    <img src={application.photo} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-300">
                      <User size={48} />
                      <span className="text-[10px] text-center px-4">PHOTO NOT PROVIDED</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 text-[10px] text-center py-1.5 font-bold text-white uppercase tracking-widest" style={{ backgroundColor: '#006A4E' }}>Applicant</div>
                </div>
                <span className="text-[9px] font-bold text-slate-400">PASSPORT SIZE</span>
              </div>
            </div>
          </div>

          {/* Section 1: Personal Profile */}
          <div className="mb-12 relative z-10">
            <div className="flex items-center gap-4 mb-6 border-b-4 pb-2" style={{ borderColor: '#006A4E' }}>
              <div className="w-10 h-10 bg-emerald-900 text-white flex items-center justify-center text-lg font-bold rounded-lg shadow-md">01</div>
              <h3 className="text-xl font-bold uppercase tracking-widest" style={{ color: '#006A4E' }}>Personal Profile Information</h3>
            </div>
            <div className="grid grid-cols-1 border-2" style={{ borderColor: '#e2e8f0' }}>
              <DataRow label="Full Name (As per NID)" value={application.fullName.toUpperCase()} />
              <DataRow label="Father's Name" value={application.fatherName.toUpperCase()} />
              <DataRow label="Mother's Name" value={application.motherName.toUpperCase()} />
              <div className="grid grid-cols-2">
                <DataRow label="Date of Birth" value={application.dob} borderRight />
                <DataRow label="National ID Number" value={application.nid} />
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Residency */}
          <div className="mb-12 relative z-10">
            <div className="flex items-center gap-4 mb-6 border-b-4 pb-2" style={{ borderColor: '#006A4E' }}>
              <div className="w-10 h-10 bg-emerald-900 text-white flex items-center justify-center text-lg font-bold rounded-lg shadow-md">02</div>
              <h3 className="text-xl font-bold uppercase tracking-widest" style={{ color: '#006A4E' }}>Contact & Residency Details</h3>
            </div>
            <div className="grid grid-cols-1 border-2" style={{ borderColor: '#e2e8f0' }}>
              <DataRow label="Primary Mobile" value={application.mobile} />
              <DataRow label="Complete Address" value={application.address} />
              <DataRow label="Verification Status" value="FACE MATCHED (100%)" />
            </div>
          </div>

          {/* Legal Declaration */}
          <div className="mt-12 p-10 border-4 relative z-10 shadow-inner" style={{ backgroundColor: '#f0fdf4', borderColor: '#006A4E', borderStyle: 'dashed' }}>
            <h4 className="font-bold mb-4 uppercase text-base underline decoration-2 underline-offset-4" style={{ color: '#006A4E' }}>Legal Declaration & Attestation</h4>
            <p className="text-[13px] leading-relaxed italic text-slate-700">
              "I, the applicant named above, do hereby solemnly affirm and declare that the information furnished in this application is true, complete and correct to the best of my knowledge and belief. I am aware that providing false information is a punishable offense under the Penal Code of Bangladesh. I authorize the relevant authorities to verify my data with the National Database (Election Commission) for the purpose of Family Card issuance."
            </p>
          </div>

          {/* Signature Section */}
          <div className="mt-32 flex justify-between items-end px-12 relative z-10">
            <div className="text-center space-y-4">
              <div className="w-64 h-24 border-2 border-slate-200 bg-slate-50/30 flex items-center justify-center text-[10px] text-slate-300 italic">Place Signature Here</div>
              <div className="w-64 border-b-4" style={{ borderColor: '#006A4E' }}></div>
              <p className="text-sm font-bold uppercase tracking-widest">Applicant's Signature</p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-64 h-24 border-2 border-slate-200 bg-slate-50/30 flex items-center justify-center text-[10px] text-slate-300 italic">Official Seal & Date</div>
              <div className="w-64 border-b-4" style={{ borderColor: '#006A4E' }}></div>
              <p className="text-sm font-bold uppercase tracking-widest">Authorized Registrar</p>
            </div>
          </div>

          {/* Security Footer */}
          <div className="mt-24 pt-8 border-t-4 relative z-10" style={{ borderColor: '#006A4E' }}>
            <div className="flex justify-between items-center">
              <div className="text-[11px] text-slate-500 font-sans space-y-1">
                <p className="font-bold uppercase mb-1" style={{ color: '#006A4E' }}>Digital Security Information</p>
                <p>Document UUID: {crypto.randomUUID().toUpperCase()}</p>
                <p>IP Address: 103.145.12.44 | Server: ASIA-EAST-1</p>
                <p>Generated: {new Date().toLocaleString('en-GB')}</p>
              </div>
              
              {/* Security Barcode */}
              <div className="flex flex-col items-end">
                <div className="flex gap-[1.5px] h-12 items-end px-4 bg-white border border-slate-200 py-1">
                  {[...Array(50)].map((_, i) => (
                    <div key={i} className="bg-slate-900" style={{ width: i % 4 === 0 ? '3px' : i % 2 === 0 ? '1px' : '2px', height: (30 + Math.random() * 70) + '%' }} />
                  ))}
                </div>
                <p className="text-[9px] font-mono mt-2 font-bold tracking-[0.3em]">{application.id.toUpperCase()}</p>
              </div>
            </div>
            
            <div className="mt-6 text-center text-[9px] font-bold uppercase tracking-[0.5em] text-slate-400">
              *** This is a digitally secured document of the People's Republic of Bangladesh ***
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const DataRow = ({ label, value, borderRight }: { label: string, value: string, borderRight?: boolean }) => (
  <div className={`flex items-center p-3 border-b border-slate-200 ${borderRight ? 'border-r' : ''}`}>
    <span className="w-48 text-[11px] font-bold uppercase text-slate-500">{label}:</span>
    <span className="flex-1 text-sm font-bold tracking-tight">{value}</span>
  </div>
);

const AdminLogin = ({ onLogin }: { onLogin: () => void }) => {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (user === 'admin' && pass === '1234') {
      onLogin();
    } else {
      alert("ভুল ইউজারনেম অথবা পাসওয়ার্ড!");
    }
  };

  return (
    <div className="p-6">
      <form onSubmit={handleLogin} className="glass-card p-8 rounded-3xl space-y-6">
        <div className="w-16 h-16 bg-bd-green/10 text-bd-green rounded-full flex items-center justify-center mx-auto">
          <ShieldCheck size={32} />
        </div>
        <h3 className="text-xl font-bold text-center text-slate-800 font-bangla">অ্যাডমিন লগইন</h3>
        <div className="space-y-4">
          <Input label="ইউজারনেম" value={user} onChange={setUser} />
          <Input label="পাসওয়ার্ড" type="password" value={pass} onChange={setPass} />
        </div>
        <button type="submit" className="w-full btn-primary font-bangla">লগইন করুন</button>
      </form>
    </div>
  );
};

const AdminDashboard = () => {
  const [apps, setApps] = useState<Application[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [newNotice, setNewNotice] = useState("");
  const [noticeType, setNoticeType] = useState<'notice' | 'ad'>('notice');
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<'apps' | 'notices' | 'users'>('apps');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [appsRes, noticesRes, usersRes] = await Promise.all([
      fetch("/api/admin/applications"),
      fetch("/api/notices"),
      fetch("/api/admin/users")
    ]);
    setApps(await appsRes.json());
    setNotices(await noticesRes.json());
    setUsers(await usersRes.json());
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/applications/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    fetchData();
  };

  const addNotice = async () => {
    if (!newNotice) return;
    await fetch("/api/admin/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newNotice, type: noticeType })
    });
    setNewNotice("");
    fetchData();
  };

  const deleteNotice = async (id: number) => {
    await fetch(`/api/admin/notices/${id}`, { method: "DELETE" });
    fetchData();
  };

  const toggleUserStatus = async (phone: string, currentStatus: number) => {
    await fetch(`/api/admin/users/${phone}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !currentStatus })
    });
    fetchData();
  };

  const exportToCSV = () => {
    const headers = ["ID", "Full Name", "Father's Name", "Mother's Name", "DOB", "NID", "Mobile", "Address", "Status", "Created At"];
    const rows = apps.map(app => [
      app.id,
      app.fullName,
      app.fatherName,
      app.motherName,
      app.dob,
      app.nid,
      app.mobile,
      app.address,
      app.status,
      app.createdAt
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `applications_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredApps = apps.filter(a => 
    a.fullName.toLowerCase().includes(search.toLowerCase()) || 
    a.nid.includes(search) || 
    a.id.includes(search)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="মোট আবেদন" value={apps.length} icon={<FileText className="text-blue-500" />} />
        <StatCard label="অপেক্ষমান" value={apps.filter(a => a.status === 'Pending').length} icon={<Clock className="text-orange-500" />} />
      </div>

      <div className="flex bg-slate-200 p-1 rounded-2xl">
        <button 
          onClick={() => setActiveTab('apps')}
          className={cn("flex-1 py-2 rounded-xl text-[10px] sm:text-sm font-bold transition-all font-bangla", activeTab === 'apps' ? "bg-white text-bd-green shadow-sm" : "text-slate-500")}
        >
          আবেদনসমূহ
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={cn("flex-1 py-2 rounded-xl text-[10px] sm:text-sm font-bold transition-all font-bangla", activeTab === 'users' ? "bg-white text-bd-green shadow-sm" : "text-slate-500")}
        >
          ব্যবহারকারী
        </button>
        <button 
          onClick={() => setActiveTab('notices')}
          className={cn("flex-1 py-2 rounded-xl text-[10px] sm:text-sm font-bold transition-all font-bangla", activeTab === 'notices' ? "bg-white text-bd-green shadow-sm" : "text-slate-500")}
        >
          নোটিশ
        </button>
      </div>

      {activeTab === 'apps' ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="নাম, NID অথবা আইডি দিয়ে খুঁজুন"
                className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-bd-green/20 font-bangla"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button 
              onClick={exportToCSV}
              className="bg-bd-green text-white p-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 font-bangla text-sm"
              title="CSV এক্সপোর্ট করুন"
            >
              <Download size={20} />
              <span className="hidden sm:inline">এক্সপোর্ট</span>
            </button>
          </div>
          
          <div className="space-y-3">
            {filteredApps.map(app => (
              <div key={app.id} className="glass-card p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100">
                      <img src={app.photo || "https://picsum.photos/seed/user/100"} alt="User" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 font-bangla">{app.fullName}</h4>
                      <p className="text-[10px] font-mono text-slate-400">{app.id}</p>
                      {app.faceVerified === 1 && (
                        <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1 rounded font-bold uppercase">Face Verified</span>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded-full font-bangla",
                    app.status === 'Pending' && "bg-orange-100 text-orange-600",
                    app.status === 'Approved' && "bg-emerald-100 text-emerald-600",
                    app.status === 'Rejected' && "bg-red-100 text-red-600"
                  )}>
                    {app.status}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateStatus(app.id, 'Approved')} className="flex-1 bg-emerald-500 text-white py-2 rounded-xl text-xs font-bold font-bangla">অনুমোদন</button>
                  <button onClick={() => updateStatus(app.id, 'Rejected')} className="flex-1 bg-red-500 text-white py-2 rounded-xl text-xs font-bold font-bangla">প্রত্যাখ্যান</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'users' ? (
        <div className="space-y-4">
          <h4 className="font-bold text-slate-800 font-bangla px-2">ব্যবহারকারী ব্যবস্থাপনা</h4>
          <div className="space-y-3">
            {users.map(user => (
              <div key={user.phone} className="glass-card p-4 rounded-2xl flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{user.phone}</p>
                    <p className="text-[10px] text-slate-400">Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                    user.enabled ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                  )}>
                    {user.enabled ? "Active" : "Disabled"}
                  </span>
                  <button 
                    onClick={() => toggleUserStatus(user.phone, user.enabled)}
                    className={cn(
                      "p-2 rounded-xl transition-colors",
                      user.enabled ? "bg-red-50 text-red-500 hover:bg-red-100" : "bg-emerald-50 text-emerald-500 hover:bg-emerald-100"
                    )}
                  >
                    {user.enabled ? <ShieldOff size={18} /> : <ShieldCheck size={18} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl space-y-4">
            <h4 className="font-bold text-slate-800 font-bangla">নতুন নোটিশ/বিজ্ঞাপন যোগ করুন</h4>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              <button 
                onClick={() => setNoticeType('notice')}
                className={cn("flex-1 py-1.5 rounded-lg text-xs font-bold transition-all", noticeType === 'notice' ? "bg-white text-bd-green shadow-sm" : "text-slate-400")}
              >
                নোটিশ
              </button>
              <button 
                onClick={() => setNoticeType('ad')}
                className={cn("flex-1 py-1.5 rounded-lg text-xs font-bold transition-all", noticeType === 'ad' ? "bg-white text-bd-red shadow-sm" : "text-slate-400")}
              >
                বিজ্ঞাপন
              </button>
            </div>
            <textarea 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-bd-green/20 font-bangla"
              placeholder="বিষয়বস্তু লিখুন..."
              value={newNotice}
              onChange={e => setNewNotice(e.target.value)}
            />
            <button onClick={addNotice} className="w-full btn-primary flex items-center justify-center gap-2 font-bangla">
              <Plus size={18} /> পাবলিশ করুন
            </button>
          </div>

          <div className="space-y-3">
            {notices.map(notice => (
              <div key={notice.id} className="glass-card p-4 rounded-2xl flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase",
                    notice.type === 'ad' ? "bg-bd-red text-white" : "bg-bd-green text-white"
                  )}>
                    {notice.type}
                  </span>
                  <p className="text-sm text-slate-700 font-bangla">{notice.content}</p>
                </div>
                <button onClick={() => deleteNotice(notice.id)} className="p-2 text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon }: any) => (
  <div className="glass-card p-5 rounded-3xl flex items-center gap-4">
    <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase font-bangla">{label}</p>
      <p className="text-xl font-bold text-slate-800">{value}</p>
    </div>
  </div>
);

const AIChat = ({ messages, onSend, isLoading }: { messages: ChatMessage[], onSend: (text: string) => void, isLoading: boolean }) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-slate-50">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-bd-green/10 text-bd-green rounded-full flex items-center justify-center mx-auto">
              <Bot size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 font-bangla">আমি আপনাকে কীভাবে সাহায্য করতে পারি?</h3>
              <p className="text-xs text-slate-400 font-bangla">পরিবার কার্ড সংক্রান্ত যেকোনো প্রশ্ন জিজ্ঞাসা করুন।</p>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "max-w-[80%] p-4 rounded-2xl text-sm font-bangla shadow-sm",
              m.role === 'user' 
                ? "ml-auto bg-bd-green text-white rounded-tr-none" 
                : "mr-auto bg-white text-slate-800 rounded-tl-none border border-slate-100"
            )}
          >
            {m.text}
          </motion.div>
        ))}
        {isLoading && (
          <div className="mr-auto bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex gap-1">
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-slate-100 flex gap-2 items-center">
        <input 
          type="text"
          placeholder="আপনার প্রশ্ন লিখুন..."
          className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-bd-green/20 font-bangla"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button 
          type="submit"
          disabled={isLoading || !input.trim()}
          className="w-12 h-12 bg-bd-green text-white rounded-2xl flex items-center justify-center shadow-lg disabled:opacity-50 transition-all active:scale-90"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};
