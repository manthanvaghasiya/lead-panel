import React, { useState, useMemo } from 'react';
import { 
  MapPin, Download, Search, ExternalLink, Phone, Globe, Star, 
  RefreshCw, Zap, Sparkles, CheckCircle2, AlertCircle, LayoutGrid, 
  List, CheckSquare, Square, ArrowRight
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import Papa from 'papaparse';
import { liveSearchGoogleLeads, saveDirectGoogleLeads } from '../api/apiClient';

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
  { 
    name: 'Surat, Gujarat', 
    geo: '21.1702,72.8311', 
    lat: 21.1702, 
    lon: 72.8311, 
    localities: ['All Surat', 'Varachha', 'Vesu', 'Adajan', 'Katargam', 'Piplod', 'Ghod Dod Road', 'Ring Road', 'Pal', 'City Light', 'Althan']
  },
  { 
    name: 'Ahmedabad, Gujarat', 
    geo: '23.0225,72.5714', 
    lat: 23.0225, 
    lon: 72.5714, 
    localities: ['All Ahmedabad', 'SG Highway', 'Prahlad Nagar', 'Navrangpura', 'Bopal', 'Maninagar', 'Sindhu Bhavan Road', 'Bodakdev', 'C.G. Road']
  },
  { 
    name: 'Vadodara, Gujarat', 
    geo: '22.3072,73.1812', 
    lat: 22.3072, 
    lon: 73.1812, 
    localities: ['All Vadodara', 'Alkapuri', 'Sayajigunj', 'Gotri', 'Manjalpur', 'Akota', 'Karelibaug', 'Vasna Road']
  },
  { 
    name: 'Rajkot, Gujarat', 
    geo: '22.3039,70.8022', 
    lat: 22.3039, 
    lon: 70.8022, 
    localities: ['All Rajkot', 'Yagnik Road', 'Kalawad Road', '150ft Ring Road', 'Mavdi', 'Amin Marg', 'Dhebar Road']
  },
  { 
    name: 'Mumbai, Maharashtra', 
    geo: '19.0760,72.8777', 
    lat: 19.0760, 
    lon: 72.8777, 
    localities: ['All Mumbai', 'Andheri West', 'Bandra West', 'Borivali', 'Dadar', 'Thane West', 'Navi Mumbai', 'Powai', 'Goregaon']
  },
  { 
    name: 'Pune, Maharashtra', 
    geo: '18.5204,73.8567', 
    lat: 18.5204, 
    lon: 73.8567, 
    localities: ['All Pune', 'Hinjewadi', 'Kothrud', 'Baner', 'Wakad', 'Viman Nagar', 'Koregaon Park', 'Aundh']
  },
  { 
    name: 'Delhi NCR', 
    geo: '28.6139,77.2090', 
    lat: 28.6139, 
    lon: 77.2090, 
    localities: ['All Delhi NCR', 'Connaught Place', 'Karol Bagh', 'Lajpat Nagar', 'South Extension', 'Noida', 'Gurugram Sector 29']
  },
  { 
    name: 'Bengaluru, Karnataka', 
    geo: '12.9716,77.5946', 
    lat: 12.9716, 
    lon: 77.5946, 
    localities: ['All Bengaluru', 'Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield', 'Jayanagar', 'MG Road']
  },
  { 
    name: 'Hyderabad, Telangana', 
    geo: '17.3850,78.4867', 
    lat: 17.3850, 
    lon: 78.4867, 
    localities: ['All Hyderabad', 'Hitec City', 'Gachibowli', 'Banjara Hills', 'Jubilee Hills', 'Madhapur', 'Secunderabad']
  },
  { 
    name: 'Jaipur, Rajasthan', 
    geo: '26.9124,75.7873', 
    lat: 26.9124, 
    lon: 75.7873, 
    localities: ['All Jaipur', 'Malviya Nagar', 'Vaishali Nagar', 'Mansarovar', 'C-Scheme', 'Tonk Road', 'Raja Park']
  }
];

