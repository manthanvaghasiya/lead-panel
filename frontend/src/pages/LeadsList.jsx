import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getLeads, createLead, extractLeadFromText, addCallLog, extractLogFromText, deleteLead } from '../api/apiClient';
import { useScrollRestore } from '../hooks/useScrollRestore';
import { extractMobileNumbers, defaultWhatsappMessage } from '../utils/contactUtils';
import SelectContactModal from '../components/Modals/SelectContactModal';
import { Search, Plus, Filter, MoreHorizontal, FileText, MessageSquarePlus, X, Sparkles, ImagePlus, ChevronDown, RotateCcw, Trash2 } from 'lucide-react';
import { FaWhatsapp, FaPhoneAlt } from 'react-icons/fa';

const extractCity = (address) => {
  if (!address) return '-';
  const parts = address.split(/[,|]/);
  return parts[0].trim().substring(0, 20) + (parts[0].length > 20 ? '...' : '');
};

function LeadsList() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewLogsLead, setViewLogsLead] = useState(null);
  const [logModalLead, setLogModalLead] = useState(null);
  const [contactActionLead, setContactActionLead] = useState(null);
  const [contactActionType, setContactActionType] = useState(null);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    type: searchParams.get('type') || '',
    businessType: '',
    city: '',
    source: ''
  });

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(!!searchParams.get('status') || !!searchParams.get('type'));

  useScrollRestore('leads-desktop-scroll', loading);
  useScrollRestore('leads-mobile-scroll', loading);

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

  // Extract unique values dynamically for filters
  const uniqueStatuses = [...new Set(leads.map(lead => lead.status).filter(Boolean))].sort();
  const uniqueTypes = ['Hot', 'Warm', 'Cold'];
  const uniqueBusinessTypes = [...new Set(leads.map(lead => lead.businessType).filter(Boolean))].sort();
  const uniqueCities = [...new Set(leads.map(lead => lead.city).filter(Boolean))].sort();
  const uniqueSources = [...new Set(leads.map(lead => lead.source).filter(Boolean))].sort();

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const filteredLeads = leads.filter(lead => {
    // 1. Search Query
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchLower) || 
      (lead.mobile || '').includes(search) ||
      (lead.city || '').toLowerCase().includes(searchLower) ||
      (lead.businessType || '').toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    // 2. Status Filter
    if (!filters.status) {
      if (lead.status === 'Lost' || lead.status === 'Permanently Lost' || lead.status === 'Won') return false;
    } else {
      if (lead.status !== filters.status) return false;
    }

    // 3. Lead Type Filter
    if (filters.type && lead.type !== filters.type) return false;

    // 4. Business Type Filter
    if (filters.businessType && lead.businessType !== filters.businessType) return false;

    // 5. City Filter
    if (filters.city && lead.city !== filters.city) return false;

    // 6. Source Filter
    if (filters.source && lead.source !== filters.source) return false;

    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Ultra-compact Header Actions */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[150px]">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400" />
          </div>
          <input
            type="text"
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all shadow-sm"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <button 
          onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg border transition-all duration-200 shadow-sm whitespace-nowrap
            ${isFilterPanelOpen || activeFilterCount > 0 
              ? 'bg-cyan-50 border-cyan-300 text-cyan-700 hover:bg-cyan-100' 
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
        >
          <Filter size={14} />
          <span className="hidden sm:inline">Filter</span>
          {activeFilterCount > 0 && (
            <span className="bg-cyan-600 text-white rounded-full text-[10px] px-1.5 py-0.5 leading-none font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-slate-800 transition-colors whitespace-nowrap"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>

      {/* Expandable Filter Panel */}
      <div 
        className={`transition-all duration-300 ease-in-out bg-white rounded-xl shadow-sm border border-slate-200 mb-4 overflow-hidden
          ${isFilterPanelOpen ? 'max-h-[500px] p-3 opacity-100 visible' : 'max-h-0 p-0 opacity-0 invisible border-none'}`}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
            <Filter size={14} className="text-cyan-600" />
            Filters
          </h4>
          {activeFilterCount > 0 && (
            <button 
              onClick={() => setFilters({ status: '', type: '', businessType: '', city: '', source: '' })}
              className="text-xs font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-md hover:bg-rose-100 transition-colors"
            >
              Reset All
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          <select 
            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-700"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Status: All</option>
            {uniqueStatuses.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
          
          <select 
            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-700"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="">Type: All</option>
            {uniqueTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>

          <select 
            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-700"
            value={filters.businessType}
            onChange={(e) => setFilters({ ...filters, businessType: e.target.value })}
          >
            <option value="">Business: All</option>
            {uniqueBusinessTypes.map(bType => <option key={bType} value={bType}>{bType}</option>)}
          </select>

          <select 
            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-700"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          >
            <option value="">City: All</option>
            {uniqueCities.map(city => <option key={city} value={city}>{city}</option>)}
          </select>

          <select 
            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-700"
            value={filters.source}
            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
          >
            <option value="">Ask For: All</option>
            {uniqueSources.map(src => <option key={src} value={src}>{src}</option>)}
          </select>
        </div>
      </div>



      {/* Leads Table (Desktop) */}
      <div className="hidden md:flex flex-1 flex-col -mx-4 sm:mx-0 overflow-hidden">
        <div id="leads-desktop-scroll" className="overflow-y-auto overflow-x-hidden flex-1 bg-white sm:rounded-xl sm:border sm:border-slate-200 shadow-sm">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-slate-50 text-xs uppercase tracking-wider text-slate-500 shadow-sm">
                <th className="px-4 py-4 font-semibold w-[22%]">Lead Profile</th>
                <th className="px-4 py-4 font-semibold w-[14%]">Contact Info</th>
                <th className="px-4 py-4 font-semibold w-[10%]">Type</th>
                <th className="px-4 py-4 font-semibold w-[12%]">Status</th>
                <th className="px-4 py-4 font-semibold w-[32%]">Latest Activity</th>
                <th className="px-4 py-4 font-semibold w-[10%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-500 font-medium">Loading leads...</td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-500 font-medium">No leads found. Add one!</td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leads List (Mobile Card View) */}
      <div id="leads-mobile-scroll" className="md:hidden flex-1 overflow-y-auto pb-20 space-y-3 -mx-2">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium">Loading leads...</div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium">No leads found. Add one!</div>
        ) : (
          filteredLeads.map((lead) => (
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
                <div className="flex gap-2">
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
          ))
        )}
      </div>

      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <AddLeadModal 
          onClose={() => setIsAddModalOpen(false)} 
          onSuccess={(newLead) => {
            setIsAddModalOpen(false);
            if (newLead) {
              setLeads(prev => [newLead, ...prev]);
            } else {
              fetchLeads();
            }
          }}
        />
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

function AddLeadModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '', ownerName: '', mobile: '', address: '', mapsUrl: '', website: '', city: '', businessType: '', source: 'Website', type: 'Cold', status: 'Pending',
    socials: { instagram: '', facebook: '', youtube: '', linkedin: '' }
  });
  const [loading, setLoading] = useState(false);
  const [magicText, setMagicText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  const handleMagicFill = async () => {
    if (!magicText.trim() && !imageFile) return;
    setExtracting(true);
    try {
      let imageBase64 = null;
      let mimeType = null;
      if (imageFile && imagePreview) {
        imageBase64 = imagePreview.split(',')[1];
        mimeType = imageFile.type;
      }

      const { data } = await extractLeadFromText(magicText, imageBase64, mimeType);
      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        ownerName: data.ownerName || prev.ownerName,
        mobile: data.mobile || prev.mobile,
        address: data.address || prev.address,
        mapsUrl: data.mapsUrl || prev.mapsUrl,
        website: data.website || prev.website,
        city: data.city || prev.city,
        businessType: data.businessType || prev.businessType,
        type: ['Hot', 'Warm', 'Cold'].includes(data.type) ? data.type : prev.type,
        source: ['Website', 'CRM', 'Website+CRM', 'Other'].includes(data.source) ? data.source : prev.source,
        status: ['Pending', 'In Process', 'Send Detail', 'Follow-up Letter', 'Contacted'].includes(data.status) ? data.status : prev.status,
        socials: {
          instagram: data.socials?.instagram || prev.socials?.instagram || '',
          facebook: data.socials?.facebook || prev.socials?.facebook || '',
          youtube: data.socials?.youtube || prev.socials?.youtube || '',
          linkedin: data.socials?.linkedin || prev.socials?.linkedin || ''
        }
      }));
      setMagicText('');
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to extract data. Make sure AI is configured properly.');
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await createLead(formData);
      onSuccess(data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error creating lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-border bg-white/50 shrink-0">
          <h3 className="font-medium text-lg">Add New Lead</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          
          {/* AI Magic Fill Section */}
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs uppercase tracking-wider text-purple-700 font-bold flex items-center gap-1">
                <Sparkles size={14}/> AI Magic Fill
              </label>
              
              {/* Image Upload Button */}
              <label className="cursor-pointer text-purple-600 hover:text-purple-800 transition-colors flex items-center gap-1 text-xs font-semibold">
                <ImagePlus size={16} /> 
                <span>Upload Photo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageChange}
                />
              </label>
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="relative inline-block mb-2">
                <img src={imagePreview} alt="Preview" className="h-16 rounded border border-purple-500/30 object-cover" />
                <button 
                  type="button" 
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-md"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <textarea 
                rows="2"
                className="input-field text-sm resize-none flex-1"
                placeholder="Paste an image (Ctrl+V) or type info..."
                value={magicText}
                onChange={e => setMagicText(e.target.value)}
              />
              <button 
                type="button"
                onClick={handleMagicFill}
                disabled={extracting || (!magicText.trim() && !imageFile)}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center shrink-0"
              >
                {extracting ? 'Extracting...' : '✨ Fill Form'}
              </button>
            </div>
          </div>

          <div className="relative py-1">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
             <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-slate-400 uppercase tracking-wider">Review & Edit</span></div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Business Name</label>
              <input required type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Mobile</label>
              <input required type="text" className="input-field" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
            </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Owner / Contact Name</label>
              <input type="text" className="input-field" value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} placeholder="e.g. Sandeep Bhai" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Business Type</label>
                <input type="text" className="input-field" value={formData.businessType} onChange={e => setFormData({...formData, businessType: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">City</label>
                <input type="text" className="input-field" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="e.g. Surat" />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Full Address</label>
              <input type="text" className="input-field" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="e.g. 123 Main G.T Road" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Google Maps URL</label>
              <input type="text" className="input-field" value={formData.mapsUrl} onChange={e => setFormData({...formData, mapsUrl: e.target.value})} placeholder="e.g. https://google.com/maps/..." />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Website Link</label>
              <input type="text" className="input-field" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} placeholder="e.g. https://example.com" />
            </div>

            <details className="group border border-slate-200 rounded-lg bg-slate-50 open:bg-white transition-colors">
              <summary className="flex items-center justify-between cursor-pointer p-3 font-medium text-slate-700 select-none">
                <span className="flex items-center gap-2 text-sm"><Sparkles size={16} className="text-purple-500" /> Social Media Links (Optional)</span>
                <ChevronDown size={18} className="text-slate-400 group-open:-rotate-180 transition-transform duration-200" />
              </summary>
              <div className="p-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Instagram</label>
                  <input type="text" className="input-field" value={formData.socials.instagram} onChange={e => setFormData({...formData, socials: {...formData.socials, instagram: e.target.value}})} placeholder="URL or handle" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Facebook</label>
                  <input type="text" className="input-field" value={formData.socials.facebook} onChange={e => setFormData({...formData, socials: {...formData.socials, facebook: e.target.value}})} placeholder="URL or handle" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">LinkedIn</label>
                  <input type="text" className="input-field" value={formData.socials.linkedin} onChange={e => setFormData({...formData, socials: {...formData.socials, linkedin: e.target.value}})} placeholder="URL or handle" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">YouTube</label>
                  <input type="text" className="input-field" value={formData.socials.youtube} onChange={e => setFormData({...formData, socials: {...formData.socials, youtube: e.target.value}})} placeholder="URL or channel" />
                </div>
              </div>
            </details>

            <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Type</label>
              <select className="input-field" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="Hot">Hot</option>
                <option value="Warm">Warm</option>
                <option value="Cold">Cold</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Ask For</label>
              <select className="input-field" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})}>
                <option value="Website">Website</option>
                <option value="CRM">CRM</option>
                <option value="Website+CRM">Website+CRM</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Initial Status</label>
            <select className="input-field" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
              <option value="Pending">Pending</option>
              <option value="In Process">In Process</option>
              <option value="Send Detail">Send Detail</option>
              <option value="Follow-up Letter">Follow-up Letter</option>
              <option value="Contacted">Contacted</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
              <option value="Permanently Lost">Permanently Lost</option>
            </select>
          </div>
          <div className="mt-4 flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary min-w-[100px]">
              {loading ? 'Saving...' : 'Save Lead'}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}

// Simple Calendar icon for the list since it's not imported at top
function Calendar(props) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;
}

