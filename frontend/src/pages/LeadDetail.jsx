import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Calendar, Clock, MapPin, Briefcase, Activity, Sparkles, BrainCircuit, MessageSquare, Target, Globe, Tags, X, Edit, ImagePlus } from 'lucide-react';
import { getLead, addCallLog, updateLead, getLeadAiInsight, extractLeadFromText } from '../api/apiClient';

function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  
  // Call Log Form
  const [note, setNote] = useState('');
  const [typeAtTime, setTypeAtTime] = useState('');
  const [statusAtTime, setStatusAtTime] = useState('');
  const [nextFollowup, setNextFollowup] = useState('');
  const [savingLog, setSavingLog] = useState(false);

  // Tags State
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = async (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!lead.tags?.includes(newTag)) {
        const updatedTags = [...(lead.tags || []), newTag];
        try {
          const { data } = await updateLead(id, { tags: updatedTags });
          setLead(data);
          setTagInput('');
        } catch (err) {
          console.error(err);
          alert('Failed to add tag');
        }
      } else {
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = async (tagToRemove) => {
    const updatedTags = lead.tags.filter(t => t !== tagToRemove);
    try {
      const { data } = await updateLead(id, { tags: updatedTags });
      setLead(data);
    } catch (err) {
      console.error(err);
      alert('Failed to remove tag');
    }
  };

  // AI Insight State
  const [aiInsight, setAiInsight] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const generateAiInsight = async () => {
    setLoadingAi(true);
    try {
      const { data } = await getLeadAiInsight(id);
      setAiInsight(data);
    } catch (err) {
      console.error(err);
      alert('Failed to generate AI Insight. Make sure your API key is valid.');
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    fetchLead();
  }, [id]);

  const fetchLead = async () => {
    try {
      const { data } = await getLead(id);
      setLead(data);
      setTypeAtTime(data.type || 'Cold');
      setStatusAtTime(data.status || 'Pending');
      
      if (data.followupDate) {
        const d = new Date(data.followupDate);
        setNextFollowup(d.toISOString().split('T')[0]);
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setNextFollowup(tomorrow.toISOString().split('T')[0]);
      }
    } catch (err) {
      console.error(err);
      navigate('/leads');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSavingLog(true);
    
    try {
      const payload = {
        note,
        typeAtTime,
        statusAtTime,
        nextFollowup: nextFollowup ? new Date(nextFollowup) : null
      };
      const { data } = await addCallLog(id, payload);
      setLead(data);
      setNote(''); 
    } catch (err) {
      console.error(err);
      alert('Error saving log');
    } finally {
      setSavingLog(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500 font-medium">Loading Enterprise Profile...</div>;
  if (!lead) return null;

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-12">
      
      {/* 1. HERO HEADER */}
      <div className="bg-white border border-border rounded-xl shadow-sm p-6 flex flex-col md:flex-row gap-6 items-start md:items-center relative overflow-hidden">
        {/* Subtle Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none"></div>

        <button onClick={() => navigate('/leads')} className="p-2 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-100 hover:text-slate-800 transition-colors shrink-0 z-10">
          <ArrowLeft size={20} />
        </button>

        <div className="flex items-center gap-5 flex-1 z-10">
          <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 text-primary flex items-center justify-center text-2xl font-bold shadow-sm shrink-0">
            {lead.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{lead.name}</h1>
            <div className="flex items-center gap-3 mt-1.5 text-sm font-medium text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Briefcase size={14} className="text-slate-400" />
                {lead.businessType || 'No Business Type'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <MapPin size={14} className="text-slate-400" />
                {lead.city || 'No Location'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto z-10 border-t border-slate-100 pt-4 md:pt-0 md:border-none">
          <button 
            onClick={() => setIsUpdateModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg font-medium shadow-sm hover:bg-slate-900 transition-colors"
          >
            <Edit size={16} />
            <span>Edit Profile</span>
          </button>
          <a 
            href={`https://wa.me/91${lead.mobile}`} 
            target="_blank" 
            rel="noreferrer"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-lg font-medium shadow-sm hover:bg-[#128C7E] transition-colors"
          >
            <MessageSquare size={16} />
            <span>WhatsApp</span>
          </a>
          <a 
            href={`tel:${lead.mobile}`} 
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Phone size={16} />
            <span>Call</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: 360 Data & Logging */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Intelligence Panel */}
          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">Lead Intelligence</h3>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border
                ${lead.status?.toLowerCase() === 'won' ? 'bg-green-50 text-green-700 border-green-200' : 
                  lead.status?.toLowerCase() === 'lost' ? 'bg-slate-100 text-slate-600 border-slate-200' : 
                  'bg-cyan-50 text-cyan-700 border-cyan-200'}`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${lead.status?.toLowerCase() === 'won' ? 'bg-green-500' : lead.status?.toLowerCase() === 'lost' ? 'bg-slate-400' : 'bg-cyan-500 animate-pulse'}`}></span>
                <span>{lead.status || 'Pending'}</span>
              </span>
            </div>
            <div className="p-5 flex flex-col gap-5">
              
              {/* Core Contact */}
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    <Phone size={14} className="text-slate-500" />
                  </div>
                  <div className="flex flex-col pt-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Mobile Number</span>
                    <span className="font-medium text-slate-900">{lead.mobile}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    <MapPin size={14} className="text-slate-500" />
                  </div>
                  <div className="flex flex-col pt-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Full Address</span>
                    <span className="font-medium text-slate-900 leading-relaxed">{lead.address || 'No address provided'}</span>
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* CRM Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lead Type</span>
                  <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-bold border w-max
                    ${lead.type?.toLowerCase() === 'hot' ? 'bg-red-50 text-red-600 border-red-200' :
                      lead.type?.toLowerCase() === 'warm' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                      'bg-blue-50 text-blue-600 border-blue-200'}`}>
                    {lead.type || 'Cold'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Source</span>
                  <span className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                    <Globe size={12} className="text-slate-400" />
                    {lead.source}
                  </span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-2 pt-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Tags size={12}/> Tags</span>
                <div className="flex flex-wrap gap-2 items-center">
                  {lead.tags && lead.tags.map((tag, i) => (
                    <span key={i} className="flex items-center gap-1 px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-md text-xs font-bold text-indigo-700 group transition-colors hover:bg-indigo-100">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="text-indigo-400 hover:text-indigo-700 opacity-50 group-hover:opacity-100 transition-opacity" title="Remove tag">
                        <X size={12} strokeWidth={3} />
                      </button>
                    </span>
                  ))}
                  <input 
                    type="text" 
                    placeholder="Type & press Enter..." 
                    className="text-xs font-medium border border-dashed border-slate-300 rounded-md px-2.5 py-1 w-32 focus:w-40 focus:outline-none focus:border-primary focus:bg-white bg-slate-50 transition-all text-slate-700 placeholder:text-slate-400 placeholder:font-normal"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                  />
                </div>
              </div>

              {/* Next Followup Highlight */}
              {lead.followupDate && (
                <div className="mt-2 bg-orange-50 border border-orange-100 rounded-lg p-3 flex flex-col gap-1">
                  <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Next Follow-up</span>
                  <div className="flex items-center gap-2 text-orange-600 font-medium">
                    <Calendar size={14} />
                    {new Date(lead.followupDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Activity Logger */}
          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Activity size={16} className="text-primary" />
                Log Interaction
              </h3>
            </div>
            <div className="p-5">
              <form onSubmit={handleAddLog} className="flex flex-col gap-4">
                <div>
                  <textarea 
                    required
                    rows={3} 
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none bg-slate-50 focus:bg-white" 
                    placeholder="What did you discuss?"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Type</label>
                    <select className="w-full border border-slate-200 rounded-md p-2 text-sm bg-white focus:outline-none focus:border-primary" value={typeAtTime} onChange={e => setTypeAtTime(e.target.value)}>
                      <option value="Hot">Hot</option>
                      <option value="Warm">Warm</option>
                      <option value="Cold">Cold</option>
                      <option value="Won">Won</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</label>
                    <select 
                      className="w-full border border-slate-200 rounded-md p-2 text-sm bg-white focus:outline-none focus:border-primary" 
                      value={statusAtTime}
                      onChange={e => setStatusAtTime(e.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Process">In Process</option>
                      <option value="Send Detail">Send Detail</option>
                      <option value="Follow-up Letter">Follow-up Letter</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Won">Won</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Set Next Follow-up</label>
                  <input 
                    type="date" 
                    className="w-full border border-slate-200 rounded-md p-2 text-sm bg-white focus:outline-none focus:border-primary" 
                    value={nextFollowup}
                    onChange={e => setNextFollowup(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={savingLog} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium shadow-sm transition-colors mt-2 text-sm">
                  {savingLog ? 'Saving...' : 'Save Interaction'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI & Timeline */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* AI Insight Section */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl shadow-lg border border-indigo-500/20 overflow-hidden relative">
            {/* Background Orbs */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/20 blur-[80px] rounded-full pointer-events-none"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none"></div>

            <div className="p-5 border-b border-indigo-500/20 flex items-center justify-between relative z-10 bg-black/10">
              <h3 className="font-medium text-indigo-50 flex items-center gap-2">
                <BrainCircuit size={18} className="text-purple-400"/> 
                Lead AI Copilot
              </h3>
              <button 
                onClick={generateAiInsight}
                disabled={loadingAi}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm transition-all disabled:opacity-50"
              >
                <Sparkles size={14} className="text-cyan-300" />
                {loadingAi ? 'Analyzing Profile...' : 'Generate Insight'}
              </button>
            </div>

            {aiInsight ? (
              <div className="p-6 relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] uppercase tracking-widest text-purple-300 font-bold mb-2 flex items-center gap-1.5"><BrainCircuit size={12}/> Analysis Summary</h4>
                    <p className="text-sm text-indigo-50 leading-relaxed font-light">{aiInsight.summary}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold mb-2 flex items-center gap-1.5"><Target size={12}/> Recommended Action</h4>
                    <p className="text-sm text-indigo-50 font-medium bg-cyan-950/40 border border-cyan-500/20 p-3 rounded-lg">{aiInsight.nextAction}</p>
                  </div>
                </div>
                <div>
                  <div className="bg-black/40 border border-indigo-500/30 rounded-xl p-4 h-full relative group">
                    <h4 className="text-[10px] uppercase tracking-widest text-green-400 font-bold mb-3 flex items-center gap-1.5"><MessageSquare size={12}/> AI WhatsApp Draft</h4>
                    <p className="text-sm text-indigo-100 font-mono whitespace-pre-wrap leading-relaxed">{aiInsight.draftMessage}</p>
                    <button 
                      onClick={() => navigator.clipboard.writeText(aiInsight.draftMessage)}
                      className="absolute top-3 right-3 text-xs bg-white/10 hover:bg-white/20 border border-white/10 px-2 py-1 rounded text-white transition-all opacity-0 group-hover:opacity-100"
                    >
                      Copy Draft
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center relative z-10 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center mb-3 border border-indigo-500/30">
                  <Sparkles size={20} className="text-purple-300" />
                </div>
                <p className="text-sm text-indigo-200 max-w-sm font-light">Generate an AI insight to analyze the lead's history, predict their temperature, and instantly draft a personalized follow-up message.</p>
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="bg-white border border-border rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">Interaction Timeline</h3>
              <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded">
                {lead.callLogs ? lead.callLogs.length : 0} Records
              </span>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              {!lead.callLogs || lead.callLogs.length === 0 ? (
                <div className="text-center py-16 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                    <Clock size={24} className="text-slate-300" />
                  </div>
                  <h4 className="text-slate-700 font-medium mb-1">No interactions yet</h4>
                  <p className="text-sm text-slate-400 max-w-xs">Log a call, message, or note using the form on the left to start building the timeline.</p>
                </div>
              ) : (
                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-100">
                  {[...lead.callLogs].reverse().map((log, i) => (
                    <div key={log._id || i} className="relative flex items-start gap-4 group">
                      
                      {/* Timeline Node */}
                      <div className="relative z-10 w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
                        <MessageSquare size={14} />
                      </div>
                      
                      {/* Event Card */}
                      <div className="flex-1 bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow group-hover:border-slate-200">
                        {/* Meta Header */}
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock size={12} />
                            {new Date(log.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                          {log.typeAtTime && (
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold border 
                              ${log.typeAtTime.toLowerCase() === 'hot' ? 'bg-red-50 text-red-600 border-red-200' :
                                log.typeAtTime.toLowerCase() === 'warm' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                'bg-blue-50 text-blue-600 border-blue-200'}`}>
                              {log.typeAtTime}
                            </span>
                          )}
                        </div>
                        
                        {/* Note Content */}
                        <p className="text-slate-700 text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                          {log.note}
                        </p>
                        
                        {/* State Changes footer */}
                        {(log.statusAtTime || log.nextFollowup) && (
                          <div className="pt-3 border-t border-slate-50 flex flex-wrap gap-4">
                            {log.statusAtTime && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status Updated</span>
                                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{log.statusAtTime}</span>
                              </div>
                            )}
                            {log.nextFollowup && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Follow-up set</span>
                                <span className="text-xs font-semibold text-orange-600 flex items-center gap-1 bg-orange-50 px-1.5 py-0.5 rounded">
                                  <Calendar size={10} />
                                  {new Date(log.nextFollowup).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Update Lead Modal */}
      {isUpdateModalOpen && (
        <UpdateLeadModal 
          lead={lead}
          onClose={() => setIsUpdateModalOpen(false)}
          onSuccess={(updatedData) => {
            setLead(updatedData);
            setIsUpdateModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function UpdateLeadModal({ lead, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: lead.name || '', 
    mobile: lead.mobile || '', 
    address: lead.address || '', 
    businessType: lead.businessType || '',
    city: lead.city || '',
    source: lead.source || 'Website', 
    type: lead.type || 'Cold', 
    status: lead.status || 'Pending'
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
        city: data.city || prev.city,
        businessType: data.businessType || prev.businessType,
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
      const { data } = await updateLead(lead._id, formData);
      onSuccess(data);
    } catch (err) {
      console.error(err);
      alert('Error updating lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">Update Lead Profile</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          
          {/* AI Magic Fill Section */}
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs uppercase tracking-wider text-purple-700 font-bold flex items-center gap-1">
                <Sparkles size={14}/> AI Magic Fill
              </label>
              <label className="cursor-pointer text-purple-600 hover:text-purple-800 transition-colors flex items-center gap-1 text-xs font-semibold">
                <ImagePlus size={16} /> 
                <span>Upload Photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>

            {imagePreview && (
              <div className="relative inline-block mb-2">
                <img src={imagePreview} alt="Preview" className="h-16 rounded border border-purple-200 object-cover" />
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
                className="w-full border border-purple-200 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none flex-1 bg-white"
                placeholder="Paste updated text or upload a photo!"
                value={magicText}
                onChange={e => setMagicText(e.target.value)}
              />
              <button 
                type="button"
                onClick={handleMagicFill}
                disabled={extracting || (!magicText.trim() && !imageFile)}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg px-3 py-2 text-sm font-semibold transition-colors flex items-center justify-center shrink-0"
              >
                {extracting ? 'Extracting...' : '✨ Fill Form'}
              </button>
            </div>
          </div>

          <form id="updateForm" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Name</label>
                <input required type="text" className="w-full border border-slate-200 rounded-md p-2 text-sm focus:border-primary focus:outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Mobile</label>
                <input required type="text" className="w-full border border-slate-200 rounded-md p-2 text-sm focus:border-primary focus:outline-none" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Business Type</label>
                <input type="text" className="w-full border border-slate-200 rounded-md p-2 text-sm focus:border-primary focus:outline-none" value={formData.businessType} onChange={e => setFormData({...formData, businessType: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">City</label>
                <input type="text" className="w-full border border-slate-200 rounded-md p-2 text-sm focus:border-primary focus:outline-none" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Address</label>
              <input type="text" className="w-full border border-slate-200 rounded-md p-2 text-sm focus:border-primary focus:outline-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Type</label>
                <select className="w-full border border-slate-200 rounded-md p-2 text-sm bg-white focus:border-primary focus:outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="Hot">Hot</option>
                  <option value="Warm">Warm</option>
                  <option value="Cold">Cold</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Source</label>
                <select className="w-full border border-slate-200 rounded-md p-2 text-sm bg-white focus:border-primary focus:outline-none" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})}>
                  <option value="Website">Website</option>
                  <option value="CRM">CRM</option>
                  <option value="Website+CRM">Website+CRM</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Status</label>
              <select className="w-full border border-slate-200 rounded-md p-2 text-sm bg-white focus:border-primary focus:outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="Pending">Pending</option>
                <option value="In Process">In Process</option>
                <option value="Send Detail">Send Detail</option>
                <option value="Follow-up Letter">Follow-up Letter</option>
                <option value="Contacted">Contacted</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
          </form>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end mt-auto">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors">Cancel</button>
          <button type="submit" form="updateForm" disabled={loading} className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium text-sm transition-colors min-w-[100px]">
            {loading ? 'Saving...' : 'Save Updates'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LeadDetail;
