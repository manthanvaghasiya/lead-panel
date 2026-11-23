import React, { useState, useEffect, useContext } from 'react';
import { 
  MapPin, Download, Upload, Copy, Check, Search, ExternalLink, 
  Phone, Mail, Globe, Star, MessageSquare, ArrowRight, RefreshCw, 
  Trash2, ShieldCheck, Zap, Sparkles, Filter, Building2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { FaGoogle, FaWhatsapp } from 'react-icons/fa';
import Papa from 'papaparse';
import { AuthContext } from '../context/AuthContext';
import { getLeads, bulkImportLeads, updateLead, deleteLead } from '../api/apiClient';

const CITY_PRESETS = [
  { name: 'Surat, Gujarat', geo: '21.1702,72.8311' },
  { name: 'Ahmedabad, Gujarat', geo: '23.0225,72.5714' },
  { name: 'Mumbai, Maharashtra', geo: '19.0760,72.8777' },
  { name: 'Pune, Maharashtra', geo: '18.5204,73.8567' },
  { name: 'Delhi NCR', geo: '28.6139,77.2090' },
  { name: 'Bengaluru, Karnataka', geo: '12.9716,77.5946' },
  { name: 'Hyderabad, Telangana', geo: '17.3850,78.4867' },
  { name: 'Jaipur, Rajasthan', geo: '26.9124,75.7873' },
];

export default function GoogleLeads() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('import'); // 'import', 'generator', 'leads'

  // Generator states
  const [searchQuery, setSearchQuery] = useState('Jewellers in Surat');
  const [selectedCity, setSelectedCity] = useState(CITY_PRESETS[0]);
  const [scrapeMode, setScrapeMode] = useState('fast'); // 'fast' or 'deep'
  const [depth, setDepth] = useState(3);
  const [copiedCmd, setCopiedCmd] = useState(false);

  // Import states
  const [importFile, setImportFile] = useState(null);
  const [parsedLeads, setParsedLeads] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);

  // Leads list states
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchGoogleLeads();
  }, []);

  const fetchGoogleLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await getLeads();
      const all = res.data?.leads || res.data || [];
      // Filter leads belonging to google dept or sourced from Google/Maps
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

  // Generate CLI Command based on user parameters
  const generateCommand = () => {
    const qEscaped = searchQuery.replace(/"/g, '\"');
    if (scrapeMode === 'fast') {
      return `'${qEscaped}' | Set-Content queries.txt; .\\google-maps-scraper.exe -input queries.txt -results google-leads.csv -fast-mode -depth ${depth} -geo "${selectedCity.geo}" -radius 10000`;
    }
    return `'${qEscaped}' | Set-Content queries.txt; .\\google-maps-scraper.exe -input queries.txt -results google-leads.csv -depth ${depth} -email -exit-on-inactivity 3m`;
  };

  const copyCommandToClipboard = () => {
    navigator.clipboard.writeText(generateCommand());
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  // CSV Drag and Drop / Upload Handling
  const handleFileUpload = (file) => {
    if (!file) return;
    setImportFile(file);
    setImportResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data || [];
        // Map gosom/google-maps-scraper columns to lead fields
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
            source: 'Google Maps',
            department: 'google',
            type: 'Cold',
            status: 'New',
          };
        }).filter(l => l.name && l.name !== 'Unnamed Business');

        setParsedLeads(mapped);
      },
      error: (err) => {
        alert('Failed to parse CSV file: ' + err.message);
      }
    });
  };

  const handleExecuteImport = async () => {
    if (parsedLeads.length === 0) return;
    setImporting(true);
    setImportResult(null);

    try {
      const res = await bulkImportLeads(parsedLeads);
      setImportResult({
        success: true,
        importedCount: res.data?.importedCount ?? parsedLeads.length,
        skippedDuplicates: res.data?.duplicatesSkipped ?? 0,
        message: res.data?.message || `Successfully imported leads into Google Department!`
      });
      fetchGoogleLeads();
      setParsedLeads([]);
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
      alert(`Lead moved to ${targetDept.toUpperCase()} Department pipeline!`);
    } catch (err) {
      alert('Error updating lead: ' + err.message);
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await deleteLead(leadId);
      setLeads(prev => prev.filter(l => l._id !== leadId));
    } catch (err) {
      alert('Failed to delete lead: ' + err.message);
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = !leadSearch || 
      (l.name && l.name.toLowerCase().includes(leadSearch.toLowerCase())) ||
      (l.city && l.city.toLowerCase().includes(leadSearch.toLowerCase())) ||
      (l.businessType && l.businessType.toLowerCase().includes(leadSearch.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-rose-900/90 via-slate-900 to-slate-900 border border-rose-500/30 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl flex items-center justify-center">
                <FaGoogle size={22} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full">
                Google Maps Department
              </span>
              <span className="text-xs font-medium text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700">
                google@webiox.tech
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Google Maps Lead Discovery & Pipeline
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Extract high-intent local B2B business leads with direct phone numbers, Google ratings, verified websites, and email addresses.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/gosom/google-maps-scraper/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 hover:border-slate-600 transition-all shadow-md"
            >
              <Download size={14} className="text-rose-400" />
              Download Scraper Binary (Win x64)
            </a>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-8 border-t border-slate-800/80 pt-4">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'import'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Upload size={16} />
            1-Click Scraper Ingestion
          </button>

          <button
            onClick={() => setActiveTab('generator')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'generator'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Zap size={16} />
            CLI Command Generator
          </button>

          <button
            onClick={() => { setActiveTab('leads'); fetchGoogleLeads(); }}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'leads'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Building2 size={16} />
            Google Leads Database ({leads.length})
          </button>
        </div>
      </div>

      {/* TAB 1: 1-CLICK SCRAPER INGESTION */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
            <div className="max-w-2xl mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Upload className="text-rose-600" size={20} />
                Drop Your Scraped CSV File
              </h2>
              <p className="text-slate-500 text-xs md:text-sm mt-1">
                Directly drop the output CSV from <code className="bg-slate-100 px-1.5 py-0.5 rounded text-rose-600 font-semibold">google-maps-scraper</code>. All 37 fields (business title, phone number, rating, reviews, website, email, and Google Maps URL) are automatically mapped with zero manual configuration.
              </p>
            </div>

            {/* Drop Zone */}
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
              className={`border-2 border-dashed rounded-3xl p-8 md:p-12 text-center transition-all cursor-pointer ${
                isDragActive
                  ? 'border-rose-500 bg-rose-50/50 scale-[0.99]'
                  : 'border-slate-300 hover:border-rose-400 hover:bg-slate-50/50'
              }`}
              onClick={() => document.getElementById('csvFileInput')?.click()}
            >
              <input
                id="csvFileInput"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                <Upload size={28} />
              </div>
              <p className="text-base font-bold text-slate-800">
                {importFile ? importFile.name : 'Click to upload or drag & drop google-leads.csv'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Accepts standard CSV output from gosom/google-maps-scraper
              </p>
            </div>

            {/* Import Status Alert */}
            {importResult && (
              <div className={`mt-6 p-4 rounded-2xl flex items-center gap-3 border ${
                importResult.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {importResult.success ? <CheckCircle2 className="text-emerald-600 shrink-0" /> : <AlertCircle className="text-rose-600 shrink-0" />}
                <div className="text-sm">
                  <strong>{importResult.success ? 'Import Completed!' : 'Import Failed:'}</strong> {importResult.message}
                  {importResult.success && importResult.skippedDuplicates > 0 && (
                    <span className="block text-xs text-emerald-700 mt-0.5">
                      (Skipped {importResult.skippedDuplicates} duplicate mobile numbers)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Parsed Leads Preview */}
            {parsedLeads.length > 0 && (
              <div className="mt-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        {parsedLeads.length} Leads Detected & Ready to Ingest
                      </h4>
                      <p className="text-xs text-slate-500">
                        Target Department: <strong className="text-rose-600">Google Department</strong> • Source: <strong className="text-slate-700">Google Maps</strong>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleExecuteImport}
                    disabled={importing}
                    className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {importing ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Ingesting to Database...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Import {parsedLeads.length} Leads to Google Dept
                      </>
                    )}
                  </button>
                </div>

                {/* Table Preview */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-96">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="p-3">Business Name</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Rating</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">City / Address</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Maps Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {parsedLeads.slice(0, 15).map((lead, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-900">{lead.name}</td>
                          <td className="p-3 font-mono text-emerald-600 font-bold">{lead.mobile}</td>
                          <td className="p-3">
                            {lead.rating ? (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                                <Star size={10} className="fill-amber-400 text-amber-500" />
                                {lead.rating} {lead.reviews ? `(${lead.reviews})` : ''}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="p-3 text-slate-500">{lead.businessType}</td>
                          <td className="p-3 max-w-[200px] truncate">{lead.address || lead.city}</td>
                          <td className="p-3 text-blue-600">{lead.emails || '-'}</td>
                          <td className="p-3">
                            {lead.mapsUrl ? (
                              <a href={lead.mapsUrl} target="_blank" rel="noreferrer" className="text-rose-600 hover:underline flex items-center gap-1 font-medium">
                                Maps <ExternalLink size={11} />
                              </a>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedLeads.length > 15 && (
                  <p className="text-xs text-slate-400 text-center italic">
                    Showing first 15 rows of {parsedLeads.length} total detected records.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CLI COMMAND GENERATOR */}
      {activeTab === 'generator' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Zap className="text-rose-600" size={20} />
                Google Maps Scraper Command Builder
              </h2>
              <p className="text-slate-500 text-xs md:text-sm mt-1">
                Select your industry query and city to generate the optimized scraping command for Windows PowerShell.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Query Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Search Query (Business Type & City)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Jewellers in Surat"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Examples: <em>"Dentists in Ahmedabad"</em>, <em>"Diamond Merchants in Surat"</em>, <em>"IT Companies in Mumbai"</em>
                </p>
              </div>

              {/* City Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Location Preset (For GPS Coordinates)
                </label>
                <select
                  value={selectedCity.name}
                  onChange={(e) => {
                    const found = CITY_PRESETS.find(c => c.name === e.target.value);
                    if (found) setSelectedCity(found);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                >
                  {CITY_PRESETS.map((city) => (
                    <option key={city.name} value={city.name}>
                      {city.name} ({city.geo})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Coordinates ensure Google Maps focuses tightly on your chosen city.
                </p>
              </div>

              {/* Scrape Mode */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Extraction Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setScrapeMode('fast')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      scrapeMode === 'fast'
                        ? 'border-rose-500 bg-rose-50/50 text-rose-900 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <Zap size={14} className="text-rose-600" />
                      ⚡ Fast Mode (5 Seconds)
                    </div>
                    <div className="text-[11px] font-normal text-slate-500 mt-1">
                      Direct HTTP requests, instant phone & address extraction.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScrapeMode('deep')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      scrapeMode === 'deep'
                        ? 'border-rose-500 bg-rose-50/50 text-rose-900 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <Mail size={14} className="text-rose-600" />
                      🌐 Deep Mode + Emails
                    </div>
                    <div className="text-[11px] font-normal text-slate-500 mt-1">
                      Visits company websites to extract official contact emails.
                    </div>
                  </button>
                </div>
              </div>

              {/* Depth / Batches */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Result Depth: {depth * 20} Businesses (~{depth} Batches)
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={depth}
                  onChange={(e) => setDepth(Number(e.target.value))}
                  className="w-full accent-rose-600"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>1 (~20 leads)</span>
                  <span>3 (~60 leads)</span>
                  <span>5 (~100 leads)</span>
                  <span>10 (~200 leads)</span>
                </div>
              </div>
            </div>

            {/* Generated Command Box */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Generated Windows PowerShell Command:
                </span>
                <button
                  onClick={copyCommandToClipboard}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all"
                >
                  {copiedCmd ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  {copiedCmd ? 'Copied to Clipboard!' : 'Copy Command'}
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-xs font-mono overflow-x-auto border border-slate-800 shadow-inner">
                  {generateCommand()}
                </pre>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-start gap-3 text-xs text-slate-600">
                <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg shrink-0 mt-0.5">
                  <MapPin size={16} />
                </div>
                <div>
                  <strong>How to run:</strong>
                  <ol className="list-decimal ml-4 mt-1 space-y-1 text-slate-500">
                    <li>Download the <code className="bg-slate-200 px-1 py-0.2 rounded font-mono">google-maps-scraper.exe</code> executable.</li>
                    <li>Open PowerShell in that folder and paste the copied command above.</li>
                    <li>When done, drag the resulting <code className="bg-slate-200 px-1 py-0.2 rounded font-mono">google-leads.csv</code> into the <strong>"1-Click Scraper Ingestion"</strong> tab!</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GOOGLE LEADS DATABASE */}
      {activeTab === 'leads' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 sm:w-80">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Google leads by name, city, category..."
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-rose-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="In Process">In Process</option>
                  <option value="Follow-up Letter">Follow-up Letter</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              <button
                onClick={fetchGoogleLeads}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <RefreshCw size={14} className={loadingLeads ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {/* Leads Table */}
            {loadingLeads ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-rose-500" />
                Loading Google Maps leads...
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-2xl">
                <MapPin size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-700">No Google Maps leads found</p>
                <p className="text-xs mt-1">Use the "1-Click Scraper Ingestion" tab to upload your first batch of Google leads.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Business</th>
                      <th className="p-3">Contact</th>
                      <th className="p-3">Rating / Reviews</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Pipeline Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredLeads.map((l) => (
                      <tr key={l._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-medium">
                          <div className="font-bold text-slate-900 text-sm">{l.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{l.businessType || 'Local Business'}</div>
                          {l.website && (
                            <a href={l.website} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5">
                              <Globe size={10} /> Website
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
                                className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors"
                                title="Send WhatsApp"
                              >
                                <FaWhatsapp size={12} />
                              </a>
                            )}
                            {l.mobile && (
                              <a
                                href={`tel:${l.mobile}`}
                                className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                                title="Call"
                              >
                                <Phone size={12} />
                              </a>
                            )}
                          </div>
                          {l.socials?.emails && (
                            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                              <Mail size={11} className="text-slate-400" />
                              <span className="truncate max-w-[150px]">{l.socials.emails}</span>
                            </div>
                          )}
                        </td>

                        <td className="p-3">
                          {l.socials?.rating ? (
                            <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-bold">
                              <Star size={12} className="fill-amber-400 text-amber-500" />
                              {l.socials.rating}
                              {l.socials.reviews && (
                                <span className="text-slate-500 font-normal">({l.socials.reviews})</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="p-3 max-w-[200px]">
                          <div className="font-medium text-slate-800">{l.city || 'Surat'}</div>
                          <div className="text-[11px] text-slate-400 truncate">{l.address}</div>
                          {l.mapsUrl && (
                            <a
                              href={l.mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-rose-600 hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <MapPin size={10} /> View on Maps <ExternalLink size={9} />
                            </a>
                          )}
                        </td>

                        <td className="p-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            l.department === 'google'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : l.department === 'tech'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}>
                            {l.department?.toUpperCase() || 'GOOGLE'}
                          </span>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleTransferDepartment(l._id, 'tech')}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-bold transition-all"
                              title="Push to Tech Dept Sales Pipeline"
                            >
                              → Tech
                            </button>
                            <button
                              onClick={() => handleTransferDepartment(l._id, 'marketing')}
                              className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[10px] font-bold transition-all"
                              title="Push to Marketing Dept Sales Pipeline"
                            >
                              → Mktg
                            </button>
                            <button
                              onClick={() => handleDeleteLead(l._id)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Delete"
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
    </div>
  );
}
