import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { getLeads } from '../api/apiClient';

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

  if (loading) return <div className="p-8 text-center text-gray-400">Loading analytics...</div>;

  // Type Distribution
  const typeData = [
    { name: 'Hot', value: leads.filter(l => l.type === 'Hot').length, color: '#ef4444' },
    { name: 'Warm', value: leads.filter(l => l.type === 'Warm').length, color: '#eab308' },
    { name: 'Cold', value: leads.filter(l => l.type === 'Cold').length, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  // Source Performance
  const sourceCount = {};
  leads.forEach(l => {
    const src = l.source || 'Unknown';
    sourceCount[src] = (sourceCount[src] || 0) + 1;
  });
  const sourceData = Object.keys(sourceCount).map(key => ({
    name: key,
    leads: sourceCount[key]
  }));

  // Status Distribution
  const statusCount = {};
  leads.forEach(l => {
    const status = l.status || 'Unknown';
    statusCount[status] = (statusCount[status] || 0) + 1;
  });
  const statusData = Object.keys(statusCount).map(key => ({
    name: key,
    count: statusCount[key]
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold mb-2">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Lead Types Chart */}
        <div className="card">
          <h3 className="font-medium mb-4 text-center">Lead Temperature</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                  itemStyle={{ color: '#f1f5f9' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sources Chart */}
        <div className="card">
          <h3 className="font-medium mb-4 text-center">Lead Sources</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" width={100} stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                />
                <Bar dataKey="leads" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="card md:col-span-2">
          <h3 className="font-medium mb-4">Pipeline Status</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {statusData.map((stat, i) => (
              <div key={i} className="bg-slate-800/50 border border-border p-4 rounded-lg flex flex-col items-center justify-center">
                <div className="text-2xl font-bold text-white mb-1">{stat.count}</div>
                <div className="text-xs uppercase tracking-wider text-gray-400 text-center">{stat.name}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Analytics;