export default function GoogleFinder() {
  const [directQuery, setDirectQuery] = useState('Jewellers in Surat');
  const [directCity, setDirectCity] = useState(CITY_PRESETS[0]);
  const [selectedLocality, setSelectedLocality] = useState('All Surat');
  const [directBatches, setDirectBatches] = useState(2); // 1 = 20, 2 = 40, 3 = 60
  const [directSearching, setDirectSearching] = useState(false);
  const [directResults, setDirectResults] = useState([]);
  const [directStats, setDirectStats] = useState(null);
  const [selectedDirectIndexes, setSelectedDirectIndexes] = useState(new Set());
  const [savingDirect, setSavingDirect] = useState(false);
  const [saveDirectResult, setSaveDirectResult] = useState(null);

  // Live Results Filtering states
  const [resultFilterTab, setResultFilterTab] = useState('all'); // 'all', 'mobile', 'no-site', 'has-site', 'top-rated'
  const [resultSearchText, setResultSearchText] = useState('');
  const [directViewMode, setDirectViewMode] = useState('cards'); // 'cards' | 'table'

  const handleRunLiveSearch = async (e) => {
    if (e) e.preventDefault();
    if (!directQuery.trim()) return;

    setDirectSearching(true);
    setSaveDirectResult(null);
    setDirectResults([]);
    setSelectedDirectIndexes(new Set());
    setDirectStats(null);

    try {
      const res = await liveSearchGoogleLeads({
        query: directQuery.trim(),
        locality: selectedLocality && !selectedLocality.startsWith('All') ? selectedLocality : '',
        lat: directCity.lat,
        lon: directCity.lon,
        zoom: 14,
        batches: directBatches
      });

      const found = res.data?.leads || [];
      setDirectResults(found);
      setDirectStats(res.data?.stats || null);

      // Select all by default
      const allIdx = new Set(found.map((_, i) => i));
      setSelectedDirectIndexes(allIdx);
    } catch (err) {
      alert('Direct Google Search Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setDirectSearching(false);
    }
  };

  // Filtered Results on Frontend
  const filteredDirectResults = useMemo(() => {
    return directResults.map((place, originalIndex) => ({ ...place, originalIndex })).filter(place => {
      // Tab filter
      if (resultFilterTab === 'mobile' && !place.isMobile) return false;
      if (resultFilterTab === 'no-site' && place.hasWebsite) return false;
      if (resultFilterTab === 'has-site' && !place.hasWebsite) return false;
      if (resultFilterTab === 'top-rated') {
        const r = parseFloat(place.rating);
        if (isNaN(r) || r < 4.5) return false;
      }

      // Text search inside results
      if (resultSearchText.trim()) {
        const q = resultSearchText.toLowerCase();
        const matchesName = place.name && place.name.toLowerCase().includes(q);
        const matchesAddress = place.address && place.address.toLowerCase().includes(q);
        const matchesCategory = place.businessType && place.businessType.toLowerCase().includes(q);
        const matchesLocality = place.locality && place.locality.toLowerCase().includes(q);
        const matchesPhone = (place.rawPhone || place.mobile || '').includes(q);
        if (!matchesName && !matchesAddress && !matchesCategory && !matchesLocality && !matchesPhone) return false;
      }

      return true;
    });
  }, [directResults, resultFilterTab, resultSearchText]);

  const toggleSelectDirectLead = (origIdx) => {
    setSelectedDirectIndexes(prev => {
      const next = new Set(prev);
      if (next.has(origIdx)) next.delete(origIdx);
      else next.add(origIdx);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    const filteredOrigIndexes = filteredDirectResults.map(p => p.originalIndex);
    const allSelected = filteredOrigIndexes.every(idx => selectedDirectIndexes.has(idx));

    setSelectedDirectIndexes(prev => {
      const next = new Set(prev);
      if (allSelected) {
        filteredOrigIndexes.forEach(idx => next.delete(idx));
      } else {
        filteredOrigIndexes.forEach(idx => next.add(idx));
      }
      return next;
    });
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
    } catch (err) {
      setSaveDirectResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Failed to save leads to database.'
      });
    } finally {
      setSavingDirect(false);
    }
  };

  // 1-Click Export Discovered Leads to CSV
  const handleExportDiscoveredToCSV = () => {
    if (directResults.length === 0) return;

    const dataToExport = filteredDirectResults.map(p => ({
      'Business Name': p.name,
      'Calling Phone': p.rawPhone || p.mobile,
      'Is 10-Digit Mobile': p.isMobile ? 'Yes' : 'No',
      'Google Rating': p.rating || 'N/A',
      'Total Reviews': p.reviews || '0',
      'Category': p.businessType || 'Local Business',
      'Locality': p.locality || '',
      'Address': p.address || '',
      'City': p.city || directCity.name.split(',')[0],
      'Website': p.website || 'No Website',
      'Pitch Opportunity': p.pitchOpportunity || '',
      'Google Maps URL': p.mapsUrl || ''
    }));

    const csvString = Papa.unparse(dataToExport);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `google-maps-leads-${directCity.name.split(',')[0].toLowerCase()}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dynamic In-Finder Pitch Message for WhatsApp
  const getDirectWhatsAppUrl = (place) => {
    if (!place.mobile || place.mobile === '0000000000') return '#';
    const cleanNum = place.mobile.slice(-10);
    const city = place.city || directCity.name.split(',')[0];

    let text = '';
    if (!place.hasWebsite) {
      text = `Hi ${place.name},\n\nI was browsing Google Maps in ${city} and saw your business listing with ${place.rating ? place.rating + '★ reviews' : 'great feedback'}, but noticed you don't have a mobile-friendly website connected.\n\nWe build high-converting websites and digital solutions for businesses in ${city} to double direct customer calls from Google.\n\nWould you be open to a quick 5-min chat this week?\n\nBest regards,\nWebiox Digital Solution\n+91 8347448241`;
    } else if (parseFloat(place.rating) >= 4.5) {
      text = `Hi ${place.name},\n\nCongratulations on maintaining a top-rated ${place.rating}★ profile with ${place.reviews || '50+'} reviews on Google Maps in ${city}!\n\nWe provide custom CRM software and automated client follow-up tools for leading businesses across Gujarat.\n\nWould love to show you a quick 2-minute demo of how our software can automate customer retention for ${place.name}.\n\nBest regards,\nWebiox Digital Solution`;
    } else {
      text = `Hello ${place.name},\n\nI came across your Google listing in ${city}. Did you know that ranking in the top 3 on Google Maps can increase your direct client inquiries by over 70%?\n\nWe help local businesses boost their Google Maps ranking, reputation, and customer inquiries.\n\nWould you like a free quick audit of your local listing?\n\nBest regards,\nWebiox Digital Solution`;
    }

    return `https://wa.me/91${cleanNum}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Main Finder Box */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[11px] font-bold mb-2">
            <Sparkles size={13} className="text-amber-500" />
            Direct Real-Time Search • Ultra-Fast Parallel Scraper Engine • 1-Click Database Save
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Zap className="text-rose-600" size={22} />
            Live Google Maps Direct Lead Finder
          </h2>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">
            Search any business niche, city, or local area. The system queries Google Maps directly over high-speed HTTP, extracts verified places with mobile numbers & ratings, and saves them into your CRM with 1 click.
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
                onClick={() => {
                  const locSuffix = selectedLocality && !selectedLocality.startsWith('All') ? ` in ${selectedLocality}` : ` in ${directCity.name.split(',')[0]}`;
                  setDirectQuery(`${chip}${locSuffix}`);
                }}
                className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50 text-slate-700 font-medium transition-all"
              >
                + {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Locality Hub Chips (for active city) */}
        {directCity.localities && directCity.localities.length > 0 && (
          <div className="space-y-2 bg-rose-50/40 p-4 rounded-2xl border border-rose-100">
            <label className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
              <MapPin size={13} className="text-rose-600" />
              Target Locality / Commercial Hub in {directCity.name.split(',')[0]}:
            </label>
            <div className="flex flex-wrap gap-2">
              {directCity.localities.map((loc) => {
                const isSelected = selectedLocality === loc;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => {
                      setSelectedLocality(loc);
                      const cityOnly = directCity.name.split(',')[0];
                      const targetArea = loc.startsWith('All') ? cityOnly : `${loc}, ${cityOnly}`;
                      setDirectQuery(prev => {
                        const parts = prev.split(' in ');
                        return parts.length > 1 ? `${parts[0]} in ${targetArea}` : `${prev} in ${targetArea}`;
                      });
                    }}
                    className={`text-xs px-3 py-1 rounded-xl font-bold transition-all ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-white border border-rose-200 text-rose-800 hover:bg-rose-100'
                    }`}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
                placeholder="e.g. Jewellers in Varachha, Surat"
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Target City
            </label>
            <select
              value={directCity.name}
              onChange={(e) => {
                const found = CITY_PRESETS.find(c => c.name === e.target.value);
                if (found) {
                  setDirectCity(found);
                  setSelectedLocality(found.localities?.[0] || 'All Areas');
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

          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Scan Depth
            </label>
            <select
              value={directBatches}
              onChange={(e) => setDirectBatches(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-rose-500"
            >
              <option value={1}>⚡ 20 Places (Fast ~2s)</option>
              <option value={2}>🚀 40 Places (Deep ~4s)</option>
              <option value={3}>🎯 60 Places (Max ~5s)</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={directSearching}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:opacity-95 text-white font-black text-xs md:text-sm rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {directSearching ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search size={16} />
                  Find Leads Live
                </>
              )}
            </button>
          </div>

          {/* Website Presence Filter Buttons inside Search Form */}
          <div className="md:col-span-12 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mr-1">
                <Globe size={14} className="text-rose-600" />
                Website Status:
              </span>
              
              <button
                type="button"
                onClick={() => setResultFilterTab('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  resultFilterTab === 'all'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                All Businesses
              </button>

              <button
                type="button"
                onClick={() => setResultFilterTab('no-site')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  resultFilterTab === 'no-site'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20 ring-2 ring-rose-400'
                    : 'bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100'
                }`}
              >
                <span>❌ Without Website Only</span>
                <span className="text-[10px] bg-rose-700/80 text-white px-1.5 py-0.2 rounded font-black">
                  Hot Pitch!
                </span>
              </button>

              <button
                type="button"
                onClick={() => setResultFilterTab('has-site')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  resultFilterTab === 'has-site'
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Globe size={12} />
                With Website Only
              </button>
            </div>

            <div className="text-xs">
              {resultFilterTab === 'no-site' ? (
                <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                  🔥 Target Mode: Only finding businesses WITHOUT a website (Sell Web Development)
                </span>
              ) : resultFilterTab === 'has-site' ? (
                <span className="text-blue-600 font-bold bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                  🌐 Showing only businesses that already have an active website
                </span>
              ) : (
                <span className="text-slate-500 font-medium">
                  Showing both businesses with and without websites
                </span>
              )}
            </div>
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
                  Check the "Prospects Directory" to start calling and messaging!
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
            {/* Result Analytics Strip */}
            {directStats && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-gradient-to-r from-slate-900 to-rose-950 p-4 rounded-2xl text-white">
                <div className="border-r border-slate-800 pr-3">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Total Places</div>
                  <div className="text-xl font-black text-white">{directStats.totalFound}</div>
                </div>
                <div className="border-r border-slate-800 pr-3">
                  <div className="text-[10px] text-emerald-400 uppercase font-bold">📱 10-Digit Mobile</div>
                  <div className="text-xl font-black text-emerald-400">{directStats.withMobileCount}</div>
                </div>
                <div className="border-r border-slate-800 pr-3">
                  <div className="text-[10px] text-blue-400 uppercase font-bold">🌐 Has Website</div>
                  <div className="text-xl font-black text-blue-400">{directStats.withWebsiteCount}</div>
                </div>
                <div className="border-r border-slate-800 pr-3">
                  <div className="text-[10px] text-rose-400 uppercase font-bold">❌ No Website (Pitch!)</div>
                  <div className="text-xl font-black text-rose-400">{directStats.noWebsiteCount}</div>
                </div>
                <div>
                  <div className="text-[10px] text-amber-400 uppercase font-bold">⭐ Top Rated (4.5+)</div>
                  <div className="text-xl font-black text-amber-400">{directStats.topRatedCount}</div>
                </div>
              </div>
            )}

            {/* Filter and Action Strip */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setResultFilterTab('all')}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                    resultFilterTab === 'all'
                      ? 'bg-rose-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  All ({directResults.length})
                </button>
                <button
                  onClick={() => setResultFilterTab('mobile')}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                    resultFilterTab === 'mobile'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  📱 Mobile Only ({directResults.filter(p => p.isMobile).length})
                </button>
                <button
                  onClick={() => setResultFilterTab('no-site')}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                    resultFilterTab === 'no-site'
                      ? 'bg-rose-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  ❌ No Website ({directResults.filter(p => !p.hasWebsite).length})
                </button>
                <button
                  onClick={() => setResultFilterTab('has-site')}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                    resultFilterTab === 'has-site'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  🌐 Has Website ({directResults.filter(p => p.hasWebsite).length})
                </button>
                <button
                  onClick={() => setResultFilterTab('top-rated')}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                    resultFilterTab === 'top-rated'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  ⭐ 4.5+ Rating
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={resultSearchText}
                    onChange={(e) => setResultSearchText(e.target.value)}
                    placeholder="Search inside results..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-rose-500 w-48"
                  />
                </div>

                <div className="flex items-center bg-white border border-slate-200 p-0.5 rounded-xl">
                  <button
                    onClick={() => setDirectViewMode('cards')}
                    className={`p-1.5 rounded-lg text-xs ${
                      directViewMode === 'cards' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-400'
                    }`}
                    title="Card Grid"
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button
                    onClick={() => setDirectViewMode('table')}
                    className={`p-1.5 rounded-lg text-xs ${
                      directViewMode === 'table' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-400'
                    }`}
                    title="Dense Table"
                  >
                    <List size={14} />
                  </button>
                </div>

                <button
                  onClick={handleExportDiscoveredToCSV}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                  title="Download results as CSV"
                >
                  <Download size={13} />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Selection & Save Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-rose-50 via-slate-50 to-pink-50 p-4 rounded-2xl border border-rose-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSelectAllFiltered}
                  className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-rose-600 transition-colors"
                >
                  <CheckSquare size={18} className="text-rose-600" />
                  <span>
                    Select / Deselect Visible ({filteredDirectResults.filter(p => selectedDirectIndexes.has(p.originalIndex)).length}/{filteredDirectResults.length})
                  </span>
                </button>
                <span className="text-slate-300">|</span>
                <span className="text-xs text-slate-600 font-medium">
                  Total Selected: <strong>{selectedDirectIndexes.size}</strong> leads
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
                    <span>💾 Save {selectedDirectIndexes.size} Leads into CRM Database</span>
                  </>
                )}
              </button>
            </div>

            {/* Content (Cards or Table) */}
            {directViewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDirectResults.map((place) => {
                  const isSelected = selectedDirectIndexes.has(place.originalIndex);
                  const waUrl = getDirectWhatsAppUrl(place);

                  return (
                    <div
                      key={place.originalIndex}
                      onClick={() => toggleSelectDirectLead(place.originalIndex)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 relative ${
                        isSelected
                          ? 'bg-rose-50/40 border-rose-400 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        {/* Checkbox and Category */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <CheckSquare size={16} className="text-rose-600 shrink-0" />
                            ) : (
                              <Square size={16} className="text-slate-300 shrink-0" />
                            )}
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200 line-clamp-1 max-w-[140px]">
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

                        {/* Locality & Address */}
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 flex items-start gap-1">
                          <MapPin size={12} className="text-rose-500 shrink-0 mt-0.5" />
                          <span>{place.locality ? `${place.locality}, ` : ''}{place.address || place.city}</span>
                        </p>

                        {/* Pitch Strategy Tag */}
                        <div className="mt-2">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                            !place.hasWebsite
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {place.pitchOpportunity}
                          </span>
                        </div>

                        {/* Direct Phone & Fast Contact */}
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-800 text-xs">
                              {place.rawPhone || place.mobile}
                            </span>
                            {place.isMobile && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                                WhatsApp
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {place.mobile && place.mobile !== '0000000000' && (
                              <>
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors"
                                  title="Send WhatsApp Pitch"
                                >
                                  <FaWhatsapp size={13} />
                                </a>
                                <a
                                  href={`tel:${place.mobile}`}
                                  className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                                  title="Call Business"
                                >
                                  <Phone size={13} />
                                </a>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Links */}
                        <div className="flex items-center gap-3 pt-2 text-[11px]" onClick={(e) => e.stopPropagation()}>
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
                          {place.website ? (
                            <a
                              href={place.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              Website <ExternalLink size={10} />
                            </a>
                          ) : (
                            <span className="text-slate-400 font-medium">No Website</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Table View in Live Finder */
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3 w-10">Select</th>
                      <th className="p-3">Business Name</th>
                      <th className="p-3">Calling Phone</th>
                      <th className="p-3">Rating / Reviews</th>
                      <th className="p-3">Locality & Address</th>
                      <th className="p-3">Website</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredDirectResults.map((place) => {
                      const isSelected = selectedDirectIndexes.has(place.originalIndex);
                      const waUrl = getDirectWhatsAppUrl(place);

                      return (
                        <tr
                          key={place.originalIndex}
                          onClick={() => toggleSelectDirectLead(place.originalIndex)}
                          className={`hover:bg-slate-50 cursor-pointer ${isSelected ? 'bg-rose-50/30' : ''}`}
                        >
                          <td className="p-3">
                            {isSelected ? (
                              <CheckSquare size={16} className="text-rose-600" />
                            ) : (
                              <Square size={16} className="text-slate-300" />
                            )}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{place.name}</div>
                            <div className="text-[10px] text-slate-500">{place.businessType}</div>
                          </td>
                          <td className="p-3">
                            <span className="font-mono font-bold text-slate-800">{place.rawPhone || place.mobile}</span>
                            {place.isMobile && (
                              <span className="ml-1 text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded">
                                WA
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {place.rating ? (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                                <Star size={10} className="fill-amber-400 text-amber-500" />
                                {place.rating} {place.reviews ? `(${place.reviews})` : ''}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="p-3 max-w-[200px] truncate">
                            {place.locality ? <strong>{place.locality}, </strong> : ''}
                            {place.address || place.city}
                          </td>
                          <td className="p-3">
                            {place.website ? (
                              <a
                                href={place.website}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                Site <ExternalLink size={10} />
                              </a>
                            ) : (
                              <span className="text-rose-500 font-bold">None</span>
                            )}
                          </td>
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              {place.mobile && place.mobile !== '0000000000' && (
                                <>
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg"
                                    title="WhatsApp"
                                  >
                                    <FaWhatsapp size={12} />
                                  </a>
                                  <a
                                    href={`tel:${place.mobile}`}
                                    className="p-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg"
                                    title="Call"
                                  >
                                    <Phone size={12} />
                                  </a>
                                </>
                              )}
                              {place.mapsUrl && (
                                <a
                                  href={place.mapsUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                                  title="Google Maps"
                                >
                                  <MapPin size={12} />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
