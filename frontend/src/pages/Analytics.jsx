import { useState, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  AreaChart, Area, CartesianGrid
} from 'recharts';
import { getLeads } from '../api/apiClient';
import { Users, Target, CheckCircle, TrendingDown, ArrowUpRight, Activity } from 'lucide-react';

function Analytics() {
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

  if (loading) return <div className="p-12 text-center text-slate-500 font-medium">Gathering insights...</div>;

  // --- KPI Metrics ---
  const totalLeads = leads.length;
  const wonLeads = leads.filter(l => l.status === 'Won').length;
  const lostLeads = leads.filter(l => l.status === 'Lost' || l.status === 'Permanently Lost').length;
  const activeLeads = totalLeads - wonLeads - lostLeads;
  const winRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  // --- Time-Series Data (Last 7 Days) ---
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const leadsOverTime = last7Days.map(dateStr => {
    const count = leads.filter(l => {
      const createdDate = l.createdAt ? new Date(l.createdAt).toISOString().split('T')[0] : null;
      return createdDate === dateStr;
    }).length;
    
    // Format date for display (e.g. "Jun 20")
    const dateObj = new Date(dateStr);
    const displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    return { date: displayDate, "New Leads": count };
  });

  // --- Type Distribution (Pie) ---
  const typeData = [
    { name: 'Hot', value: leads.filter(l => l.type === 'Hot').length, color: '#ef4444' }, // Red
    { name: 'Warm', value: leads.filter(l => l.type === 'Warm').length, color: '#f97316' }, // Orange
    { name: 'Cold', value: leads.filter(l => l.type === 'Cold').length, color: '#0ea5e9' }, // Sky
  ].filter(d => d.value > 0);

  // --- Source / Ask For (Bar) ---
  const sourceCount = {};
  leads.forEach(l => {
    const src = l.source || 'Unknown';
    sourceCount[src] = (sourceCount[src] || 0) + 1;
  });
  const sourceData = Object.keys(sourceCount).map(key => ({
    name: key,
    leads: sourceCount[key]
  })).sort((a, b) => b.leads - a.leads);

  // --- Pipeline Funnel Data ---
  const pipelineOrder = ['Pending', 'In Process', 'Contacted', 'Send Detail', 'Follow-up Letter'];
  const funnelData = pipelineOrder.map(status => {
    return {
      status,
      count: leads.filter(l => l.status === status).length
    };
  }).filter(d => d.count > 0);

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-12">
      
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Performance Analytics</h1>
        <p className="text-slate-500 font-medium">High-level overview of your sales pipeline and lead conversion.</p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">Total Leads</p>
              <h2 className="text-4xl font-extrabold text-slate-900">{totalLeads}</h2>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Users size={20} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-green-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">Win Rate</p>
              <h2 className="text-4xl font-extrabold text-slate-900 flex items-baseline gap-1">
                {winRate}<span className="text-xl text-slate-400">%</span>
              </h2>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
              <CheckCircle size={20} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Active Pipeline */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">Active Pipeline</p>
              <h2 className="text-4xl font-extrabold text-slate-900">{activeLeads}</h2>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center text-cyan-600">
              <Activity size={20} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Lost Leads */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">Lost Opportunities</p>
              <h2 className="text-4xl font-extrabold text-slate-900">{lostLeads}</h2>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
              <TrendingDown size={20} strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Leads Over Time (Area Chart) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <ArrowUpRight className="text-cyan-500" size={20} />
            Lead Acquisition (Last 7 Days)
          </h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={leadsOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#22d3ee', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="New Leads" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Temperature (Pie Chart) */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Target className="text-orange-500" size={20} />
            Lead Temperature
          </h3>
          <div className="flex-1 min-h-[300px] flex items-center justify-center relative">
            {typeData.length === 0 ? (
              <div className="text-slate-400 font-medium">No active data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#1e293b', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
            
            {/* Center Label */}
            {typeData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-36px]">
                <span className="text-3xl font-black text-slate-800">{typeData.reduce((acc, curr) => acc + curr.value, 0)}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Secondary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Active Pipeline Funnel */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Active Pipeline Stages</h3>
          <div className="space-y-4">
            {funnelData.length === 0 ? (
              <div className="text-slate-400 font-medium text-center py-8">Pipeline is empty</div>
            ) : (
              funnelData.map((stage, i) => {
                const maxCount = Math.max(...funnelData.map(d => d.count));
                const percentage = Math.round((stage.count / maxCount) * 100);
                return (
                  <div key={i} className="flex items-center gap-4 group">
                    <div className="w-32 text-right">
                      <span className="text-sm font-semibold text-slate-600">{stage.status}</span>
                    </div>
                    <div className="flex-1 bg-slate-100 h-8 rounded-r-lg rounded-l-sm relative overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-r-lg transition-all duration-1000 ease-out"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="w-12">
                      <span className="text-lg font-bold text-slate-800">{stage.count}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sources Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Lead Sources / Requests</h3>
          <div className="flex-1 min-h-[250px]">
            {sourceData.length === 0 ? (
               <div className="text-slate-400 font-medium text-center py-8">No source data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#1e293b', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="leads" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

export default Analytics;