export function ViewLogsModal({ lead, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-border bg-white/50">
          <div>
            <h3 className="font-medium text-lg text-slate-900">Follow-up Logs</h3>
            <p className="text-xs text-cyan-400 mt-1">{lead.name} • {lead.mobile}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1">
          {(!lead.callLogs || lead.callLogs.length === 0) ? (
            <div className="text-center text-slate-400 py-8">
              No follow-ups recorded yet.
            </div>
          ) : (
            <div className="relative border-l border-slate-300 ml-3 space-y-6">
              {lead.callLogs.map((log, idx) => (
                <div key={idx} className="relative pl-6">
                  {/* Timeline dot */}
                  <div className="absolute w-3 h-3 bg-cyan-500 rounded-full -left-[6.5px] top-1.5 shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                  
                  <div className="bg-white/50 border border-slate-300 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xs text-slate-500 font-medium bg-slate-50 px-2 py-1 rounded">
                        {new Date(log.date).toLocaleString()}
                      </div>
                      <div className="flex gap-2">
                        {log.typeAtTime && <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${log.typeAtTime.toLowerCase() === 'hot' ? 'bg-red-500/20 text-red-400' : log.typeAtTime.toLowerCase() === 'warm' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>{log.typeAtTime}</span>}
                        {log.statusAtTime && <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{log.statusAtTime}</span>}
                      </div>
                    </div>
                    <p className="text-sm text-slate-800 mt-2 whitespace-pre-wrap leading-relaxed">
                      {log.note}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-border bg-white/30 flex justify-end">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}

export default LeadsList;

export function AddCallLogModal({ lead, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    note: '',
    typeAtTime: lead.type || 'Cold',
    statusAtTime: lead.status || 'Pending',
    nextFollowup: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [magicText, setMagicText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleMagicFill = async () => {
    if (!magicText.trim() && !imageFile) return;
    setExtracting(true);
    try {
      let imageBase64 = null;
      let mimeType = null;
      if (imageFile && imagePreview) {
        imageBase64 = imagePreview.split(',')[1];
        mimeType = imageFile.type;
      }

      const { data } = await extractLogFromText(magicText, imageBase64, mimeType);
      
      setFormData(prev => ({
        ...prev,
        note: data.note || prev.note,
        typeAtTime: ['Hot', 'Warm', 'Cold'].includes(data.typeAtTime) ? data.typeAtTime : prev.typeAtTime,
        statusAtTime: ['Pending', 'In Process', 'Send Detail', 'Follow-up Letter', 'Contacted', 'Won', 'Lost'].includes(data.statusAtTime) ? data.statusAtTime : prev.statusAtTime,
        nextFollowup: data.nextFollowup ? data.nextFollowup : prev.nextFollowup
      }));
      setMagicText('');
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to extract data. Make sure AI is configured properly.');
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.note.trim()) return;
    setLoading(true);
    try {
      const { data } = await addCallLog(lead._id, formData);
      onSuccess(data);
    } catch (err) {
      console.error(err);
      alert('Error saving log');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800">Add Follow-up</h3>
            <p className="text-[11px] text-slate-500 font-medium">for {lead.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {/* AI Magic Fill Section */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs uppercase tracking-wider text-indigo-700 font-bold flex items-center gap-1">
                <Sparkles size={14}/> AI Call Logger
              </label>
              
              <label className="cursor-pointer text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 text-xs font-semibold">
                <ImagePlus size={16} /> 
                <span>Upload Note</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>

            {imagePreview && (
              <div className="relative inline-block mb-2">
                <img src={imagePreview} alt="Preview" className="h-16 rounded border border-indigo-200 object-cover" />
                <button 
                  type="button" 
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-md"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <textarea 
                rows="2"
                className="w-full border border-indigo-200 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none flex-1 bg-white placeholder:text-indigo-300"
                placeholder="Dictate your notes e.g. 'Client is hot, send details...'"
                value={magicText}
                onChange={e => setMagicText(e.target.value)}
              />
              <button 
                type="button"
                onClick={handleMagicFill}
                disabled={extracting || (!magicText.trim() && !imageFile)}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-3 py-2 text-sm font-semibold transition-colors flex items-center justify-center shrink-0"
              >
                {extracting ? 'Processing...' : '✨ Auto-Fill'}
              </button>
            </div>
          </div>

          <form id="callLogForm" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Notes</label>
              <textarea 
                required
                rows={3} 
                className="w-full border border-slate-200 rounded-md p-2 text-sm focus:border-primary focus:outline-none resize-none" 
                placeholder="What did you discuss?"
                value={formData.note}
                onChange={e => {
                  const val = e.target.value;
                  const updates = { note: val };
                  if (val.toLowerCase().includes('lost') || val.toLowerCase().includes('close')) {
                    updates.statusAtTime = 'Lost';
                    updates.nextFollowup = '';
                  }
                  setFormData({...formData, ...updates});
                }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Update Type</label>
                <select className="w-full border border-slate-200 rounded-md p-2 text-sm bg-white focus:border-primary focus:outline-none" value={formData.typeAtTime} onChange={e => {
                  const val = e.target.value;
                  const updates = { typeAtTime: val };
                  if (val === 'Lost' && !formData.note.trim()) {
                    updates.note = 'Lost - Future needs / Not interested';
                  }
                  setFormData({...formData, ...updates});
                }}>
                  <option value="Hot">Hot</option>
                  <option value="Warm">Warm</option>
                  <option value="Cold">Cold</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Update Status</label>
                <select 
                  className="w-full border border-slate-200 rounded-md p-2 text-sm bg-white focus:border-primary focus:outline-none" 
                  value={formData.statusAtTime}
                  onChange={e => {
                    const val = e.target.value;
                    const updates = { statusAtTime: val };
                    if ((val === 'Lost' || val === 'Permanently Lost') && !formData.note.trim()) {
                      updates.note = 'Lost - Future needs / Not interested';
                    }
                    setFormData({...formData, ...updates});
                  }}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Process">In Process</option>
                  <option value="Send Detail">Send Detail</option>
                  <option value="Follow-up Letter">Follow-up Letter</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                  <option value="Permanently Lost">Permanently Lost</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Set Next Follow-up</label>
              <input 
                type="date" 
                className="w-full border border-slate-200 rounded-md p-2 text-sm bg-white focus:border-primary focus:outline-none" 
                value={formData.nextFollowup}
                onChange={e => setFormData({...formData, nextFollowup: e.target.value})}
              />
            </div>
          </form>
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end mt-auto">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors">Cancel</button>
          <button type="submit" form="callLogForm" disabled={loading} className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium text-sm transition-colors min-w-[100px]">
            {loading ? 'Saving...' : 'Save Log'}
          </button>
        </div>
      </div>
    </div>
  );
}
