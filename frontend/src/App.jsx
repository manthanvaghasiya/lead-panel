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
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-16 md:w-64 bg-surface border-r border-border flex flex-col">
        <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-border">
          <div className="w-8 h-8 rounded bg-primary text-white flex items-center justify-center font-bold text-xl md:mr-3">
            W
          </div>
          <span className="hidden md:block font-bold text-xl tracking-wider">WEBIOX</span>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-2 px-2">
          <Link to="/" className="flex items-center gap-3 px-3 py-3 rounded hover:bg-slate-700 transition-colors text-gray-300 hover:text-white">
            <LayoutDashboard size={20} />
            <span className="hidden md:block text-sm font-medium">Dashboard</span>
          </Link>
          <Link to="/leads" className="flex items-center gap-3 px-3 py-3 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <List size={20} />
            <span className="hidden md:block text-sm font-medium">Leads</span>
          </Link>
          <Link to="/follow-ups" className="flex items-center gap-3 px-3 py-3 rounded hover:bg-slate-700 transition-colors text-gray-300 hover:text-white">
            <Calendar size={20} />
            <span className="hidden md:block text-sm font-medium">Follow-ups</span>
          </Link>
          <Link to="/analytics" className="flex items-center gap-3 px-3 py-3 rounded hover:bg-slate-700 transition-colors text-gray-300 hover:text-white">
            <LayoutDashboard size={20} />
            <span className="hidden md:block text-sm font-medium">Analytics</span>
          </Link>
          <Link to="/import-export" className="flex items-center gap-3 px-3 py-3 rounded hover:bg-slate-700 transition-colors text-gray-300 hover:text-white">
            <FileDown size={20} />
            <span className="hidden md:block text-sm font-medium">Import / Export</span>
          </Link>
        </nav>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        <main className="flex-1 overflow-y-auto p-4 md:p-6 text-gray-200">
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
