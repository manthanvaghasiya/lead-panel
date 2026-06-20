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
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="glass-panel p-6 mb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-primary/20 transition-all duration-700"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <h1 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">Leads Management</h1>
            <p className="text-gray-400 mt-1 text-sm font-medium tracking-wide">Manage, track, and convert your leads</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} /> Add New Lead
          </button>
        </div>
        <div className="mt-6">
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="input-field pl-10"
              placeholder="Search name, mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="glass-panel overflow-hidden border-t border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider font-semibold">
                <th className="p-4 rounded-tl-xl">Name</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Location</th>
                <th className="p-4">Type</th>
                <th className="p-4">Source</th>
                <th className="p-4">Status</th>
                <th className="p-4">Added</th>
                <th className="p-4 text-right rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-gray-400">Loading leads...</td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-gray-500 font-medium">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Search size={32} className="text-gray-600 mb-2" />
                      No leads found matching your filters.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4">
                      <Link to={`/leads/${lead._id}`} className="font-semibold text-white group-hover:text-primary transition-colors">
                        {lead.name}
                      </Link>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-mono tracking-tight text-gray-300 flex items-center gap-2">
                        <Phone size={12} className="text-gray-500" /> {lead.mobile}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-300">
                        {extractCity(lead.address)}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`badge ${
                        lead.type === 'Hot' ? 'badge-hot' : 
                        lead.type === 'Warm' ? 'badge-warm' : 'badge-cold'
                      }`}>
                        {lead.type}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-400">{lead.source}</td>
                    <td className="p-4">
                      <span className={`status-badge ${
                        lead.status === 'Won' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                        lead.status === 'Lost' ? 'text-gray-400 border-gray-500/30 bg-gray-500/10' :
                        lead.status === 'Pending' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                        'text-indigo-400 border-indigo-500/30 bg-indigo-500/10'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-400 whitespace-nowrap">
                      {new Date(lead.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setViewLogsLead(lead)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <MoreHorizontal size={18} />
                      </button>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
          <div className="glass-panel w-full max-w-2xl border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h2 className="text-xl font-display font-semibold text-white">Add New Lead</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
          <div className="p-6 space-y-6">
          
          {/* AI Magic Fill Section */}
          <div className="relative rounded-xl p-4 overflow-hidden border border-purple-500/30 shadow-[0_0_30px_rgba(139,92,246,0.15)] group">
            {/* Glowing background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 z-0 pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[11px] uppercase tracking-widest text-purple-300 font-bold flex items-center gap-2">
                  <Sparkles size={14} className="text-purple-400 animate-pulse-glow" /> AI Magic Fill
                </label>
                
                {/* Image Upload Button */}
                <label className="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 transition-all flex items-center gap-2 text-xs font-medium text-purple-200">
                  <ImagePlus size={14} /> 
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
                <div className="relative inline-block mb-3 group/img">
                  <img src={imagePreview} alt="Preview" className="h-20 rounded-lg border border-purple-500/50 object-cover shadow-lg" />
                  <button 
                    type="button" 
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md transform scale-0 group-hover/img:scale-100 transition-transform"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <textarea 
                  rows="2"
                  className="input-field flex-1 text-sm bg-black/30 border-purple-500/30 focus:border-purple-500 focus:ring-purple-500/50"
                  placeholder="e.g. 'Rahul from Surat, 9988776655' or just upload a photo!"
                  value={magicText}
                  onChange={e => setMagicText(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={handleMagicFill}
                  disabled={extracting || (!magicText.trim() && !imageFile)}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:grayscale text-white rounded-xl px-6 py-2 text-sm font-semibold transition-all shadow-lg flex items-center justify-center shrink-0"
                >
                  {extracting ? (
                    <span className="flex items-center gap-2"><Sparkles size={14} className="animate-spin" /> Extracting...</span>
                  ) : '✨ Fill Form'}
                </button>
              </div>
            </div>
          </div>

          <div className="relative py-1 my-4">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
             <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className="bg-black px-3 py-1 rounded-full text-purple-400 border border-purple-500/30">Review & Edit Data</span></div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Name</label>
              <input required type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Mobile</label>
              <input required type="text" className="input-field" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Address</label>
            <input type="text" className="input-field" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="e.g. Surat, Gujarat" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Type</label>
              <select className="input-field bg-slate-900" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="Hot">Hot</option>
                <option value="Warm">Warm</option>
                <option value="Cold">Cold</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Source</label>
              <select className="input-field bg-slate-900" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})}>
                <option value="Website">Website</option>
                <option value="CRM">CRM</option>
                <option value="Website+CRM">Website+CRM</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Initial Status</label>
            <select className="input-field bg-slate-900" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
              <option value="Pending">Pending</option>
              <option value="In Process">In Process</option>
              <option value="Send Detail">Send Detail</option>
              <option value="Follow-up Letter">Follow-up Letter</option>
              <option value="Contacted">Contacted</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </select>
          </div>
          <div className="mt-4 flex gap-3 justify-end pt-4 border-t border-white/10">
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

function Calendar(props) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;
}

function ViewLogsModal({ lead, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-border bg-slate-800/50">
          <div>
            <h3 className="font-medium text-lg text-white">Follow-up Logs</h3>
            <p className="text-xs text-cyan-400 mt-1">{lead.name} • {lead.mobile}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1">
          {(!lead.callLogs || lead.callLogs.length === 0) ? (
            <div className="text-center text-gray-500 py-8">
              No follow-ups recorded yet.
            </div>
          ) : (
            <div className="relative border-l border-slate-700 ml-3 space-y-6">
              {lead.callLogs.map((log, idx) => (
                <div key={idx} className="relative pl-6">
                  {/* Timeline dot */}
                  <div className="absolute w-3 h-3 bg-cyan-500 rounded-full -left-[6.5px] top-1.5 shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                  
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xs text-gray-400 font-medium bg-slate-900 px-2 py-1 rounded">
                        {new Date(log.date).toLocaleString()}
                      </div>
                      <div className="flex gap-2">
                        {log.typeAtTime && <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${log.typeAtTime.toLowerCase() === 'hot' ? 'bg-red-500/20 text-red-400' : log.typeAtTime.toLowerCase() === 'warm' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>{log.typeAtTime}</span>}
                        {log.statusAtTime && <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-gray-300">{log.statusAtTime}</span>}
                      </div>
                    </div>
                    <p className="text-sm text-gray-200 mt-2 whitespace-pre-wrap leading-relaxed">
                      {log.note}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-border bg-slate-800/30 flex justify-end">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}

export default LeadsList;
