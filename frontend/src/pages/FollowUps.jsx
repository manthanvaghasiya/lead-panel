import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { getLeads } from '../api/apiClient';

function FollowUps() {
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

  if (loading) return <div className="p-8 text-center text-gray-400">Loading follow-ups...</div>;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter only leads that have a followup date and are not Won or Lost
  const activeFollowUps = leads.filter(l => 
    l.followupDate && 
    l.status !== 'Won' && 
    l.status !== 'Lost'
  ).sort((a, b) => new Date(a.followupDate) - new Date(b.followupDate));

  const overdue = activeFollowUps.filter(l => new Date(l.followupDate) < today);
  const dueToday = activeFollowUps.filter(l => {
    const d = new Date(l.followupDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });
  const upcoming = activeFollowUps.filter(l => new Date(l.followupDate) > today);

  const renderLeadCard = (lead, type) => (
    <Link 
      key={lead._id} 
      to={`/leads/${lead._id}`}
      className={`card flex items-center justify-between hover:bg-slate-800/50 transition-colors group ${type === 'overdue' ? 'border-red-500/30 bg-red-500/5' : ''}`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${type === 'overdue' ? 'bg-red-500/20 text-red-400' : type === 'today' ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-gray-400'}`}>
          {type === 'overdue' ? <AlertCircle size={20} /> : <Calendar size={20} />}
        </div>
        <div>
          <h4 className="font-medium text-gray-200 group-hover:text-primary transition-colors flex items-center gap-2">
            {lead.name}
            <span className={`badge badge-${lead.type?.toLowerCase()}`}>{lead.type}</span>
          </h4>
          <div className="text-sm text-gray-400 mt-1 flex items-center gap-3">
            <span>{lead.mobile}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {type === 'upcoming' ? new Date(lead.followupDate).toLocaleDateString() : type === 'today' ? 'Today' : new Date(lead.followupDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      <div className="text-gray-500 group-hover:text-primary transition-colors">
        <ChevronRight size={20} />
      </div>
    </Link>
  );

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      <h1 className="text-2xl font-bold mb-2">Follow-ups</h1>

      {overdue.length > 0 && (
        <section>
          <h2 className="text-lg font-medium text-red-400 mb-3 flex items-center gap-2">
            <AlertCircle size={18} /> Overdue ({overdue.length})
          </h2>
          <div className="flex flex-col gap-3">
            {overdue.map(l => renderLeadCard(l, 'overdue'))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-medium text-primary mb-3 flex items-center gap-2">
          <Clock size={18} /> Due Today ({dueToday.length})
        </h2>
        {dueToday.length === 0 ? (
          <div className="p-6 text-center text-gray-500 bg-surface border border-border rounded-lg">
            No follow-ups scheduled for today.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {dueToday.map(l => renderLeadCard(l, 'today'))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium text-gray-300 mb-3 flex items-center gap-2">
          <Calendar size={18} /> Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <div className="p-6 text-center text-gray-500 bg-surface border border-border rounded-lg">
            No upcoming follow-ups.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map(l => renderLeadCard(l, 'upcoming'))}
          </div>
        )}
      </section>
    </div>
  );
}

export default FollowUps;
