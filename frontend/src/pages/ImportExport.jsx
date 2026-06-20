import { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, Check, AlertTriangle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { createLead, getLeads } from '../api/apiClient';

function ImportExport() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [exporting, setExporting] = useState(false);
  
  const fileInputRef = useRef(null);

  const requiredFields = ['name', 'mobile'];
  const dbFields = [
    { key: 'name', label: 'Name (Required)' },
    { key: 'mobile', label: 'Mobile (Required)' },
    { key: 'source', label: 'Source' },
    { key: 'type', label: 'Type (Hot/Warm/Cold)' },
    { key: 'status', label: 'Status' },
    { key: 'businessType', label: 'Business Type' },
    { key: 'city', label: 'City' },
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
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
          const headers = Object.keys(jsonData[0]);
          processData(jsonData, headers);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const processData = (data, fileHeaders) => {
    setHeaders(fileHeaders);
    setPreview(data.slice(0, 5)); // Show first 5 rows

    // Auto-map columns based on exact or partial matches
    const newMapping = {};
    dbFields.forEach(field => {
      const match = fileHeaders.find(h => 
        h.toLowerCase() === field.key.toLowerCase() || 
        h.toLowerCase().includes(field.key.toLowerCase()) ||
        field.key.toLowerCase().includes(h.toLowerCase())
      );
      if (match) {
        newMapping[field.key] = match;
      }
    });
    setMapping(newMapping);
  };

  const handleImport = async () => {
    // Validate required mappings
    const missing = requiredFields.filter(f => !mapping[f]);
    if (missing.length > 0) {
      alert(`Please map the required fields: ${missing.join(', ')}`);
      return;
    }

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    // Full parse again for the actual import
    const processRows = async (rows) => {
      for (const row of rows) {
        const leadData = {};
        Object.keys(mapping).forEach(dbKey => {
          const fileCol = mapping[dbKey];
          if (fileCol && row[fileCol]) {
            leadData[dbKey] = row[fileCol].toString().trim();
          }
        });

        if (!leadData.name || !leadData.mobile) {
          errorCount++;
          continue;
        }

        try {
          await createLead(leadData);
          successCount++;
        } catch (err) {
          console.error('Failed to import lead:', leadData, err);
          errorCount++;
        }
      }
      setResults({ success: successCount, error: errorCount });
      setImporting(false);
      setFile(null);
      setPreview([]);
    };

    const isCsv = file.name.endsWith('.csv');
    if (isCsv) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => processRows(res.data)
      });
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
      
      const exportData = data.map(lead => ({
        Name: lead.name,
        Mobile: lead.mobile,
        Type: lead.type,
        Status: lead.status,
        Source: lead.source,
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
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold mb-2">Import / Export Data</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Import Section */}
        <div className="card flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <div className="p-2 bg-primary/20 text-primary rounded"><Upload size={20} /></div>
            <h2 className="text-lg font-medium">Import Leads</h2>
          </div>
          
          <p className="text-sm text-slate-500">
            Upload your existing Excel or CSV file. You can map your columns to the database fields in the next step.
          </p>

          <input 
            type="file" 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          
          <button 
            onClick={() => fileInputRef.current.click()}
            className="btn-secondary w-full py-8 border-dashed border-2 flex flex-col items-center justify-center gap-3 hover:border-primary/50"
          >
            <FileSpreadsheet size={32} className="text-slate-500" />
            <span>Select Excel or CSV File</span>
          </button>

          {results && (
            <div className={`p-4 rounded-lg flex items-start gap-3 ${results.error > 0 ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-green-500/10 border border-green-500/30'}`}>
              {results.error > 0 ? <AlertTriangle className="text-orange-500" /> : <Check className="text-green-500" />}
              <div>
                <h4 className={`font-medium ${results.error > 0 ? 'text-orange-500' : 'text-green-500'}`}>Import Complete</h4>
                <p className="text-sm text-slate-700 mt-1">Successfully imported {results.success} leads.</p>
                {results.error > 0 && <p className="text-sm text-orange-400 mt-1">Failed to import {results.error} rows (missing required fields or errors).</p>}
              </div>
            </div>
          )}
        </div>

        {/* Export Section */}
        <div className="card flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <div className="p-2 bg-green-500/20 text-green-500 rounded"><Download size={20} /></div>
            <h2 className="text-lg font-medium">Export Leads</h2>
          </div>
          
          <p className="text-sm text-slate-500">
            Download your entire lead database as an Excel (.xlsx) file for backup or external reporting.
          </p>

          <div className="mt-auto pt-4">
            <button 
              onClick={handleExport}
              disabled={exporting}
              className="btn-primary w-full flex items-center justify-center gap-2 !bg-green-600 hover:!bg-green-700"
            >
              <Download size={18} />
              {exporting ? 'Generating File...' : 'Export All to Excel'}
            </button>
          </div>
        </div>
      </div>

      {/* Column Mapping UI */}
      {preview.length > 0 && (
        <div className="card mt-4 animation-fade-in">
          <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
            <Check className="text-primary" /> Map Columns
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            Match your file columns to the system fields. Name and Mobile are required.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {dbFields.map(field => (
              <div key={field.key} className="bg-white/50 p-3 rounded border border-border">
                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">
                  {field.label}
                </label>
                <select 
                  className="input-field text-sm"
                  value={mapping[field.key] || ''}
                  onChange={(e) => setMapping({...mapping, [field.key]: e.target.value})}
                >
                  <option value="">-- Ignore --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button className="btn-secondary" onClick={() => { setFile(null); setPreview([]); }}>Cancel</button>
            <button 
              className="btn-primary flex items-center gap-2 min-w-[150px] justify-center"
              onClick={handleImport}
              disabled={importing}
            >
              {importing ? 'Importing...' : 'Start Import'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImportExport;
