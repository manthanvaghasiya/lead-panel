import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Copy, Check, ExternalLink, Phone, Mail, Globe, 
  Star, MapPin, Sparkles, Send, RefreshCw, Filter, CheckCircle2 
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import GoogleHeader from '../components/GoogleHeader';
import { getLeads } from '../api/apiClient';

const OUTREACH_TEMPLATES = [
  {
    id: 'web-modern',
    name: 'Website & Digital Presence Upgrade',
    badge: 'No Website / Web Dev',
    target: 'Businesses with slow, outdated, or no mobile website',
    subject: 'Enhancing Digital Presence for {businessName}',
    body: `Hi {businessName} Team,\n\nI came across your Google listing in {city} and was really impressed by your customer reviews ({rating}★).\n\nWe specialize in high-converting modern websites and customized digital solutions for businesses in {city}. We can help double your direct client inquiries from Google search.\n\nWould you be open to a quick 5-minute call or WhatsApp chat this week?\n\nBest regards,\nWebiox Digital Solution\n+91 8347448241`
  },
  {
    id: 'google-reviews',
    name: 'Google Maps SEO & Review Booster',
    badge: 'Local SEO / Maps #1',
    target: 'Businesses with 3.5★ to 4.5★ ratings looking to rank #1 locally',
    subject: 'Local Google Maps Ranking for {businessName}',
    body: `Hello {businessName},\n\nDid you know that over 70% of local customers in {city} choose the top 3 Google Maps listings with the highest reviews?\n\nWe noticed your profile currently has {reviews} reviews with a {rating}★ rating. Our local SEO automation can help your business rank at the very top of Google Maps for high-intent customers in your area.\n\nLet us know if you'd like a free local SEO audit of your profile!\n\nBest regards,\nWebiox Digital Solution`
  },
  {
    id: 'custom-software',
    name: 'Custom CRM & Business Automation',
    badge: 'Enterprise Software',
    target: 'Growing businesses needing inventory, booking, or billing tech',
    subject: 'Automating Sales & Client Management for {businessName}',
    body: `Hi {businessName},\n\nWe build streamlined, custom CRM panels and operational software for fast-growing businesses across Gujarat.\n\nWe help automate client follow-ups, WhatsApp invoicing, and sales pipelines so no customer inquiry ever slips through the cracks.\n\nWould love to show you a quick 2-minute demo if you're interested.\n\nBest regards,\nManthan Vaghasiya\nWebiox Digital Solution`
  }
];

