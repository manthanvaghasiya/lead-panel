import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
  MapPin, Download, Search, ExternalLink, Phone, Mail, Globe, 
  Star, MessageSquare, RefreshCw, Trash2, LayoutGrid, List, Sparkles, Building2
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { AuthContext } from '../context/AuthContext';
import GoogleHeader from '../components/GoogleHeader';
import { getLeads, updateLead, deleteLead } from '../api/apiClient';

export default function GoogleLeads() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRatingTier, setFilterRatingTier] = useState('all');
  const [filterWebsite, setFilterWebsite] = useState('all'); // 'all', 'no-website', 'has-website'
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

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
    const withoutWebsite = leads.filter(l => !l.website || l.website.trim().length <= 3 || l.website === 'No Website').length;
    const highRated = leads.filter(l => {
      const r = parseFloat(l.socials?.rating);
      return !isNaN(r) && r >= 4.5;
    }).length;
    const handedOff = leads.filter(l => l.department === 'tech' || l.department === 'marketing').length;

    return { total, withPhone, withEmail, withoutWebsite, highRated, handedOff };
  }, [leads]);

  const handleTransferDepartment = async (leadId, targetDept) => {
    try {
      await updateLead(leadId, { department: targetDept });
      setLeads(prev => prev.map(l => l._id === leadId ? { ...l, department: targetDept } : l));
      alert(`Lead successfully routed to ${targetDept.toUpperCase()} Department pipeline!`);
    } catch (err) {
      alert('Error transferring lead: ' + err.message);
    }
  };

  const handleUpdateStatus = async (leadId, newStatus) => {
    try {
      await updateLead(leadId, { status: newStatus });
      setLeads(prev => prev.map(l => l._id === leadId ? { ...l, status: newStatus } : l));
    } catch (err) {
      alert('Failed to update status: ' + err.message);
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

  const handleExportCRMLeadsToCSV = () => {
    if (leads.length === 0) return;

    const dataToExport = filteredDirectoryLeads.map(l => ({
      'Business Name': l.name,
      'Calling Phone': l.mobile,
      'Status': l.status,
      'Rating': l.socials?.rating || '',
      'Reviews': l.socials?.reviews || '',
      'Address': l.address || '',
      'City': l.city || '',
      'Category': l.businessType || '',
      'Website': l.website || 'No Website',
      'Google Maps Link': l.mapsUrl || '',
      'Pipeline Dept': l.department
    }));

    const csvString = Papa.unparse(dataToExport);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `google-crm-directory-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredDirectoryLeads = useMemo(() => {
    return leads.filter(l => {
      const q = leadSearch.toLowerCase().trim();
      const matchesSearch = !q || 
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.city && l.city.toLowerCase().includes(q)) ||
        (l.businessType && l.businessType.toLowerCase().includes(q)) ||
        (l.mobile && l.mobile.includes(q)) ||
        (l.address && l.address.toLowerCase().includes(q));

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

      let matchesWebsite = true;
      const hasSite = Boolean(l.website && l.website.trim().length > 3 && l.website !== 'No Website');
      if (filterWebsite === 'no-website') {
        matchesWebsite = !hasSite;
      } else if (filterWebsite === 'has-website') {
        matchesWebsite = hasSite;
      }

      return matchesSearch && matchesCat && matchesStatus && matchesRating && matchesWebsite;
    });
  }, [leads, leadSearch, filterCategory, filterStatus, filterRatingTier, filterWebsite]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <GoogleHeader activePage="directory" totalLeads={leads.length} metrics={metrics} />

      {/* Directory Content Box */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-5">
        {/* Top Action & Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, phone, city, locality..."
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20"
              />
            </div>

            {/* Dedicated Website Status Selector Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setFilterWebsite('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterWebsite === 'all'
                    ? 'bg-white shadow-sm text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({leads.length})
              </button>

              <button
                onClick={() => setFilterWebsite('no-website')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterWebsite === 'no-website'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-rose-700 hover:bg-white/60'
                }`}
              >
                <span>❌ No Website</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-black">
                  {leads.filter(l => !l.website || l.website.trim().length <= 3 || l.website === 'No Website').length}
                </span>
              </button>

              <button
                onClick={() => setFilterWebsite('has-website')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterWebsite === 'has-website'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-blue-700 hover:bg-white/60'
                }`}
              >
                <Globe size={12} />
                <span>With Website</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-black">
                  {leads.filter(l => l.website && l.website.trim().length > 3 && l.website !== 'No Website').length}
                </span>
              </button>
            </div>

            <select
              value={filterRatingTier}
              onChange={(e) => setFilterRatingTier(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
            >
              <option value="all">All Ratings</option>
              <option value="4.5+">⭐ 4.5+ Top Rated</option>
              <option value="4.0+">⭐ 4.0+ Good Rating</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
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
            <button
              onClick={handleExportCRMLeadsToCSV}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              title="Export all Google Leads to CSV"
            >
              <Download size={13} />
              Export CSV
            </button>

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
            Loading Google Maps prospects...
          </div>
        ) : filteredDirectoryLeads.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-3xl">
            <Building2 size={36} className="mx-auto mb-3 text-rose-300" />
            <p className="font-bold text-slate-800 text-base">No Google Maps leads found</p>
            <p className="text-xs mt-1 text-slate-500">
              Click the <strong>"Live Lead Finder"</strong> to discover and save fresh business leads right into your CRM!
            </p>
            <Link
              to="/google-finder"
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20"
            >
              Open Live Lead Finder
            </Link>
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

                    <div className="flex items-center gap-1.5">
                      {lead.socials?.rating && (
                        <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-black">
                          <Star size={11} className="fill-amber-400 text-amber-500" />
                          {lead.socials.rating}
                          {lead.socials.reviews && (
                            <span className="text-[10px] text-slate-500 font-normal">({lead.socials.reviews})</span>
                          )}
                        </div>
                      )}

                      {/* Quick In-line Status Select */}
                      <select
                        value={lead.status || 'New'}
                        onChange={(e) => handleUpdateStatus(lead._id, e.target.value)}
                        className="text-[10px] font-bold px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                      >
                        <option value="New">✨ New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="In Process">In Process</option>
                        <option value="Won">Won</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </div>
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
                              href={`https://wa.me/91${lead.mobile.replace(/\D/g, '').slice(-10)}`}
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
                      {lead.website && lead.website.trim().length > 3 && lead.website !== 'No Website' ? (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <Globe size={11} /> Website <ExternalLink size={10} />
                        </a>
                      ) : (
                        <Link
                          to="/google-outreach"
                          className="text-[10px] text-rose-700 font-bold bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors"
                          title="No Website - Click to generate website pitch"
                        >
                          <span>❌ No Website</span>
                          <span className="underline font-black">Pitch Web Dev</span>
                        </Link>
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
                      → Tech
                    </button>
                    <button
                      onClick={() => handleTransferDepartment(lead._id, 'marketing')}
                      className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[10px] font-bold transition-all"
                      title="Handoff to Marketing Department"
                    >
                      → Mktg
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Link
                      to="/google-outreach"
                      className="p-1 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded transition-colors"
                      title="Generate Outreach Pitch"
                    >
                      <MessageSquare size={13} />
                    </Link>
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
                  <th className="p-3">Status</th>
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
                      {l.website && l.website.trim().length > 3 && l.website !== 'No Website' ? (
                        <a href={l.website} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5 font-semibold">
                          <Globe size={10} /> Visit Website
                        </a>
                      ) : (
                        <Link
                          to="/google-outreach"
                          className="text-[10px] text-rose-700 font-bold bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1 mt-0.5 transition-colors"
                          title="No Website - Click to pitch website"
                        >
                          <span>❌ No Website</span>
                          <span className="underline font-bold">Pitch</span>
                        </Link>
                      )}
                    </td>

                    <td className="p-3">
                      <select
                        value={l.status || 'New'}
                        onChange={(e) => handleUpdateStatus(l._id, e.target.value)}
                        className="text-xs font-bold px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                      >
                        <option value="New">✨ New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="In Process">In Process</option>
                        <option value="Won">Won</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{l.mobile}</span>
                        {l.mobile && l.mobile !== '0000000000' && (
                          <a
                            href={`https://wa.me/91${l.mobile.replace(/\D/g, '').slice(-10)}`}
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
  );
}
