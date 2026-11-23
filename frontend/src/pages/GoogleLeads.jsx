import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
  MapPin, Download, Upload, Copy, Check, Search, ExternalLink, 
  Phone, Mail, Globe, Star, MessageSquare, ArrowRight, RefreshCw, 
  Trash2, ShieldCheck, Zap, Sparkles, Filter, Building2, CheckCircle2, 
  AlertCircle, LayoutGrid, List, Sliders, ChevronDown, ChevronUp, Share2, 
  Send, Database, Award, TrendingUp, BarChart3, HelpCircle, Layers, FileSpreadsheet,
  Compass, CheckSquare, Square
} from 'lucide-react';
import { FaGoogle, FaWhatsapp } from 'react-icons/fa';
import Papa from 'papaparse';
import { AuthContext } from '../context/AuthContext';
import { 
  getLeads, 
  bulkImportLeads, 
  updateLead, 
  deleteLead,
  liveSearchGoogleLeads,
  saveDirectGoogleLeads
} from '../api/apiClient';

const INDUSTRY_CHIPS = [
  'Jewellers & Diamond Merchants',
  'Dentists & Dental Clinics',
  'Hospitals & Healthcare',
  'IT & Software Companies',
  'Real Estate & Builders',
  'Textile & Fashion Boutiques',
  'Restaurants & Cafes',
  'Interior Designers & Architects',
  'Automobile Dealers & Garages',
  'Chartered Accountants & Legal',
  'Gyms & Fitness Centers',
  'Manufacturing & Industrial Units'
];

const CITY_PRESETS = [
  { name: 'Surat, Gujarat', geo: '21.1702,72.8311', lat: 21.1702, lon: 72.8311, bbox: '21.1000,72.7500,21.2500,72.9000' },
  { name: 'Ahmedabad, Gujarat', geo: '23.0225,72.5714', lat: 23.0225, lon: 72.5714, bbox: '22.9500,72.4800,23.1000,72.6500' },
  { name: 'Vadodara, Gujarat', geo: '22.3072,73.1812', lat: 22.3072, lon: 73.1812, bbox: '22.2500,73.1200,22.3600,73.2400' },
  { name: 'Rajkot, Gujarat', geo: '22.3039,70.8022', lat: 22.3039, lon: 70.8022, bbox: '22.2500,70.7500,22.3500,70.8500' },
  { name: 'Mumbai, Maharashtra', geo: '19.0760,72.8777', lat: 19.0760, lon: 72.8777, bbox: '18.9000,72.7800,19.2500,72.9800' },
  { name: 'Pune, Maharashtra', geo: '18.5204,73.8567', lat: 18.5204, lon: 73.8567, bbox: '18.4500,73.7800,18.6000,73.9500' },
  { name: 'Delhi NCR', geo: '28.6139,77.2090', lat: 28.6139, lon: 77.2090, bbox: '28.4500,77.0500,28.8000,77.3500' },
  { name: 'Bengaluru, Karnataka', geo: '12.9716,77.5946', lat: 12.9716, lon: 77.5946, bbox: '12.8500,77.4800,13.1000,77.7200' },
  { name: 'Hyderabad, Telangana', geo: '17.3850,78.4867', lat: 17.3850, lon: 78.4867, bbox: '17.3000,78.3500,17.5000,78.5800' },
  { name: 'Jaipur, Rajasthan', geo: '26.9124,75.7873', lat: 26.9124, lon: 75.7873, bbox: '26.8500,75.7200,26.9800,75.8600' },
];

const OUTREACH_TEMPLATES = [
  {
    id: 'web-modern',
    name: 'Website & Digital Presence Upgrade',
    target: 'Businesses with slow, outdated, or no mobile website',
    subject: 'Enhancing Digital Presence for {businessName}',
    body: `Hi {businessName} Team,\n\nI came across your Google listing in {city} and was really impressed by your customer reviews ({rating}★).\n\nWe specialize in high-converting modern websites and customized digital solutions for businesses in {city}. We can help double your direct client inquiries from Google search.\n\nWould you be open to a quick 5-minute call or WhatsApp chat this week?\n\nBest regards,\nWebiox Digital Solution\n+91 8347448241`
  },
  {
    id: 'google-reviews',
    name: 'Google Maps SEO & Review Booster',
    target: 'Businesses with 3.5★ to 4.5★ ratings looking to rank #1 locally',
    subject: 'Local Google Maps Ranking for {businessName}',
    body: `Hello {businessName},\n\nDid you know that over 70% of local customers in {city} choose the top 3 Google Maps listings with the highest reviews?\n\nWe noticed your profile currently has {reviews} reviews with a {rating}★ rating. Our local SEO automation can help your business rank at the very top of Google Maps for high-intent customers in your area.\n\nLet us know if you'd like a free local SEO audit of your profile!\n\nBest regards,\nWebiox Digital Solution`
  },
  {
    id: 'custom-software',
    name: 'Custom CRM & Business Automation',
    target: 'Growing businesses needing inventory, booking, or billing tech',
    subject: 'Automating Sales & Client Management for {businessName}',
    body: `Hi {businessName},\n\nWe build streamlined, custom CRM panels and operational software for fast-growing businesses across Gujarat.\n\nWe help automate client follow-ups, WhatsApp invoicing, and sales pipelines so no customer inquiry ever slips through the cracks.\n\nWould love to show you a quick 2-minute demo if you're interested.\n\nBest regards,\nManthan Vaghasiya\nWebiox Digital Solution`
  }
];

