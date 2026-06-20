import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Filter, MoreHorizontal, Phone, X, FileText, Sparkles, ImagePlus } from 'lucide-react';
import { getLeads, createLead, extractLeadFromText } from '../api/apiClient';

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

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(search.toLowerCase()) || 
    lead.mobile.includes(search)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:w-72 md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-500" />
          </div>
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search name, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="btn-secondary flex items-center gap-2 flex-1 sm:flex-none justify-center">
            <Filter size={18} />
            <span>Filter</span>
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary flex items-center gap-2 flex-1 sm:flex-none justify-center"
          >
            <Plus size={18} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="card flex-1 overflow-hidden flex flex-col p-0">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold w-[280px]">Lead Profile</th>
                <th className="px-4 py-3 font-semibold w-[180px]">Contact Info</th>
                <th className="px-4 py-3 font-semibold w-[100px]">Type</th>
                <th className="px-4 py-3 font-semibold w-[140px]">Status</th>
                <th className="px-4 py-3 font-semibold min-w-[200px]">Latest Activity</th>
                <th className="px-4 py-3 font-semibold w-[100px] text-right">Actions</th>
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
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">{lead.mobile}</span>
                        <span 
                          className="text-xs text-cyan-600 cursor-pointer hover:underline truncate max-w-[150px]"
                          onClick={() => alert(`Full Address:\n${lead.address || 'No address provided'}`)}
                          title={lead.address || 'No address'}
                        >
                          {extractCity(lead.address)}
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
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a 
                          href={`https://wa.me/91${lead.mobile}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors border border-green-200 shadow-sm"
                          title="WhatsApp"
                        >
                          <Phone size={14} />
                        </a>
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

      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <AddLeadModal 
          onClose={() => setIsAddModalOpen(false)} 
          onSuccess={() => {
            setIsAddModalOpen(false);
            fetchLeads();
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
    </div>
  );
}

function AddLeadModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '', mobile: '', address: '', source: 'Website', type: 'Cold', status: 'Pending'
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

      const { data } = await extractLeadFromText(magicText, imageBase64, mimeType);
      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        mobile: data.mobile || prev.mobile,
        address: data.address || prev.address,
        type: ['Hot', 'Warm', 'Cold'].includes(data.type) ? data.type : prev.type,
        source: ['Website', 'CRM', 'Website+CRM', 'Other'].includes(data.source) ? data.source : prev.source,
        status: ['Pending', 'In Process', 'Send Detail', 'Follow-up Letter', 'Contacted'].includes(data.status) ? data.status : prev.status
      }));
      setMagicText('');
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error(err);
      alert('Failed to extract data. Make sure AI is configured properly.');
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createLead(formData);
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Error creating lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-border bg-white/50">
          <h3 className="font-medium text-lg">Add New Lead</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          
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
                placeholder="e.g. 'Rahul from Surat, 9988776655' or just upload a photo!"
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
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Name</label>
              <input required type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Mobile</label>
              <input required type="text" className="input-field" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Address</label>
            <input type="text" className="input-field" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="e.g. Surat, Gujarat" />
          </div>
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
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Source</label>
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

function ViewLogsModal({ lead, onClose }) {
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
