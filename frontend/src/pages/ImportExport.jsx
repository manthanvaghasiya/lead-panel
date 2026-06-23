import { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, Check, AlertTriangle, ArrowRight, X, Calendar, Filter } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { bulkImportLeads, getLeads } from '../api/apiClient';
import BulkImageImport from './BulkImageImport';

function ImportExport() {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  
  // Export states
  const [exporting, setExporting] = useState(false);
  const [exportFilter, setExportFilter] = useState({ dateRange: 'all', status: 'all' });
  
  const fileInputRef = useRef(null);

  const requiredFields = ['name', 'mobile'];
  const dbFields = [
    { key: 'name', label: 'Name (Required)', icon: '👤' },
    { key: 'mobile', label: 'Mobile (Required)', icon: '📱' },
    { key: 'source', label: 'Ask For', icon: '🌐' },
    { key: 'type', label: 'Type (Hot/Warm/Cold)', icon: '🔥' },
    { key: 'status', label: 'Status', icon: '📊' },
    { key: 'businessType', label: 'Business Type', icon: '🏢' },
    { key: 'city', label: 'City', icon: '🏙️' },
    { key: 'address', label: 'Address', icon: '📍' },
    { key: 'mapsUrl', label: 'Google Maps URL', icon: '🗺️' },
    { key: 'rating', label: 'Rating (out of 5)', icon: '⭐' },
    { key: 'reviews', label: 'Total Reviews', icon: '💬' },
  ];

  // Drag and Drop handlers
  const handleDrag = function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = function(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = function(e) {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    setFile(file);
    setResults(null);
    const isCsv = file.name.endsWith('.csv');

    if (isCsv) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processData(results.data, results.meta.fields);
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
        if (jsonData.length > 0) {
          processData(jsonData, Object.keys(jsonData[0]));
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const processData = (data, fileHeaders) => {
    setHeaders(fileHeaders);
    setPreview(data.slice(0, 3)); // Show first 3 rows
    const newMapping = {};
    dbFields.forEach(field => {
      const match = fileHeaders.find(h => {
        const hLower = h.toLowerCase();
        const fKeyLower = field.key.toLowerCase();
        
        // Exact match or contains check
        if (hLower === fKeyLower || hLower.includes(fKeyLower) || fKeyLower.includes(hLower)) {
          return true;
        }
        
        // Smart/Custom synonyms mapping
        if (field.key === 'name' && hLower === 'title') return true;
        if (field.key === 'mobile' && hLower === 'phone') return true;
        if (field.key === 'address' && hLower === 'street') return true;
        if (field.key === 'mapsUrl' && (hLower === 'url' || hLower.includes('map'))) return true;
        if (field.key === 'rating' && (hLower.includes('score') || hLower.includes('rating'))) return true;
        if (field.key === 'reviews' && (hLower.includes('review') || hLower.includes('count'))) return true;
        
        return false;
      });
      if (match) newMapping[field.key] = match;
    });
    setMapping(newMapping);
  };

  const handleImport = async () => {
    const missing = requiredFields.filter(f => !mapping[f]);
    if (missing.length > 0) {
      alert(`Please map the required fields: ${missing.join(', ')}`);
      return;
    }

    setImporting(true);

    const processRows = async (rows) => {
      try {
        const leadsToImport = [];
        for (const row of rows) {
          if (!row) continue;
          const leadData = {};
          Object.keys(mapping).forEach(dbKey => {
            const fileCol = mapping[dbKey];
            if (fileCol && row[fileCol] !== undefined && row[fileCol] !== null) {
              leadData[dbKey] = row[fileCol].toString().trim();
            }
          });
          if (leadData.name && leadData.mobile) {
            leadsToImport.push(leadData);
          }
        }

        const { data } = await bulkImportLeads(leadsToImport);
        setResults({ success: data.imported, skipped: data.skipped });
      } catch (err) {
        console.error('Failed to bulk import:', err);
        alert('Server error during bulk import.');
        setResults({ error: true });
      } finally {
        setImporting(false);
        setFile(null);
        setPreview([]);
      }
    };

    const isCsv = file.name.endsWith('.csv');
    if (isCsv) {
      Papa.parse(file, { header: true, skipEmptyLines: true, complete: (res) => processRows(res.data) });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
        processRows(jsonData);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data } = await getLeads();
      let filteredData = data;

      // Status Filter
      if (exportFilter.status !== 'all') {
        filteredData = filteredData.filter(lead => lead.status === exportFilter.status);
      }

      // Date Range Filter
      const now = new Date();
      if (exportFilter.dateRange === 'today') {
        filteredData = filteredData.filter(lead => new Date(lead.createdAt).toDateString() === now.toDateString());
      } else if (exportFilter.dateRange === 'week') {
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        filteredData = filteredData.filter(lead => new Date(lead.createdAt) >= weekAgo);
      } else if (exportFilter.dateRange === 'month') {
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        filteredData = filteredData.filter(lead => new Date(lead.createdAt) >= monthAgo);
      }

      if (filteredData.length === 0) {
        alert('No leads found matching your filters.');
        setExporting(false);
        return;
      }

      const exportData = filteredData.map(lead => ({
        Name: lead.name,
        Mobile: lead.mobile,
        Type: lead.type,
        Status: lead.status,
        'Ask For': lead.source,
        'Business Type': lead.businessType || '',
        City: lead.city || '',
        'Created At': new Date(lead.createdAt).toLocaleDateString(),
        'Last Note': lead.callLogs?.length > 0 ? lead.callLogs[lead.callLogs.length-1].note : ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leads");
      XLSX.writeFile(wb, `Webiox_Leads_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (err) {
      console.error(err);
      alert('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8 pb-10">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Data Center</h1>
        <p className="text-slate-500 mt-1">Import new leads via CSV/Excel or export your existing database for external use.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Import Section (Takes up 3/5 width) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="card p-0 overflow-hidden shadow-sm border-slate-200">
            <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <Upload size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Import Leads</h2>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Drag & Drop Supported</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {!preview.length ? (
                <div 
                  className={`relative w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-200 cursor-pointer overflow-hidden ${dragActive ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}
                  onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                  onClick={() => fileInputRef.current.click()}
                >
                  <input ref={fileInputRef} type="file" className="hidden" accept=".csv, .xlsx" onChange={handleChange} />
                  
                  <div className="w-20 h-20 rounded-full bg-indigo-100/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileSpreadsheet size={36} className="text-indigo-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700">Click to upload or drag and drop</h3>
                  <p className="text-sm text-slate-500 mt-1 font-medium">CSV or Excel (XLSX) files only</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6 animation-fade-in">
                  <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100 p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet size={24} className="text-indigo-600" />
                      <div>
                        <p className="font-bold text-sm text-slate-800">{file?.name}</p>
                        <p className="text-xs text-slate-500">Ready to map columns</p>
                      </div>
                    </div>
                    <button onClick={() => {setPreview([]); setFile(null);}} className="p-1.5 hover:bg-indigo-100 rounded text-indigo-600 transition-colors"><X size={18}/></button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200 p-3 font-semibold text-sm text-slate-700 flex items-center gap-2">
                      <Check className="text-green-500" size={16}/> Map Your Data
                    </div>
                    <div className="p-4 bg-white grid gap-4">
                      {dbFields.map(field => (
                        <div key={field.key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                          <div className="w-48 shrink-0 flex items-center gap-2 font-medium text-sm text-slate-700">
                            <span>{field.icon}</span> {field.label}
                          </div>
                          <div className="hidden sm:block text-slate-300"><ArrowRight size={16}/></div>
                          <select 
                            className={`flex-1 border text-sm rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${!mapping[field.key] && requiredFields.includes(field.key) ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-200 bg-white'}`}
                            value={mapping[field.key] || ''}
                            onChange={(e) => setMapping({...mapping, [field.key]: e.target.value})}
                          >
                            <option value="">-- Ignore --</option>
                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex items-center justify-center gap-3"
                    onClick={handleImport} disabled={importing}
                  >
                    {importing ? <span className="animate-pulse">Importing securely...</span> : <><Upload size={20}/> Complete Import</>}
                  </button>
                </div>
              )}

              {results && (
                <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 border ${results.error ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                  {results.error ? <AlertTriangle className="mt-0.5 shrink-0" size={20} /> : <Check className="mt-0.5 shrink-0" size={20} />}
                  <div>
                    <h4 className="font-bold text-sm">{results.error ? 'Import Failed' : 'Import Successful'}</h4>
                    {!results.error && (
                      <ul className="text-sm mt-1 opacity-90 list-disc list-inside">
                        <li><strong>{results.success}</strong> new leads added</li>
                        <li><strong>{results.skipped}</strong> duplicates skipped (based on mobile)</li>
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Export Section (Takes up 2/5 width) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="card p-0 overflow-hidden shadow-sm border-slate-200 h-full flex flex-col">
            <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Download size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Export Leads</h2>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Download to Excel</p>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={14}/> Date Range
                </label>
                <select 
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  value={exportFilter.dateRange} onChange={e => setExportFilter({...exportFilter, dateRange: e.target.value})}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Filter size={14}/> Status
                </label>
                <select 
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  value={exportFilter.status} onChange={e => setExportFilter({...exportFilter, status: e.target.value})}
                >
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Process">In Process</option>
                  <option value="Send Detail">Send Detail</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                  <option value="Permanently Lost">Permanently Lost</option>
                </select>
              </div>

              <div className="mt-auto pt-6 border-t border-slate-100">
                <button 
                  onClick={handleExport} disabled={exporting}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex items-center justify-center gap-3"
                >
                  {exporting ? <span className="animate-pulse">Generating File...</span> : <><Download size={20}/> Export Data</>}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Bulk Image Import Section */}
      <div className="mt-4 pt-8 border-t border-slate-200">
        <BulkImageImport isComponent={true} />
      </div>
    </div>
  );
}

export default ImportExport;
