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

  if (loading) return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;

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
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-surface to-slate-50">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Total Leads</p>
              <h3 className="text-3xl font-bold">{totalLeads}</h3>
            </div>
            <div className="p-2 bg-primary/20 text-primary rounded-lg"><Users size={20} /></div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-surface to-slate-50 border-l-4 border-l-hot">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Hot Leads</p>
              <h3 className="text-3xl font-bold">{hotLeads}</h3>
            </div>
            <div className="p-2 bg-hot/20 text-hot rounded-lg"><TrendingUp size={20} /></div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-surface to-slate-50 border-l-4 border-l-warm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Warm Leads</p>
              <h3 className="text-3xl font-bold">{warmLeads}</h3>
            </div>
            <div className="p-2 bg-warm/20 text-warm rounded-lg"><PhoneCall size={20} /></div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-surface to-slate-50 border-l-4 border-l-won">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Total Won</p>
              <h3 className="text-3xl font-bold">{wonLeads}</h3>
            </div>
            <div className="p-2 bg-won/20 text-won rounded-lg"><CheckCircle size={20} /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        {/* Today's Follow-ups */}
        <div className="card flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-border">
            <h3 className="font-medium flex items-center gap-2">
              <Clock size={18} className="text-primary" />
              Today's Follow-ups
            </h3>
            <span className="badge bg-slate-100 text-slate-800">{todayFollowUps.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {todayFollowUps.length === 0 ? (
              <div className="text-center py-10 text-slate-400">No follow-ups scheduled for today.</div>
            ) : (
              todayFollowUps.map(lead => (
                <Link key={lead._id} to={`/leads/${lead._id}`} className="block bg-white border border-border p-3 rounded hover:border-primary/50 transition-colors group">
                  <div className="flex justify-between items-start">
                    <div className="font-medium group-hover:text-primary transition-colors">{lead.name}</div>
                    <span className={`badge badge-${lead.type?.toLowerCase()}`}>{lead.type}</span>
                  </div>
                  <div className="text-sm text-slate-500 mt-1">{lead.mobile}</div>
                  <div className="text-xs text-slate-400 mt-2 truncate">
                    {lead.callLogs?.length > 0 ? lead.callLogs[lead.callLogs.length - 1].note : 'No previous notes'}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity (Placeholder for now, just shows recent leads) */}
        <div className="card flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-border">
            <h3 className="font-medium">Recently Added Leads</h3>
            <Link to="/leads" className="text-sm text-primary hover:underline flex items-center gap-1">View all <ArrowRight size={14} /></Link>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {leads.slice(0, 5).map(lead => (
              <div key={lead._id} className="flex items-center gap-3 p-2 hover:bg-white/50 rounded transition-colors">
                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-slate-700">{lead.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{lead.name}</div>
                  <div className="text-xs text-slate-500 truncate">{lead.source} • {new Date(lead.createdAt).toLocaleDateString()}</div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0
                  ${lead.status?.toLowerCase() === 'won' ? 'bg-green-50 text-green-700 border-green-200' : 
                    lead.status?.toLowerCase() === 'lost' ? 'bg-slate-100 text-slate-600 border-slate-200' : 
                    'bg-cyan-50 text-cyan-700 border-cyan-200'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${lead.status?.toLowerCase() === 'won' ? 'bg-green-500' : lead.status?.toLowerCase() === 'lost' ? 'bg-slate-400' : 'bg-cyan-500 animate-pulse'}`}></span>
                  <span>{lead.status || 'Pending'}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
