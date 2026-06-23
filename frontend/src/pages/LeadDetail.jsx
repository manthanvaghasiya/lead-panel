import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Calendar, Clock, MapPin, Briefcase, Activity, Sparkles, BrainCircuit, MessageSquare, Target, Globe, Tags, X, Edit, Trash2, ImagePlus, Star, Search } from 'lucide-react';
import { FaInstagram, FaFacebook, FaYoutube, FaLinkedin } from 'react-icons/fa';
import { getLead, addCallLog, updateCallLog, deleteCallLog, updateLead, getLeadAiInsight, extractLeadFromText, extractLogFromText, autoCleanLead, extractSocialProfiles, deleteLead } from '../api/apiClient';
import { useScrollRestore } from '../hooks/useScrollRestore';
import { extractMobileNumbers, defaultWhatsappMessage } from '../utils/contactUtils';
import SelectContactModal from '../components/Modals/SelectContactModal';

function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Call Log Form
  const [note, setNote] = useState('');
  const [logType, setLogType] = useState('Cold');
  const [logStatus, setLogStatus] = useState('Pending');
  const [nextFollowup, setNextFollowup] = useState('');
  const [editingLogId, setEditingLogId] = useState(null);

  // Advanced Log Filters
  const [logSearch, setLogSearch] = useState('');
  const [logFilterType, setLogFilterType] = useState('');
  const [logFilterStatus, setLogFilterStatus] = useState('');

  // AI Call Logger
  const [magicLogText, setMagicLogText] = useState('');
  const [extractingLog, setExtractingLog] = useState(false);
  const [logImageFile, setLogImageFile] = useState(null);
  const [logImagePreview, setLogImagePreview] = useState(null);
  const [savingLog, setSavingLog] = useState(false);
  const [extractingSocials, setExtractingSocials] = useState(false);

  // Tags State
  const [tagInput, setTagInput] = useState('');

  const [contactActionType, setContactActionType] = useState(null);

  useScrollRestore('main-scroll-container', loading);

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
    } catch (e) {
      console.error(e);
      const isRateLimit = e.response?.status === 429 || e.response?.data?.message?.includes('429') || e.response?.data?.message?.includes('quota');
      if (isRateLimit) {
        alert('Google API Rate Limit Reached! The free tier allows 15 requests per minute. Please wait 30 seconds and try again.');
      } else {
        alert('Failed to generate AI Insight. Make sure your API key is valid.');
      }
    } finally {
      setLoadingAi(false);
    }
  };

  const handleExtractSocials = async () => {
    try {
      setExtractingSocials(true);
      const res = await extractSocialProfiles(id);
      setLead(res.data);
    } catch (e) {
      console.error(e);
      const isRateLimit = e.response?.status === 429 || e.response?.data?.message?.includes('429') || e.response?.data?.message?.includes('quota');
      if (isRateLimit) {
        alert('Google API Rate Limit Reached! The free tier allows 15 requests per minute. Please wait 30 seconds and try again.');
      } else {
        alert('Failed to extract social profiles. Make sure API key is valid.');
      }
    } finally {
      setExtractingSocials(false);
    }
  };

  useEffect(() => {
    fetchLead();
  }, [id]);

  const fetchLead = async () => {
    try {
      let { data } = await getLead(id);

      // Auto-clean if missing city or business type
      if (!data.city || !data.businessType) {
        const cooldown = localStorage.getItem('ai_cooldown_until');
        if (!cooldown || Date.now() > parseInt(cooldown)) {
          try {
            const cleanRes = await autoCleanLead(id);
            data = cleanRes.data;
          } catch(e) {
            console.error("Auto clean failed", e);
            if (e.response?.status === 429) {
              // Block background AI tasks for 60 seconds to save quota
              localStorage.setItem('ai_cooldown_until', Date.now() + 60000);
            }
          }
        } else {
          console.log("Background AI paused due to rate limit.");
        }
      }

      setLead(data);
      setLogType(data.type || 'Cold');
      setLogStatus(data.status || 'Pending');
      
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

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to permanently delete this lead? This action cannot be undone.')) {
      try {
        setIsDeleting(true);
        await deleteLead(id);
        navigate('/leads');
      } catch (err) {
        console.error(err);
        alert('Failed to delete lead');
        setIsDeleting(false);
      }
    }
  };

  const handleContactClick = (e, type) => {
    e.preventDefault();
    const numbers = extractMobileNumbers(lead.mobile);
    if (numbers.length > 1) {
      setContactActionType(type);
    } else if (numbers.length === 1) {
      if (type === 'call') window.location.href = `tel:${numbers[0]}`;
      if (type === 'whatsapp') window.location.href = `whatsapp://send?phone=91${numbers[0]}&text=${encodeURIComponent(defaultWhatsappMessage)}`;
    } else {
      alert('No valid mobile number found.');
    }
  };

  const filteredLogs = (lead?.callLogs || []).filter(log => {
    if (logSearch && !log.note.toLowerCase().includes(logSearch.toLowerCase())) {
      return false;
    }
    if (logFilterType && log.typeAtTime !== logFilterType) {
      return false;
    }
    if (logFilterStatus && log.statusAtTime !== logFilterStatus) {
      return false;
    }
    return true;
  });

  if (loading) return <div className="p-12 text-center text-slate-500 font-medium">Loading Enterprise Profile...</div>;
  if (!lead) return null;

  const handleEditLog = (log) => {
    setEditingLogId(log._id);
    setNote(log.note || '');
    setLogType(log.typeAtTime || 'Cold');
    setLogStatus(log.statusAtTime || 'Pending');
    if (log.nextFollowup) {
      setNextFollowup(new Date(log.nextFollowup).toISOString().split('T')[0]);
    } else {
      setNextFollowup('');
    }
    document.getElementById('log-form-container')?.scrollIntoView({ behavior: 'smooth' });
  };

  const cancelEditLog = () => {
    setEditingLogId(null);
    setNote('');
    setNextFollowup('');
    setLogType(lead.type || 'Cold');
    setLogStatus(lead.status || 'Pending');
  };

  const handleDeleteLog = async (logId) => {
    if (window.confirm('Are you sure you want to delete this interaction log?')) {
      try {
        const { data } = await deleteCallLog(id, logId);
        setLead(data);
      } catch (err) {
        console.error(err);
        alert('Failed to delete interaction log.');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-12">
      
      {/* 1. HERO HEADER */}
      <div className="bg-white border border-border rounded-xl shadow-sm p-5 md:p-6 flex flex-col md:flex-row gap-5 md:gap-6 items-start md:items-center relative overflow-hidden">
        {/* Subtle Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none"></div>

        <div className="flex items-start md:items-center gap-4 w-full md:w-auto flex-1 z-10">
          <button onClick={() => navigate('/leads')} className="mt-1 md:mt-0 p-2 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-100 hover:text-slate-800 transition-colors shrink-0">
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-4 md:gap-5 flex-1 min-w-0">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-indigo-50 border border-indigo-100 text-primary flex items-center justify-center text-xl md:text-2xl font-bold shadow-sm shrink-0">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight truncate">{lead.name}</h1>
              <div className="flex items-center gap-2 md:gap-3 mt-1 text-xs md:text-sm font-medium text-slate-500 flex-wrap">
                {lead.businessType && (
                  <>
                    <span className="flex items-center gap-1 text-slate-700 truncate">
                      <Briefcase size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate max-w-[100px] sm:max-w-none">{lead.businessType}</span>
                    </span>
                    <span className="text-slate-300 hidden sm:inline">•</span>
                  </>
                )}
                <span className="flex items-center gap-1 text-slate-700 truncate">
                  <MapPin size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate max-w-[120px] sm:max-w-none">{lead.city || (lead.address ? lead.address.split(/[,|]/)[0].trim() : 'Location Unknown')}</span>
                </span>
                {lead.createdAt && (
                  <>
                    <span className="text-slate-300 hidden sm:inline">•</span>
                    <span className="flex items-center gap-1 text-slate-700 truncate" title="Lead Added Date">
                      <Calendar size={14} className="text-slate-400 shrink-0" />
                      <span>Added {new Date(lead.createdAt).toLocaleDateString()}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:flex md:flex-wrap md:items-center gap-2 md:gap-3 w-full md:w-auto z-10 border-t border-slate-100 pt-4 md:pt-0 md:border-none">
          <button 
            onClick={handleDelete}
            disabled={isDeleting}
            className="md:flex-none flex items-center justify-center gap-2 px-3 py-2.5 bg-red-50 text-red-600 rounded-lg font-medium shadow-sm hover:bg-red-100 transition-colors"
            title="Delete Lead"
          >
            <X size={16} />
            <span className="md:hidden">Delete</span>
          </button>
          <button 
            onClick={() => setIsUpdateModalOpen(true)}
            className="md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg font-medium shadow-sm hover:bg-slate-900 transition-colors"
          >
            <Edit size={16} />
            <span>Edit Profile</span>
          </button>
          {/* Action Buttons */}
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={(e) => {
                e.preventDefault();
                const query = encodeURIComponent(`${lead.name} ${lead.mobile || ''}`);
                window.open(`https://www.google.com/search?q=${query}`, '_blank');
              }}
              className="flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-lg font-medium shadow-sm hover:bg-blue-100 transition-colors"
              title="Google Search"
            >
              <Search size={16} />
              <span>Search</span>
            </button>
            <button 
              onClick={(e) => handleContactClick(e, 'whatsapp')}
              className="flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 bg-[#25D366] text-white rounded-lg font-medium shadow-sm hover:bg-[#128C7E] transition-colors"
            >
              <MessageSquare size={16} />
              <span>WhatsApp</span>
            </button>
            <button 
              onClick={(e) => handleContactClick(e, 'call')}
              className="flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium shadow-sm hover:bg-slate-50 transition-colors"
            >
              <Phone size={16} />
              <span>Call</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: 360 Data & Logging */}
        <div className="contents lg:flex lg:flex-col lg:col-span-1 gap-6">
          
          {/* Intelligence Panel */}
          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden order-1 lg:order-none">
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
              
              {/* Owner / Core Contact */}
              <div className="flex flex-col gap-4">
                
                {lead.ownerName && (
                  <div className="flex items-start gap-3 text-sm bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/50">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                      <Target size={14} className="text-indigo-600" />
                    </div>
                    <div className="flex flex-col pt-1">
                      <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-0.5">Owner / Contact</span>
                      <span className="font-bold text-slate-900">{lead.ownerName}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    <Phone size={14} className="text-slate-500" />
                  </div>
                  <div className="flex flex-col pt-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Mobile Number</span>
                    <span className="font-bold text-slate-900">
                      {lead.mobile?.length > 10 ? lead.mobile.match(/.{1,10}/g).join(', ') : lead.mobile}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    <MapPin size={14} className="text-slate-500" />
                  </div>
                  <div className="flex flex-col pt-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Full Address</span>
                    <span className="font-medium text-slate-900 leading-relaxed">
                      {lead.address || 'No address provided'}
                      {lead.mapsUrl && (
                        <a 
                          href={lead.mapsUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-2 text-indigo-600 hover:text-indigo-800 text-xs font-bold underline inline-flex items-center gap-0.5"
                        >
                          Open Map
                        </a>
                      )}
                    </span>
                  </div>
                </div>

                {lead.website && (
                  <div className="flex items-start gap-3 text-sm mt-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      <Globe size={14} className="text-slate-500" />
                    </div>
                    <div className="flex flex-col pt-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Website</span>
                      <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
                        {lead.website}
                      </a>
                    </div>
                  </div>
                )}
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
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ask For</span>
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

          {/* Web Presence Panel */}
          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden order-5 lg:order-none">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-3 sm:gap-0">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Globe size={16} className="text-blue-500" />
                Web Presence
              </h3>
              <button 
                onClick={handleExtractSocials}
                disabled={extractingSocials}
                className="w-full sm:w-auto flex justify-center items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded border border-blue-200 text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {extractingSocials ? <Activity size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {extractingSocials ? 'Scanning...' : 'AI Search Web'}
              </button>
            </div>
            <div className="p-5 flex flex-col gap-5">
              {/* Platform Ratings */}
              {lead.socials?.platforms && lead.socials.platforms.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {lead.socials.platforms.map((platform, idx) => (
                    <div key={idx} className="bg-amber-50/50 border border-amber-100 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white border border-amber-200 flex items-center justify-center shrink-0 shadow-sm text-amber-500">
                          <Star size={20} className="fill-amber-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{platform.name} Rating</span>
                          {platform.rating ? (
                            <div className="flex items-baseline gap-1">
                              <span className="font-black text-xl text-slate-800">
                                {platform.rating.replace(/(\/.*|out of.*)/gi, '').trim()}
                              </span>
                              <span className="text-sm font-semibold text-amber-600">/ 5</span>
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-slate-400 italic">No rating found</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Reviews</span>
                        <span className="font-bold text-slate-700">{platform.reviews || '0'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white border border-amber-200 flex items-center justify-center shrink-0 shadow-sm text-amber-500">
                      <Star size={20} className="fill-amber-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rating</span>
                      {lead.socials?.rating ? (
                        <div className="flex items-baseline gap-1">
                          <span className="font-black text-xl text-slate-800">
                            {lead.socials.rating.replace(/(\/.*|out of.*)/gi, '').trim()}
                          </span>
                          <span className="text-sm font-semibold text-amber-600">/ 5</span>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-slate-400 italic">No rating found</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Reviews</span>
                    <span className="font-bold text-slate-700">{lead.socials?.reviews || '0'}</span>
                  </div>
                </div>
              )}

              {/* Web Summary */}
              {lead.socials?.summary && (
                <div className="text-sm text-slate-600 bg-blue-50/50 border border-blue-100 p-3 rounded-lg leading-relaxed shadow-sm">
                  <span className="font-bold text-blue-800 block mb-1 text-[10px] uppercase tracking-wider flex items-center gap-1"><Sparkles size={10} className="text-blue-600" /> AI Web Summary</span>
                  {lead.socials.summary}
                </div>
              )}
              
              {/* Extra Info */}
              {(lead.socials?.hours || lead.socials?.emails || lead.socials?.phones || lead.socials?.addressMatch) && (
                <div className="flex flex-col gap-2 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm">
                  {lead.socials?.hours && (
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider w-12 shrink-0 mt-0.5">Hours</span>
                      <span className="text-slate-700 font-medium">{lead.socials.hours}</span>
                    </div>
                  )}
                  {lead.socials?.emails && (
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider w-12 shrink-0 mt-0.5">Email</span>
                      <span className="text-blue-600 font-medium break-all">{lead.socials.emails}</span>
                    </div>
                  )}
                  {lead.socials?.phones && (
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider w-12 shrink-0 mt-0.5">Phones</span>
                      <span className="text-slate-700 font-medium break-all">{lead.socials.phones}</span>
                    </div>
                  )}
                  {lead.socials?.addressMatch && (
                    <div className="flex items-start gap-2 pt-1 border-t border-slate-200 mt-1">
                      <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider w-12 shrink-0 mt-0.5">Address</span>
                      <span className="text-slate-600 font-medium leading-tight">{lead.socials.addressMatch}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Social Links */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm bg-slate-50 border border-slate-100 p-2 rounded-lg">
                  <div className="w-8 h-8 rounded bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 text-white flex items-center justify-center shrink-0">
                    <FaInstagram size={16} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Instagram</span>
                    {lead.socials?.instagram?.startsWith('http') ? (
                      <a href={lead.socials.instagram} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:text-blue-800 hover:underline truncate" title={lead.socials.instagram}>{lead.socials.instagram.replace(/^https?:\/\/(www\.)?/, '')}</a>
                    ) : (
                      <span className="font-medium text-slate-700 truncate">{lead.socials?.instagram || '-'}</span>
                    )}
                    {lead.socials?.instagramFollowers && (
                      <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded mt-0.5 w-max">
                        {lead.socials.instagramFollowers} Followers
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm bg-slate-50 border border-slate-100 p-2 rounded-lg">
                  <div className="w-8 h-8 rounded bg-[#1877F2] text-white flex items-center justify-center shrink-0">
                    <FaFacebook size={16} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Facebook</span>
                    {lead.socials?.facebook?.startsWith('http') ? (
                      <a href={lead.socials.facebook} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:text-blue-800 hover:underline truncate" title={lead.socials.facebook}>{lead.socials.facebook.replace(/^https?:\/\/(www\.)?/, '')}</a>
                    ) : (
                      <span className="font-medium text-slate-700 truncate">{lead.socials?.facebook || '-'}</span>
                    )}
                    {lead.socials?.facebookFollowers && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 w-max">
                        {lead.socials.facebookFollowers} Followers
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm bg-slate-50 border border-slate-100 p-2 rounded-lg">
                  <div className="w-8 h-8 rounded bg-[#FF0000] text-white flex items-center justify-center shrink-0">
                    <FaYoutube size={16} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">YouTube</span>
                    {lead.socials?.youtube?.startsWith('http') ? (
                      <a href={lead.socials.youtube} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:text-blue-800 hover:underline truncate" title={lead.socials.youtube}>{lead.socials.youtube.replace(/^https?:\/\/(www\.)?/, '')}</a>
                    ) : (
                      <span className="font-medium text-slate-700 truncate">{lead.socials?.youtube || '-'}</span>
                    )}
                    {lead.socials?.youtubeSubscribers && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded mt-0.5 w-max">
                        {lead.socials.youtubeSubscribers} Subs
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm bg-slate-50 border border-slate-100 p-2 rounded-lg">
                  <div className="w-8 h-8 rounded bg-[#0A66C2] text-white flex items-center justify-center shrink-0">
                    <FaLinkedin size={16} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">LinkedIn</span>
                    {lead.socials?.linkedin?.startsWith('http') ? (
                      <a href={lead.socials.linkedin} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:text-blue-800 hover:underline truncate" title={lead.socials.linkedin}>{lead.socials.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</a>
                    ) : (
                      <span className="font-medium text-slate-700 truncate">{lead.socials?.linkedin || '-'}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: AI & Timeline */}
        <div className="contents lg:flex lg:flex-col lg:col-span-2 gap-6">
          
          {/* AI Insight Section */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl shadow-lg border border-indigo-500/20 overflow-hidden relative order-4 lg:order-none">
            {/* Background Orbs */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/20 blur-[80px] rounded-full pointer-events-none"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none"></div>

            <div className="p-4 sm:p-5 border-b border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 relative z-10 bg-black/10">
              <h3 className="font-medium text-indigo-50 flex items-center gap-2">
                <BrainCircuit size={18} className="text-purple-400"/> 
                Lead AI Copilot
              </h3>
              <button 
                onClick={generateAiInsight}
                disabled={loadingAi}
                className="w-full sm:w-auto flex justify-center items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white px-4 sm:px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm transition-all disabled:opacity-50"
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
          <div className="bg-white border border-border rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col order-2 lg:order-none">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">Interaction Timeline</h3>
              <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded">
                {filteredLogs.length} of {lead.callLogs ? lead.callLogs.length : 0} Records
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
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-16 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                    <Clock size={24} className="text-slate-300" />
                  </div>
                  <h4 className="text-slate-700 font-medium mb-1">No matching logs</h4>
                  <p className="text-sm text-slate-400 max-w-xs">Try clearing or adjusting your search filters to see all interactions.</p>
                </div>
              ) : (
                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-100">
                  {[...filteredLogs].reverse().map((log, i) => (
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
                          <div className="flex items-center gap-2">
                            {log.typeAtTime && (
                              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold border 
                                ${log.typeAtTime.toLowerCase() === 'hot' ? 'bg-red-50 text-red-600 border-red-200' :
                                  log.typeAtTime.toLowerCase() === 'warm' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                  'bg-blue-50 text-blue-600 border-blue-200'}`}>
                                {log.typeAtTime}
                              </span>
                            )}
                            <button onClick={() => handleEditLog(log)} className="text-slate-400 hover:text-primary transition-colors" title="Edit Interaction">
                              <Edit size={14} />
                            </button>
                            <button onClick={() => handleDeleteLog(log._id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Delete Interaction">
                              <Trash2 size={14} />
                            </button>
                          </div>
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
          
          {/* Activity Logger */}
          <div id="log-form-container" className="bg-white border border-border rounded-xl shadow-sm overflow-hidden order-3 lg:order-none">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Activity size={16} className="text-primary" />
                Log Interaction
              </h3>
            </div>
            <div className="p-5 flex flex-col gap-4">
              
              {/* AI Magic Fill Section for Logs */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[11px] uppercase tracking-wider text-indigo-700 font-bold flex items-center gap-1">
                    <Sparkles size={12}/> AI Call Logger
                  </label>
                  
                  <label className="cursor-pointer text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 text-[11px] font-semibold">
                    <ImagePlus size={14} /> 
                    <span>Upload Note</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogImageChange} />
                  </label>
                </div>

                {logImagePreview && (
                  <div className="relative inline-block mb-2">
                    <img src={logImagePreview} alt="Preview" className="h-12 rounded border border-indigo-200 object-cover" />
                    <button 
                      type="button" 
                      onClick={() => { setLogImageFile(null); setLogImagePreview(null); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-md"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <textarea 
                    rows="2"
                    className="w-full border border-indigo-200 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none flex-1 bg-white placeholder:text-indigo-300"
                    placeholder="Dictate your notes e.g. 'Client is hot...'"
                    value={magicLogText}
                    onChange={e => setMagicLogText(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={handleMagicLogFill}
                    disabled={extractingLog || (!magicLogText.trim() && !logImageFile)}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors flex items-center justify-center shrink-0"
                  >
                    {extractingLog ? 'Processing...' : '✨ Auto-Fill'}
                  </button>
                </div>
              </div>

              <form onSubmit={handleCallLogSubmit} className="flex flex-col gap-4">
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
                    <select className="w-full border border-slate-200 rounded-md p-2 text-sm bg-white focus:outline-none focus:border-primary" value={logType} onChange={e => setLogType(e.target.value)}>
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
                      value={logStatus}
                      onChange={e => setLogStatus(e.target.value)}
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
                  {savingLog ? 'Saving...' : editingLogId ? 'Update Interaction' : 'Save Interaction'}
                </button>
                {editingLogId && (
                  <button type="button" onClick={cancelEditLog} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium shadow-sm transition-colors text-sm">
                    Cancel Edit
                  </button>
                )}
              </form>
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

      {contactActionType && (
        <SelectContactModal 
          lead={lead}
          actionType={contactActionType}
          onClose={() => setContactActionType(null)}
        />
      )}
    </div>
  );

  async function handleCallLogSubmit(e) {
    e.preventDefault();
    if (!note) return;
    setSavingLog(true);
    try {
      if (editingLogId) {
        const { data } = await updateCallLog(id, editingLogId, { note, typeAtTime: logType, statusAtTime: logStatus, nextFollowup });
        setLead(data);
        cancelEditLog();
      } else {
        const { data } = await addCallLog(id, { note, typeAtTime: logType, statusAtTime: logStatus, nextFollowup });
        setLead(data);
        setNote('');
        setNextFollowup('');
      }
      setMagicLogText('');
      setLogImageFile(null);
      setLogImagePreview(null);
    } catch (err) {
      console.error(err);
      alert('Error adding call log');
    } finally {
      setSavingLog(false);
    }
  }

  function handleLogImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      setLogImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  }

  async function handleMagicLogFill() {
    if (!magicLogText.trim() && !logImageFile) return;
    setExtractingLog(true);
    try {
      let imageBase64 = null;
      let mimeType = null;
      if (logImageFile && logImagePreview) {
        imageBase64 = logImagePreview.split(',')[1];
        mimeType = logImageFile.type;
      }

      const { data } = await extractLogFromText(magicLogText, imageBase64, mimeType);
      
      if (data.note) setNote(data.note);
      if (['Hot', 'Warm', 'Cold'].includes(data.typeAtTime)) setLogType(data.typeAtTime);
      if (['Pending', 'In Process', 'Send Detail', 'Follow-up Letter', 'Contacted', 'Won', 'Lost'].includes(data.statusAtTime)) setLogStatus(data.statusAtTime);
      if (data.nextFollowup) setNextFollowup(data.nextFollowup);

      setMagicLogText('');
      setLogImageFile(null);
      setLogImagePreview(null);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to extract log data. Make sure AI is configured properly.');
    } finally {
      setExtractingLog(false);
    }
  }
}

function UpdateLeadModal({ lead, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: lead.name || '', 
    ownerName: lead.ownerName || '',
    mobile: lead.mobile || '', 
    address: lead.address || '', 
    mapsUrl: lead.mapsUrl || '', 
    website: lead.website || '',
    businessType: lead.businessType || '',
    city: lead.city || '',
    source: lead.source || 'Website', 
    type: lead.type || 'Cold', 
    status: lead.status || 'Pending',
    socials: {
      instagram: lead.socials?.instagram || '',
      facebook: lead.socials?.facebook || '',
      youtube: lead.socials?.youtube || '',
      linkedin: lead.socials?.linkedin || '',
      rating: lead.socials?.rating || '',
      reviews: lead.socials?.reviews || '',
      summary: lead.socials?.summary || '',
      hours: lead.socials?.hours || '',
      emails: lead.socials?.emails || '',
      phones: lead.socials?.phones || '',
      addressMatch: lead.socials?.addressMatch || '',
      instagramFollowers: lead.socials?.instagramFollowers || '',
      facebookFollowers: lead.socials?.facebookFollowers || '',
      youtubeSubscribers: lead.socials?.youtubeSubscribers || '',
      platforms: lead.socials?.platforms || []
    }
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
          linkedin: data.socials?.linkedin || prev.socials?.linkedin || '',
          rating: prev.socials?.rating || '',
          reviews: prev.socials?.reviews || ''
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
      const { data } = await updateLead(lead._id, formData);
      onSuccess(data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error updating lead');
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
                className="input-field text-sm resize-none flex-1"
                placeholder="Paste an image (Ctrl+V) or type info..."
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
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Business Name</label>
                <input required type="text" className="w-full border border-slate-200 rounded-md p-2 text-sm focus:border-primary focus:outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Mobile</label>
                <input required type="text" className="w-full border border-slate-200 rounded-md p-2 text-sm focus:border-primary focus:outline-none" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Owner / Contact Name</label>
              <input type="text" className="w-full border border-slate-200 rounded-md p-2 text-sm focus:border-primary focus:outline-none" value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} placeholder="e.g. Sandeep Bhai" />
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
                <span className="flex items-center gap-2 text-sm"><Sparkles size={16} className="text-purple-500" /> Social Media Links</span>
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
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Type</label>
                <select className="w-full border border-slate-200 rounded-md p-2 text-sm bg-white focus:border-primary focus:outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="Hot">Hot</option>
                  <option value="Warm">Warm</option>
                  <option value="Cold">Cold</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Ask For</label>
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
                <option value="Permanently Lost">Permanently Lost</option>
              </select>
            </div>

            <div className="border-t border-slate-200 pt-4 mt-2">
              <h4 className="text-sm font-bold text-slate-700 mb-3">Social Media Links</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Instagram</label>
                  <input type="text" className="w-full border border-slate-200 rounded-md p-2 text-sm focus:border-primary focus:outline-none" value={formData.socials.instagram} onChange={e => setFormData({...formData, socials: {...formData.socials, instagram: e.target.value}})} placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Facebook</label>
                  <input type="text" className="w-full border border-slate-200 rounded-md p-2 text-sm focus:border-primary focus:outline-none" value={formData.socials.facebook} onChange={e => setFormData({...formData, socials: {...formData.socials, facebook: e.target.value}})} placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">YouTube</label>
                  <input type="text" className="w-full border border-slate-200 rounded-md p-2 text-sm focus:border-primary focus:outline-none" value={formData.socials.youtube} onChange={e => setFormData({...formData, socials: {...formData.socials, youtube: e.target.value}})} placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">LinkedIn</label>
                  <input type="text" className="w-full border border-slate-200 rounded-md p-2 text-sm focus:border-primary focus:outline-none" value={formData.socials.linkedin} onChange={e => setFormData({...formData, socials: {...formData.socials, linkedin: e.target.value}})} placeholder="https://..." />
                </div>
              </div>
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
