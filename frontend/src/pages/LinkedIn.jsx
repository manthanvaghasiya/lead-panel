import { useState, useEffect } from 'react';
import { 
  Users, Search, Plus, Sparkles, Filter, Calendar, ExternalLink, 
  MessageSquare, Phone, Video, Trash2, Edit3, CheckCircle2, 
  Clock, MapPin, Building2, Briefcase, Tag, ArrowRight, UserCheck, 
  AlertCircle, ChevronDown, Check, X, RefreshCw, Send, Zap
} from 'lucide-react';
import { FaLinkedin, FaWhatsapp, FaPhoneAlt } from 'react-icons/fa';
import { 
  getLinkedInContacts, 
  getLinkedInStats, 
  createLinkedInContact, 
  updateLinkedInContact, 
  deleteLinkedInContact, 
  extractLinkedInData,
  convertLinkedInToLead,
  smartUpdateLinkedInContact 
} from '../api/apiClient';

const CONNECTION_REASONS = [
  'All',
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
Webiox: Locking in quick 10-min catchup. Google Meet: https://meet.google.com/qbb-roeq-hwa
BDE Abhishek Dholakiya: 5:30 PM today. Finally we connect!`;

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

  // Detail Modal state
  const [selectedContact, setSelectedContact] = useState(null);

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
      setContacts(data);
    } catch (err) {
      console.error('Failed to load LinkedIn contacts:', err);
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
      meetingDate: contact.meetingDate ? contact.meetingDate.slice(0, 16) : '',
      followupDate: contact.followupDate ? contact.followupDate.slice(0, 10) : '',
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
    try {
      const { data } = await extractLinkedInData(rawText);
      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        position: data.position || prev.position,
        company: data.company || prev.company,
        location: data.location || prev.location,
        reason: data.reason || prev.reason,
        linkedinUrl: data.linkedinUrl || prev.linkedinUrl,
        mobile: data.mobile || prev.mobile,
        email: data.email || prev.email,
        status: data.status || prev.status,
        priority: data.priority || prev.priority,
        meetingLink: data.meetingLink || prev.meetingLink,
        commission: data.commission || prev.commission,
        dealTerms: data.dealTerms || prev.dealTerms,
        skillsInput: Array.isArray(data.skills) ? data.skills.join(', ') : prev.skillsInput,
        skills: Array.isArray(data.skills) ? data.skills : prev.skills,
        summary: data.summary || prev.summary,
        notes: data.notes || prev.notes,
        rawSnippet: rawText
      }));
      setModalTab('form');
    } catch (err) {
      console.error('Extraction error:', err);
      alert('Extraction failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setExtracting(false);
    }
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
      setContacts(contacts.filter(c => c._id !== id));
      fetchStats();
      if (selectedContact?._id === id) setSelectedContact(null);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete contact');
    }
  };

  const handleConvertToLead = async (contact) => {
    if (!window.confirm(`Convert "${contact.name}" into a core CRM Lead?`)) return;
    try {
      await convertLinkedInToLead(contact._id);
      alert(`"${contact.name}" has been successfully added to your CRM Leads!`);
      fetchContacts();
    } catch (err) {
      console.error('Conversion error:', err);
      alert('Conversion failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const getReasonColor = (reason) => {
    switch (reason) {
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

        <div className="flex items-center gap-3 relative z-10">
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

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Network</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats?.totalContacts ?? contacts.length}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <MessageSquare size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Chats</p>
            <h3 className="text-2xl font-bold text-indigo-600">{stats?.activeConversations ?? 0}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Meetings Set</p>
            <h3 className="text-2xl font-bold text-cyan-600">{stats?.meetingsScheduled ?? 0}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Deals / Partners</p>
            <h3 className="text-2xl font-bold text-emerald-600">{stats?.closedPartnered ?? 0}</h3>
          </div>
        </div>
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

      {/* Cards List Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-500 text-sm font-medium">Loading LinkedIn connections...</p>
        </div>
      ) : contacts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <FaLinkedin size={32} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-slate-800">No LinkedIn Connections Found</h3>
            <p className="text-sm text-slate-500">
              No contacts match your current filter. You can add your first LinkedIn connection manually or use Smart Auto-Extract to parse copied text!
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={openAddModal}
              className="btn-primary flex items-center gap-2"
            >
              <Sparkles size={16} />
              <span>Smart Extract Connection</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {contacts.map((contact) => {
            const cleanPhone = contact.mobile?.replace(/\D/g, '').slice(-10);
            return (
              <div
                key={contact._id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:border-blue-400/60"
              >
                {/* Card Header Top */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    {/* Reason Badge & Priority */}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getReasonColor(contact.reason)}`}>
                      {contact.reason}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${getPriorityBadge(contact.priority)}`}>
                        {contact.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadge(contact.status)}`}>
                        {contact.status}
                      </span>
                    </div>
                  </div>

                  {/* Profile & Name */}
                  <div className="flex items-start gap-3 pt-1">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-800 to-indigo-900 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-900 text-base leading-tight truncate group-hover:text-primary transition-colors">
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

                  {/* Meeting Link Notification Box */}
                  {contact.meetingLink && contact.status === 'Meeting Scheduled' && (
                    <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Video size={16} className="text-blue-600 shrink-0" />
                        <span className="text-xs font-semibold text-blue-900 truncate">Meeting Scheduled</span>
                      </div>
                      <a
                        href={contact.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium rounded-lg shrink-0 transition-colors shadow-sm"
                      >
                        Join Call
                      </a>
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

                  {/* Summary Snippet */}
                  {contact.summary && (
                    <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic line-clamp-2">
                      "{contact.summary}"
                    </p>
                  )}
                </div>

                {/* Card Actions Bottom */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* WhatsApp button */}
                    {cleanPhone ? (
                      <a
                        href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hi ${contact.name}, Manthan here from Webiox.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Chat on WhatsApp"
                        className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors border border-emerald-200"
                      >
                        <FaWhatsapp size={15} />
                      </a>
                    ) : (
                      <button
                        disabled
                        title="No mobile number"
                        className="p-2 bg-slate-100 text-slate-300 rounded-lg cursor-not-allowed"
                      >
                        <FaWhatsapp size={15} />
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
                    {/* Quick AI Update button */}
                    <button
                      onClick={() => openUpdateModal(contact._id)}
                      className="px-2 py-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-800 rounded-md transition-colors border border-amber-200 flex items-center gap-1"
                      title="AI Smart Update this Contact"
                    >
                      <Zap size={11} className="fill-amber-600" /> Update
                    </button>

                    {/* Convert to Lead button */}
                    {contact.convertedToLeadId ? (
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                        <Check size={12} /> In CRM
                      </span>
                    ) : (
                      <button
                        onClick={() => handleConvertToLead(contact)}
                        className="px-2.5 py-1 text-[11px] font-medium bg-slate-200/80 hover:bg-primary hover:text-white text-slate-700 rounded-md transition-colors"
                        title="Convert to CRM Lead"
                      >
                        + CRM Lead
                      </button>
                    )}

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

                  {/* Row 5: Meeting Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Meeting Link (Google Meet / Zoom)
                      </label>
                      <input
                        type="url"
                        placeholder="https://meet.google.com/qbb-roeq-hwa"
                        value={formData.meetingLink}
                        onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                        className="input-field text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Next Follow-up Date</label>
                      <input
                        type="date"
                        value={formData.followupDate}
                        onChange={(e) => setFormData({ ...formData, followupDate: e.target.value })}
                        className="input-field text-sm"
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
    </div>
  );
}