export default function GoogleLeads() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('direct'); // 'direct', 'studio', 'ingestion', 'directory', 'templates'
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // =========================================================================
  // 1. Direct In-CRM Live Search State
  // =========================================================================
  const [directQuery, setDirectQuery] = useState('Jewellers in Surat');
  const [directCity, setDirectCity] = useState(CITY_PRESETS[0]);
  const [directBatches, setDirectBatches] = useState(1); // 1 = 20, 2 = 40, 3 = 60
  const [directSearching, setDirectSearching] = useState(false);
  const [directResults, setDirectResults] = useState([]);
  const [selectedDirectIndexes, setSelectedDirectIndexes] = useState(new Set());
  const [savingDirect, setSavingDirect] = useState(false);
  const [saveDirectResult, setSaveDirectResult] = useState(null);

  // =========================================================================
  // 2. Generator & Studio states
  // =========================================================================
  const [searchQuery, setSearchQuery] = useState('Jewellers in Surat');
  const [selectedCity, setSelectedCity] = useState(CITY_PRESETS[0]);
  const [scrapeMode, setScrapeMode] = useState('fast');
  const [depth, setDepth] = useState(3);
  const [concurrency, setConcurrency] = useState(4);
  const [radius, setRadius] = useState(10000);
  const [includeEmail, setIncludeEmail] = useState(true);
  const [extraReviews, setExtraReviews] = useState(false);
  const [proxyList, setProxyList] = useState('');
  const [showAdvancedStudio, setShowAdvancedStudio] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedType, setCopiedType] = useState('ps');

  // =========================================================================
  // 3. Ingestion states
  // =========================================================================
  const [importFile, setImportFile] = useState(null);
  const [rawParsedRows, setRawParsedRows] = useState([]);
  const [filteredParsedLeads, setFilteredParsedLeads] = useState([]);
  const [filterOnlyWithPhone, setFilterOnlyWithPhone] = useState(true);
  const [minRatingFilter, setMinRatingFilter] = useState('0');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);

  // =========================================================================
  // 4. Directory states
  // =========================================================================
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRatingTier, setFilterRatingTier] = useState('all');

  // =========================================================================
  // 5. Outreach Pitch states
  // =========================================================================
  const [selectedPitchLead, setSelectedPitchLead] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(OUTREACH_TEMPLATES[0].id);
  const [copiedPitch, setCopiedPitch] = useState(false);

  useEffect(() => {
    fetchGoogleLeads();
  }, []);

  const fetchGoogleLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await getLeads();
      const all = res.data?.leads || res.data || [];
      const gLeads = all.filter(l => 
        l.department === 'google' || 
        (l.source && l.source.toLowerCase().includes('google')) ||
        (l.mapsUrl && l.mapsUrl.length > 5)
      );
      setLeads(gLeads);
    } catch (err) {
      console.error('Failed to load Google leads:', err);
    } finally {
      setLoadingLeads(false);
    }
  };

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = leads.length;
    const withPhone = leads.filter(l => l.mobile && l.mobile !== '0000000000' && l.mobile.length >= 10).length;
    const withEmail = leads.filter(l => l.socials?.emails && l.socials.emails.includes('@')).length;
    const highRated = leads.filter(l => {
      const r = parseFloat(l.socials?.rating);
      return !isNaN(r) && r >= 4.5;
    }).length;
    const handedOff = leads.filter(l => l.department === 'tech' || l.department === 'marketing').length;

    return { total, withPhone, withEmail, highRated, handedOff };
  }, [leads]);

  // =========================================================================
  // HANDLERS: DIRECT LIVE SEARCH
  // =========================================================================
  const handleRunLiveSearch = async (e) => {
    if (e) e.preventDefault();
    if (!directQuery.trim()) return;

    setDirectSearching(true);
    setSaveDirectResult(null);
    setDirectResults([]);
    setSelectedDirectIndexes(new Set());

    try {
      const res = await liveSearchGoogleLeads({
        query: directQuery.trim(),
        lat: directCity.lat,
        lon: directCity.lon,
        zoom: 14,
        batches: directBatches
      });

      const found = res.data?.leads || [];
      setDirectResults(found);
      // Select all by default
      const allIdx = new Set(found.map((_, i) => i));
      setSelectedDirectIndexes(allIdx);
    } catch (err) {
      alert('Direct Google Search Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setDirectSearching(false);
    }
  };

  const toggleSelectDirectLead = (idx) => {
    setSelectedDirectIndexes(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleSelectAllDirect = () => {
    if (selectedDirectIndexes.size === directResults.length) {
      setSelectedDirectIndexes(new Set());
    } else {
      setSelectedDirectIndexes(new Set(directResults.map((_, i) => i)));
    }
  };

  const handleSaveSelectedDirectLeads = async () => {
    const selected = directResults.filter((_, i) => selectedDirectIndexes.has(i));
    if (selected.length === 0) return;

    setSavingDirect(true);
    setSaveDirectResult(null);

    try {
      const res = await saveDirectGoogleLeads(selected);
      setSaveDirectResult({
        success: true,
        savedCount: res.data?.savedCount ?? selected.length,
        duplicatesCount: res.data?.duplicatesCount ?? 0,
        message: res.data?.message || `Successfully ingested ${res.data?.savedCount} leads into CRM database!`
      });
      fetchGoogleLeads();
    } catch (err) {
      setSaveDirectResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Failed to save leads to database.'
      });
    } finally {
      setSavingDirect(false);
    }
  };

  // =========================================================================
  // HANDLERS: STUDIO / GENERATOR
  // =========================================================================
  const generateCommand = (type = 'ps') => {
    const qEscaped = searchQuery.replace(/"/g, '\"');
    const proxyFlag = proxyList.trim() ? ` -proxies "${proxyList.trim()}"` : '';

    if (type === 'ps') {
      if (scrapeMode === 'fast') {
        return `'${qEscaped}' | Set-Content queries.txt; .\\google-maps-scraper.exe -input queries.txt -results google-leads.csv -fast-mode -depth ${depth} -geo "${selectedCity.geo}" -radius ${radius}${proxyFlag}`;
      }
      if (scrapeMode === 'grid') {
        return `'${qEscaped}' | Set-Content queries.txt; .\\google-maps-scraper.exe -input queries.txt -results google-leads-grid.csv -grid-bbox "${selectedCity.bbox}" -grid-cell 0.5 -depth 1 -c ${concurrency}${includeEmail ? ' -email' : ''}${proxyFlag}`;
      }
      return `'${qEscaped}' | Set-Content queries.txt; .\\google-maps-scraper.exe -input queries.txt -results google-leads.csv -depth ${depth} -c ${concurrency}${includeEmail ? ' -email' : ''}${extraReviews ? ' -extra-reviews' : ''} -exit-on-inactivity 3m${proxyFlag}`;
    }

    if (type === 'docker') {
      if (scrapeMode === 'fast') {
        return `docker run --rm -v "\$PWD/out:/out" gosom/google-maps-scraper -input "${qEscaped}" -results /out/leads.csv -fast-mode -depth ${depth} -geo "${selectedCity.geo}"`;
      }
      return `docker run --rm -v gmaps-playwright-cache:/opt -v "\$PWD/out:/out" gosom/google-maps-scraper -input "${qEscaped}" -results /out/leads.csv -depth ${depth} ${includeEmail ? '-email' : ''}`;
    }

    return `printf '%s\\n' '${qEscaped}' > queries.txt && ./google-maps-scraper -input queries.txt -results google-leads.csv -fast-mode -depth ${depth} -geo "${selectedCity.geo}"`;
  };

  const copyCommand = (type) => {
    navigator.clipboard.writeText(generateCommand(type));
    setCopiedType(type);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  // =========================================================================
  // HANDLERS: SMART INGESTION
  // =========================================================================
  const handleFileUpload = (file) => {
    if (!file) return;
    setImportFile(file);
    setImportResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data || [];
        setRawParsedRows(rows);
        applyIngestionFilters(rows, filterOnlyWithPhone, minRatingFilter);
      },
      error: (err) => {
        alert('Failed to parse CSV file: ' + err.message);
      }
    });
  };

  const applyIngestionFilters = (rows, onlyPhone, minRate) => {
    const mapped = rows.map((r) => {
      const rawMobile = r.phone || r.mobile || r.phones || '';
      let cleanMobile = String(rawMobile).replace(/\D/g, '');
      if (cleanMobile.startsWith('91') && cleanMobile.length === 12) cleanMobile = cleanMobile.substring(2);
      if (cleanMobile.startsWith('0')) cleanMobile = cleanMobile.substring(1);

      return {
        name: r.title || r.name || 'Unnamed Business',
        mobile: cleanMobile || '0000000000',
        businessType: r.category || r.businessType || 'Local Business',
        city: r.city || (r.complete_address ? r.complete_address.split(',')[1]?.trim() : '') || selectedCity.name.split(',')[0],
        address: r.address || r.complete_address || '',
        mapsUrl: r.link || r.mapsUrl || r.reviews_link || '',
        website: r.website || r.web_site || '',
        rating: r.review_rating || r.rating || '',
        reviews: r.review_count || r.reviews || '',
        emails: r.emails || r.email || '',
        hours: r.open_hours || '',
        source: 'Google Maps',
        department: 'google',
        type: 'Cold',
        status: 'New',
      };
    }).filter(l => {
      if (!l.name || l.name === 'Unnamed Business') return false;
      if (onlyPhone && (!l.mobile || l.mobile === '0000000000' || l.mobile.length < 10)) return false;
      if (minRate !== '0') {
        const rFloat = parseFloat(l.rating);
        if (isNaN(rFloat) || rFloat < parseFloat(minRate)) return false;
      }
      return true;
    });

    setFilteredParsedLeads(mapped);
  };

  const handleExecuteImport = async () => {
    if (filteredParsedLeads.length === 0) return;
    setImporting(true);
    setImportResult(null);

    try {
      const res = await bulkImportLeads(filteredParsedLeads);
      setImportResult({
        success: true,
        importedCount: res.data?.importedCount ?? filteredParsedLeads.length,
        skippedDuplicates: res.data?.duplicatesSkipped ?? 0,
        message: `Successfully ingested ${res.data?.importedCount ?? filteredParsedLeads.length} leads into Google Department database!`
      });
      fetchGoogleLeads();
      setRawParsedRows([]);
      setFilteredParsedLeads([]);
      setImportFile(null);
    } catch (err) {
      setImportResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Failed to import leads.'
      });
    } finally {
      setImporting(false);
    }
  };

  const handleTransferDepartment = async (leadId, targetDept) => {
    try {
      await updateLead(leadId, { department: targetDept });
      setLeads(prev => prev.map(l => l._id === leadId ? { ...l, department: targetDept } : l));
      alert(`Lead successfully routed to ${targetDept.toUpperCase()} Department pipeline!`);
    } catch (err) {
      alert('Error transferring lead: ' + err.message);
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this Google Maps lead?')) return;
    try {
      await deleteLead(leadId);
      setLeads(prev => prev.filter(l => l._id !== leadId));
    } catch (err) {
      alert('Failed to delete lead: ' + err.message);
    }
  };

  // Outreach message generator
  const getRenderedPitch = (lead, template) => {
    if (!lead || !template) return { subject: '', body: '', whatsappUrl: '#' };
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

    return { subject, body, whatsappUrl };
  };

  // Filtered Leads in Directory
  const filteredDirectoryLeads = useMemo(() => {
    return leads.filter(l => {
      const q = leadSearch.toLowerCase().trim();
      const matchesSearch = !q || 
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.city && l.city.toLowerCase().includes(q)) ||
        (l.businessType && l.businessType.toLowerCase().includes(q)) ||
        (l.mobile && l.mobile.includes(q));

      const matchesCat = filterCategory === 'all' || (l.businessType && l.businessType.toLowerCase().includes(filterCategory.toLowerCase()));
      const matchesStatus = filterStatus === 'all' || l.status === filterStatus;
      
      let matchesRating = true;
      if (filterRatingTier === '4.5+') {
        const r = parseFloat(l.socials?.rating);
        matchesRating = !isNaN(r) && r >= 4.5;
      } else if (filterRatingTier === '4.0+') {
        const r = parseFloat(l.socials?.rating);
        matchesRating = !isNaN(r) && r >= 4.0;
      }

      return matchesSearch && matchesCat && matchesStatus && matchesRating;
    });
  }, [leads, leadSearch, filterCategory, filterStatus, filterRatingTier]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Hero Command Center Header */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 border border-rose-500/30 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-3">
              <span className="p-2.5 bg-gradient-to-br from-rose-500 to-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                <FaGoogle size={20} />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-rose-300 bg-rose-500/20 border border-rose-400/40 px-3 py-1 rounded-full">
                Google Maps Department
              </span>
              <span className="text-xs font-mono text-slate-300 bg-slate-800/90 px-3 py-1 rounded-full border border-slate-700">
                google@webiox.tech
              </span>
              <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Direct Scraper Engine Active
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Google Maps Lead Discovery & Pipeline
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
              Find leads directly inside your CRM with live Google Maps scraping, verified 10-digit mobile numbers, ratings, websites, and 1-click sales pipeline handoffs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('direct')}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:opacity-90 text-white text-xs font-black rounded-xl transition-all shadow-xl shadow-rose-500/30 border border-white/20 animate-pulse"
            >
              <Zap size={15} />
              ⚡ Direct Live Lead Finder
            </button>
          </div>
        </div>

        {/* Real-Time Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-8 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-3.5 rounded-2xl">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Scraped</div>
            <div className="text-2xl font-black text-white mt-1">{metrics.total}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Google Maps Listings</div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-3.5 rounded-2xl">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Direct Phone</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{metrics.withPhone}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">WhatsApp / Call Ready</div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-3.5 rounded-2xl">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Verified Email</div>
            <div className="text-2xl font-black text-blue-400 mt-1">{metrics.withEmail}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Scraped via Websites</div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-3.5 rounded-2xl">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Top Rated (4.5★+)</div>
            <div className="text-2xl font-black text-amber-400 mt-1">{metrics.highRated}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">High Reputation</div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-3.5 rounded-2xl col-span-2 sm:col-span-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400">Pipeline Handoff</div>
            <div className="text-2xl font-black text-purple-400 mt-1">{metrics.handedOff}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Tech & Marketing Deals</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('direct')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'direct'
                ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Zap size={15} className="text-amber-300" />
            1. Direct Live Lead Finder (In-CRM)
          </button>

          <button
            onClick={() => { setActiveTab('directory'); fetchGoogleLeads(); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'directory'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Building2 size={15} />
            2. Google Prospects Directory ({leads.length})
          </button>

          <button
            onClick={() => setActiveTab('ingestion')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'ingestion'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Upload size={15} />
            3. Smart CSV Ingestion
            {filteredParsedLeads.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('studio')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'studio'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Sliders size={15} />
            4. Scraper Studio & CLI Generator
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'templates'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <MessageSquare size={15} />
            5. B2B Outreach Pitch
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: DIRECT LIVE LEAD FINDER (IN-CRM REAL-TIME SCRAPING)
      ========================================================================= */}
      {activeTab === 'direct' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[11px] font-bold mb-2">
                <Sparkles size={13} className="text-amber-500" />
                Direct Real-Time Search • Zero Terminals • Zero CSV Downloads
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Zap className="text-rose-600" size={22} />
                Live Google Maps Direct Lead Finder
              </h2>
              <p className="text-slate-500 text-xs md:text-sm mt-0.5">
                Search any business category and city. The system connects directly to Google Maps, extracts verified places with phone numbers & ratings, and lets you save them into your CRM with 1 click.
              </p>
            </div>

            {/* Quick Industry Niche Chips */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Sparkles size={13} className="text-rose-500" />
                Select Niche to Auto-Fill
              </label>
              <div className="flex flex-wrap gap-2">
                {INDUSTRY_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setDirectQuery(`${chip} in ${directCity.name.split(',')[0]}`)}
                    className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50 text-slate-700 font-medium transition-all"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Controls Form */}
            <form onSubmit={handleRunLiveSearch} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Search Keyword / Industry
                </label>
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={directQuery}
                    onChange={(e) => setDirectQuery(e.target.value)}
                    placeholder="e.g. Jewellers in Surat"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Target City Location
                </label>
                <select
                  value={directCity.name}
                  onChange={(e) => {
                    const found = CITY_PRESETS.find(c => c.name === e.target.value);
                    if (found) {
                      setDirectCity(found);
                      setDirectQuery(prev => {
                        const parts = prev.split(' in ');
                        return parts.length > 1 ? `${parts[0]} in ${found.name.split(',')[0]}` : prev;
                      });
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-rose-500"
                >
                  {CITY_PRESETS.map((city) => (
                    <option key={city.name} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 flex items-end">
                <button
                  type="submit"
                  disabled={directSearching}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:opacity-95 text-white font-black text-sm rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {directSearching ? (
                    <>
                      <RefreshCw size={17} className="animate-spin" />
                      Scanning Google Maps...
                    </>
                  ) : (
                    <>
                      <Search size={17} />
                      Find Leads Live
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Ingestion Results Banner */}
            {saveDirectResult && (
              <div className={`p-4 rounded-2xl flex items-center gap-3 border ${
                saveDirectResult.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {saveDirectResult.success ? <CheckCircle2 className="text-emerald-600 shrink-0" /> : <AlertCircle className="text-rose-600 shrink-0" />}
                <div className="text-sm">
                  <strong>{saveDirectResult.success ? 'Saved to CRM Database!' : 'Save Error:'}</strong> {saveDirectResult.message}
                  {saveDirectResult.success && (
                    <span className="block text-xs text-emerald-700 mt-0.5">
                      Check the "Google Prospects Directory" tab or Sales Pipeline to start calling and messaging!
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Direct Results Stream */}
            {directSearching ? (
              <div className="py-20 text-center space-y-4 border-2 border-dashed border-rose-200 rounded-3xl bg-rose-50/30">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-rose-500 border-t-transparent animate-spin" />
                  <div className="absolute inset-2 rounded-full border-4 border-amber-400 border-b-transparent animate-spin-reverse" />
                  <MapPin size={24} className="absolute inset-0 m-auto text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Directly Querying Google Maps Engine</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Fetching real-time business places in <strong>{directCity.name}</strong> for <em>"{directQuery}"</em>...
                  </p>
                </div>
              </div>
            ) : directResults.length > 0 ? (
              <div className="space-y-4 pt-2">
                {/* Floating Batch Control Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-rose-50 via-slate-50 to-pink-50 p-4 rounded-2xl border border-rose-200">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleSelectAllDirect}
                      className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-rose-600 transition-colors"
                    >
                      {selectedDirectIndexes.size === directResults.length ? (
                        <CheckSquare size={18} className="text-rose-600" />
                      ) : (
                        <Square size={18} className="text-slate-400" />
                      )}
                      <span>
                        {selectedDirectIndexes.size === directResults.length ? 'Deselect All' : 'Select All'} ({selectedDirectIndexes.size}/{directResults.length})
                      </span>
                    </button>
                    <span className="text-slate-300">|</span>
                    <span className="text-xs text-slate-600 font-medium">
                      Found <strong>{directResults.length}</strong> live places from Google Maps
                    </span>
                  </div>

                  <button
                    onClick={handleSaveSelectedDirectLeads}
                    disabled={savingDirect || selectedDirectIndexes.size === 0}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {savingDirect ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Saving to Database...
                      </>
                    ) : (
                      <>
                        <Database size={14} />
                        Save {selectedDirectIndexes.size} Leads into CRM Database
                      </>
                    )}
                  </button>
                </div>

                {/* Found Leads Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {directResults.map((place, idx) => {
                    const isSelected = selectedDirectIndexes.has(idx);

                    return (
                      <div
                        key={idx}
                        onClick={() => toggleSelectDirectLead(idx)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 relative ${
                          isSelected
                            ? 'bg-rose-50/40 border-rose-400 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          {/* Checkbox and Rating */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              {isSelected ? (
                                <CheckSquare size={16} className="text-rose-600 shrink-0" />
                              ) : (
                                <Square size={16} className="text-slate-300 shrink-0" />
                              )}
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200 line-clamp-1 max-w-[150px]">
                                {place.businessType || 'Local Business'}
                              </span>
                            </div>

                            {place.rating && (
                              <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-black shrink-0">
                                <Star size={11} className="fill-amber-400 text-amber-500" />
                                {place.rating}
                                {place.reviews && (
                                  <span className="text-[10px] text-slate-500 font-normal">({place.reviews})</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Business Name */}
                          <h4 className="font-bold text-slate-900 text-sm line-clamp-1">
                            {place.name}
                          </h4>

                          {/* Address */}
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 flex items-start gap-1">
                            <MapPin size={12} className="text-rose-500 shrink-0 mt-0.5" />
                            <span>{place.address || place.city}</span>
                          </p>

                          {/* Direct Phone */}
                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="font-mono font-bold text-slate-800 text-xs">
                              {place.rawPhone || place.mobile}
                            </span>
                            
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {place.mobile && place.mobile !== '0000000000' && (
                                <>
                                  <a
                                    href={`https://wa.me/91${place.mobile}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors"
                                    title="WhatsApp"
                                  >
                                    <FaWhatsapp size={13} />
                                  </a>
                                  <a
                                    href={`tel:${place.mobile}`}
                                    className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                                    title="Call"
                                  >
                                    <Phone size={13} />
                                  </a>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Links */}
                          <div className="flex items-center gap-3 pt-1 text-[11px]" onClick={(e) => e.stopPropagation()}>
                            {place.mapsUrl && (
                              <a
                                href={place.mapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-rose-600 hover:underline flex items-center gap-1 font-semibold"
                              >
                                View on Maps <ExternalLink size={10} />
                              </a>
                            )}
                            {place.website && (
                              <a
                                href={place.website}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-600 hover:underline flex items-center gap-1"
                              >
                                Website <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: GOOGLE PROSPECTS DIRECTORY (CRM VIEW)
      ========================================================================= */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            {/* Search and Filters Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative w-full sm:w-72">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, phone, city, category..."
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20"
                  />
                </div>

                <select
                  value={filterRatingTier}
                  onChange={(e) => setFilterRatingTier(e.target.value)}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                >
                  <option value="all">All Ratings</option>
                  <option value="4.5+">⭐ 4.5+ Top Rated</option>
                  <option value="4.0+">⭐ 4.0+ Good Rating</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                >
                  <option value="all">All Statuses</option>
                  <option value="New">✨ New Data</option>
                  <option value="Contacted">Contacted</option>
                  <option value="In Process">In Process</option>
                  <option value="Won">Won Deal</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`p-1.5 rounded-lg text-xs transition-all ${
                      viewMode === 'cards' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-500'
                    }`}
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg text-xs transition-all ${
                      viewMode === 'table' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-500'
                    }`}
                  >
                    <List size={15} />
                  </button>
                </div>

                <button
                  onClick={fetchGoogleLeads}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={loadingLeads ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            {/* List / Cards Container */}
            {loadingLeads ? (
              <div className="py-20 text-center text-slate-400 text-sm">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-rose-500" />
                Loading Google Maps database...
              </div>
            ) : filteredDirectoryLeads.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-3xl">
                <MapPin size={36} className="mx-auto mb-3 text-rose-300" />
                <p className="font-bold text-slate-800 text-base">No Google Maps leads found</p>
                <p className="text-xs mt-1 text-slate-500">
                  Click the <strong>"1. Direct Live Lead Finder"</strong> tab to discover and save leads right into the database!
                </p>
              </div>
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {filteredDirectoryLeads.map((lead) => (
                  <div
                    key={lead._id}
                    className="bg-white border border-slate-200 hover:border-rose-400/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 relative group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                          {lead.businessType || 'Business'}
                        </span>

                        {lead.socials?.rating && (
                          <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-black">
                            <Star size={11} className="fill-amber-400 text-amber-500" />
                            {lead.socials.rating}
                            {lead.socials.reviews && (
                              <span className="text-[10px] text-slate-500 font-normal">({lead.socials.reviews})</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Business Title */}
                      <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-rose-600 transition-colors">
                        {lead.name}
                      </h3>

                      {/* Location */}
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1 flex items-center gap-1">
                        <MapPin size={12} className="text-rose-500 shrink-0" />
                        {lead.address || lead.city || 'Surat, Gujarat'}
                      </p>

                      {/* Contact Info Strip */}
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-800">{lead.mobile}</span>
                          <div className="flex items-center gap-1">
                            {lead.mobile && lead.mobile !== '0000000000' && (
                              <>
                                <a
                                  href={`https://wa.me/91${lead.mobile}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors"
                                  title="WhatsApp"
                                >
                                  <FaWhatsapp size={13} />
                                </a>
                                <a
                                  href={`tel:${lead.mobile}`}
                                  className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                                  title="Call"
                                >
                                  <Phone size={13} />
                                </a>
                              </>
                            )}
                          </div>
                        </div>

                        {lead.socials?.emails && (
                          <div className="text-[11px] text-blue-600 truncate flex items-center gap-1">
                            <Mail size={11} className="text-slate-400 shrink-0" />
                            <a href={`mailto:${lead.socials.emails}`} className="hover:underline truncate">
                              {lead.socials.emails}
                            </a>
                          </div>
                        )}

                        <div className="flex items-center gap-3 pt-1 text-[11px]">
                          {lead.mapsUrl && (
                            <a
                              href={lead.mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-rose-600 hover:underline flex items-center gap-1 font-semibold"
                            >
                              Google Maps <ExternalLink size={10} />
                            </a>
                          )}
                          {lead.website && (
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-600 hover:underline flex items-center gap-1"
                            >
                              Website <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Pipeline Handoff Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleTransferDepartment(lead._id, 'tech')}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-bold transition-all"
                          title="Handoff to Tech Department"
                        >
                          → Tech Pipeline
                        </button>
                        <button
                          onClick={() => handleTransferDepartment(lead._id, 'marketing')}
                          className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[10px] font-bold transition-all"
                          title="Handoff to Marketing Department"
                        >
                          → Mktg Pipeline
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedPitchLead(lead);
                            setActiveTab('templates');
                          }}
                          className="p-1 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded transition-colors"
                          title="Generate Outreach Pitch"
                        >
                          <MessageSquare size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteLead(lead._id)}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Delete Lead"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Table View */
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Business</th>
                      <th className="p-3">Direct Phone</th>
                      <th className="p-3">Rating / Reviews</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Verified Email</th>
                      <th className="p-3">Pipeline Routing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredDirectoryLeads.map((l) => (
                      <tr key={l._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-medium">
                          <div className="font-bold text-slate-900 text-sm">{l.name}</div>
                          <div className="text-[11px] text-slate-400">{l.businessType}</div>
                          {l.website && (
                            <a href={l.website} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5">
                              <Globe size={10} /> Visit Website
                            </a>
                          )}
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{l.mobile}</span>
                            {l.mobile && l.mobile !== '0000000000' && (
                              <a
                                href={`https://wa.me/91${l.mobile}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg"
                                title="WhatsApp"
                              >
                                <FaWhatsapp size={12} />
                              </a>
                            )}
                          </div>
                        </td>

                        <td className="p-3">
                          {l.socials?.rating ? (
                            <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-bold">
                              <Star size={11} className="fill-amber-400 text-amber-500" />
                              {l.socials.rating}
                              {l.socials.reviews && (
                                <span className="text-slate-500 font-normal">({l.socials.reviews})</span>
                              )}
                            </div>
                          ) : '-'}
                        </td>

                        <td className="p-3 max-w-[200px]">
                          <div className="font-medium text-slate-800">{l.city}</div>
                          <div className="text-[11px] text-slate-400 truncate">{l.address}</div>
                          {l.mapsUrl && (
                            <a href={l.mapsUrl} target="_blank" rel="noreferrer" className="text-[11px] text-rose-600 hover:underline flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> Maps Link <ExternalLink size={9} />
                            </a>
                          )}
                        </td>

                        <td className="p-3 text-slate-600">
                          {l.socials?.emails ? (
                            <a href={`mailto:${l.socials.emails}`} className="text-blue-600 hover:underline truncate max-w-[150px] block">
                              {l.socials.emails}
                            </a>
                          ) : '-'}
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleTransferDepartment(l._id, 'tech')}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-bold transition-all"
                            >
                              → Tech
                            </button>
                            <button
                              onClick={() => handleTransferDepartment(l._id, 'marketing')}
                              className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[10px] font-bold transition-all"
                            >
                              → Mktg
                            </button>
                            <button
                              onClick={() => handleDeleteLead(l._id)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: SMART CSV INGESTION
      ========================================================================= */}
      {activeTab === 'ingestion' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Upload className="text-rose-600" size={20} />
                Smart Google Maps Scraper Ingestion Studio
              </h2>
              <p className="text-slate-500 text-xs md:text-sm mt-0.5">
                Drop your <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-semibold font-mono">google-leads.csv</code> file. All 37 fields from gosom/google-maps-scraper are automatically parsed and formatted.
              </p>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
              onDragLeave={() => setIsDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer ${
                isDragActive
                  ? 'border-rose-500 bg-rose-50/70 scale-[0.99]'
                  : 'border-slate-300 hover:border-rose-400 hover:bg-slate-50/70'
              }`}
              onClick={() => document.getElementById('csvDropInput')?.click()}
            >
              <input
                id="csvDropInput"
                type="file"
                accept=".csv,.jsonl"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="w-16 h-16 bg-gradient-to-tr from-rose-500 to-amber-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/25">
                <FileSpreadsheet size={28} />
              </div>
              <p className="text-base font-bold text-slate-800">
                {importFile ? importFile.name : 'Click to Browse or Drag & Drop google-leads.csv'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supports standard CSV and JSON Lines generated by gosom/google-maps-scraper
              </p>
            </div>

            {/* Ingestion Filters */}
            {rawParsedRows.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterOnlyWithPhone}
                      onChange={(e) => {
                        setFilterOnlyWithPhone(e.target.checked);
                        applyIngestionFilters(rawParsedRows, e.target.checked, minRatingFilter);
                      }}
                      className="w-4 h-4 rounded text-rose-600 accent-rose-600"
                    />
                    Only Ingest Places with Phone Number
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Minimum Rating:</span>
                    <select
                      value={minRatingFilter}
                      onChange={(e) => {
                        setMinRatingFilter(e.target.value);
                        applyIngestionFilters(rawParsedRows, filterOnlyWithPhone, e.target.value);
                      }}
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold"
                    >
                      <option value="0">All Ratings</option>
                      <option value="3.5">3.5★ and Above</option>
                      <option value="4.0">4.0★ and Above</option>
                      <option value="4.5">4.5★ and Above</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs text-slate-500">
                  Qualifying: <strong className="text-rose-600 font-bold">{filteredParsedLeads.length}</strong> of {rawParsedRows.length} raw rows
                </div>
              </div>
            )}

            {/* Import Alert Status */}
            {importResult && (
              <div className={`p-4 rounded-2xl flex items-center gap-3 border ${
                importResult.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {importResult.success ? <CheckCircle2 className="text-emerald-600 shrink-0" /> : <AlertCircle className="text-rose-600 shrink-0" />}
                <div className="text-sm">
                  <strong>{importResult.success ? 'Ingestion Success!' : 'Ingestion Error:'}</strong> {importResult.message}
                  {importResult.success && importResult.skippedDuplicates > 0 && (
                    <span className="block text-xs text-emerald-700 mt-0.5">
                      (Skipped {importResult.skippedDuplicates} duplicates already existing in database)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Ingestion Action and Preview */}
            {filteredParsedLeads.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-rose-50 to-pink-50 p-5 rounded-2xl border border-rose-200">
                  <div>
                    <h4 className="text-base font-black text-slate-900">
                      {filteredParsedLeads.length} Leads Validated & Ready for Ingestion
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Target Dept: <strong className="text-rose-600">Google Department</strong> • Initial Status: <strong className="text-emerald-600">New Data</strong>
                    </p>
                  </div>

                  <button
                    onClick={handleExecuteImport}
                    disabled={importing}
                    className="px-6 py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {importing ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Writing to MongoDB Atlas...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Ingest {filteredParsedLeads.length} Leads into Database
                      </>
                    )}
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-96">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="p-3">Business Name</th>
                        <th className="p-3">Calling Phone</th>
                        <th className="p-3">Google Rating</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">City & Address</th>
                        <th className="p-3">Website</th>
                        <th className="p-3">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {filteredParsedLeads.slice(0, 10).map((l, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{l.name}</td>
                          <td className="p-3 font-mono font-bold text-emerald-600">{l.mobile}</td>
                          <td className="p-3">
                            {l.rating ? (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                                <Star size={10} className="fill-amber-400 text-amber-500" />
                                {l.rating} {l.reviews ? `(${l.reviews})` : ''}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="p-3 text-slate-500">{l.businessType}</td>
                          <td className="p-3 max-w-[200px] truncate">{l.address || l.city}</td>
                          <td className="p-3">
                            {l.website ? (
                              <a href={l.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                Site <ExternalLink size={10} />
                              </a>
                            ) : '-'}
                          </td>
                          <td className="p-3 text-slate-600">{l.emails || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: SCRAPER STUDIO & CLI GENERATOR
      ========================================================================= */}
      {activeTab === 'studio' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Sliders className="text-rose-600" size={20} />
                  Visual Scraper Query Generator
                </h2>
                <p className="text-slate-500 text-xs md:text-sm mt-0.5">
                  Craft precision commands for <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-semibold font-mono">gosom/google-maps-scraper</code> with tuned parameters for maximum throughput and zero bans.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedStudio(!showAdvancedStudio)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
                >
                  <Sliders size={13} />
                  {showAdvancedStudio ? 'Hide Advanced' : 'Show Advanced Flags'}
                  {showAdvancedStudio ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>
            </div>

            {/* Primary Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Target Search Query
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Dentists in Ahmedabad"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Location & GPS Preset
                </label>
                <select
                  value={selectedCity.name}
                  onChange={(e) => {
                    const found = CITY_PRESETS.find(c => c.name === e.target.value);
                    if (found) setSelectedCity(found);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                >
                  {CITY_PRESETS.map((city) => (
                    <option key={city.name} value={city.name}>
                      {city.name} ({city.geo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Extraction Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setScrapeMode('fast')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      scrapeMode === 'fast'
                        ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-bold">⚡ Fast HTTP</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">~5s (No Browser)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScrapeMode('deep')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      scrapeMode === 'deep'
                        ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-bold">🌐 Deep + Email</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Visits Websites</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScrapeMode('grid')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      scrapeMode === 'grid'
                        ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-bold">📦 Grid BBox</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Deep Area Tile</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Depth & Radius Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Scroll Depth: {depth} Batches (~{depth * 20} places)
                  </label>
                  <span className="text-xs font-mono font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded">
                    -depth {depth}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={depth}
                  onChange={(e) => setDepth(Number(e.target.value))}
                  className="w-full accent-rose-600"
                />
              </div>

              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Search Radius: {(radius / 1000).toFixed(0)} km
                  </label>
                  <span className="text-xs font-mono font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded">
                    -radius {radius}
                  </span>
                </div>
                <input
                  type="range"
                  min="2000"
                  max="25000"
                  step="1000"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full accent-rose-600"
                />
              </div>
            </div>

            {/* Ready-to-Execute Code Terminal Box */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  CLI Execution Command:
                </span>

                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => copyCommand('ps')}
                    className="px-3 py-1.5 bg-white shadow-sm text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    {copiedCmd && copiedType === 'ps' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    Windows PowerShell
                  </button>
                  <button
                    type="button"
                    onClick={() => copyCommand('docker')}
                    className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-medium flex items-center gap-1.5"
                  >
                    {copiedCmd && copiedType === 'docker' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    Docker
                  </button>
                  <button
                    type="button"
                    onClick={() => copyCommand('bash')}
                    className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-medium flex items-center gap-1.5"
                  >
                    {copiedCmd && copiedType === 'bash' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    Linux / Mac
                  </button>
                </div>
              </div>

              <div className="relative">
                <pre className="p-4 bg-slate-950 text-rose-400 rounded-2xl text-xs font-mono overflow-x-auto border border-slate-800 shadow-2xl leading-relaxed">
                  {generateCommand('ps')}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: B2B OUTREACH PITCH GENERATOR
      ========================================================================= */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <MessageSquare className="text-rose-600" size={20} />
                High-Converting B2B WhatsApp & Email Pitch Generator
              </h2>
              <p className="text-slate-500 text-xs md:text-sm mt-0.5">
                Automatically generate personalized pitches using real Google Maps review metrics and business names.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    1. Select Google Lead
                  </label>
                  <select
                    value={selectedPitchLead?._id || ''}
                    onChange={(e) => {
                      const found = leads.find(l => l._id === e.target.value);
                      setSelectedPitchLead(found || null);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium"
                  >
                    <option value="">-- Choose a Lead from Database --</option>
                    {leads.map((l) => (
                      <option key={l._id} value={l._id}>
                        {l.name} ({l.city || 'Surat'}) - {l.mobile}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    2. Choose Pitch Angle
                  </label>
                  <div className="space-y-2">
                    {OUTREACH_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => setSelectedTemplateId(tmpl.id)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                          selectedTemplateId === tmpl.id
                            ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold shadow-sm'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-xs font-bold">{tmpl.name}</div>
                        <div className="text-[11px] font-normal text-slate-500 mt-0.5">{tmpl.target}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                {selectedPitchLead ? (
                  (() => {
                    const tmpl = OUTREACH_TEMPLATES.find(t => t.id === selectedTemplateId) || OUTREACH_TEMPLATES[0];
                    const pitch = getRenderedPitch(selectedPitchLead, tmpl);

                    return (
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Personalized Pitch For:
                            </span>
                            <h3 className="text-base font-black text-slate-900">{selectedPitchLead.name}</h3>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(pitch.body);
                                setCopiedPitch(true);
                                setTimeout(() => setCopiedPitch(false), 2000);
                              }}
                              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                            >
                              {copiedPitch ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                              {copiedPitch ? 'Copied' : 'Copy Pitch'}
                            </button>

                            {pitch.whatsappUrl !== '#' && (
                              <a
                                href={pitch.whatsappUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                              >
                                <FaWhatsapp size={15} />
                                Send on WhatsApp
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-500 uppercase">Subject:</span>
                          <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                            {pitch.subject}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-500 uppercase">Message Body:</span>
                          <div className="p-4 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {pitch.body}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center text-slate-400">
                    <MessageSquare size={36} className="text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No Lead Selected</p>
                    <p className="text-xs mt-1">Select a business from step 1 to see the live personalized outreach pitch.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
