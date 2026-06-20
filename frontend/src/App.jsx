import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { LayoutDashboard, List, Calendar, FileDown } from 'lucide-react';
import LeadsList from './pages/LeadsList';
import LeadDetail from './pages/LeadDetail';
import Dashboard from './pages/Dashboard';
import FollowUps from './pages/FollowUps';
import Analytics from './pages/Analytics';
import ImportExport from './pages/ImportExport';

function Layout({ children }) {
  return (
    <div className="flex h-screen bg-background relative overflow-hidden font-sans text-gray-100">
      {/* Background Animated Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob z-0 pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-10%] w-[35vw] h-[35vw] bg-purple-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000 z-0 pointer-events-none"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[45vw] h-[45vw] bg-cyan-600/10 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000 z-0 pointer-events-none"></div>

      {/* Sidebar - Glassmorphism */}
      <div className="w-16 md:w-64 bg-white/5 backdrop-blur-2xl border-r border-white/10 flex flex-col z-10 shadow-2xl relative">
        <div className="h-20 flex items-center justify-center md:justify-start md:px-6 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-2xl md:mr-4 shadow-[0_0_15px_rgba(139,92,246,0.4)]">
            W
          </div>
          <span className="hidden md:block font-display font-bold text-2xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">WEBIOX</span>
        </div>
        <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-gray-400 hover:text-white hover:bg-white/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            <LayoutDashboard size={20} className="text-indigo-400" />
            <span className="hidden md:block text-sm font-medium">Dashboard</span>
          </Link>
          <Link to="/leads" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-primary/20 to-transparent text-white border-l-2 border-primary shadow-[inset_0_0_20px_rgba(139,92,246,0.1)] transition-all">
            <List size={20} className="text-purple-400" />
            <span className="hidden md:block text-sm font-medium tracking-wide">Leads Management</span>
          </Link>
          <Link to="/follow-ups" className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-gray-400 hover:text-white hover:bg-white/5">
            <Calendar size={20} className="text-cyan-400" />
            <span className="hidden md:block text-sm font-medium">Follow-ups</span>
          </Link>
          <Link to="/analytics" className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-gray-400 hover:text-white hover:bg-white/5">
            <LayoutDashboard size={20} className="text-pink-400" />
            <span className="hidden md:block text-sm font-medium">Analytics</span>
          </Link>
          <Link to="/import-export" className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-gray-400 hover:text-white hover:bg-white/5">
            <FileDown size={20} className="text-emerald-400" />
            <span className="hidden md:block text-sm font-medium">Import / Export</span>
          </Link>
        </nav>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden z-10 relative">
        <header className="h-20 bg-white/5 backdrop-blur-md border-b border-white/5 flex items-center px-8 justify-between">
          <h2 className="text-xl font-display font-semibold text-white tracking-wide">Lead Panel ⚡</h2>
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 shadow-lg border border-white/20"></div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 md:p-8 text-gray-200">
          <div className="max-w-7xl mx-auto animate-fade-in-up">
            {children}
          </div>
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
