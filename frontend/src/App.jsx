import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, List, Calendar, FileDown, PieChart, LogOut, Settings as SettingsIcon, Images, LayoutGrid } from 'lucide-react';
import { FaLinkedin, FaGoogle } from 'react-icons/fa';
import LeadsList from './pages/LeadsList';
import Pipeline from './pages/Pipeline';
import LeadDetail from './pages/LeadDetail';
import Dashboard from './pages/Dashboard';
import FollowUps from './pages/FollowUps';
import Analytics from './pages/Analytics';
import ImportExport from './pages/ImportExport';
import Settings from './pages/Settings';
import LinkedIn from './pages/LinkedIn';
import GoogleLeads from './pages/GoogleLeads';
import UpdatePrompt from './components/PWA/UpdatePrompt';
import InstallButton from './components/PWA/InstallButton';
import OfflineBadge from './components/PWA/OfflineBadge';
import { AuthProvider, AuthContext } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import ErrorBoundary from './components/ErrorBoundary';

function Layout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);

    // Scroll to top of main content when route changes
    const mainContent = document.getElementById('main-scroll-container');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
  }, [location.pathname]);

  const isLinkedInUser = user?.role === 'linkedin';
  const isGoogleUser = user?.role === 'google';
  const isAdmin = user?.role === 'admin';
  const canAccessNetwork = isLinkedInUser || isAdmin;
  const canAccessGoogle = isGoogleUser || isAdmin;

  const navItems = isLinkedInUser
    ? [
        { path: '/linkedin', label: 'Network', icon: FaLinkedin, isNetwork: true, badge: 'LinkedIn' }
      ]
    : [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        ...(isAdmin ? [
          { path: '/linkedin', label: 'Network', icon: FaLinkedin, isNetwork: true, badge: 'LinkedIn' }
        ] : []),
        ...(canAccessGoogle ? [
          { path: '/google-leads', label: 'Google Maps', icon: FaGoogle, isGoogle: true, badge: 'Maps' }
        ] : []),
        { path: '/leads', label: 'Leads', icon: List, badge: 'Sales' },
        { path: '/pipeline', label: 'Pipeline', icon: LayoutGrid },
        { path: '/follow-ups', label: 'Follow-ups', icon: Calendar },
        { path: '/analytics', label: 'Analytics', icon: PieChart },
        { path: '/import-export', label: 'Import / Export', icon: FileDown },
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
                  className={`relative flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-300 group overflow-hidden ${isActive
                    ? item.isNetwork
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                      : item.isGoogle
                      ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
                      : 'bg-primary/10 text-primary'
                    : item.isNetwork
                    ? 'text-slate-400 hover:bg-slate-800/50 hover:text-blue-200'
                    : item.isGoogle
                    ? 'text-slate-400 hover:bg-slate-800/50 hover:text-rose-200'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                >
                  {/* Active Indicator Bar */}
                  {isActive && (
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-r-md ${
                      item.isNetwork
                        ? 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]'
                        : item.isGoogle
                        ? 'bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.8)]'
                        : 'bg-primary shadow-[0_0_10px_rgba(6,182,212,0.8)]'
                    }`} />
                  )}

                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex items-center justify-center shrink-0 ${
                      isActive 
                        ? item.isNetwork ? 'text-blue-400' : item.isGoogle ? 'text-rose-400' : 'text-primary' 
                        : item.isNetwork ? 'text-blue-400/80 group-hover:text-blue-300' : item.isGoogle ? 'text-rose-400/80 group-hover:text-rose-300' : 'text-slate-400 group-hover:text-slate-300'
                    }`}>
                      <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    </div>

                    <span className={`text-sm transition-all duration-200 ${isActive ? 'font-semibold tracking-wide' : 'font-medium'}`}>
                      {item.label}
                    </span>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      item.isNetwork
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                        : item.isGoogle
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                    }`}>
                      {item.badge}
                    </span>
                  )}

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
                <img src="/IMG_20251110_151125[1].jpg" alt={user?.name || "Profile"} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">{user?.name || (user?.role === 'admin' ? 'Master Admin' : 'User')}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                    user?.role === 'tech'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-400/40'
                      : user?.role === 'marketing'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-400/40'
                      : user?.role === 'oldata'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                      : user?.role === 'linkedin'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                      : user?.role === 'google'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                      : user?.role === 'admin'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      : 'bg-slate-700/40 text-slate-300 border-slate-600/40'
                  }`}>
                    {user?.role === 'tech'
                      ? '💻 Tech Dept'
                      : user?.role === 'marketing'
                      ? '📢 Marketing Dept'
                      : user?.role === 'oldata'
                      ? '📦 Old Data'
                      : user?.role === 'linkedin'
                      ? '🔗 LinkedIn Dept'
                      : user?.role === 'google'
                      ? '📍 Google Dept'
                      : user?.role === 'admin'
                      ? '👑 Master Admin'
                      : '👤 User'}
                  </span>
                </div>
              </div>
              <button onClick={logout} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-slate-500 transition-colors">
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
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
      <UpdatePrompt />
    </div>
  );
}

function LinkedInRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user || (user.role !== 'linkedin' && user.role !== 'admin')) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function NonLinkedInRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (user && user.role === 'linkedin') {
    return <Navigate to="/linkedin" replace />;
  }
  return children;
}

function RootRoute() {
  const { user, loading } = useContext(AuthContext);
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (user && user.role === 'linkedin') {
    return <Navigate to="/linkedin" replace />;
  }
  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<PrivateRoute />}>
            <Route path="/*" element={
              <Layout>
                <Routes>
                  <Route path="/" element={<RootRoute />} />
                  <Route path="/linkedin" element={<LinkedInRoute><LinkedIn /></LinkedInRoute>} />
                  <Route path="/google-leads" element={<NonLinkedInRoute><GoogleLeads /></NonLinkedInRoute>} />
                  <Route path="/leads" element={<NonLinkedInRoute><LeadsList /></NonLinkedInRoute>} />
                  <Route path="/pipeline" element={<NonLinkedInRoute><Pipeline /></NonLinkedInRoute>} />
                  <Route path="/leads/:id" element={<NonLinkedInRoute><LeadDetail /></NonLinkedInRoute>} />
                  <Route path="/follow-ups" element={<NonLinkedInRoute><FollowUps /></NonLinkedInRoute>} />
                  <Route path="/analytics" element={<NonLinkedInRoute><Analytics /></NonLinkedInRoute>} />
                  <Route path="/import-export" element={<NonLinkedInRoute><ImportExport /></NonLinkedInRoute>} />
                  <Route path="/settings" element={<NonLinkedInRoute><Settings /></NonLinkedInRoute>} />
                </Routes>
              </Layout>
            } />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
