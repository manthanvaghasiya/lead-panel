import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getLeads, updateLead } from '../api/apiClient';
import { extractMobileNumbers, defaultWhatsappMessage } from '../utils/contactUtils';
import SelectContactModal from '../components/Modals/SelectContactModal';
import { Search, Plus, Filter, MoreHorizontal, FileText, MessageSquarePlus, X, Sparkles, ImagePlus, ChevronDown, RotateCcw, Trash2, LayoutGrid, Calendar } from 'lucide-react';
import { FaWhatsapp, FaPhoneAlt } from 'react-icons/fa';
import { AddCallLogModal, ViewLogsModal } from './LeadsList';

function Pipeline() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewLogsLead, setViewLogsLead] = useState(null);
  const [logModalLead, setLogModalLead] = useState(null);
  const [contactActionLead, setContactActionLead] = useState(null);
  const [contactActionType, setContactActionType] = useState(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data } = await getLeads();
      setLeads(data);
    } catch (err) {
      console.error('Error fetching leads:', err);
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

  const handleDropLead = async (leadId, newStatus) => {
    const leadToUpdate = leads.find(l => l._id === leadId);
    if (!leadToUpdate || leadToUpdate.status === newStatus) return;

    setLeads(prev => prev.map(l => l._id === leadId ? { ...l, status: newStatus } : l));
    try {
      await updateLead(leadId, { status: newStatus });
    } catch (err) {
      console.error('Failed to update lead status via drag and drop', err);
      fetchLeads();
    }
  };

  const filteredLeads = leads.filter(lead => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchLower) || 
      (lead.mobile || '').includes(search) ||
      (lead.city || '').toLowerCase().includes(searchLower) ||
      (lead.businessType || '').toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;
    
    // EXCLUDE Lost and Permanently Lost
    if (lead.status === 'Lost' || lead.status === 'Permanently Lost') return false;

    return true;
  });

  const boardStatuses = ['Pending', 'Contacted', 'Send Detail', 'Follow-up Letter', 'In Process', 'Won'];
  
  const [draggedLeadId, setDraggedLeadId] = useState(null);

  const handleDragStart = (e, leadId) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('leadId', leadId);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      const el = document.getElementById(`pipeline-card-${leadId}`);
      if (el) el.classList.add('opacity-50');
    }, 0);
  };

  const handleDragEnd = (e, leadId) => {
    setDraggedLeadId(null);
    const el = document.getElementById(`pipeline-card-${leadId}`);
    if (el) el.classList.remove('opacity-50');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-slate-100/80');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('bg-slate-100/80');
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-slate-100/80');
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) {
      handleDropLead(leadId, status);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400" />
          </div>
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all shadow-sm"
            placeholder="Search active leads in pipeline..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 custom-scrollbar">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium">Loading pipeline...</div>
        ) : (
          <div className="flex gap-4 h-full min-w-max pb-2">
            {boardStatuses.map(status => {
              const columnLeads = filteredLeads.filter(l => (l.status || 'Pending') === status);
              
              return (
                <div 
                  key={status}
                  className="w-[300px] flex flex-col bg-slate-50/50 rounded-xl border border-slate-200/60 overflow-hidden shadow-sm transition-colors duration-200"
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  <div className="p-3 border-b border-slate-200/60 bg-white/50 backdrop-blur-sm sticky top-0 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${status === 'Won' ? 'bg-green-500' : status === 'Pending' ? 'bg-cyan-500' : 'bg-blue-500'}`}></span>
                      {status}
                    </h3>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-full">
                      {columnLeads.length}
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                    {columnLeads.map(lead => (
                      <div 
                        key={lead._id}
                        id={`pipeline-card-${lead._id}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead._id)}
                        onDragEnd={(e) => handleDragEnd(e, lead._id)}
                        className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-cyan-300 hover:shadow-md transition-all group relative"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col min-w-0 pr-2">
                            <Link to={`/leads/${lead._id}`} className="font-bold text-sm text-slate-900 truncate hover:text-cyan-600 transition-colors">
                              {lead.name}
                            </Link>
                            <span className="text-xs font-medium text-slate-500 mt-0.5">{lead.mobile}</span>
                          </div>
                          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border 
                            ${lead.type?.toLowerCase() === 'hot' ? 'bg-red-50 text-red-600 border-red-200' :
                              lead.type?.toLowerCase() === 'warm' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                              'bg-blue-50 text-blue-600 border-blue-200'}`}>
                            {lead.type || 'Cold'}
                          </span>
                        </div>
                        
                        <div className="text-[11px] text-slate-500 bg-slate-50/80 p-2 rounded-md line-clamp-2 leading-relaxed border border-slate-100 mb-2">
                          {lead.callLogs && lead.callLogs.length > 0 
                            ? lead.callLogs[lead.callLogs.length - 1].note 
                            : <span className="italic text-slate-400">No notes.</span>}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          {lead.followupDate ? (
                            <span className="text-[10px] font-medium text-orange-600 flex items-center gap-1 bg-orange-50 px-1.5 py-0.5 rounded">
                              <Calendar size={10} className="mb-0.5" />
                              {new Date(lead.followupDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 truncate max-w-[80px]">{lead.city || 'No city'}</span>
                          )}
                          
                          <div className="flex items-center gap-1 opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => handleContactClick(e, lead, 'call')} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Call"><FaPhoneAlt size={10} /></button>
                            <button onClick={(e) => handleContactClick(e, lead, 'whatsapp')} className="p-1 text-green-600 hover:bg-green-50 rounded" title="WhatsApp"><FaWhatsapp size={12} /></button>
                            <button onClick={() => setLogModalLead(lead)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="Add Log"><MessageSquarePlus size={12} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {columnLeads.length === 0 && (
                      <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200/60 rounded-lg text-xs text-slate-400 font-medium bg-slate-50/30">
                        Drop leads here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {viewLogsLead && (
        <ViewLogsModal 
          lead={viewLogsLead} 
          onClose={() => setViewLogsLead(null)} 
        />
      )}

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

export default Pipeline;
