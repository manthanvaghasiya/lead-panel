import React, { useState } from 'react';
import { 
  Upload, FileSpreadsheet, Star, ExternalLink, RefreshCw, 
  Sparkles, CheckCircle2, AlertCircle, Filter, Database 
} from 'lucide-react';
import Papa from 'papaparse';
import GoogleHeader from '../components/GoogleHeader';
import { bulkImportLeads } from '../api/apiClient';

export default function GoogleImport() {
  const [importFile, setImportFile] = useState(null);
  const [rawParsedRows, setRawParsedRows] = useState([]);
  const [filteredParsedLeads, setFilteredParsedLeads] = useState([]);
  const [filterOnlyWithPhone, setFilterOnlyWithPhone] = useState(true);
  const [filterOnlyWithoutWebsite, setFilterOnlyWithoutWebsite] = useState(false);
  const [minRatingFilter, setMinRatingFilter] = useState('0');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);

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
        applyIngestionFilters(rows, filterOnlyWithPhone, minRatingFilter, filterOnlyWithoutWebsite);
      },
      error: (err) => {
        alert('Failed to parse CSV file: ' + err.message);
      }
    });
  };

  const applyIngestionFilters = (rows, onlyPhone, minRate, onlyWithoutWeb) => {
    const mapped = rows.map((r) => {
      const rawMobile = r.phone || r.mobile || r.phones || '';
      let cleanMobile = String(rawMobile).replace(/\D/g, '');
      if (cleanMobile.startsWith('91') && cleanMobile.length === 12) cleanMobile = cleanMobile.substring(2);
      if (cleanMobile.startsWith('0')) cleanMobile = cleanMobile.substring(1);

      return {
        name: r.title || r.name || 'Unnamed Business',
        mobile: cleanMobile || '0000000000',
        businessType: r.category || r.businessType || 'Local Business',
        city: r.city || (r.complete_address ? r.complete_address.split(',')[1]?.trim() : '') || 'Surat',
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
      if (onlyWithoutWeb && l.website && l.website.trim().length > 3 && l.website !== 'No Website') return false;
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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <GoogleHeader activePage="import" />

      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[11px] font-bold mb-2">
            <Sparkles size={13} className="text-amber-500" />
            High-Volume CSV Ingestion • Automatic Field Mapping & Deduplication
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Upload className="text-rose-600" size={22} />
            Smart Google Maps Scraper Ingestion Studio
          </h2>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">
            Drop your <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-semibold font-mono">google-leads.csv</code> file. All 37 fields from gosom/google-maps-scraper are automatically parsed and formatted into encrypted database rows.
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
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterOnlyWithPhone}
                  onChange={(e) => {
                    setFilterOnlyWithPhone(e.target.checked);
                    applyIngestionFilters(rawParsedRows, e.target.checked, minRatingFilter, filterOnlyWithoutWebsite);
                  }}
                  className="w-4 h-4 rounded text-rose-600 accent-rose-600"
                />
                Only Ingest Places with Phone Number
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-rose-700 cursor-pointer bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                <input
                  type="checkbox"
                  checked={filterOnlyWithoutWebsite}
                  onChange={(e) => {
                    setFilterOnlyWithoutWebsite(e.target.checked);
                    applyIngestionFilters(rawParsedRows, filterOnlyWithPhone, minRatingFilter, e.target.checked);
                  }}
                  className="w-4 h-4 rounded text-rose-600 accent-rose-600"
                />
                Only Ingest Without Website (Web Dev Leads)
              </label>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Min Rating:</span>
                <select
                  value={minRatingFilter}
                  onChange={(e) => {
                    setMinRatingFilter(e.target.value);
                    applyIngestionFilters(rawParsedRows, filterOnlyWithPhone, e.target.value, filterOnlyWithoutWebsite);
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
                        ) : (
                          <span className="text-rose-600 font-bold">No Website</span>
                        )}
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
  );
}
