import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Calendar, Clock, MapPin, Building, User, Activity, Sparkles, BrainCircuit, MessageSquare, Target } from 'lucide-react';
import { getLead, addCallLog, updateLead, getLeadAiInsight } from '../api/apiClient';

function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Call Log Form
  const [note, setNote] = useState('');
  const [typeAtTime, setTypeAtTime] = useState('');
  const [statusAtTime, setStatusAtTime] = useState('');
  const [nextFollowup, setNextFollowup] = useState('');
  const [savingLog, setSavingLog] = useState(false);

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
      // Set default followup to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setNextFollowup(tomorrow.toISOString().split('T')[0]);
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
      setLead(data); // Update with new data
      setNote(''); // Clear only the note
    } catch (err) {
      console.error(err);
      alert('Error saving log');
    } finally {
      setSavingLog(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading lead profile...</div>;
  if (!lead) return null;

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 animate-fade-in-up">
      {/* Header */}
      <div className="glass-panel p-6 flex flex-col md:flex-row items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <button onClick={() => navigate('/leads')} className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors z-10 text-gray-300">
          <ArrowLeft size={20} />
        </button>
        <div className="z-10">
          <h1 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">{lead.name}</h1>
          <div className="text-sm font-medium text-gray-400 mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1"><Calendar size={14} className="text-primary"/> Added {new Date(lead.createdAt).toLocaleDateString()}</span>
            <span className="text-white/20">•</span>
            <span className="flex items-center gap-1"><MapPin size={14} className="text-cyan-400"/> Source: {lead.source}</span>
          </div>
        </div>
        <div className="md:ml-auto flex gap-3 z-10 w-full md:w-auto mt-4 md:mt-0">
          <a 
            href={`https://wa.me/91${lead.mobile}`} 
            target="_blank" 
            rel="noreferrer"
            className="flex-1 md:flex-none bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#128C7E] hover:to-[#075E54] text-white font-medium py-2.5 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(37,211,102,0.3)] flex items-center justify-center gap-2"
          >
            <Phone size={18} />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Info & Add Log */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          {/* Status Card */}
          <div className="glass-panel p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-primary/30 transition-all"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-gray-400 mb-1.5 font-bold">Current Status</div>
                  <div className="font-display font-semibold text-2xl text-white">{lead.status}</div>
                </div>
                <span className={`badge ${lead.type === 'Hot' ? 'badge-hot' : lead.type === 'Warm' ? 'badge-warm' : 'badge-cold'} text-sm px-3 py-1.5`}>
                  {lead.type}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm mt-6 text-gray-200 bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center shadow-inner border border-white/10">
                  <Phone size={16} className="text-purple-400" />
                </div>
                <div className="font-mono text-lg tracking-tight">{lead.mobile}</div>
              </div>
              {lead.followupDate && (
                <div className="flex items-center gap-3 text-sm mt-4 text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                  <Calendar size={18} />
                  <span className="font-medium">Next Call: {new Date(lead.followupDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* New Call Log Form */}
          <div className="glass-panel p-6">
            <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
              <Activity size={18} className="text-primary" />
              Log Activity
            </h3>
            <form onSubmit={handleAddLog} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Notes / Conversation</label>
                <textarea 
                  required
                  rows={3} 
                  className="input-field resize-none" 
                  placeholder="What did you discuss?"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Change Type</label>
                  <select className="input-field text-sm py-1.5" value={typeAtTime} onChange={e => setTypeAtTime(e.target.value)}>
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Change Status</label>
                  <select 
                    className="input-field text-sm py-1.5" 
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
              <div>
                <label className="block text-xs text-gray-400 mb-1">Set Next Follow-up</label>
                <input 
                  type="date" 
                  className="input-field text-sm py-1.5" 
                  value={nextFollowup}
                  onChange={e => setNextFollowup(e.target.value)}
                />
              </div>
              <button type="submit" disabled={savingLog} className="btn-primary mt-2">
                {savingLog ? 'Saving...' : 'Save Log & Update Status'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: Timeline */}
        <div className="lg:col-span-2">
          
          {/* AI Insight Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-xl flex items-center gap-2 text-white">
                <BrainCircuit size={22} className="text-purple-400"/> 
                AI Assistant
              </h3>
              <button 
                onClick={generateAiInsight}
                disabled={loadingAi}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all disabled:opacity-50"
              >
                <Sparkles size={16} className={loadingAi ? "animate-spin" : ""} />
                {loadingAi ? 'Thinking...' : 'Generate Insight'}
              </button>
            </div>

            {aiInsight && (
              <div className="glass-panel border border-purple-500/30 p-6 relative overflow-hidden group">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-3xl rounded-full group-hover:bg-purple-500/20 transition-all pointer-events-none"></div>
                
                <div className="relative z-10 space-y-6">
                  <div>
                    <h4 className="text-[11px] uppercase tracking-widest text-purple-400 font-bold mb-2 flex items-center gap-1.5"><BrainCircuit size={14}/> AI Summary</h4>
                    <p className="text-sm text-gray-200 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">{aiInsight.summary}</p>
                  </div>
                  <div>
                    <h4 className="text-[11px] uppercase tracking-widest text-cyan-400 font-bold mb-2 flex items-center gap-1.5"><Target size={14}/> Suggested Action</h4>
                    <p className="text-sm text-gray-200 bg-black/20 p-4 rounded-xl border border-white/5">{aiInsight.nextAction}</p>
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 relative shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]">
                    <h4 className="text-[11px] uppercase tracking-widest text-emerald-400 font-bold mb-3 flex items-center gap-1.5"><MessageSquare size={14}/> WhatsApp Draft</h4>
                    <p className="text-sm text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">{aiInsight.draftMessage}</p>
                    <button 
                      onClick={() => navigator.clipboard.writeText(aiInsight.draftMessage)}
                      className="absolute top-4 right-4 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-white font-medium transition-all backdrop-blur-md border border-white/10"
                    >
                      Copy Draft
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel p-6 h-full flex flex-col">
            <h3 className="font-display font-semibold text-xl mb-6 border-b border-white/10 pb-4 text-white flex items-center gap-2">
              <Activity size={20} className="text-primary"/> Activity Timeline
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2">
              {!lead.callLogs || lead.callLogs.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Clock size={40} className="mx-auto mb-3 opacity-20" />
                  <p>No activity recorded yet.</p>
                  <p className="text-sm mt-1">Add a log on the left to start the timeline.</p>
                </div>
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                  {[...lead.callLogs].reverse().map((log, i) => (
                    <div key={log._id || i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      {/* Icon */}
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-slate-700 text-slate-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <Phone size={14} />
                      </div>
                      
                      {/* Content Card */}
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white/5 backdrop-blur-md border border-white/5 p-5 rounded-2xl shadow-lg group-hover:bg-white/10 group-hover:border-primary/30 transition-all duration-300 group-hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                            <Clock size={12} />
                            {new Date(log.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                          <span className={`badge badge-${log.typeAtTime?.toLowerCase()} scale-90 origin-right`}>
                            {log.typeAtTime}
                          </span>
                        </div>
                        <p className="text-gray-200 text-sm leading-relaxed mb-3">
                          {log.note}
                        </p>
                        {(log.statusAtTime || log.nextFollowup) && (
                          <div className="pt-3 border-t border-border/50 text-xs flex flex-wrap gap-x-4 gap-y-2">
                            {log.statusAtTime && (
                              <div className="text-gray-400">Status: <span className="text-gray-200">{log.statusAtTime}</span></div>
                            )}
                            {log.nextFollowup && (
                              <div className="text-orange-400/80 flex items-center gap-1">
                                <Calendar size={12} />
                                Follow-up: {new Date(log.nextFollowup).toLocaleDateString()}
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
    </div>
  );
}

export default LeadDetail;
