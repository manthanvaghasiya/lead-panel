import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Calendar, Clock, Video, CheckCircle2, AlertCircle, 
  ExternalLink, X, ArrowRight, UserCheck, RefreshCw, Zap, Copy, Check, Mail
} from 'lucide-react';
import { 
  parseGoogleCalendarSnippet, 
  generateGoogleCalendarUrl, 
  getMeetingTitle,
  generateGoogleMeetLink,
  SAMPLE_CALENDAR_INVITE 
} from '../utils/calendarSync';
import { updateLinkedInContact } from '../api/apiClient';

export default function GeminiCalendarSyncModal({
  isOpen,
  onClose,
  contacts = [],
  onSuccess
}) {
  const [inputText, setInputText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [editableTitle, setEditableTitle] = useState('');
  const [editableMeetUrl, setEditableMeetUrl] = useState('');
  const [editableGuestEmail, setEditableGuestEmail] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Auto-parse on input change
  useEffect(() => {
    if (!inputText.trim()) {
      setParsedData(null);
      setSelectedContactId('');
      setEditableTitle('');
      setEditableMeetUrl('');
      setEditableGuestEmail('');
      setErrorMsg('');
      setSyncSuccess(false);
      return;
    }

    try {
      const result = parseGoogleCalendarSnippet(inputText, contacts);
      setParsedData(result);
      if (result) {
        setEditableTitle(result.title || (result.matchedContact ? getMeetingTitle(result.matchedContact) : ''));
        setEditableMeetUrl(result.meetUrl || generateGoogleMeetLink());
        setEditableGuestEmail(result.guestEmail || result.matchedContact?.email || '');
      }
      if (result?.matchedContact) {
        setSelectedContactId(result.matchedContact._id);
      } else if (contacts.length > 0) {
        setSelectedContactId(contacts[0]._id);
      }
      setErrorMsg('');
    } catch (err) {
      console.warn('Calendar parsing error:', err);
    }
  }, [inputText, contacts]);

  if (!isOpen) return null;

  const handleUseSample = () => {
    setInputText(SAMPLE_CALENDAR_INVITE);
  };

  const handleClear = () => {
    setInputText('');
    setParsedData(null);
    setSelectedContactId('');
    setEditableTitle('');
    setEditableMeetUrl('');
    setEditableGuestEmail('');
    setSyncSuccess(false);
    setErrorMsg('');
  };

  const handleContactChange = (newId) => {
    setSelectedContactId(newId);
    const chosen = contacts.find(c => c._id === newId);
    if (chosen) {
      if (chosen.email) {
        setEditableGuestEmail(chosen.email);
      }
      setEditableTitle(getMeetingTitle(chosen));
      if (chosen.meetingLink && chosen.meetingLink.startsWith('http')) {
        setEditableMeetUrl(chosen.meetingLink);
      }
    }
  };

  const handleCopyMeet = () => {
    if (!editableMeetUrl) return;
    navigator.clipboard.writeText(editableMeetUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const targetContact = contacts.find(c => c._id === selectedContactId);
  const finalTitle = editableTitle.trim() || parsedData?.title || getMeetingTitle(targetContact);
  const finalMeet = editableMeetUrl.trim() || parsedData?.meetUrl || generateGoogleMeetLink();
  const finalEmail = editableGuestEmail.trim() || parsedData?.guestEmail || targetContact?.email || '';

  const handleSyncToContact = async () => {
    if (!selectedContactId) {
      setErrorMsg('Please select a contact to link this meeting schedule with.');
      return;
    }

    if (!parsedData?.startDate && !finalMeet) {
      setErrorMsg('Could not detect a valid meeting date/time or Google Meet URL.');
      return;
    }

    if (!targetContact) {
      setErrorMsg('Selected contact was not found.');
      return;
    }

    setSyncing(true);
    setErrorMsg('');

    try {
      const updates = {
        status: 'Meeting Scheduled',
        priority: 'Hot',
        meetingLink: finalMeet
      };

      if (parsedData?.startDate) {
        updates.meetingDate = parsedData.startDate.toISOString();
      }

      if (finalEmail) {
        updates.email = finalEmail;
      }

      // Append agenda / calendar event details to notes
      const syncStamp = `\n\n--- Google Calendar Event Synced (${new Date().toLocaleDateString('en-IN')}) ---\nEvent: ${finalTitle}\nPlatform: ${finalMeet}\nGuests: ${finalEmail || targetContact.email || 'N/A'}, Manthan Vaghasiya\nAgenda: ${parsedData?.agenda || 'Collaborative partnership discussion'}`;
      updates.notes = (targetContact.notes || '') + syncStamp;

      await updateLinkedInContact(selectedContactId, updates);
      setSyncSuccess(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
        setSyncSuccess(false);
        setInputText('');
      }, 1800);
    } catch (err) {
      console.error('Failed to sync calendar event to contact:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update contact schedule');
    } finally {
      setSyncing(false);
    }
  };

  const gCalUrl = parsedData?.startDate ? generateGoogleCalendarUrl({
    title: finalTitle,
    startDate: parsedData.startDate,
    endDate: parsedData.endDate,
    location: finalMeet,
    details: parsedData.agenda || targetContact?.dealTerms,
    addGuestEmail: finalEmail
  }) : '';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden border-l border-slate-200 animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl shadow-inner">
              <Sparkles size={18} className="text-amber-300 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base leading-tight">Gemini Calendar & Meet Sync</h3>
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded shadow-xs">
                  AI Fast Sync
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium">
                Paste Google Calendar invite or email snippet to auto-sync
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={19} />
          </button>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-800 text-xs">
          {/* Quick Info / Instructions */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 p-3 rounded-xl flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Calendar size={15} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <span className="font-bold text-blue-950 block">Paste anywhere from Google Calendar:</span>
                <span className="text-[11px] text-blue-800 font-medium">
                  We automatically extract Title, Date & Time, Meet Link, Guest Email & Agenda, and match your contact instantly!
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleUseSample}
              className="text-[10px] font-bold text-blue-700 bg-white hover:bg-blue-100/60 border border-blue-300 px-2 py-1 rounded-lg shrink-0 transition-colors shadow-xs"
            >
              Test Sample
            </button>
          </div>

          {/* Paste Input Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <span>Google Calendar Invite / Email Snippet:</span>
              </label>
              {inputText && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] text-slate-400 hover:text-slate-600 font-medium"
                >
                  Clear text
                </button>
              )}
            </div>
            <textarea
              rows={6}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Paste your Google Calendar event here...\n\nExample:\nWebiox <> Softol Solutions | Technical Partnership Intro (Manthan & Swati)\nMonday, September 21⋅3:30 – 3:45pm\nhttps://meet.google.com/ppm-gbqv-ddd\nswati@softolsolutions.com`}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-[11px] focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 leading-relaxed outline-none transition-all shadow-inner"
            />
          </div>

          {/* Live Parsing Preview Card */}
          {parsedData && (
            <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-xs animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Zap size={13} className="text-amber-500 fill-amber-500" />
                  <span>AI Extracted Details</span>
                </span>
                {parsedData.matchConfidence === 'high' && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <UserCheck size={11} />
                    <span>Auto-Matched Contact</span>
                  </span>
                )}
              </div>

              {/* Matched Contact Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Link / Sync With Contact:</span>
                  {targetContact && (
                    <span className="text-[10px] text-blue-600 font-semibold">
                      {targetContact.position || targetContact.company}
                    </span>
                  )}
                </label>
                <select
                  value={selectedContactId}
                  onChange={(e) => handleContactChange(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                >
                  <option value="">-- Select Contact --</option>
                  {contacts.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.company ? `(${c.company})` : ''} {c.email ? `• ${c.email}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Parsed Fields & Customization Form */}
              <div className="space-y-2.5">
                {/* 1. Meeting Event Title */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Meeting Event Title:
                  </label>
                  <input
                    type="text"
                    value={editableTitle}
                    onChange={(e) => setEditableTitle(e.target.value)}
                    placeholder="e.g. Webiox <> Aayushi Paliwal(BDE) | Partnership Catchup"
                    className="w-full p-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                  />
                  <p className="text-[10px] text-slate-400">
                    Auto-formatted with partner name & role tag for clean professional calendar invites.
                  </p>
                </div>

                {/* 2. When (Date & Time) */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-start gap-2.5">
                  <Clock size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                      Scheduled Time:
                    </span>
                    {parsedData.startDate ? (
                      <div className="mt-0.5 font-bold text-xs text-slate-800">
                        <span>
                          {parsedData.startDate.toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="mx-1 text-slate-400">•</span>
                        <span className="text-blue-700 font-extrabold">
                          {parsedData.startDate.toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                        {parsedData.endDate && (
                          <span className="text-slate-500 font-semibold">
                            {' '}–{' '}
                            {parsedData.endDate.toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-amber-700 italic font-medium">Could not detect date/time</span>
                    )}
                  </div>
                </div>

                {/* 3. Google Meet Video Link (Auto-Generated & Full Video Integration) */}
                <div className="bg-gradient-to-r from-indigo-50/80 to-purple-50/60 p-3 rounded-xl border border-indigo-200/90 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                      <Video size={14} className="text-indigo-600" />
                      <span>Google Meet Link (Auto-Generated):</span>
                    </label>
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1 shadow-2xs">
                      <Sparkles size={10} className="text-amber-500" /> Auto-Attached
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editableMeetUrl}
                      onChange={(e) => setEditableMeetUrl(e.target.value)}
                      placeholder="https://meet.google.com/xxx-yyyy-zzz"
                      className="flex-1 p-2 bg-white border border-indigo-200 rounded-lg text-xs font-mono text-indigo-950 font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setEditableMeetUrl(generateGoogleMeetLink())}
                      className="px-2.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-all shadow-xs"
                      title="Generate a brand-new unique Google Meet URL"
                    >
                      <RefreshCw size={12} />
                      <span>Fresh Link</span>
                    </button>
                    {editableMeetUrl && (
                      <button
                        type="button"
                        onClick={handleCopyMeet}
                        className="p-2 bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 rounded-lg shrink-0 transition-colors shadow-2xs"
                        title="Copy Google Meet URL"
                      >
                        {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                    )}
                    {editableMeetUrl && (
                      <a
                        href={editableMeetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 rounded-lg shrink-0 transition-colors shadow-2xs"
                        title="Join / Test Google Meet in new tab"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                  <p className="text-[10px] text-indigo-800/80 font-medium">
                    Embedded into Google Calendar location & description as <span className="font-bold">[Join with Google Meet]</span> so guest connects in 1 click.
                  </p>
                </div>

                {/* 4. Guest Email (Auto-Invite via Calendar) */}
                <div className="bg-gradient-to-r from-blue-50/80 to-sky-50/60 p-3 rounded-xl border border-blue-200/90 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-blue-950 flex items-center gap-1.5">
                      <Mail size={14} className="text-blue-600" />
                      <span>Guest Email (Auto-Invites via Google Calendar):</span>
                    </label>
                    {editableGuestEmail ? (
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                        Invite Armed
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 italic">
                        Optional
                      </span>
                    )}
                  </div>

                  <input
                    type="email"
                    value={editableGuestEmail}
                    onChange={(e) => setEditableGuestEmail(e.target.value)}
                    placeholder="e.g. mgpatel0077@gmail.com"
                    className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
                  />

                  {/* Suggestion Chips */}
                  {targetContact?.email && targetContact.email !== editableGuestEmail && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-600 pt-0.5">
                      <span>Suggestion:</span>
                      <button
                        type="button"
                        onClick={() => setEditableGuestEmail(targetContact.email)}
                        className="text-blue-700 font-bold bg-blue-100 hover:bg-blue-200 px-2 py-0.5 rounded-md transition-colors"
                      >
                        + Use {targetContact.email}
                      </button>
                    </div>
                  )}

                  <p className="text-[10px] text-blue-800/80 font-medium">
                    When opening Google Calendar, Google Calendar automatically fills this into the "Add guests" box and sends email notifications.
                  </p>
                </div>

                {/* 5. Agenda & Notes */}
                {parsedData.agenda && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                      Agenda & Notes:
                    </span>
                    <p className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200 leading-relaxed whitespace-pre-line font-normal">
                      {parsedData.agenda}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 text-xs font-medium">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {syncSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>Successfully Synced to Meeting Schedule!</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          {gCalUrl ? (
            <a
              href={gCalUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-300 text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Calendar size={13} className="text-blue-600" />
              <span>Open in Google Calendar</span>
              <ExternalLink size={11} className="text-slate-400" />
            </a>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={syncing || !parsedData || !selectedContactId}
              onClick={handleSyncToContact}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-1.5 transition-all active:scale-95"
            >
              {syncing ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Syncing Schedule...</span>
                </>
              ) : (
                <>
                  <Zap size={14} className="fill-amber-300 text-amber-300" />
                  <span>Sync & Update Schedule</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
