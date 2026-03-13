
import React, { useState, useEffect } from 'react';
import { Bell, LogOut, BookOpen, Sun, Moon, X } from 'lucide-react';
import { NAV_ITEMS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
  activePath: string;
  onNavigate: (path: string) => void;
}

// Notification data
const NOTIFICATIONS = [
  { id: 1, type: 'info' as const, title: 'System Update', message: 'Smart Presence v2.0 has been deployed with new features.', time: '2m ago', read: false },
  { id: 2, type: 'success' as const, title: 'Attendance Synced', message: 'All class attendance records have been synced to the cloud.', time: '15m ago', read: false },
  { id: 3, type: 'warning' as const, title: 'Low Attendance', message: 'BCA 2nd Year has below 75% attendance this week.', time: '1h ago', read: false },
  { id: 4, type: 'info' as const, title: 'New Staff Added', message: 'A new staff member has been registered in the system.', time: '3h ago', read: true },
  { id: 5, type: 'success' as const, title: 'Face Data Registered', message: '12 new students completed biometric registration.', time: '5h ago', read: true },
];

const notifColors = {
  info: { dot: 'bg-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400' },
  success: { dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' },
  warning: { dot: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
  error: { dot: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' },
};

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, activePath, onNavigate }) => {
  const items = user?.role === 'ADMIN' ? NAV_ITEMS.ADMIN : NAV_ITEMS.STAFF;
  const isAuth = !!user;
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleNavClick = (item: any) => {
    onNavigate(item.path);
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const toggleNotifPanel = () => {
    setShowNotifPanel(prev => !prev);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950 transition-colors duration-500 overflow-x-hidden">
      {isAuth && (
        <header className="sticky top-0 z-[100] bg-white/80 dark:bg-slate-950/80 nav-blur border-b border-slate-200 dark:border-slate-800/60 px-5 h-20 flex items-center justify-between transition-all duration-300">
          <div
            onClick={() => onNavigate(user?.role === 'ADMIN' ? '/dashboard' : '/staff-home')}
            className="flex items-center gap-3 cursor-pointer group tap-active"
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20 transform group-hover:rotate-12 group-hover:scale-[1.06] transition-transform group-hover:shadow-[0_0_20px_rgba(79,70,229,0.18)] dark:group-hover:shadow-[0_0_24px_rgba(79,70,229,0.28)]">
              <BookOpen size={20} strokeWidth={2.5} className="transition-transform duration-300 group-hover:scale-[1.1] group-hover:drop-shadow-[0_0_10px_rgba(79,70,229,0.45)] dark:group-hover:drop-shadow-[0_0_12px_rgba(79,70,229,0.65)]" />
            </div>
            <div className="animate-in fade-in slide-in-from-left-2 duration-700">
              <h1 className="text-[14px] font-extrabold text-slate-900 dark:text-white tracking-wide uppercase leading-none">Smart Presence</h1>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 opacity-70">CS Department</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-10 h-10 flex items-center justify-center text-slate-500 tap-active bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800"
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-slate-600" />}
            </button>

            <button
              onClick={toggleNotifPanel}
              className="relative w-10 h-10 flex items-center justify-center text-slate-500 tap-active bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800"
            >
              <Bell size={18} strokeWidth={2.5} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 rounded-full border-2 border-white dark:border-slate-950 flex items-center justify-center text-[9px] font-black text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-800 shadow-sm ml-1.5 transition-all active:scale-90">
              <img src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=4F46E5&color=fff&size=40&bold=true`} alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>
      )}

      {/* Notification Panel */}
      {showNotifPanel && (
        <>
          <div className="fixed inset-0 z-[150] bg-black/20 dark:bg-black/40 backdrop-blur-sm" onClick={() => setShowNotifPanel(false)} />
          <div className="fixed top-20 right-4 z-[151] w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-top-2 fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white tracking-tight">Notifications</h3>
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">{unreadCount} unread</p>
                </div>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setShowNotifPanel(false)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                    <X size={16} strokeWidth={3} />
                  </button>
                </div>
              </div>

              {/* Notification list */}
              <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {notifications.map((notif) => {
                  const colors = notifColors[notif.type];
                  return (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-3.5 px-5 py-4 transition-all ${!notif.read ? 'bg-indigo-50/40 dark:bg-indigo-950/15' : ''
                        }`}
                    >
                      {/* Colored dot */}
                      <div className={`w-2.5 h-2.5 rounded-full mt-[7px] shrink-0 ${colors.dot} ${notif.read ? 'opacity-25' : 'ring-4 ring-opacity-20'}`}
                        style={!notif.read ? { boxShadow: `0 0 0 4px ${notif.type === 'info' ? 'rgba(99,102,241,0.15)' : notif.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}` } : {}}
                      />

                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-[13px] font-bold leading-snug ${!notif.read ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                            }`}>
                            {notif.title}
                          </p>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${colors.bg} ${colors.text}`}>
                            {notif.type}
                          </span>
                        </div>

                        {/* Message */}
                        <p className={`text-[12px] mt-1 leading-relaxed ${!notif.read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'
                          }`}>
                          {notif.message}
                        </p>

                        {/* Time */}
                        <p className="text-[11px] font-semibold text-slate-300 dark:text-slate-600 mt-2">
                          {notif.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">No more notifications</p>
              </div>
            </div>
          </div>
        </>
      )}

      <main className={`flex-1 transition-all ${isAuth ? 'px-5 py-6 pb-48' : ''}`}>
        <div className={isAuth ? 'w-full max-w-6xl mx-auto' : 'w-full'}>
          {children}
        </div>
      </main>

      {/* Brand Footer */}
      <footer className="w-full py-10 px-6 flex flex-col items-center justify-center gap-4 text-center">
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent mb-2" />
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">
          Smart Presence v3.0
        </p>
        <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400">
          Developed with ❤️ by <a href="https://github.com/sylvernjones557" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">Sylvester Jones</a>
        </p>
        <div className="flex items-center gap-4 mt-2">
          <a href="https://github.com/sylvernjones557" target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:scale-110 transition-transform">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
          </a>
          <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">
            Open Source MIT
          </span>
        </div>
      </footer>

      {isAuth && (
        <div className="fixed bottom-0 left-0 right-0 pointer-events-none flex items-end justify-center px-4 pb-10 z-[200] safe-bottom">
          <div className="w-full max-w-sm flex flex-col items-center pointer-events-none transition-transform duration-500 hover:scale-[1.02]">
            {/* Superior Curved Parallax Floating Navbar */}
            <nav className="w-full h-[96px] bg-white/90 dark:bg-slate-900/90 nav-blur border border-slate-200/40 dark:border-slate-800/40 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1),0_10px_30px_-10px_rgba(79,70,229,0.15)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5),0_10px_30px_-10px_rgba(79,70,229,0.2)] rounded-[3.5rem] flex items-center justify-around px-3 pointer-events-auto backdrop-saturate-150">
              {items.map((item) => {
                const isActive = activePath === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavClick(item)}
                    data-active={isActive ? 'true' : 'false'}
                    className={`nav-glow group flex flex-col items-center justify-center w-16 h-full tap-active transition-all duration-300 relative ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                      }`}
                  >
                    <div className={`glow-target p-2.5 rounded-2xl transition-all duration-300 mb-1.5 ${isActive
                      ? 'bg-indigo-600/15 dark:bg-indigo-500/20 shadow-[0_8px_16px_-4px_rgba(79,70,229,0.2)] group-hover:shadow-[0_0_22px_rgba(79,70,229,0.15)] dark:group-hover:shadow-[0_0_26px_rgba(79,70,229,0.25)] group-hover:scale-[1.06]'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 group-hover:shadow-[0_0_18px_rgba(79,70,229,0.12)] dark:group-hover:shadow-[0_0_22px_rgba(79,70,229,0.22)] group-hover:scale-[1.06]'
                      } group-hover:rotate-[2deg]`}>
                      {React.cloneElement(item.icon as React.ReactElement, {
                        size: 24,
                        strokeWidth: isActive ? 3 : 2,
                        className: `transition-transform duration-300 group-hover:scale-[1.12] group-hover:brightness-110 drop-shadow-none group-hover:drop-shadow-[0_0_10px_rgba(79,70,229,0.45)] dark:group-hover:drop-shadow-[0_0_12px_rgba(79,70,229,0.65)]`
                      } as any)}
                    </div>
                    <span className={`glow-label text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0 text-indigo-700 dark:text-indigo-300' : 'opacity-40 translate-y-0.5 group-hover:opacity-70 group-hover:text-slate-600'
                      }`}>
                      {item.label}
                    </span>

                    {isActive && (
                      <span className="absolute -bottom-1 w-5 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full shadow-[0_0_12px_rgba(79,70,229,1)]"></span>
                    )}
                  </button>
                );
              })}

              <div className="w-[1.5px] h-10 bg-slate-200 dark:bg-slate-800/60 mx-1 rounded-full opacity-50"></div>

              <button
                onClick={onLogout}
                className="nav-glow-logout group flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 w-16 h-full tap-active rounded-2xl transition-all"
              >
                <div className="glow-target-rose p-2.5 rounded-2xl transition-all mb-1.5 group-hover:bg-rose-600 group-hover:text-white group-hover:scale-[1.06] group-hover:shadow-[0_0_20px_rgba(244,63,94,0.22)] dark:group-hover:shadow-[0_0_24px_rgba(244,63,94,0.32)]">
                  <LogOut size={24} strokeWidth={2} className="transition-transform duration-300 group-hover:scale-[1.12] group-hover:drop-shadow-[0_0_10px_rgba(244,63,94,0.45)] dark:group-hover:drop-shadow-[0_0_12px_rgba(244,63,94,0.65)]" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.15em] opacity-40 group-hover:opacity-90 group-hover:text-rose-600">
                  Exit
                </span>
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
