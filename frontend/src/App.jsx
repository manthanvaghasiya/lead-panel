import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, Calendar, FileDown, PieChart, LogOut, Settings as SettingsIcon, Images, LayoutGrid } from 'lucide-react';
import LeadsList from './pages/LeadsList';
import Pipeline from './pages/Pipeline';
import LeadDetail from './pages/LeadDetail';
import Dashboard from './pages/Dashboard';
import FollowUps from './pages/FollowUps';
import Analytics from './pages/Analytics';
import ImportExport from './pages/ImportExport';
import Settings from './pages/Settings';
import BulkImageImport from './pages/BulkImageImport';
import UpdatePrompt from './components/PWA/UpdatePrompt';
import InstallButton from './components/PWA/InstallButton';
import OfflineBadge from './components/PWA/OfflineBadge';

function Layout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    
    // Scroll to top of main content when route changes
    const mainContent = document.getElementById('main-scroll-container');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
  }, [location.pathname]);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/leads', label: 'Leads', icon: List },
    { path: '/pipeline', label: 'Pipeline', icon: LayoutGrid },
    { path: '/follow-ups', label: 'Follow-ups', icon: Calendar },
    { path: '/analytics', label: 'Analytics', icon: PieChart },
    { path: '/import-export', label: 'Import / Export', icon: FileDown },
    { path: '/bulk-image-import', label: 'Bulk Image Import', icon: Images },
    { path: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-background font-sans text-slate-800 overflow-hidden flex-col">
      <OfflineBadge />
      <div className="flex flex-1 overflow-hidden">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 w-64 bg-[#0f172a] border-r border-slate-800 flex flex-col shadow-2xl z-50 transition-transform duration-300 ease-in-out`}>

        {/* Logo Section */}
        <div className="h-16 md:h-20 flex items-center justify-between md:justify-start px-6 border-b border-slate-800/80">
          <div className="flex items-center">
            <img src="/WEBIOX%20LOGO.png" alt="WEBIOX Logo" className="h-8 md:h-10 mr-3 shrink-0 object-contain drop-shadow-md" />
            <span className="font-bold text-xl tracking-wider text-white">WEBIOX</span>
          </div>
          <button 
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 flex flex-col gap-2 px-3 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Exact match for root, startsWith for other routes
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group overflow-hidden ${isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-md shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                )}

                <div className={`flex items-center justify-center shrink-0 ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-300 transition-colors'}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>

                <span className={`text-sm transition-all duration-200 ${isActive ? 'font-semibold tracking-wide' : 'font-medium'}`}>
                  {item.label}
                </span>

                {/* Subtle hover gradient effect */}
                {!isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 flex flex-col gap-2">
          <InstallButton />
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 transition-all duration-200 cursor-pointer group">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border-2 border-slate-700 group-hover:border-slate-500 transition-colors overflow-hidden">
              <img src="/IMG_20251110_151125[1].jpg" alt="Admin" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">Admin User</p>
              <p className="text-xs text-slate-500 truncate group-hover:text-slate-400 transition-colors">manthanvaghasiya@webiox.tech</p>
            </div>
            <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-slate-500 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between h-16 px-4 border-b border-slate-200 bg-white/50 backdrop-blur-md z-30 sticky top-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <span className="font-bold text-lg tracking-wide text-slate-800">WEBIOX</span>
          </div>
        </div>

        <main id="main-scroll-container" className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
      </div>
      <UpdatePrompt />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads" element={<LeadsList />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/leads/:id" element={<LeadDetail />} />
          <Route path="/follow-ups" element={<FollowUps />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/import-export" element={<ImportExport />} />
          <Route path="/bulk-image-import" element={<BulkImageImport />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
