import React, { useState } from 'react';
import { 
  Sliders, Copy, Check, ChevronDown, ChevronUp, Sparkles, Terminal, 
  ExternalLink, Layers, Globe, ShieldCheck 
} from 'lucide-react';

const CITY_PRESETS = [
  { name: 'Surat, Gujarat', geo: '21.1702,72.8311', bbox: '21.1000,72.7500,21.2500,72.9000' },
  { name: 'Ahmedabad, Gujarat', geo: '23.0225,72.5714', bbox: '22.9500,72.4800,23.1000,72.6500' },
  { name: 'Vadodara, Gujarat', geo: '22.3072,73.1812', bbox: '22.2500,73.1200,22.3600,73.2400' },
  { name: 'Rajkot, Gujarat', geo: '22.3039,70.8022', bbox: '22.2500,70.7500,22.3500,70.8500' },
  { name: 'Mumbai, Maharashtra', geo: '19.0760,72.8777', bbox: '18.9000,72.7800,19.2500,72.9800' },
  { name: 'Pune, Maharashtra', geo: '18.5204,73.8567', bbox: '18.4500,73.7800,18.6000,73.9500' },
  { name: 'Delhi NCR', geo: '28.6139,77.2090', bbox: '28.4500,77.0500,28.8000,77.3500' },
  { name: 'Bengaluru, Karnataka', geo: '12.9716,77.5946', bbox: '12.8500,77.4800,13.1000,77.7200' },
  { name: 'Hyderabad, Telangana', geo: '17.3850,78.4867', bbox: '17.3000,78.3500,17.5000,78.5800' },
  { name: 'Jaipur, Rajasthan', geo: '26.9124,75.7873', bbox: '26.8500,75.7200,26.9800,75.8600' }
];

export default function GoogleStudio() {
  const [searchQuery, setSearchQuery] = useState('Jewellers in Surat');
  const [selectedCity, setSelectedCity] = useState(CITY_PRESETS[0]);
  const [scrapeMode, setScrapeMode] = useState('fast'); // 'fast', 'deep', 'grid'
  const [depth, setDepth] = useState(3);
  const [concurrency, setConcurrency] = useState(4);
  const [radius, setRadius] = useState(10000);
  const [includeEmail, setIncludeEmail] = useState(true);
  const [extraReviews, setExtraReviews] = useState(false);
  const [proxyList, setProxyList] = useState('');
  const [showAdvancedStudio, setShowAdvancedStudio] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedType, setCopiedType] = useState('ps');

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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[11px] font-bold mb-2">
              <Sparkles size={13} className="text-amber-500" />
              Power Scraper CLI Generator • gosom/google-maps-scraper Engine
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Sliders className="text-rose-600" size={22} />
              Visual Scraper Query Generator
            </h2>
            <p className="text-slate-500 text-xs md:text-sm mt-0.5">
              Craft precision commands for <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-semibold font-mono">gosom/google-maps-scraper</code> with tuned parameters for maximum throughput, grid tiling, and zero IP bans.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdvancedStudio(!showAdvancedStudio)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
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

        {/* Advanced Flags Panel */}
        {showAdvancedStudio && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeEmail}
                  onChange={(e) => setIncludeEmail(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 accent-rose-600"
                />
                Extract Emails from Websites (-email)
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={extraReviews}
                  onChange={(e) => setExtraReviews(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 accent-rose-600"
                />
                Scrape Detailed Review Text (-extra-reviews)
              </label>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Workers:</span>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={concurrency}
                  onChange={(e) => setConcurrency(Number(e.target.value))}
                  className="w-16 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Optional Proxies File / URL:</label>
              <input
                type="text"
                placeholder="e.g. proxies.txt or http://user:pass@host:port"
                value={proxyList}
                onChange={(e) => setProxyList(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>
        )}

        {/* Ready-to-Execute Code Terminal Box */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Terminal size={14} className="text-rose-600" />
              CLI Execution Command:
            </span>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => copyCommand('ps')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  copiedCmd && copiedType === 'ps' ? 'bg-emerald-600 text-white' : 'bg-white shadow-sm text-slate-800'
                }`}
              >
                {copiedCmd && copiedType === 'ps' ? <Check size={12} /> : <Copy size={12} />}
                Windows PowerShell
              </button>
              <button
                type="button"
                onClick={() => copyCommand('docker')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  copiedCmd && copiedType === 'docker' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {copiedCmd && copiedType === 'docker' ? <Check size={12} /> : <Copy size={12} />}
                Docker
              </button>
              <button
                type="button"
                onClick={() => copyCommand('bash')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  copiedCmd && copiedType === 'bash' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {copiedCmd && copiedType === 'bash' ? <Check size={12} /> : <Copy size={12} />}
                Linux / Mac
              </button>
            </div>
          </div>

          <div className="relative">
            <pre className="p-4 bg-slate-950 text-rose-400 rounded-2xl text-xs font-mono overflow-x-auto border border-slate-800 shadow-2xl leading-relaxed">
              {generateCommand(copiedType)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