export default function GoogleOutreach() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(OUTREACH_TEMPLATES[0].id);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [websiteFilter, setWebsiteFilter] = useState('all'); // 'all', 'no-site', 'has-site'

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await getLeads();
      const all = res.data?.leads || res.data || [];
      const gLeads = all.filter(l => 
        l.department === 'google' || 
        (l.source && l.source.toLowerCase().includes('google')) ||
        (l.mapsUrl && l.mapsUrl.length > 5)
      );
      setLeads(gLeads);
      if (gLeads.length > 0 && !selectedLead) {
        setSelectedLead(gLeads[0]);
      }
    } catch (err) {
      console.error('Failed to load leads for outreach:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(l => {
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const match = (l.name && l.name.toLowerCase().includes(q)) ||
                    (l.city && l.city.toLowerCase().includes(q)) ||
                    (l.mobile && l.mobile.includes(q));
      if (!match) return false;
    }
    const hasSite = Boolean(l.website && l.website.trim().length > 3 && l.website !== 'No Website');
    if (websiteFilter === 'no-site' && hasSite) return false;
    if (websiteFilter === 'has-site' && !hasSite) return false;
    return true;
  });

  const getRenderedPitch = (lead, template) => {
    if (!lead || !template) return { subject: '', body: '', whatsappUrl: '#', mailtoUrl: '#' };
    const bName = lead.name || 'Business Owner';
    const bCity = lead.city || 'your area';
    const bRating = lead.socials?.rating || '4.5';
    const bReviews = lead.socials?.reviews || 'several';

    const subject = template.subject.replace('{businessName}', bName);
    const body = template.body
      .replace(/{businessName}/g, bName)
      .replace(/{city}/g, bCity)
      .replace(/{rating}/g, bRating)
      .replace(/{reviews}/g, bReviews);

    const cleanPhone = lead.mobile?.replace(/\D/g, '').slice(-10);
    const whatsappUrl = cleanPhone ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(body)}` : '#';
    const mailtoUrl = lead.socials?.emails ? `mailto:${lead.socials.emails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : '#';

    return { subject, body, whatsappUrl, mailtoUrl };
  };

  const selectedTemplate = OUTREACH_TEMPLATES.find(t => t.id === selectedTemplateId) || OUTREACH_TEMPLATES[0];
  const renderedPitch = getRenderedPitch(selectedLead, selectedTemplate);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <GoogleHeader activePage="outreach" totalLeads={leads.length} />

      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[11px] font-bold mb-2">
            <Sparkles size={13} className="text-amber-500" />
            Agency B2B Outreach Studio • 1-Click WhatsApp Direct Hook
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="text-rose-600" size={22} />
            B2B Outreach & Pitch Generator
          </h2>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">
            Craft tailored cold pitch copy using verified Google Maps metrics (star rating, review count, website status). Directly launch WhatsApp chats with 1 click.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Lead Selector & Pitch Angle Selector */}
          <div className="lg:col-span-5 space-y-4">
            {/* Step 1: Filter & Choose Lead */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  1. Select Target Prospect ({filteredLeads.length})
                </label>
                <button
                  onClick={fetchLeads}
                  className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 font-semibold"
                >
                  <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>

              {/* Quick Website Filter Buttons */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setWebsiteFilter('all')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    websiteFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All ({leads.length})
                </button>
                <button
                  type="button"
                  onClick={() => setWebsiteFilter('no-site')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    websiteFilter === 'no-site' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  ❌ No Website ({leads.filter(l => !l.website || l.website.trim().length <= 3 || l.website === 'No Website').length})
                </button>
                <button
                  type="button"
                  onClick={() => setWebsiteFilter('has-site')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    websiteFilter === 'has-site' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  🌐 Has Website
                </button>
              </div>

              <input
                type="text"
                placeholder="Search business name, phone, city..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
              />

              {/* Scrollable Lead List */}
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {filteredLeads.map((l) => {
                  const isSelected = selectedLead?._id === l._id;
                  const hasSite = Boolean(l.website && l.website.trim().length > 3 && l.website !== 'No Website');

                  return (
                    <div
                      key={l._id}
                      onClick={() => setSelectedLead(l)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50/80 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 text-xs line-clamp-1">{l.name}</span>
                        {l.socials?.rating && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-full shrink-0">
                            <Star size={9} className="fill-amber-400 text-amber-500" />
                            {l.socials.rating}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <span className="font-mono text-slate-700">{l.mobile}</span>
                        <span>{hasSite ? '🌐 Website' : '❌ No Site'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Choose Strategy Pitch */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Choose Pitch Angle
              </label>
              <div className="space-y-2">
                {OUTREACH_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedTemplateId === tmpl.id
                        ? 'border-rose-500 bg-white shadow-sm ring-1 ring-rose-400'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{tmpl.name}</span>
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                        {tmpl.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{tmpl.target}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Live Rendered Copy & Fast Action Dispatch */}
          <div className="lg:col-span-7 space-y-4">
            {selectedLead ? (
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-5">
                {/* Prospect Header Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Personalized Pitch For:
                    </span>
                    <h3 className="text-lg font-black text-slate-900">{selectedLead.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="text-rose-500" />
                        {selectedLead.city || 'Surat'}
                      </span>
                      <span>•</span>
                      <span className="font-mono font-bold text-slate-800">{selectedLead.mobile}</span>
                      <span>•</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selectedLead.website && selectedLead.website !== 'No Website'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {selectedLead.website && selectedLead.website !== 'No Website' ? '🌐 Has Website' : '❌ No Website'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(renderedPitch.body);
                        setCopiedPitch(true);
                        setTimeout(() => setCopiedPitch(false), 2000);
                      }}
                      className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      {copiedPitch ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      {copiedPitch ? 'Copied' : 'Copy Pitch'}
                    </button>

                    {renderedPitch.whatsappUrl !== '#' && (
                      <a
                        href={renderedPitch.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                      >
                        <FaWhatsapp size={15} />
                        Send WhatsApp
                      </a>
                    )}
                  </div>
                </div>

                {/* Email Subject Line */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Subject:</span>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                    {renderedPitch.subject}
                  </div>
                </div>

                {/* Message Body */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Message Body:</span>
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner">
                    {renderedPitch.body}
                  </div>
                </div>

                {/* Quick Call Strip */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-slate-500">
                    Phone Ready: <strong className="text-slate-800">{selectedLead.mobile}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${selectedLead.mobile}`}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <Phone size={12} /> Direct Call
                    </a>
                    {selectedLead.mapsUrl && (
                      <a
                        href={selectedLead.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <MapPin size={12} /> View on Maps <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[350px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center text-slate-400">
                <MessageSquare size={40} className="text-slate-300 mb-2" />
                <p className="font-bold text-slate-700 text-sm">No Prospect Selected</p>
                <p className="text-xs mt-1">Select a prospect from the left to generate their tailored pitch.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
