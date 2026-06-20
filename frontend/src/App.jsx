import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, Calendar, FileDown, PieChart, LogOut } from 'lucide-react';
import LeadsList from './pages/LeadsList';
import LeadDetail from './pages/LeadDetail';
import Dashboard from './pages/Dashboard';
import FollowUps from './pages/FollowUps';
import Analytics from './pages/Analytics';
import ImportExport from './pages/ImportExport';

function Layout({ children }) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/leads', label: 'Leads', icon: List },
    { path: '/follow-ups', label: 'Follow-ups', icon: Calendar },
    { path: '/analytics', label: 'Analytics', icon: PieChart },
    { path: '/import-export', label: 'Import / Export', icon: FileDown },
  ];

  return (
    <div className="flex h-screen bg-background font-sans text-slate-800">
      {/* Sidebar */}
      <div className="w-16 md:w-64 bg-[#0f172a] border-r border-slate-800 flex flex-col shadow-2xl z-10 transition-all duration-300">
        
        {/* Logo Section */}
        <div className="h-20 flex items-center justify-center md:justify-start md:px-6 border-b border-slate-800/80">
          <img src="/WEBIOX%20LOGO.png" alt="WEBIOX Logo" className="h-10 md:mr-3 shrink-0 object-contain drop-shadow-md" />
          <span className="hidden md:block font-bold text-xl tracking-wider text-white">WEBIOX</span>
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
                className={`relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group overflow-hidden ${
                  isActive 
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
                
                <span className={`hidden md:block text-sm transition-all duration-200 ${isActive ? 'font-semibold tracking-wide' : 'font-medium'}`}>
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
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 transition-all duration-200 cursor-pointer group">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border-2 border-slate-700 group-hover:border-slate-500 transition-colors overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin&backgroundColor=1e293b" alt="Admin" className="w-full h-full object-cover" />
            </div>
            <div className="hidden md:block flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">Admin User</p>
              <p className="text-xs text-slate-500 truncate group-hover:text-slate-400 transition-colors">admin@webiox.com</p>
            </div>
            <button className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-slate-500 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
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
          <Route path="/leads/:id" element={<LeadDetail />} />
          <Route path="/follow-ups" element={<FollowUps />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/import-export" element={<ImportExport />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
