import { useState, useEffect } from 'react';
import { 
  Users, Search, Plus, Sparkles, Filter, Calendar, ExternalLink, 
  MessageSquare, Phone, Video, Trash2, Edit3, CheckCircle2, 
  Clock, MapPin, Building2, Briefcase, Tag, ArrowRight, UserCheck, 
  AlertCircle, ChevronDown, ChevronUp, Check, X, RefreshCw, Send, Zap, Eye, Mail,
  Lock, Copy, ShieldCheck, Database, Download
} from 'lucide-react';
import { FaLinkedin, FaWhatsapp, FaPhoneAlt } from 'react-icons/fa';
import { 
  getLinkedInContacts, 
  getLinkedInStats, 
  createLinkedInContact, 
  updateLinkedInContact, 
  deleteLinkedInContact, 
  extractLinkedInData,
  smartUpdateLinkedInContact 
} from '../api/apiClient';
import { heuristicExtract } from '../utils/linkedinParser';
import { generateGoogleCalendarUrl, getMeetingTitle, generateGoogleMeetLink } from '../utils/calendarSync';
import GeminiCalendarSyncModal from '../components/GeminiCalendarSyncModal';
import BackupRestoreModal from '../components/BackupRestoreModal';

const SKILL_FILTER_TAGS = [
  'All',
  'Flutter',
  'React / MERN',
  'Meta Ads',
  'SEO',
  'Shopify',
  'Node.js',
  'B2B Sales',
  'Dealership Systems'
];

const getFunnelStage = (contact) => {
  if (!contact) {
    return {
      stage: 1,
      name: 'LinkedIn Chat',
      stepNum: 1,
      badge: 'Step 1: LinkedIn Chat',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      pillColor: 'bg-blue-600 text-white',
      nextAction: 'Pitch & gauge interest on LinkedIn → Request email for 10-min Google Meet',
      whatsappUnlocked: false
    };
  }

  const status = contact.status;
  if (status === 'Closed / Partnered') {
    return {
      stage: 4,
      name: 'WhatsApp Handoff',
      stepNum: 4,
      badge: 'Step 4: Active Partner',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      pillColor: 'bg-emerald-600 text-white',
      nextAction: 'Active deal handoffs & live project routing on WhatsApp',
      whatsappUnlocked: true
    };
  }
  if (status === 'Call Completed' || status === 'Proposal / Terms Sent') {
    return {
      stage: 3,
      name: 'Demo & Finalize',
      stepNum: 3,
      badge: 'Step 3: Demo & Finalize',
      color: 'bg-purple-50 text-purple-700 border-purple-300',
      pillColor: 'bg-purple-600 text-white',
      nextAction: 'Finalize 15%–20% referral terms; share WhatsApp upon agreement',
      whatsappUnlocked: true
    };
  }
  if (status === 'Meeting Scheduled' || Boolean(contact.meetingDate)) {
    return {
      stage: 2,
      name: '10-Min Google Meet',
      stepNum: 2,
      badge: 'Step 2: 10-Min Meet',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-300',
      pillColor: 'bg-indigo-600 text-white',
      nextAction: 'Host 10-minute Google Meet demo; do not move to WhatsApp yet',
      whatsappUnlocked: false
    };
  }
  return {
    stage: 1,
    name: 'LinkedIn Chat',
    stepNum: 1,
    badge: 'Step 1: LinkedIn Chat',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    pillColor: 'bg-blue-600 text-white',
    nextAction: 'Pitch & gauge interest on LinkedIn → Request email for 10-min Google Meet',
    whatsappUnlocked: false
  };
};

const CONNECTION_REASONS = [
  'All',
  'Freelancer BDE',
  'Freelance BDE Opportunity',
  'IT Client / Project Lead',
  'Agency Partnership',
  'Hiring / Candidate',
  'General Networking',
  'Other'
];

const STATUS_OPTIONS = [
  'All',
  'Connected',
  'In Conversation',
  'WhatsApp Connected',
  'Meeting Scheduled',
  'Call Completed',
  'Proposal / Terms Sent',
  'Closed / Partnered',
  'Not Interested'
];

const PRIORITY_OPTIONS = ['All', 'Hot', 'Warm', 'Cold'];

const SAMPLE_TEXT = `[Status is reachable](https://www.linkedin.com/in/abhishek-dholakiya-bb1591354/)[Abhishek Dholakiya](https://www.linkedin.com/in/abhishek-dholakiya-bb1591354/)(He/Him)· 1st
Business Development Executive | Driving Revenue Growth | Client Relationship Management | Lead Generation | B2B Sales
Surat, Gujarat, India · DI Solutions
Freelance BDE Opportunity – Webiox Digital Solution (Commission up to 15% on closed projects).
Abhishek Dholakiya: I'm interested.
WhatsApp: 7567664748
Webiox: Locking in quick 10-min catchup. Google Meet: https://meet.google.com/qbb-roeq-hwa`;

const isMeetUrl = (str) => {
  if (!str || typeof str !== 'string') return false;
  return str.startsWith('http://') || str.startsWith('https://');
};

const formatMeetingDateTime = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return {
    date: d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }),
    time: d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  };
};

