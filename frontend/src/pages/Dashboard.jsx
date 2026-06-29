import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, PhoneCall, CheckCircle, TrendingUp, AlertCircle, Clock, ArrowRight, Activity, MessageSquare, Phone, ChevronRight, Target } from 'lucide-react';
import { getLeads } from '../api/apiClient';
import { useScrollRestore } from '../hooks/useScrollRestore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';

function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useScrollRestore('main-scroll-container', loading);

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

  // Memoized stats calculation
  const stats = useMemo(() => {
    const total = leads.length;
    const hot = leads.filter(l => l.type === 'Hot').length;
    const warm = leads.filter(l => l.type === 'Warm').length;
    const cold = leads.filter(l => l.type === 'Cold').length;
    const won = leads.filter(l => l.status === 'Won').length;
    const winRate = total > 0 ? ((won / total) * 100).toFixed(1) : '0.0';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const followUps = leads.filter(l => l.followupDate && l.status !== 'Won' && l.status !== 'Lost');
    const overdue = followUps.filter(l => new Date(l.followupDate) < today);
    const todayList = followUps.filter(l => {
      const d = new Date(l.followupDate);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });

    // Mock trend data for aesthetics (real implementation would group by createdAt)
    const trendData = [
      { name: 'Mon', value: 4 }, { name: 'Tue', value: 7 }, { name: 'Wed', value: 5 },
      { name: 'Thu', value: 12 }, { name: 'Fri', value: 9 }, { name: 'Sat', value: 15 }, { name: 'Sun', value: total > 20 ? 18 : total }
    ];

    const pipelineData = [
      { name: 'Hot', value: hot, color: '#f43f5e' },   // Rose
      { name: 'Warm', value: warm, color: '#f59e0b' }, // Amber
      { name: 'Cold', value: cold, color: '#3b82f6' }  // Blue
    ].filter(d => d.value > 0);

    // Recent leads
    const recentLeads = [...leads].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);

    return { total, hot, warm, cold, won, winRate, overdue, todayList, trendData, pipelineData, recentLeads };
  }, [leads]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 font-medium animate-pulse">Loading Agency Dashboard...</p>
        </div>
      </div>
    );
  }

  const { total, hot, warm, cold, won, winRate, overdue, todayList, trendData, pipelineData, recentLeads } = stats;

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-12">
      
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agency Overview</h1>
          <p className="text-slate-500 text-sm mt-1">Here is what's happening with your pipeline today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/leads?type=Hot" className="px-4 py-2 bg-rose-50 text-rose-600 rounded-lg text-sm font-semibold hover:bg-rose-100 transition-colors">
            View Hot Leads
          </Link>
          <Link to="/leads" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm">
            + New Lead
          </Link>
        </div>
      </div>

      {/* 2. ALERTS */}
      {overdue.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 md:p-5 flex items-start gap-4 backdrop-blur-md">
          <div className="p-2 bg-red-500/20 rounded-full shrink-0">
            <AlertCircle className="text-red-600" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-red-700 font-semibold text-sm">Critical: Overdue Follow-ups</h3>
            <p className="text-sm text-red-600/80 mt-1 mb-3">You have {overdue.length} leads that have slipped past their scheduled follow-up date.</p>
            <div className="flex flex-wrap gap-2">
              {overdue.slice(0, 5).map(lead => (
                <Link key={lead._id} to={`/leads/${lead._id}`} className="inline-flex items-center gap-1 text-xs font-medium bg-red-50 border border-red-100 text-red-700 px-2.5 py-1 rounded-md hover:bg-red-100 transition-colors shadow-sm">
                  {lead.name} <ChevronRight size={12} />
                </Link>
              ))}
              {overdue.length > 5 && <span className="text-xs text-red-500 font-medium px-2 py-1">+{overdue.length - 5} more</span>}
            </div>
          </div>
        </div>
      )}

      {/* 3. BENTO GRID STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Leads - Premium Gradient Card */}
        <Link to="/leads" className="group relative overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-900 to-black rounded-2xl p-5 shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <p className="text-indigo-200/80 text-sm font-medium tracking-wide">Total Leads</p>
              <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-sm"><Users size={18} className="text-indigo-200" /></div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <h3 className="text-4xl font-extrabold text-white">{total}</h3>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">+12%</span>
            </div>
          </div>
        </Link>

        {/* Win Rate */}
        <Link to="/leads?status=Won" className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <p className="text-slate-500 text-sm font-medium tracking-wide">Win Rate</p>
            <div className="p-1.5 bg-emerald-50 rounded-lg"><Target size={18} className="text-emerald-600" /></div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <h3 className="text-3xl font-bold text-slate-900">{winRate}%</h3>
              <p className="text-xs text-slate-400 mt-1">{won} deals closed</p>
            </div>
            {/* Simple CSS Radial */}
            <div className="relative w-12 h-12 rounded-full flex items-center justify-center bg-slate-50" style={{ background: `conic-gradient(#10b981 ${winRate}%, #f1f5f9 0)` }}>
              <div className="w-10 h-10 bg-white rounded-full"></div>
            </div>
          </div>
        </Link>

        {/* Pipeline Health */}
        <div className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium tracking-wide">Pipeline</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{hot + warm + cold} <span className="text-xs font-normal text-slate-400">total</span></h3>
            </div>
            <div className="p-1.5 bg-rose-50 rounded-lg"><Activity size={18} className="text-rose-600" /></div>
          </div>
          <div className="mt-2 flex items-center gap-4">
            <div className="w-16 h-16 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pipelineData} innerRadius={20} outerRadius={30} paddingAngle={2} dataKey="value" stroke="none">
                    {pipelineData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#333', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 flex flex-col gap-1.5 justify-center">
              {pipelineData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></span>
                    <span className="text-slate-600 font-medium">{d.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Follow-ups */}
        <div className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <p className="text-slate-500 text-sm font-medium tracking-wide">Today's Focus</p>
            <div className="p-1.5 bg-indigo-50 rounded-lg"><Clock size={18} className="text-indigo-600" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-900">{todayList.length}</h3>
            <p className="text-xs text-slate-400 mt-1">Calls scheduled for today</p>
          </div>
          {todayList.length > 0 && (
             <div className="mt-3 flex -space-x-2 overflow-hidden">
               {todayList.slice(0,4).map((l, i) => (
                 <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 uppercase">
                   {l.name.charAt(0)}
                 </div>
               ))}
             </div>
          )}
        </div>
      </div>

      {/* 4. MAIN CONTENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Action Center */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
            <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle size={20} className="text-emerald-500" />
                  Action Center
                </h2>
                <p className="text-xs text-slate-500 mt-1">Leads scheduled for follow-up today.</p>
              </div>
              <Link to="/follow-ups" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                View All
              </Link>
            </div>
            
            <div className="p-2 md:p-4 flex-1 overflow-y-auto">
              {todayList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle size={24} className="text-slate-300" />
                  </div>
                  <p className="font-medium text-slate-600">Inbox Zero!</p>
                  <p className="text-sm mt-1">No follow-ups scheduled for today.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayList.map(lead => (
                    <div key={lead._id} className="group bg-white border border-slate-100 p-4 rounded-xl hover:border-indigo-200 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
                      {/* Accent Bar */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${lead.type === 'Hot' ? 'bg-rose-500' : lead.type === 'Warm' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                      
                      <div className="flex items-center gap-4 pl-2">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-700 shrink-0">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <Link to={`/leads/${lead._id}`} className="text-base font-bold text-slate-900 hover:text-indigo-600 truncate block transition-colors">
                            {lead.name}
                          </Link>
                          <div className="text-sm text-slate-500 mt-0.5 truncate">{lead.mobile}</div>
                          {lead.callLogs?.length > 0 && (
                            <div className="text-xs text-slate-400 mt-1.5 truncate max-w-[250px] md:max-w-sm flex items-center gap-1.5">
                              <MessageSquare size={12} className="shrink-0" />
                              <span className="italic">"{lead.callLogs[lead.callLogs.length - 1].note}"</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:self-center pl-16 sm:pl-0">
                        <a href={`tel:${lead.mobile}`} onClick={(e) => e.stopPropagation()} className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors shrink-0" title="Call">
                          <Phone size={18} />
                        </a>
                        <a href={`whatsapp://send?phone=91${lead.mobile}&text=Hi ${lead.name.split(' ')[0]},`} onClick={(e) => e.stopPropagation()} className="p-2.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors shrink-0" title="WhatsApp">
                          <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.391.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 3.825 0 6.938 3.112 6.938 6.937 0 3.825-3.113 6.938-6.938 6.938z"/></svg>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Activity Timeline */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
          <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-indigo-500" />
              Live Activity
            </h2>
          </div>
          
          <div className="p-5 flex-1 overflow-y-auto">
            <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
              {recentLeads.map((lead, i) => (
                <div key={lead._id} className="relative pl-6">
                  {/* Dot */}
                  <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white
                    ${lead.status === 'Won' ? 'bg-emerald-500' : lead.status === 'Lost' ? 'bg-slate-400' : 'bg-indigo-500'}`}
                  ></div>
                  
                  <div className="flex flex-col">
                    <div className="flex justify-between items-start gap-2">
                      <Link to={`/leads/${lead._id}`} className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                        {lead.name}
                      </Link>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mt-0.5">
                        {new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {lead.source ? `Added from ${lead.source}` : 'New lead added to system'}
                    </p>
                    
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border 
                        ${lead.type === 'Hot' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                          lead.type === 'Warm' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                          'bg-blue-50 text-blue-600 border-blue-100'}`}>
                        {lead.type || 'Standard'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border
                        ${lead.status === 'Won' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                          lead.status === 'Lost' ? 'bg-slate-50 text-slate-500 border-slate-200' : 
                          'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                        {lead.status || 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {recentLeads.length === 0 && (
              <div className="text-center text-slate-400 py-10 text-sm">No recent activity found.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;
