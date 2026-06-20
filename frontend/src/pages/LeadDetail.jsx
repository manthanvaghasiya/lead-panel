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

  if (loading) return <div className="p-8 text-center text-slate-500">Loading lead profile...</div>;
  if (!lead) return null;

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/leads')} className="p-2 bg-white border border-border rounded-md hover:bg-slate-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{lead.name}</h1>
          <div className="text-sm text-slate-500 mt-1 flex gap-3">
            <span>Added {new Date(lead.createdAt).toLocaleDateString()}</span>
            <span>•</span>
            <span>Source: {lead.source}</span>
          </div>
        </div>
        <div className="ml-auto flex gap-3">
          <a 
            href={`https://wa.me/91${lead.mobile}`} 
            target="_blank" 
            rel="noreferrer"
            className="btn-primary !bg-[#25D366] hover:!bg-[#128C7E] flex items-center gap-2"
          >
            <Phone size={18} />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Info & Add Log */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Status Card */}
          <div className="card bg-gradient-to-br from-surface to-slate-800/80 border-t-4 border-t-primary">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Current Status</div>
                <div className="font-semibold text-lg">{lead.status}</div>
              </div>
              <span className={`badge badge-${lead.type?.toLowerCase() || 'cold'} text-sm px-3 py-1`}>
                {lead.type}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm mt-4 text-slate-700">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <Phone size={14} className="text-primary" />
              </div>
              <div className="font-mono">{lead.mobile}</div>
            </div>
            {lead.followupDate && (
              <div className="flex items-center gap-3 text-sm mt-3 text-orange-400 bg-orange-500/10 p-2 rounded border border-orange-500/20">
                <Calendar size={16} />
                <span>Next Call: {new Date(lead.followupDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* New Call Log Form */}
          <div className="card">
            <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
              <Activity size={18} className="text-primary" />
              Log Activity
            </h3>
            <form onSubmit={handleAddLog} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Notes / Conversation</label>
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
                  <label className="block text-xs text-slate-500 mb-1">Change Type</label>
                  <select className="input-field text-sm py-1.5" value={typeAtTime} onChange={e => setTypeAtTime(e.target.value)}>
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Change Status</label>
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
                <label className="block text-xs text-slate-500 mb-1">Set Next Follow-up</label>
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
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-lg flex items-center gap-2">
                <BrainCircuit size={20} className="text-purple-400"/> 
                AI Assistant
              </h3>
              <button 
                onClick={generateAiInsight}
                disabled={loadingAi}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all disabled:opacity-50"
              >
                <Sparkles size={16} />
                {loadingAi ? 'Thinking...' : 'Generate Insight'}
              </button>
            </div>

            {aiInsight && (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/30 rounded-xl p-5 shadow-xl relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full"></div>
                
                <div className="relative z-10 space-y-5">
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-purple-400 font-semibold mb-1 flex items-center gap-1"><BrainCircuit size={14}/> AI Summary</h4>
                    <p className="text-sm text-slate-800 leading-relaxed">{aiInsight.summary}</p>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-cyan-400 font-semibold mb-1 flex items-center gap-1"><Target size={14}/> Suggested Action</h4>
                    <p className="text-sm text-slate-800">{aiInsight.nextAction}</p>
                  </div>
                  <div className="bg-black/40 border border-slate-300/50 rounded-lg p-3 relative">
                    <h4 className="text-xs uppercase tracking-wider text-green-400 font-semibold mb-2 flex items-center gap-1"><MessageSquare size={14}/> WhatsApp Draft</h4>
                    <p className="text-sm text-slate-700 font-mono whitespace-pre-wrap">{aiInsight.draftMessage}</p>
                    <button 
                      onClick={() => navigator.clipboard.writeText(aiInsight.draftMessage)}
                      className="absolute top-3 right-3 text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-700 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="card h-full flex flex-col">
            <h3 className="font-medium text-lg mb-6 border-b border-border pb-4">Activity Timeline</h3>
            
            <div className="flex-1 overflow-y-auto pr-2">
              {!lead.callLogs || lead.callLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Clock size={40} className="mx-auto mb-3 opacity-20" />
                  <p>No activity recorded yet.</p>
                  <p className="text-sm mt-1">Add a log on the left to start the timeline.</p>
                </div>
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                  {[...lead.callLogs].reverse().map((log, i) => (
                    <div key={log._id || i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      {/* Icon */}
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-slate-100 text-slate-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <Phone size={14} />
                      </div>
                      
                      {/* Content Card */}
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white border border-border p-4 rounded-lg shadow-sm group-hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                            <Clock size={12} />
                            {new Date(log.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                          <span className={`badge badge-${log.typeAtTime?.toLowerCase()} scale-90 origin-right`}>
                            {log.typeAtTime}
                          </span>
                        </div>
                        <p className="text-slate-800 text-sm leading-relaxed mb-3">
                          {log.note}
                        </p>
                        {(log.statusAtTime || log.nextFollowup) && (
                          <div className="pt-3 border-t border-border/50 text-xs flex flex-wrap gap-x-4 gap-y-2">
                            {log.statusAtTime && (
                              <div className="text-slate-500">Status: <span className="text-slate-800">{log.statusAtTime}</span></div>
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
