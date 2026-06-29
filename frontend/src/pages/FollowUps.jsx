import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, AlertCircle, Clock, ChevronRight, CheckCircle, Search, FileText, MessageSquarePlus, MoreHorizontal, Trash2 } from 'lucide-react';
import { FaWhatsapp, FaPhoneAlt } from 'react-icons/fa';
import { getLeads, deleteLead } from '../api/apiClient';
import { useScrollRestore } from '../hooks/useScrollRestore';
import { extractMobileNumbers, defaultWhatsappMessage } from '../utils/contactUtils';
import SelectContactModal from '../components/Modals/SelectContactModal';
import { ViewLogsModal, AddCallLogModal } from './LeadsList';

function FollowUps() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewLogsLead, setViewLogsLead] = useState(null);
  const [logModalLead, setLogModalLead] = useState(null);
  const [contactActionLead, setContactActionLead] = useState(null);
  const [contactActionType, setContactActionType] = useState(null);

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

  const handleContactClick = (e, lead, type) => {
    e.preventDefault();
    const numbers = extractMobileNumbers(lead.mobile);
    if (numbers.length > 1) {
      setContactActionLead(lead);
      setContactActionType(type);
    } else if (numbers.length === 1) {
      if (type === 'call') window.location.href = `tel:${numbers[0]}`;
      if (type === 'whatsapp') window.location.href = `whatsapp://send?phone=91${numbers[0]}&text=${encodeURIComponent(defaultWhatsappMessage)}`;
    } else {
      alert('No valid mobile number found.');
    }
  };

  const handleDeleteLead = async (id) => {
    if (window.confirm('Are you sure you want to permanently delete this lead? This action cannot be undone.')) {
      try {
        await deleteLead(id);
        setLeads(leads.filter(l => l._id !== id));
      } catch (err) {
        console.error(err);
        alert('Failed to delete lead');
      }
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading follow-ups...</div>;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter only leads that have a followup date and are not Won or Lost or Permanently Lost
  const activeFollowUps = leads.filter(l => 
    l.followupDate && 
    l.status !== 'Won' && 
    l.status !== 'Lost' &&
    l.status !== 'Permanently Lost'
  ).sort((a, b) => new Date(a.followupDate) - new Date(b.followupDate));

  const overdue = activeFollowUps.filter(l => new Date(l.followupDate) < today);
  const dueToday = activeFollowUps.filter(l => {
    const d = new Date(l.followupDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });
  const upcoming = activeFollowUps.filter(l => new Date(l.followupDate) > today);

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const completed = leads.filter(l => 
    l.lastFollowupCompletedDate && 
    new Date(l.lastFollowupCompletedDate) >= twentyFourHoursAgo
  ).sort((a, b) => new Date(b.lastFollowupCompletedDate) - new Date(a.lastFollowupCompletedDate));

  const renderLeadsTable = (filteredLeads) => (
    <>
      {/* Leads Table (Desktop) */}
      <div className="hidden md:flex flex-1 flex-col overflow-hidden mb-6">
        <div className="overflow-x-auto bg-white sm:rounded-xl sm:border sm:border-slate-200 shadow-sm">
          <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 shadow-sm border-b border-border">
              <tr>
                <th className="px-4 py-4 font-semibold w-[22%]">Lead Profile</th>
                <th className="px-4 py-4 font-semibold w-[14%]">Contact Info</th>
                <th className="px-4 py-4 font-semibold w-[10%]">Type</th>
                <th className="px-4 py-4 font-semibold w-[12%]">Status</th>
                <th className="px-4 py-4 font-semibold w-[32%]">Latest Activity</th>
                <th className="px-4 py-4 font-semibold w-[10%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredLeads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-slate-50/80 transition-all duration-200 group">
                    {/* 1. Lead Profile */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-slate-900 truncate">{lead.name}</span>
                          <span className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                            {lead.source}
                            {lead.followupDate && (
                              <>
                                <span className="mx-1 text-slate-300">•</span>
                                <span className="text-orange-500 flex items-center gap-1 font-medium">
                                  <Calendar size={10} className="mb-0.5" />
                                  {new Date(lead.followupDate).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>
                    
                    {/* 2. Contact Info */}
                    <td className="px-3 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">
                          {lead.mobile?.length > 10 ? lead.mobile.match(/.{1,10}/g).join(', ') : lead.mobile}
                        </span>
                        <span className="text-xs text-slate-500 truncate max-w-[150px] flex items-center gap-1 mt-0.5">
                          {lead.city || 'No City'}
                        </span>
                      </div>
                    </td>

                    {/* 3. Type (Square Badge) */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold border 
                        ${lead.type?.toLowerCase() === 'hot' ? 'bg-red-50 text-red-600 border-red-200' :
                          lead.type?.toLowerCase() === 'warm' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                          'bg-blue-50 text-blue-600 border-blue-200'}`}>
                        {lead.type || 'Cold'}
                      </span>
                    </td>

                    {/* 4. Status (Pill Badge with Circle Dot) */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border
                        ${lead.status?.toLowerCase() === 'won' ? 'bg-green-50 text-green-700 border-green-200' : 
                          lead.status?.toLowerCase() === 'lost' ? 'bg-slate-100 text-slate-600 border-slate-200' : 
                          'bg-cyan-50 text-cyan-700 border-cyan-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${lead.status?.toLowerCase() === 'won' ? 'bg-green-500' : lead.status?.toLowerCase() === 'lost' ? 'bg-slate-400' : 'bg-cyan-500 animate-pulse'}`}></span>
                        <span className="truncate">{lead.status || 'Pending'}</span>
                      </span>
                    </td>

                    {/* 5. Latest Activity */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-xs text-slate-500 line-clamp-2 leading-relaxed max-w-[280px]">
                          {lead.callLogs && lead.callLogs.length > 0 
                            ? lead.callLogs[lead.callLogs.length - 1].note 
                            : 'No recent notes.'}
                        </span>
                        <button 
                          onClick={() => setViewLogsLead(lead)}
                          className="text-[10px] uppercase tracking-wider font-semibold text-cyan-600 hover:text-cyan-700 mt-1 flex items-center gap-1 transition-colors"
                        >
                          <FileText size={12} />
                          View Logs ({lead.callLogs ? lead.callLogs.length : 0})
                        </button>
                      </div>
                    </td>

                    {/* 6. Actions */}
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            const query = encodeURIComponent(`${lead.name} ${lead.mobile || ''}`);
                            window.open(`https://www.google.com/search?q=${query}`, '_blank');
                          }}
                          className="p-1.5 bg-cyan-50 text-cyan-600 rounded-md hover:bg-cyan-100 transition-colors border border-cyan-200 shadow-sm"
                          title="Google Search"
                        >
                          <Search size={12} />
                        </button>
                        <button 
                          onClick={(e) => handleContactClick(e, lead, 'call')}
                          className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm"
                          title="Call"
                        >
                          <FaPhoneAlt size={12} />
                        </button>
                        <button 
                          onClick={() => handleDeleteLead(lead._id)}
                          className="p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors border border-red-200 shadow-sm"
                          title="Delete Lead"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button 
                          onClick={(e) => handleContactClick(e, lead, 'whatsapp')}
                          className="p-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors border border-green-200 shadow-sm"
                          title="WhatsApp"
                        >
                          <FaWhatsapp size={14} />
                        </button>
                        <button 
                          onClick={() => setLogModalLead(lead)}
                          className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors border border-indigo-200 shadow-sm"
                          title="Add Follow-up"
                        >
                          <MessageSquarePlus size={14} />
                        </button>
                        <Link 
                          to={`/leads/${lead._id}`}
                          className="p-1.5 bg-slate-50 text-slate-600 rounded-md hover:bg-slate-100 transition-colors border border-slate-200 shadow-sm"
                          title="Edit Lead"
                        >
                          <MoreHorizontal size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leads List (Mobile Card View) */}
      <div className="md:hidden flex-1 space-y-3 mb-6">
        {filteredLeads.map((lead) => (
            <div key={lead._id} className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-start gap-2">
                <div className="flex flex-col min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">{lead.name}</h3>
                  <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-slate-700">{lead.mobile}</span>
                    <span className="text-slate-300">•</span>
                    <span className="truncate">{lead.city || 'No City'}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border
                    ${lead.status?.toLowerCase() === 'won' ? 'bg-green-50 text-green-700 border-green-200' : 
                      lead.status?.toLowerCase() === 'lost' ? 'bg-slate-100 text-slate-600 border-slate-200' : 
                      'bg-cyan-50 text-cyan-700 border-cyan-200'}`}>
                    <span className={`w-1 h-1 rounded-full ${lead.status?.toLowerCase() === 'won' ? 'bg-green-500' : lead.status?.toLowerCase() === 'lost' ? 'bg-slate-400' : 'bg-cyan-500'}`}></span>
                    {lead.status || 'Pending'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border 
                    ${lead.type?.toLowerCase() === 'hot' ? 'bg-red-50 text-red-600 border-red-200' :
                      lead.type?.toLowerCase() === 'warm' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                      'bg-blue-50 text-blue-600 border-blue-200'}`}>
                    {lead.type || 'Cold'}
                  </span>
                </div>
              </div>
              
              <div className="text-xs text-slate-500 bg-slate-50/80 border border-slate-100 p-2.5 rounded-lg line-clamp-2 leading-relaxed">
                {lead.callLogs && lead.callLogs.length > 0 
                  ? lead.callLogs[lead.callLogs.length - 1].note 
                  : <span className="italic text-slate-400">No notes recorded yet.</span>}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-1">
                <button 
                  onClick={() => setViewLogsLead(lead)} 
                  className="text-[11px] uppercase tracking-wider font-bold text-cyan-600 flex items-center gap-1.5"
                >
                  <FileText size={14} />
                  Logs ({lead.callLogs ? lead.callLogs.length : 0})
                </button>
                <div className="flex gap-2 flex-wrap justify-end">
                  <button onClick={(e) => {
                    e.preventDefault();
                    const query = encodeURIComponent(`${lead.name} ${lead.mobile || ''}`);
                    window.open(`https://www.google.com/search?q=${query}`, '_blank');
                  }} className="p-2 bg-cyan-50 text-cyan-600 rounded-lg border border-cyan-200 shadow-sm" title="Google Search"><Search size={14} /></button>
                  <button onClick={(e) => handleContactClick(e, lead, 'call')} className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-200 shadow-sm"><FaPhoneAlt size={14} /></button>
                  <button onClick={() => handleDeleteLead(lead._id)} className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-200 shadow-sm" title="Delete Lead"><Trash2 size={16} /></button>
                  <button onClick={(e) => handleContactClick(e, lead, 'whatsapp')} className="p-2 bg-green-50 text-green-600 rounded-lg border border-green-200 shadow-sm"><FaWhatsapp size={16} /></button>
                  <button onClick={() => setLogModalLead(lead)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200 shadow-sm"><MessageSquarePlus size={16} /></button>
                  <Link to={`/leads/${lead._id}`} className="p-2 bg-slate-800 text-white rounded-lg shadow-sm"><MoreHorizontal size={16} /></Link>
                </div>
              </div>
            </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 h-full overflow-y-auto pb-10">
      <div className="flex justify-between items-end mb-2">
        <h1 className="text-2xl font-bold text-slate-800">Follow-ups</h1>
      </div>

      {overdue.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-red-500 mb-3 flex items-center gap-2">
            <AlertCircle size={18} /> Overdue ({overdue.length})
          </h2>
          {renderLeadsTable(overdue)}
        </section>
      )}

      <section>
        <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
          <Clock size={18} /> Due Today ({dueToday.length})
        </h2>
        {dueToday.length === 0 ? (
          <div className="p-6 mb-6 text-center text-slate-400 bg-white border border-border rounded-lg shadow-sm">
            No follow-ups scheduled for today.
          </div>
        ) : (
          renderLeadsTable(dueToday)
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Calendar size={18} /> Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <div className="p-6 mb-6 text-center text-slate-400 bg-white border border-border rounded-lg shadow-sm">
            No upcoming follow-ups.
          </div>
        ) : (
          renderLeadsTable(upcoming)
        )}
      </section>

      {completed.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-green-600 mb-3 flex items-center gap-2">
            <CheckCircle size={18} /> Recently Completed ({completed.length})
          </h2>
          {renderLeadsTable(completed)}
        </section>
      )}

      {/* View Logs Modal */}
      {viewLogsLead && (
        <ViewLogsModal 
          lead={viewLogsLead} 
          onClose={() => setViewLogsLead(null)} 
        />
      )}

      {/* Add Call Log Modal */}
      {logModalLead && (
        <AddCallLogModal 
          lead={logModalLead}
          onClose={() => setLogModalLead(null)}
          onSuccess={(updatedLead) => {
            setLogModalLead(null);
            if (updatedLead) {
              setLeads(prev => prev.map(l => l._id === updatedLead._id ? updatedLead : l));
            } else {
              fetchLeads();
            }
          }}
        />
      )}

      {/* Select Contact Modal */}
      {contactActionLead && (
        <SelectContactModal 
          lead={contactActionLead}
          actionType={contactActionType}
          onClose={() => {
            setContactActionLead(null);
            setContactActionType(null);
          }}
        />
      )}
    </div>
  );
}

export default FollowUps;
