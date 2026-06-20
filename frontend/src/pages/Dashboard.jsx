import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, PhoneCall, CheckCircle, TrendingUp, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { getLeads } from '../api/apiClient';

function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data } = await getLeads();
      setLeads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading dashboard...</div>;

  // Stats calculation
  const totalLeads = leads.length;
  const hotLeads = leads.filter(l => l.type === 'Hot').length;
  const warmLeads = leads.filter(l => l.type === 'Warm').length;
  const coldLeads = leads.filter(l => l.type === 'Cold').length;
  const wonLeads = leads.filter(l => l.status === 'Won').length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const followUps = leads.filter(l => l.followupDate && l.status !== 'Won' && l.status !== 'Lost');
  
  const overdueFollowUps = followUps.filter(l => new Date(l.followupDate) < today);
  const todayFollowUps = followUps.filter(l => {
    const d = new Date(l.followupDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">Dashboard</h1>
      </div>

      {/* Overdue Alerts */}
      {overdueFollowUps.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-4">
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-red-500 font-medium">Overdue Follow-ups</h3>
            <p className="text-sm text-red-400/80 mb-3">You have {overdueFollowUps.length} leads that require immediate attention.</p>
            <div className="flex flex-wrap gap-2">
              {overdueFollowUps.slice(0, 5).map(lead => (
                <Link key={lead._id} to={`/leads/${lead._id}`} className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded hover:bg-red-500/30 transition-colors">
                  {lead.name}
                </Link>
              ))}
              {overdueFollowUps.length > 5 && <span className="text-xs text-red-500/50 flex items-center px-2 py-1">+{overdueFollowUps.length - 5} more</span>}
            </div>
          </div>
        </div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="glass-panel p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-indigo-500/30 transition-all duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-gray-400 mb-1.5 font-bold">Total Leads</p>
              <h3 className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">{totalLeads}</h3>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl shadow-[0_0_15px_rgba(99,102,241,0.2)]"><Users size={22} /></div>
          </div>
        </div>
        <div className="glass-panel p-6 relative overflow-hidden group border-l-4 border-l-red-500">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-red-500/30 transition-all duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-red-400 mb-1.5 font-bold">Hot Leads</p>
              <h3 className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-red-100">{hotLeads}</h3>
            </div>
            <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl shadow-[0_0_15px_rgba(239,68,68,0.2)]"><TrendingUp size={22} /></div>
          </div>
        </div>
        <div className="glass-panel p-6 relative overflow-hidden group border-l-4 border-l-amber-500">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-amber-500/30 transition-all duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-amber-400 mb-1.5 font-bold">Warm Leads</p>
              <h3 className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-amber-100">{warmLeads}</h3>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl shadow-[0_0_15px_rgba(245,158,11,0.2)]"><PhoneCall size={22} /></div>
          </div>
        </div>
        <div className="glass-panel p-6 relative overflow-hidden group border-l-4 border-l-emerald-500">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-emerald-500/30 transition-all duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-emerald-400 mb-1.5 font-bold">Total Won</p>
              <h3 className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-emerald-100">{wonLeads}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl shadow-[0_0_15px_rgba(16,185,129,0.2)]"><CheckCircle size={22} /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        {/* Today's Follow-ups */}
        <div className="glass-panel flex flex-col h-[420px] p-0 overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-white/5 bg-black/10 backdrop-blur-md">
            <h3 className="font-display font-semibold flex items-center gap-2 text-lg">
              <Clock size={20} className="text-purple-400" />
              Today's Follow-ups
            </h3>
            <span className="badge bg-purple-500/20 text-purple-300 border border-purple-500/30">{todayFollowUps.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {todayFollowUps.length === 0 ? (
              <div className="text-center py-10 text-gray-500 flex flex-col items-center">
                <CheckCircle size={32} className="text-emerald-500/50 mb-3" />
                No follow-ups scheduled for today!
              </div>
            ) : (
              todayFollowUps.map(lead => (
                <Link key={lead._id} to={`/leads/${lead._id}`} className="block bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 hover:border-purple-500/50 transition-all group">
                  <div className="flex justify-between items-start">
                    <div className="font-semibold text-white group-hover:text-purple-300 transition-colors">{lead.name}</div>
                    <span className={`badge ${lead.type === 'Hot' ? 'badge-hot' : lead.type === 'Warm' ? 'badge-warm' : 'badge-cold'}`}>{lead.type}</span>
                  </div>
                  <div className="text-sm font-mono text-gray-400 mt-1">{lead.mobile}</div>
                  <div className="text-xs text-gray-500 mt-3 truncate bg-black/20 p-2 rounded-lg border border-white/5">
                    {lead.callLogs?.length > 0 ? lead.callLogs[lead.callLogs.length - 1].note : 'No previous notes'}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-panel flex flex-col h-[420px] p-0 overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-white/5 bg-black/10 backdrop-blur-md">
            <h3 className="font-display font-semibold text-lg">Recently Added Leads</h3>
            <Link to="/leads" className="text-xs text-purple-400 hover:text-purple-300 font-semibold uppercase tracking-wider flex items-center gap-1 transition-colors">View all <ArrowRight size={14} /></Link>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {leads.slice(0, 7).map(lead => (
              <div key={lead._id} className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10 group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center shrink-0 shadow-inner group-hover:from-purple-600 group-hover:to-indigo-600 transition-colors">
                  <span className="text-sm font-bold text-white">{lead.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">{lead.name}</div>
                  <div className="text-xs text-gray-500 truncate">{lead.source} • {new Date(lead.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-gray-400">{lead.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