const getMeetingRelative = (dateStr) => {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const now = new Date();
  const diffDays = Math.round((new Date(target).setHours(0,0,0,0) - new Date(now).setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < -1) return `${Math.abs(diffDays)}d ago`;
  return null;
};

const toDateTimeLocal = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toDateLocal = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const generateWhatsAppMeetingUrl = (contact) => {
  if (!contact) return '#';
  const rawMobile = contact.mobile || (contact.meetingLink && contact.meetingLink.match(/\d{10}/)?.[0]) || '';
  const cleanDigits = rawMobile.replace(/\D/g, '').slice(-10);
  if (!cleanDigits) return '#';

  const dt = formatMeetingDateTime(contact.meetingDate);
  const whenStr = dt ? `${dt.date} at ${dt.time}` : 'upcoming meeting';
  const firstName = (contact.name || 'there').split(' ')[0];
  const meet = contact.meetingLink || 'Google Meet';

  const message = `Hi ${firstName}, confirming our scheduled sync on ${whenStr}.\n\nMeeting Link: ${meet}\n\nLooking forward to speaking with you!\n- Manthan Vaghasiya (Webiox)`;
  return `https://wa.me/91${cleanDigits}?text=${encodeURIComponent(message)}`;
};

const generateEmailMeetingUrl = (contact) => {
  if (!contact || !contact.email) return '#';
  const dt = formatMeetingDateTime(contact.meetingDate);
  const whenStr = dt ? `${dt.date} at ${dt.time}` : 'Upcoming Sync';
  const firstName = (contact.name || 'there').split(' ')[0];
  const meet = contact.meetingLink || 'Google Meet';

  const subject = `${getMeetingTitle(contact)} (${whenStr})`;
  const body = `Hi ${firstName},\n\nLooking forward to our scheduled sync on ${whenStr}.\n\nMeeting Details:\n- Date & Time: ${whenStr} (IST)\n- Google Meet / Platform: ${meet}\n- Focus: Technical & Strategic Partnership Alignment\n\nLooking forward to speaking with you!\n\nBest regards,\nManthan Vaghasiya\nFounder, Webiox\n+91 8347448241`;

  return `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

export default function LinkedIn() {
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedReason, setSelectedReason] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('smart'); // 'smart' | 'form'
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingContactId, setEditingContactId] = useState(null);
  const [rawText, setRawText] = useState('');
  
  // Smart Update Modal states
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedUpdateContactId, setSelectedUpdateContactId] = useState('');
  const [updatePrompt, setUpdatePrompt] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);

  // Calendar & Meet Sync Drawer state
  const [isCalendarSyncOpen, setIsCalendarSyncOpen] = useState(false);

  // Detail Modal state
  const [selectedContact, setSelectedContact] = useState(null);
  const [expandedSummaryIds, setExpandedSummaryIds] = useState({});

  const toggleExpandSummary = (id) => {
    setExpandedSummaryIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const [expandedMeetingIds, setExpandedMeetingIds] = useState({});
  const toggleExpandMeeting = (id) => {
    setExpandedMeetingIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const [isFunnelCollapsed, setIsFunnelCollapsed] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState('All');

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    company: '',
    location: '',
    reason: 'Freelance BDE Opportunity',
    linkedinUrl: '',
    mobile: '',
    email: '',
    status: 'In Conversation',
    priority: 'Warm',
    meetingLink: '',
    meetingDate: '',
    followupDate: '',
    commission: '',
    dealTerms: '',
    skillsInput: '',
    skills: [],
    summary: '',
    notes: '',
    rawSnippet: ''
  });

  useEffect(() => {
    fetchContacts();
    fetchStats();
  }, [selectedReason, selectedStatus, selectedPriority]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedReason !== 'All') params.reason = selectedReason;
      if (selectedStatus !== 'All') params.status = selectedStatus;
      if (selectedPriority !== 'All') params.priority = selectedPriority;
      if (search.trim()) params.search = search.trim();

      const { data } = await getLinkedInContacts(params);
      setContacts(Array.isArray(data) ? data : (data?.contacts || []));
    } catch (err) {
      console.error('Failed to load LinkedIn contacts:', err);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await getLinkedInStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchContacts();
  };

  const openAddModal = () => {
    setEditingContactId(null);
    setRawText('');
    setFormData({
      name: '',
      position: '',
      company: '',
      location: '',
      reason: 'Freelance BDE Opportunity',
      linkedinUrl: '',
      mobile: '',
      email: '',
      status: 'In Conversation',
      priority: 'Warm',
      meetingLink: '',
      meetingDate: '',
      followupDate: '',
      commission: '',
      dealTerms: '',
      skillsInput: '',
      skills: [],
      summary: '',
      notes: '',
      rawSnippet: ''
    });
    setModalTab('smart');
    setIsModalOpen(true);
  };

  const openEditModal = (contact) => {
    setEditingContactId(contact._id);
    setFormData({
      name: contact.name || '',
      position: contact.position || '',
      company: contact.company || '',
      location: contact.location || '',
      reason: contact.reason || 'Freelance BDE Opportunity',
      linkedinUrl: contact.linkedinUrl || '',
      mobile: contact.mobile || '',
      email: contact.email || '',
      status: contact.status || 'In Conversation',
      priority: contact.priority || 'Warm',
      meetingLink: contact.meetingLink || '',
      meetingDate: toDateTimeLocal(contact.meetingDate),
      followupDate: toDateLocal(contact.followupDate),
      commission: contact.commission || '',
      dealTerms: contact.dealTerms || '',
      skillsInput: (contact.skills || []).join(', '),
      skills: contact.skills || [],
      summary: contact.summary || '',
      notes: contact.notes || '',
      rawSnippet: contact.rawSnippet || ''
    });
    setModalTab('form');
    setIsModalOpen(true);
  };

  const handleSmartExtract = async () => {
    if (!rawText.trim()) {
      alert('Please paste some text first or click "Use Sample Data"');
      return;
    }
    setExtracting(true);
    let extractedData = null;
    try {
      const { data } = await extractLinkedInData(rawText);
      extractedData = data;
    } catch (err) {
      console.warn('Backend AI extraction failed or network error occurred; using smart client heuristic parser fallback:', err);
      extractedData = heuristicExtract(rawText);
    }

    if (extractedData) {
      setFormData(prev => ({
        ...prev,
        name: extractedData.name || prev.name,
        position: extractedData.position || prev.position,
        company: extractedData.company || prev.company,
        location: extractedData.location || prev.location,
        reason: extractedData.reason || prev.reason,
        linkedinUrl: extractedData.linkedinUrl || prev.linkedinUrl,
        mobile: extractedData.mobile || prev.mobile,
        email: extractedData.email || prev.email,
        status: extractedData.status || prev.status,
        priority: extractedData.priority || prev.priority,
        meetingLink: extractedData.meetingLink || prev.meetingLink,
        commission: extractedData.commission || prev.commission,
        dealTerms: extractedData.dealTerms || prev.dealTerms,
        skillsInput: Array.isArray(extractedData.skills) ? extractedData.skills.join(', ') : prev.skillsInput,
        skills: Array.isArray(extractedData.skills) ? extractedData.skills : prev.skills,
        summary: extractedData.summary || prev.summary,
        notes: extractedData.notes || prev.notes,
        rawSnippet: rawText
      }));
      setModalTab('form');
    }
    setExtracting(false);
  };

  const openUpdateModal = (contactId = null) => {
    setSelectedUpdateContactId(contactId || (contacts[0]?._id || ''));
    setUpdatePrompt('');
    setUpdateResult(null);
    setIsUpdateModalOpen(true);
  };

  const handleApplySmartUpdate = async (e) => {
    e.preventDefault();
    if (!selectedUpdateContactId) {
      alert('Please select a contact to update.');
      return;
    }
    if (!updatePrompt.trim()) {
      alert('Please enter an update prompt or paste the chat messages.');
      return;
    }
    setUpdating(true);
    try {
      const { data } = await smartUpdateLinkedInContact(selectedUpdateContactId, updatePrompt);
      setUpdateResult(data);
      fetchContacts();
      fetchStats();
    } catch (err) {
      console.error('Smart update failed:', err);
      alert('Failed to apply update: ' + (err.response?.data?.message || err.message));
    } finally {
      setUpdating(false);
    }
  };

  const handleQuickCreateMeet = async (contact) => {
    try {
      const newMeet = generateGoogleMeetLink();
      await updateLinkedInContact(contact._id, {
        meetingLink: newMeet,
        status: contact.status === 'In Conversation' ? 'Meeting Scheduled' : contact.status
      });
      fetchContacts();
      fetchStats();
    } catch (err) {
      console.error('Failed to create quick meet link:', err);
    }
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }
    if (!formData.position.trim()) {
      alert('Position / Headline is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        meetingDate: formData.meetingDate ? new Date(formData.meetingDate).toISOString() : null,
        followupDate: formData.followupDate ? new Date(formData.followupDate).toISOString() : null,
        skills: formData.skillsInput
          ? formData.skillsInput.split(',').map(s => s.trim()).filter(Boolean)
          : formData.skills
      };

      if (editingContactId) {
        await updateLinkedInContact(editingContactId, payload);
      } else {
        await createLinkedInContact(payload);
      }

      setIsModalOpen(false);
      fetchContacts();
      fetchStats();
    } catch (err) {
      console.error('Save contact error:', err);
      alert('Failed to save contact: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await deleteLinkedInContact(id);
      setContacts(prev => (Array.isArray(prev) ? prev : []).filter(c => c._id !== id));
      fetchStats();
      if (selectedContact?._id === id) setSelectedContact(null);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete contact');
    }
  };

  const getReasonColor = (reason) => {
    switch (reason) {
      case 'Freelancer BDE':
        return 'bg-emerald-600/15 text-emerald-700 border-emerald-500/40 font-semibold';
      case 'Freelance BDE Opportunity':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
      case 'IT Client / Project Lead':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'Agency Partnership':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
      case 'Hiring / Candidate':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
      default:
        return 'bg-slate-500/10 text-slate-600 border-slate-500/30';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Meeting Scheduled':
        return 'bg-cyan-500/15 text-cyan-700 border-cyan-400 font-semibold';
      case 'WhatsApp Connected':
        return 'bg-green-500/15 text-green-700 border-green-400';
      case 'Closed / Partnered':
        return 'bg-emerald-600/20 text-emerald-800 border-emerald-500 font-bold';
      case 'In Conversation':
        return 'bg-indigo-500/15 text-indigo-700 border-indigo-400';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Hot':
        return 'bg-red-500 text-white shadow-sm animate-pulse';
      case 'Warm':
        return 'bg-amber-500 text-white shadow-sm';
      default:
        return 'bg-blue-500 text-white shadow-sm';
    }
  };

  // Today's scheduled calls detector for smart reminder banner
  const todayMeetings = contacts.filter(c => {
    if (!c.meetingDate) return false;
    const mDate = new Date(c.meetingDate);
    if (isNaN(mDate.getTime())) return false;
    const today = new Date();
    return (
      mDate.getFullYear() === today.getFullYear() &&
      mDate.getMonth() === today.getMonth() &&
      mDate.getDate() === today.getDate()
    );
  }).map(c => {
    const formatted = formatMeetingDateTime(c.meetingDate);
    return {
      contact: c,
      time: formatted ? formatted.time : 'Today'
    };
  });

  // Filter contacts by selected skill
  const displayedContacts = contacts.filter(contact => {
    if (selectedSkill && selectedSkill !== 'All') {
      const skillsStr = `${(contact.skills || []).join(' ')} ${contact.position || ''} ${contact.notes || ''} ${contact.summary || ''}`.toLowerCase();
      if (selectedSkill === 'React / MERN') {
        if (!skillsStr.includes('react') && !skillsStr.includes('mern')) return false;
      } else if (!skillsStr.includes(selectedSkill.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl text-white shadow-xl border border-slate-700/60 relative overflow-hidden">
        {/* Background glow decoration */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0077b5] rounded-xl shadow-lg shadow-blue-900/40 text-white">
              <FaLinkedin size={26} />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">LinkedIn Outreach & Network</h1>
          </div>
          <p className="text-slate-300 text-sm max-w-2xl">
            Centralized hub for managing inbound messages, connection reasons, WhatsApp follow-ups, and scheduled client & freelancer meetings.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 flex-wrap">
          <button
            onClick={() => setIsBackupModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-600/25 transition-all duration-200 active:scale-95 border border-emerald-400/40"
            title="Download PDF Dossier, Excel, or Complete JSON Database Backup"
          >
            <Database size={18} className="text-emerald-200" />
            <span>💾 Export & Backup</span>
          </button>

          <button
            onClick={() => setIsCalendarSyncOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-500/25 transition-all duration-200 active:scale-95 border border-indigo-400/40"
          >
            <Sparkles size={18} className="text-amber-300 animate-pulse" />
            <span>✨ Gemini Calendar Sync</span>
          </button>

          <button
            onClick={() => openUpdateModal()}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-orange-500/25 transition-all duration-200 active:scale-95 border border-amber-400/40"
          >
            <Zap size={18} className="fill-white" />
            <span>⚡ AI Smart Update</span>
          </button>

          <button
            onClick={() => {
              openAddModal();
              setModalTab('smart');
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-cyan-500/25 transition-all duration-200 active:scale-95"
          >
            <Plus size={18} />
            <span>+ New Connection</span>
          </button>
        </div>
      </div>

      {/* Smart Meeting Reminder Banner (Today's Scheduled Calls) */}
      {todayMeetings.length > 0 && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 border border-blue-400/50 rounded-2xl p-4 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-11 w-11 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-11 w-11 bg-emerald-500 text-white items-center justify-center font-bold shadow-md">
                <Video size={22} />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-400/30">
                  Scheduled Today
                </span>
                <span className="text-xs text-indigo-200 font-bold">• {todayMeetings[0].time}</span>
              </div>
              <h3 className="text-base font-bold text-white leading-tight mt-1">
                {todayMeetings[0].contact.name}
                <span className="text-indigo-200 font-normal text-xs ml-2">
                  ({todayMeetings[0].contact.position || 'Partner'})
                </span>
              </h3>
              <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                {todayMeetings[0].contact.notes || '10-minute partnership catchup'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {isMeetUrl(todayMeetings[0].contact.meetingLink) && (
              <a
                href={todayMeetings[0].contact.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 py-2 px-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all"
              >
                <Video size={14} />
                <span>Join Google Meet</span>
                <ExternalLink size={12} />
              </a>
            )}
            <a
              href={generateGoogleCalendarUrl({
                title: getMeetingTitle(todayMeetings[0].contact),
                startDate: todayMeetings[0].contact.meetingDate,
                location: todayMeetings[0].contact.meetingLink,
                details: todayMeetings[0].contact.notes,
                addGuestEmail: todayMeetings[0].contact.email
              })}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 py-2 px-3 bg-white/10 hover:bg-white/20 text-indigo-200 border border-white/20 text-xs font-bold rounded-xl transition-all shadow-2xs"
            >
              <Calendar size={13} />
              <span>Add to Cal</span>
            </a>
            <button
              type="button"
              onClick={() => setSelectedContact(todayMeetings[0].contact)}
              className="inline-flex items-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold rounded-xl transition-all"
            >
              <span>View Dossier</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Stats Bar (Click to Filter) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => {
            setSelectedStatus('All');
            setSelectedReason('All');
          }}
          className={`bg-white p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'All' && selectedReason === 'All'
              ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
              : 'border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300'
          } flex items-center gap-4`}
          title="Click to view all network contacts"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Network</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats?.totalContacts ?? contacts.length}</h3>
          </div>
        </div>

        <div 
          onClick={() => setSelectedStatus(selectedStatus === 'In Conversation' ? 'All' : 'In Conversation')}
          className={`bg-white p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'In Conversation'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
              : 'border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300'
          } flex items-center gap-4`}
          title="Click to filter by In Conversation"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <MessageSquare size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Chats</p>
            <h3 className="text-2xl font-bold text-indigo-600">{stats?.activeConversations ?? 0}</h3>
          </div>
        </div>

        <div 
          onClick={() => setSelectedStatus(selectedStatus === 'Meeting Scheduled' ? 'All' : 'Meeting Scheduled')}
          className={`bg-white p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'Meeting Scheduled'
              ? 'border-cyan-500 ring-2 ring-cyan-500/20 shadow-md'
              : 'border-slate-200 shadow-sm hover:shadow-md hover:border-cyan-300'
          } flex items-center gap-4`}
          title="Click to filter by Meeting Scheduled"
        >
          <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 shrink-0">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Meetings Set</p>
            <h3 className="text-2xl font-bold text-cyan-600">{stats?.meetingsScheduled ?? 0}</h3>
          </div>
        </div>

        <div 
          onClick={() => setSelectedStatus(selectedStatus === 'Closed / Partnered' ? 'All' : 'Closed / Partnered')}
          className={`bg-white p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'Closed / Partnered'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
              : 'border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300'
          } flex items-center gap-4`}
          title="Click to filter by Closed / Partnered"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Deals / Partners</p>
            <h3 className="text-2xl font-bold text-emerald-600">{stats?.closedPartnered ?? 0}</h3>
          </div>
        </div>
      </div>

      {/* Standard Outreach & Partnership Funnel SOP Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-md border border-indigo-900/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-900/60">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Standard Outreach & Partnership Funnel</span>
            <span className="text-[11px] text-slate-400 font-medium hidden md:inline">• 4-Stage Lead Conversion Workflow</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-[11px] text-indigo-200 font-medium flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/10 w-fit">
              <Lock size={11} className="text-amber-300 shrink-0" />
              <span>WhatsApp shared ONLY after Meet for active leads</span>
            </div>
            <button
              type="button"
              onClick={() => setIsFunnelCollapsed(prev => !prev)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors text-xs flex items-center gap-1"
              title={isFunnelCollapsed ? 'Expand funnel playbook' : 'Collapse funnel playbook'}
            >
              {isFunnelCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>
        </div>

        {/* 4 Interactive Funnel Steps */}
        {!isFunnelCollapsed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3">
            {/* Step 1 */}
            <div 
              onClick={() => setSelectedStatus(selectedStatus === 'In Conversation' ? 'All' : 'In Conversation')}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                selectedStatus === 'In Conversation' 
                  ? 'bg-blue-600/30 border-blue-400 ring-2 ring-blue-500/50' 
                  : 'bg-white/5 hover:bg-white/10 border-white/10'
              }`}
              title="Click to filter Step 1 contacts"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded">1. LinkedIn Chat</span>
                <span className="text-[10px] font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                  {contacts.filter(c => getFunnelStage(c).stage === 1).length}
                </span>
              </div>
              <p className="text-xs font-bold text-white">Interest / Pitch</p>
              <p className="text-[10px] text-slate-300 leading-snug mt-1">Keep on LinkedIn. Gauge interest. Do NOT share WhatsApp yet.</p>
            </div>

            {/* Step 2 */}
            <div 
              onClick={() => setSelectedStatus(selectedStatus === 'Meeting Scheduled' ? 'All' : 'Meeting Scheduled')}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                selectedStatus === 'Meeting Scheduled' 
                  ? 'bg-indigo-600/30 border-indigo-400 ring-2 ring-indigo-500/50' 
                  : 'bg-white/5 hover:bg-white/10 border-white/10'
              }`}
              title="Click to filter Step 2 contacts"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded">2. 10-Min Google Meet</span>
                <span className="text-[10px] font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                  {contacts.filter(c => getFunnelStage(c).stage === 2).length}
                </span>
              </div>
              <p className="text-xs font-bold text-white">Lock Time & Email</p>
              <p className="text-[10px] text-slate-300 leading-snug mt-1">Request email on LinkedIn & send 10-min calendar invite.</p>
            </div>

            {/* Step 3 */}
            <div 
              onClick={() => setSelectedStatus(selectedStatus === 'Call Completed' ? 'All' : 'Call Completed')}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                selectedStatus === 'Call Completed' 
                  ? 'bg-purple-600/30 border-purple-400 ring-2 ring-purple-500/50' 
                  : 'bg-white/5 hover:bg-white/10 border-white/10'
              }`}
              title="Click to filter Step 3 contacts"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded">3. Demo & Finalize</span>
                <span className="text-[10px] font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                  {contacts.filter(c => getFunnelStage(c).stage === 3).length}
                </span>
              </div>
              <p className="text-xs font-bold text-white">Partnership / Deal Terms</p>
              <p className="text-[10px] text-slate-300 leading-snug mt-1">Showcase Webiox builds & finalize 15%–20% milestone referral.</p>
            </div>

            {/* Step 4 */}
            <div 
              onClick={() => setSelectedStatus(selectedStatus === 'Closed / Partnered' ? 'All' : 'Closed / Partnered')}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                selectedStatus === 'Closed / Partnered' 
                  ? 'bg-emerald-600/30 border-emerald-400 ring-2 ring-emerald-500/50' 
                  : 'bg-white/5 hover:bg-white/10 border-white/10'
              }`}
              title="Click to filter Step 4 contacts"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded">4. WhatsApp Handoff</span>
                <span className="text-[10px] font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                  {contacts.filter(c => getFunnelStage(c).stage === 4).length}
                </span>
              </div>
              <p className="text-xs font-bold text-white">Active Lead Handoffs</p>
              <p className="text-[10px] text-slate-300 leading-snug mt-1">Unlocked ONLY post-Meet for live deal routing & client builds.</p>
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs by Connection Reason */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CONNECTION_REASONS.map((reason) => {
          const isActive = selectedReason === reason;
          return (
            <button
              key={reason}
              onClick={() => setSelectedReason(reason)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
              }`}
            >
              {reason}
            </button>
          );
        })}
      </div>

      {/* Search & Secondary Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, position, company, phone, skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt === 'All' ? 'All Statuses' : opt}</option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {PRIORITY_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt === 'All' ? 'All Priorities' : opt}</option>
            ))}
          </select>

          <button
            onClick={() => {
              setSearch('');
              setSelectedReason('All');
              setSelectedStatus('All');
              setSelectedPriority('All');
            }}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors"
            title="Reset Filters"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Partner Skill & Capability Matcher */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
          <Tag size={12} className="text-indigo-500" />
          <span>Skill Matcher:</span>
        </span>
        {SKILL_FILTER_TAGS.map((skill) => {
          const isActive = selectedSkill === skill;
          return (
            <button
              key={skill}
              onClick={() => setSelectedSkill(isActive ? 'All' : skill)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
              }`}
            >
              {skill}
            </button>
          );
        })}
        {selectedSkill !== 'All' && (
          <button
            onClick={() => setSelectedSkill('All')}
            className="text-[11px] font-bold text-slate-400 hover:text-slate-600 underline ml-1 shrink-0"
          >
            Clear ({displayedContacts.length})
          </button>
        )}
      </div>

      {/* Cards List Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-500 text-sm font-medium">Loading LinkedIn connections...</p>
        </div>
      ) : displayedContacts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <FaLinkedin size={32} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-slate-800">No Matching Connections Found</h3>
            <p className="text-sm text-slate-500">
              No contacts match your current filter{selectedSkill !== 'All' ? ` for skill "${selectedSkill}"` : ''}. Reset your filters to view all connections.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setSelectedSkill('All');
                setSelectedStatus('All');
                setSelectedReason('All');
                setSelectedPriority('All');
                setSearch('');
              }}
              className="btn-primary flex items-center gap-2"
            >
              <RefreshCw size={16} />
              <span>Reset All Filters</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedContacts.map((contact) => {
            const cleanPhone = contact.mobile?.replace(/\D/g, '').slice(-10);
            const funnelInfo = getFunnelStage(contact);
            return (
              <div
                key={contact._id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:border-blue-400/60"
              >
                {/* Card Header Top */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    {/* Reason Badge & Funnel Step Badge */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getReasonColor(contact.reason)}`}>
                        {contact.reason}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${funnelInfo.color}`}>
                        {funnelInfo.badge}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${getPriorityBadge(contact.priority)}`}>
                        {contact.priority}
                      </span>
                      <span 
                        onClick={(e) => {
                          if (contact.status === 'Meeting Scheduled' || contact.meetingDate) {
                            e.stopPropagation();
                            toggleExpandMeeting(contact._id);
                          }
                        }}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadge(contact.status)} ${
                          (contact.status === 'Meeting Scheduled' || contact.meetingDate) ? 'cursor-pointer hover:opacity-85' : ''
                        }`}
                        title={contact.status === 'Meeting Scheduled' ? 'Click to show / hide meeting schedule' : undefined}
                      >
                        {contact.status}
                      </span>
                    </div>
                  </div>

                  {/* Profile & Name */}
                  <div className="flex items-start gap-3 pt-1">
                    <div 
                      onClick={() => setSelectedContact(contact)}
                      className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-800 to-indigo-900 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md cursor-pointer hover:scale-105 transition-transform"
                      title="Click to view full details"
                    >
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 
                        onClick={() => setSelectedContact(contact)}
                        className="font-bold text-slate-900 text-base leading-tight truncate hover:text-primary transition-colors cursor-pointer"
                        title="Click to view full details"
                      >
                        {contact.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-0.5 leading-relaxed">
                        {contact.position}
                      </p>
                    </div>
                  </div>

                  {/* Company & Location Info */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-slate-600">
                    {contact.company && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Building2 size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{contact.company}</span>
                      </div>
                    )}
                    {contact.location && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{contact.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Commission & Deal Terms Box */}
                  {contact.commission && (
                    <div className="p-2.5 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 border border-amber-300/80 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                          <span>💰 Payout Terms:</span>
                          <span className="text-emerald-700 font-extrabold">{contact.commission} Commission</span>
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                          {contact.status === 'Closed / Partnered' ? 'Active Partner' : 'Terms Offered'}
                        </span>
                      </div>
                      {contact.dealTerms && (
                        <p className="text-[11px] text-slate-700 font-medium leading-snug">
                          {contact.dealTerms}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Scheduled Meeting & Call Banner (Click to show / hide details) */}
                  {(contact.status === 'Meeting Scheduled' || Boolean(contact.meetingDate)) && (
                    <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-blue-50/90 border border-blue-200/90 rounded-xl overflow-hidden shadow-xs transition-all">
                      {/* Banner Header - Click to Toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpandMeeting(contact._id);
                        }}
                        className="w-full p-2.5 flex items-center justify-between gap-2 hover:bg-blue-100/50 transition-colors text-left select-none"
                        title="Click to show / hide meeting schedule"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                          </span>
                          <Calendar size={13} className="text-blue-600 shrink-0" />
                          <span className="text-blue-900 font-bold text-xs">Meeting Scheduled</span>
                          {/* Quick summary line when collapsed */}
                          {contact.meetingDate && formatMeetingDateTime(contact.meetingDate) && (
                            <span className="text-[11px] font-semibold text-blue-700 truncate hidden sm:inline">
                              • {formatMeetingDateTime(contact.meetingDate).date}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {contact.meetingDate && getMeetingRelative(contact.meetingDate) && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white tracking-wide shadow-xs">
                              {getMeetingRelative(contact.meetingDate)}
                            </span>
                          )}
                          <span className="p-0.5 text-blue-700 hover:text-blue-900">
                            {expandedMeetingIds[contact._id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        </div>
                      </button>

                      {/* Expandable Details Container */}
                      {expandedMeetingIds[contact._id] && (
                        <div className="px-3 pb-3 pt-0 space-y-2 animate-in fade-in duration-200">
                          {/* When, Where & Direct Channels Box */}
                          <div className="bg-white/95 border border-blue-100/90 rounded-xl p-3 space-y-2 text-[11px] shadow-2xs">
                            {/* WHEN */}
                            <div className="flex items-start gap-1.5">
                              <Clock size={13} className="text-blue-600 shrink-0 mt-0.5" />
                              <div className="leading-tight">
                                <span className="text-slate-400 font-medium mr-1">When:</span>
                                {contact.meetingDate && formatMeetingDateTime(contact.meetingDate) ? (
                                  <span className="font-bold text-slate-800">
                                    {formatMeetingDateTime(contact.meetingDate).date} •{' '}
                                    <span className="text-blue-700 font-extrabold">
                                      {formatMeetingDateTime(contact.meetingDate).time}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-amber-700 font-medium italic">Date/time to be set</span>
                                )}
                              </div>
                            </div>

                            {/* WHERE / PLATFORM */}
                            <div className="flex items-start gap-1.5">
                              {isMeetUrl(contact.meetingLink) ? (
                                <Video size={13} className="text-indigo-600 shrink-0 mt-0.5" />
                              ) : (contact.meetingLink?.toLowerCase().includes('call') || contact.mobile) ? (
                                <Phone size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                              ) : (
                                <MapPin size={13} className="text-blue-600 shrink-0 mt-0.5" />
                              )}
                              <div className="leading-tight min-w-0 flex-1">
                                <span className="text-slate-400 font-medium mr-1">Where:</span>
                                <span className="font-semibold text-slate-800 break-words" title={contact.meetingLink || 'Scheduled call'}>
                                  {contact.meetingLink || (contact.mobile ? `Direct Phone Call (${contact.mobile})` : 'Google Meet / Online Call')}
                                </span>
                              </div>
                            </div>

                            {/* Channels + Quick Icon Actions (WhatsApp/Email on left, Add to Cal & Reschedule on right) */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[10px]">
                              {/* Channels: WhatsApp & Email Badges */}
                              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                {contact.mobile && (
                                  <a
                                    href={generateWhatsAppMeetingUrl(contact)}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Send WhatsApp Confirmation & Details"
                                    className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 active:scale-95 border border-emerald-300/90 px-2 py-0.5 rounded-md font-semibold transition-all shadow-2xs group/wa"
                                  >
                                    <FaWhatsapp size={11} className="text-emerald-600 shrink-0" />
                                    <span>+91 {contact.mobile}</span>
                                    <ExternalLink size={8} className="opacity-40 group-hover/wa:opacity-100 text-emerald-700" />
                                  </a>
                                )}
                                {contact.email && (
                                  <a
                                    href={generateEmailMeetingUrl(contact)}
                                    onClick={(e) => e.stopPropagation()}
                                    title="Send Meeting Confirmation Email"
                                    className="inline-flex items-center gap-1 text-sky-800 bg-sky-50 hover:bg-sky-100 active:scale-95 border border-sky-300/90 px-2 py-0.5 rounded-md font-semibold truncate transition-all shadow-2xs max-w-[145px]"
                                  >
                                    <Mail size={11} className="text-sky-600 shrink-0" />
                                    <span className="truncate">{contact.email}</span>
                                  </a>
                                )}
                                {!contact.mobile && !contact.email && (
                                  <span className="text-slate-400 italic font-medium">No contact channel</span>
                                )}
                              </div>

                              {/* Action Icon Buttons: Add to Cal & Reschedule */}
                              <div className="flex items-center gap-1 shrink-0">
                                {contact.meetingDate && (
                                  <a
                                    href={generateGoogleCalendarUrl({
                                      title: getMeetingTitle(contact),
                                      startDate: contact.meetingDate,
                                      location: isMeetUrl(contact.meetingLink) ? contact.meetingLink : generateGoogleMeetLink(),
                                      details: contact.notes || contact.dealTerms,
                                      addGuestEmail: contact.email
                                    })}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Add Event to Google Calendar"
                                    className="p-1.5 bg-white hover:bg-indigo-50 active:scale-90 text-indigo-700 hover:text-indigo-900 rounded-lg border border-indigo-200 transition-all shadow-2xs flex items-center justify-center"
                                  >
                                    <Calendar size={13} className="text-indigo-600" />
                                  </a>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(contact);
                                  }}
                                  title="Reschedule / Edit Meeting"
                                  className="p-1.5 bg-white hover:bg-slate-100 active:scale-90 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 transition-all shadow-2xs flex items-center justify-center"
                                >
                                  <Edit3 size={12} className="text-slate-500" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Primary Call / Video Action Buttons (Side by Side!) */}
                          <div>
                            {isMeetUrl(contact.meetingLink) ? (
                              <a
                                href={contact.meetingLink}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                              >
                                <Video size={14} />
                                <span>Join Google Meet</span>
                                <ExternalLink size={11} className="opacity-80" />
                              </a>
                            ) : (contact.mobile || (contact.meetingLink && /\d{10}/.test(contact.meetingLink))) ? (
                              <div className="grid grid-cols-2 gap-2">
                                <a
                                  href={`tel:${contact.mobile || contact.meetingLink.match(/\d{10}/)?.[0]}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center justify-center gap-1.5 py-2 px-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all truncate"
                                  title={`Call +91 ${contact.mobile}`}
                                >
                                  <Phone size={13} className="shrink-0" />
                                  <span className="truncate">Call ({cleanPhone})</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickCreateMeet(contact);
                                  }}
                                  className="inline-flex items-center justify-center gap-1.5 py-2 px-2 bg-indigo-50 hover:bg-indigo-100 active:scale-[0.98] text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-all shadow-2xs truncate"
                                  title="Generate and attach a Google Meet link"
                                >
                                  <Video size={13} className="text-indigo-600 shrink-0" />
                                  <span className="truncate">⚡ Create Meet Link</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickCreateMeet(contact);
                                }}
                                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                              >
                                <Video size={14} />
                                <span>⚡ Generate Google Meet Link</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Skills Chips */}
                  {contact.skills && contact.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {contact.skills.slice(0, 3).map((skill, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-medium">
                          {skill}
                        </span>
                      ))}
                      {contact.skills.length > 3 && (
                        <span className="text-[10px] text-slate-400 self-center font-medium">
                          +{contact.skills.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Executive Summary with Full Read Toggle */}
                  {contact.summary && (
                    <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200/80 transition-all">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                          <Sparkles size={11} className="text-indigo-500" />
                          <span>Executive Summary</span>
                        </span>
                        {contact.summary.length > 80 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandSummary(contact._id);
                            }}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 hover:underline"
                          >
                            <span>{expandedSummaryIds[contact._id] ? 'Show Less' : 'Read Full'}</span>
                            {expandedSummaryIds[contact._id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        )}
                      </div>
                      <p className={`text-xs text-slate-600 leading-relaxed italic ${expandedSummaryIds[contact._id] ? '' : 'line-clamp-2'}`}>
                        "{contact.summary}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Actions Bottom */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* WhatsApp button with SOP Lock/Unlock Rule */}
                    {cleanPhone ? (
                      funnelInfo.whatsappUnlocked ? (
                        <a
                          href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hi ${contact.name}, Manthan here from Webiox.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Chat on WhatsApp (Active Lead Handoff)"
                          className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors border border-emerald-200 flex items-center gap-1"
                        >
                          <FaWhatsapp size={15} />
                        </a>
                      ) : (
                        <span
                          title="SOP Rule: WhatsApp is only shared after the 10-minute Google Meet demo for active lead handoffs"
                          className="p-2 bg-slate-100 text-slate-400 rounded-lg border border-slate-200 cursor-not-allowed flex items-center gap-1 relative group/lock"
                        >
                          <FaWhatsapp size={14} className="opacity-40" />
                          <Lock size={10} className="text-amber-600 absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-2xs border border-amber-300" />
                        </span>
                      )
                    ) : (
                      <button
                        disabled
                        title={funnelInfo.stage <= 2 ? "WhatsApp unlocked only post-Meet for active leads" : "No phone number available"}
                        className="p-2 bg-slate-100 text-slate-300 rounded-lg cursor-not-allowed relative"
                      >
                        <FaWhatsapp size={15} />
                        {funnelInfo.stage <= 2 && (
                          <Lock size={9} className="text-slate-400 absolute -top-1 -right-1" />
                        )}
                      </button>
                    )}

                    {/* Phone button */}
                    {cleanPhone && (
                      <a
                        href={`tel:${cleanPhone}`}
                        title="Call"
                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white rounded-lg transition-colors border border-blue-200"
                      >
                        <FaPhoneAlt size={13} />
                      </a>
                    )}

                    {/* LinkedIn button */}
                    {contact.linkedinUrl && (
                      <a
                        href={contact.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open LinkedIn Profile"
                        className="p-2 bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white rounded-lg transition-colors border border-sky-200"
                      >
                        <FaLinkedin size={15} />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* View Full Details button */}
                    <button
                      onClick={() => setSelectedContact(contact)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="View Full Profile & Notes"
                    >
                      <Eye size={15} />
                    </button>

                    {/* Quick AI Update button */}
                    <button
                      onClick={() => openUpdateModal(contact._id)}
                      className="px-2 py-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-800 rounded-md transition-colors border border-amber-200 flex items-center gap-1"
                      title="AI Smart Update this Contact"
                    >
                      <Zap size={11} className="fill-amber-600" /> Update
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={() => openEditModal(contact)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors"
                      title="Edit Connection"
                    >
                      <Edit3 size={15} />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(contact._id, contact.name)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form & Smart Extract Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg text-white">
                  <FaLinkedin size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {editingContactId ? 'Edit LinkedIn Connection' : 'Add LinkedIn Connection'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Track outreach conversations, purpose, WhatsApp and scheduled meetings.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setModalTab('smart')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all ${
                  modalTab === 'smart'
                    ? 'border-primary text-primary bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles size={16} />
                <span>1. Smart Auto-Extract</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('form')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all ${
                  modalTab === 'form'
                    ? 'border-primary text-primary bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Edit3 size={16} />
                <span>2. Form Details</span>
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {modalTab === 'smart' ? (
                /* TAB 1: Smart Auto Extract */
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <Sparkles size={14} className="text-blue-600" />
                      Paste raw LinkedIn messages or copied profile text:
                    </p>
                    <p className="text-blue-800 leading-relaxed">
                      Copy the chat dialogue, WhatsApp conversation, or LinkedIn profile. The system will automatically extract Name, Position, Connection Reason, WhatsApp Number, Google Meet link, and Notes!
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">Raw Copied Text / Messages</label>
                      <button
                        type="button"
                        onClick={() => setRawText(SAMPLE_TEXT)}
                        className="text-xs text-primary hover:underline font-semibold"
                      >
                        Try with Abhishek's Sample
                      </button>
                    </div>
                    <textarea
                      rows={10}
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="Paste text copied from LinkedIn chat, profile, or WhatsApp here..."
                      className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setModalTab('form')}
                      className="btn-secondary text-xs"
                    >
                      Skip to Form
                    </button>
                    <button
                      type="button"
                      disabled={extracting || !rawText.trim()}
                      onClick={handleSmartExtract}
                      className="btn-primary text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                    >
                      {extracting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Extracting Profile & Chat...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          <span>Auto-Fill Form</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* TAB 2: Structured Form */
                <form id="contact-form" onSubmit={handleSaveContact} className="space-y-4">
                  {/* Row 1: Name & Position */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Abhishek Dholakiya"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input-field text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Position / Headline <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Business Development Executive | IT Sales"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="input-field text-sm"
                      />
                    </div>
                  </div>

                  {/* Row 2: Company & Location */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Organization</label>
                      <input
                        type="text"
                        placeholder="e.g. DI Solutions"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="input-field text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                      <input
                        type="text"
                        placeholder="e.g. Surat, Gujarat, India"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="input-field text-sm"
                      />
                    </div>
                  </div>

                  {/* Row 3: Connection Reason & Stage */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Connection Reason / Purpose
                      </label>
                      <select
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        className="input-field text-xs font-medium"
                      >
                        {CONNECTION_REASONS.filter(r => r !== 'All').map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Stage / Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="input-field text-xs font-medium"
                      >
                        {STATUS_OPTIONS.filter(s => s !== 'All').map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="input-field text-xs font-medium"
                      >
                        <option value="Hot">Hot (Immediate Call/Close)</option>
                        <option value="Warm">Warm (Interested)</option>
                        <option value="Cold">Cold (Slow/Uncertain)</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 4: Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp / Phone</label>
                      <input
                        type="text"
                        placeholder="e.g. 7567664748"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        className="input-field text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Optional)</label>
                      <input
                        type="email"
                        placeholder="e.g. abhishek@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="input-field text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">LinkedIn URL</label>
                      <input
                        type="url"
                        placeholder="https://www.linkedin.com/in/..."
                        value={formData.linkedinUrl}
                        onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                        className="input-field text-sm"
                      />
                    </div>
                  </div>

                  {/* Row 5: Meeting & Follow-up Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <div>
                      <label className="block text-xs font-bold text-blue-900 mb-1 flex items-center gap-1">
                        <Clock size={12} className="text-blue-600" />
                        <span>Meeting Date & Time</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.meetingDate}
                        onChange={(e) => setFormData({ ...formData, meetingDate: e.target.value })}
                        className="input-field text-xs font-medium bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-blue-900 mb-1 flex items-center gap-1">
                        <Video size={12} className="text-blue-600" />
                        <span>Meeting Link / Platform</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. https://meet.google.com/... or Direct Call"
                        value={formData.meetingLink}
                        onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                        className="input-field text-xs font-medium bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Calendar size={12} className="text-slate-500" />
                        <span>Next Follow-up Date</span>
                      </label>
                      <input
                        type="date"
                        value={formData.followupDate}
                        onChange={(e) => setFormData({ ...formData, followupDate: e.target.value })}
                        className="input-field text-xs font-medium bg-white"
                      />
                    </div>
                  </div>

                  {/* Row 6: Commission & Deal Terms */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl">
                    <div>
                      <label className="block text-xs font-bold text-amber-950 mb-1">
                        Agreed Commission / Payout
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 15% or ₹10,000/deal"
                        value={formData.commission}
                        onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                        className="input-field text-sm bg-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-amber-950 mb-1">
                        Agreement Terms / Scope
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. He finds leads, Webiox pays 15% commission on closed and collected projects."
                        value={formData.dealTerms}
                        onChange={(e) => setFormData({ ...formData, dealTerms: e.target.value })}
                        className="input-field text-sm bg-white"
                      />
                    </div>
                  </div>

                  {/* Row 7: Skills */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Skills & Tags (comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. B2B Sales, Lead Generation, Node.js, Upwork"
                      value={formData.skillsInput}
                      onChange={(e) => setFormData({ ...formData, skillsInput: e.target.value })}
                      className="input-field text-sm"
                    />
                  </div>

                  {/* Row 8: Executive Summary */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Executive Summary
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Commission up to 15% on closed projects. Meeting scheduled for tech capabilities review."
                      value={formData.summary}
                      onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                      className="input-field text-sm"
                    />
                  </div>

                  {/* Row 8: Full Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Conversation Notes / Discussion Points
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Enter detailed conversation history, discussion points, or next steps..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="input-field text-sm font-sans"
                    />
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            {modalTab === 'form' && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setModalTab('smart')}
                  className="text-xs text-primary font-semibold flex items-center gap-1.5 hover:underline"
                >
                  <Sparkles size={14} /> Back to Smart Extract
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="contact-form"
                    disabled={saving}
                    className="btn-primary text-xs flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Save Connection</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Smart Update Modal */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-md shadow-orange-500/20">
                  <Zap size={20} className="fill-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">⚡ AI Smart Update Contact</h3>
                  <p className="text-xs text-slate-300">
                    Select person & type a prompt or paste new WhatsApp / call updates.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUpdateModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleApplySmartUpdate} className="p-6 space-y-4">
              {/* Select Person */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
                  1. Select Contact to Update
                </label>
                <select
                  value={selectedUpdateContactId}
                  onChange={(e) => {
                    setSelectedUpdateContactId(e.target.value);
                    setUpdateResult(null);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                >
                  <option value="" disabled>-- Select a person --</option>
                  {contacts.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} — {c.status} ({c.company || c.reason || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Inspiration Pills */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                  Quick Prompt Templates (Click to fill):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setUpdatePrompt("Call done! Agreed to find leads for Webiox on a 15% commission basis. Mark as Closed Partner.")}
                    className="text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors text-left"
                  >
                    🤝 Closed Partner (15% Commission)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdatePrompt("Scheduled 10-minute Google Meet call for tomorrow at 5:30 PM. He will connect on mobile.")}
                    className="text-[11px] font-medium bg-blue-50 hover:bg-blue-100 text-blue-800 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors text-left"
                  >
                    📅 Schedule Meeting
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdatePrompt("Sent details on WhatsApp. Waiting for response on milestone commissions.")}
                    className="text-[11px] font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors text-left"
                  >
                    💬 WhatsApp Follow-up
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdatePrompt("Not interested currently, follow up next month.")}
                    className="text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-300 transition-colors text-left"
                  >
                    ❌ Not Interested
                  </button>
                </div>
              </div>

              {/* Update Prompt / Messages Input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
                  2. What's the Update? (Type prompt or paste messages)
                </label>
                <textarea
                  rows={4}
                  required
                  value={updatePrompt}
                  onChange={(e) => setUpdatePrompt(e.target.value)}
                  placeholder="e.g. 'We connected on call at 5:30 PM, he will find leads and we pay 15%' or paste latest WhatsApp chat..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
                />
              </div>

              {/* Update Result Feedback Banner */}
              {updateResult && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-emerald-900 animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Successfully Updated via AI!</span>
                  </div>
                  {updateResult.appliedChanges && updateResult.appliedChanges.length > 0 && (
                    <ul className="list-disc list-inside text-[11px] text-emerald-700 pl-1 space-y-0.5">
                      {updateResult.appliedChanges.map((change, i) => (
                        <li key={i}>{change}</li>
                      ))}
                    </ul>
                  )}
                  {updateResult.logEntry && (
                    <p className="text-[11px] text-emerald-800 italic bg-white/60 p-1.5 rounded border border-emerald-100">
                      "{updateResult.logEntry}"
                    </p>
                  )}
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  {updateResult ? 'Close' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={updating || !updatePrompt.trim() || !selectedUpdateContactId}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
                >
                  {updating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Applying AI Update...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={15} className="fill-white" />
                      <span>Apply AI Update</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Detailed Contact View Modal (Full Read) */}
      {selectedContact && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-start justify-between shrink-0">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md">
                  {selectedContact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-lg text-white leading-tight">
                      {selectedContact.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${getPriorityBadge(selectedContact.priority)}`}>
                      {selectedContact.priority}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadge(selectedContact.status)}`}>
                      {selectedContact.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium">
                    {selectedContact.position}
                  </p>
                  {(selectedContact.company || selectedContact.location) && (
                    <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      {selectedContact.company && <span>{selectedContact.company}</span>}
                      {selectedContact.company && selectedContact.location && <span>•</span>}
                      {selectedContact.location && <span>{selectedContact.location}</span>}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-5 text-slate-800">
              {/* Standard Funnel Progression Tracker */}
              {(() => {
                const fInfo = getFunnelStage(selectedContact);
                return (
                  <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2 border border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                        <ShieldCheck size={14} className="text-indigo-400" />
                        <span>Standard Outreach Funnel Progress</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${fInfo.pillColor}`}>
                        {fInfo.badge}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-center text-[10px]">
                      <div className={`p-1.5 rounded-lg border ${fInfo.stage >= 1 ? 'bg-blue-600/30 border-blue-400 text-blue-200 font-bold' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                        1. LinkedIn Chat
                      </div>
                      <div className={`p-1.5 rounded-lg border ${fInfo.stage >= 2 ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200 font-bold' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                        2. 10-Min Meet
                      </div>
                      <div className={`p-1.5 rounded-lg border ${fInfo.stage >= 3 ? 'bg-purple-600/30 border-purple-400 text-purple-200 font-bold' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                        3. Demo & Finalize
                      </div>
                      <div className={`p-1.5 rounded-lg border ${fInfo.stage >= 4 ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 font-bold' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                        4. WhatsApp (Active)
                      </div>
                    </div>

                    <div className="pt-1 text-[11px] text-slate-300 flex items-center gap-1.5">
                      <span className="text-indigo-400 font-bold shrink-0">Next Action:</span>
                      <span className="text-slate-200">{fInfo.nextAction}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Scheduled Meeting Banner in Detail View */}
              {(selectedContact.status === 'Meeting Scheduled' || Boolean(selectedContact.meetingDate)) && (
                <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                      </span>
                      <Calendar size={16} className="text-blue-600" />
                      <span>Scheduled Meeting / Discussion</span>
                    </div>
                    {selectedContact.meetingDate && getMeetingRelative(selectedContact.meetingDate) && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white tracking-wide shadow-xs">
                        {getMeetingRelative(selectedContact.meetingDate)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/90 p-3.5 rounded-lg border border-blue-100 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium block mb-0.5">When (Date & Time):</span>
                      {selectedContact.meetingDate && formatMeetingDateTime(selectedContact.meetingDate) ? (
                        <div className="font-bold text-slate-800 text-sm">
                          {formatMeetingDateTime(selectedContact.meetingDate).date}
                          <span className="text-blue-600 ml-1.5 font-extrabold">
                            {formatMeetingDateTime(selectedContact.meetingDate).time}
                          </span>
                        </div>
                      ) : (
                        <span className="text-amber-700 italic font-medium">To be scheduled</span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium block mb-0.5">Where / Platform:</span>
                      <div className="font-bold text-slate-800 text-sm break-words">
                        {selectedContact.meetingLink || (selectedContact.mobile ? `Direct Phone Call (${selectedContact.mobile})` : 'Google Meet / Online Call')}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {isMeetUrl(selectedContact.meetingLink) && (
                      <a
                        href={selectedContact.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                      >
                        <Video size={14} />
                        <span>Open Google Meet</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                    {(selectedContact.mobile || (selectedContact.meetingLink && /\d{10}/.test(selectedContact.meetingLink))) && (
                      <a
                        href={`tel:${selectedContact.mobile || selectedContact.meetingLink.match(/\d{10}/)?.[0]}`}
                        className="inline-flex items-center gap-1.5 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                      >
                        <Phone size={14} />
                        <span>Call {selectedContact.mobile || selectedContact.name}</span>
                      </a>
                    )}
                    {selectedContact.mobile && (
                      <a
                        href={generateWhatsAppMeetingUrl(selectedContact)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 py-2 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300 transition-colors shadow-xs"
                      >
                        <FaWhatsapp size={14} className="text-emerald-600" />
                        <span>Send WhatsApp</span>
                      </a>
                    )}
                    {selectedContact.email && (
                      <a
                        href={generateEmailMeetingUrl(selectedContact)}
                        className="inline-flex items-center gap-1.5 py-2 px-3.5 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold rounded-lg border border-sky-300 transition-colors shadow-xs"
                      >
                        <Mail size={14} className="text-sky-600" />
                        <span>Send Email Invite</span>
                      </a>
                    )}
                    {selectedContact.meetingDate && (
                      <a
                        href={generateGoogleCalendarUrl({
                          title: getMeetingTitle(selectedContact),
                          startDate: selectedContact.meetingDate,
                          location: selectedContact.meetingLink,
                          details: selectedContact.notes || selectedContact.dealTerms,
                          addGuestEmail: selectedContact.email
                        })}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors shadow-xs"
                      >
                        <Calendar size={14} className="text-indigo-600" />
                        <span>Add to Google Calendar</span>
                        <ExternalLink size={11} className="text-indigo-400" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const contactToEdit = selectedContact;
                        setSelectedContact(null);
                        openEditModal(contactToEdit);
                      }}
                      className="inline-flex items-center gap-1 py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors"
                    >
                      <Edit3 size={13} />
                      <span>Reschedule</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Full Executive Summary */}
              {selectedContact.summary && (
                <div className="p-4 bg-indigo-50/80 border border-indigo-200/80 rounded-xl space-y-1.5 shadow-sm">
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-600" />
                    <span>Executive Summary (Full Read)</span>
                  </h4>
                  <p className="text-xs text-indigo-950 leading-relaxed font-medium">
                    {selectedContact.summary}
                  </p>
                </div>
              )}

              {/* Deal Terms / Commission */}
              {(selectedContact.commission || selectedContact.dealTerms) && (
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">
                      💰 Payout & Deal Terms: {selectedContact.commission && <span className="text-emerald-700 font-extrabold">{selectedContact.commission} Commission</span>}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                      {selectedContact.status === 'Closed / Partnered' ? 'Active Partner' : 'Offered Terms'}
                    </span>
                  </div>
                  {selectedContact.dealTerms && (
                    <p className="text-xs text-slate-700 leading-relaxed font-medium pt-1">
                      {selectedContact.dealTerms}
                    </p>
                  )}
                </div>
              )}

              {/* Contact Information & Channels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Category / Reason:</span>
                  <span className="font-semibold text-slate-800">{selectedContact.reason || 'Freelance BDE Opportunity'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Direct Phone / WhatsApp:</span>
                  <span className="font-semibold text-slate-800">{selectedContact.mobile || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Email:</span>
                  <span className="font-semibold text-slate-800">{selectedContact.email || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Scheduled Meeting / Call:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedContact.meetingDate ? new Date(selectedContact.meetingDate).toLocaleString('en-IN') : (selectedContact.meetingLink || 'None')}
                  </span>
                </div>
              </div>

              {/* Skills */}
              {selectedContact.skills && selectedContact.skills.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Key Skills & Focus Areas
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedContact.skills.map((skill, idx) => (
                      <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Notes */}
              {selectedContact.notes && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Interaction Notes & Background
                  </h4>
                  <pre className="text-xs font-sans text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed">
                    {selectedContact.notes}
                  </pre>
                </div>
              )}

              {/* Conversation Log Timeline */}
              {selectedContact.conversationLog && selectedContact.conversationLog.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-primary" />
                    <span>Conversation Log ({selectedContact.conversationLog.length} messages)</span>
                  </h4>
                  <div className="space-y-2 border-l-2 border-slate-200 pl-3.5 ml-1">
                    {selectedContact.conversationLog.map((log, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{log.sender}</span>
                          <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                          {log.channel && (
                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              {log.channel}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                          {log.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {selectedContact.mobile && (
                  <a
                    href={`https://wa.me/91${selectedContact.mobile.replace(/\D/g, '').slice(-10)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary text-xs flex items-center gap-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300"
                  >
                    <FaWhatsapp size={14} /> WhatsApp
                  </a>
                )}
                {selectedContact.linkedinUrl && (
                  <a
                    href={selectedContact.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary text-xs flex items-center gap-1.5 text-sky-700 bg-sky-50 hover:bg-sky-100 border-sky-300"
                  >
                    <FaLinkedin size={14} /> LinkedIn
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const c = selectedContact;
                    setSelectedContact(null);
                    openEditModal(c);
                  }}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  <Edit3 size={14} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedContact(null)}
                  className="btn-primary text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Gemini Calendar & Meet Sync Drawer */}
      <GeminiCalendarSyncModal
        isOpen={isCalendarSyncOpen}
        onClose={() => setIsCalendarSyncOpen(false)}
        contacts={contacts}
        onSuccess={() => {
          fetchContacts();
          fetchStats();
        }}
      />

      {/* 5. Master PDF Export & Disaster Recovery Modal */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        contacts={contacts}
        stats={stats}
        onRestored={() => {
          fetchContacts();
          fetchStats();
        }}
      />
    </div>
  );
}
