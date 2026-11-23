import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Building2, MessageSquare, Upload, Sliders } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa';

export default function GoogleHeader({ activePage, totalLeads = 0, metrics = null }) {
  const navTabs = [
    {
      id: 'finder',
      label: '⚡ Live Lead Finder',
      path: '/google-finder',
      icon: Zap,
      badge: 'Live Search'
    },
    {
      id: 'directory',
      label: '📇 Prospects Directory',
      path: '/google-leads',
      icon: Building2,
      count: totalLeads
    },
    {
      id: 'outreach',
      label: '💬 Outreach Studio',
      path: '/google-outreach',
      icon: MessageSquare,
      badge: 'Pitch Copy'
    },
    {
      id: 'import',
      label: '📥 CSV Ingestion',
      path: '/google-import',
      icon: Upload,
      badge: 'Scraper File'
    },
    {
      id: 'studio',
      label: '🛠️ CLI Generator',
      path: '/google-studio',
      icon: Sliders,
      badge: 'gosom'
    }
  ];

  return (
    <div className="space-y-6">
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
                Agency Intelligence Active
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Google Maps Lead Engine & Agency CRM
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
              Top-tier agency lead generation platform. Discover live local businesses, filter verified mobile numbers & website presence, and convert prospects via personalized B2B outreach.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/google-finder"
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:opacity-90 text-white text-xs font-black rounded-xl transition-all shadow-xl shadow-rose-500/30 border border-white/20 animate-pulse"
            >
              <Zap size={15} />
              ⚡ Open Live Lead Finder
            </Link>
          </div>
        </div>

        {/* Real-Time Metrics Strip (if metrics passed) */}
        {metrics && (
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
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Without Website</div>
              <div className="text-2xl font-black text-rose-400 mt-1">{metrics.withoutWebsite}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">High-Intent Web Leads</div>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-3.5 rounded-2xl">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Top Rated (4.5★+)</div>
              <div className="text-2xl font-black text-amber-400 mt-1">{metrics.highRated}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">High Client Trust</div>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-3.5 rounded-2xl col-span-2 sm:col-span-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400">Pipeline Hand-offs</div>
              <div className="text-2xl font-black text-purple-400 mt-1">{metrics.handedOff}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Moved to Tech / Mktg</div>
            </div>
          </div>
        )}
      </div>

      {/* Agency Navigation Header Bar */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {navTabs.map((tab) => {
            const isActive = activePage === tab.id;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-white border border-slate-200/80'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase tracking-wider ${
                    isActive ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
