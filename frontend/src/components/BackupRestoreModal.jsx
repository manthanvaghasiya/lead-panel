import React, { useState } from 'react';
import { 
  X, FileText, Table, Database, Upload, CheckCircle2, 
  AlertCircle, ShieldCheck, Download, RefreshCw, Sparkles, HardDriveDownload
} from 'lucide-react';
import { exportMasterCrmPdf } from '../utils/pdfExportService';
import { exportCrmExcel, downloadJsonBackup, restoreDatabaseFromFile } from '../utils/dataBackupService';

export default function BackupRestoreModal({ isOpen, onClose, contacts = [], stats = null, onRestored }) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingJson, setLoadingJson] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState(null); // { type: 'success' | 'error', message: '' }
  const [selectedFile, setSelectedFile] = useState(null);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    setLoadingPdf(true);
    setRestoreStatus(null);
    try {
      exportMasterCrmPdf(contacts, stats);
      setRestoreStatus({ type: 'success', message: 'Master PDF dossier generated and downloaded successfully!' });
    } catch (err) {
      console.error('PDF Export failed:', err);
      setRestoreStatus({ type: 'error', message: 'Failed to generate PDF dossier: ' + err.message });
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleDownloadExcel = () => {
    setLoadingExcel(true);
    setRestoreStatus(null);
    try {
      exportCrmExcel(contacts);
      setRestoreStatus({ type: 'success', message: 'Excel spreadsheet (.xlsx) downloaded successfully!' });
    } catch (err) {
      console.error('Excel export failed:', err);
      setRestoreStatus({ type: 'error', message: 'Failed to export Excel: ' + err.message });
    } finally {
      setLoadingExcel(false);
    }
  };

  const handleDownloadJson = async () => {
    setLoadingJson(true);
    setRestoreStatus(null);
    try {
      await downloadJsonBackup();
      setRestoreStatus({ type: 'success', message: 'Raw JSON database snapshot downloaded. Store this file safely for disaster recovery!' });
    } catch (err) {
      console.error('JSON backup failed:', err);
      setRestoreStatus({ type: 'error', message: 'Failed to download JSON backup: ' + err.message });
    } finally {
      setLoadingJson(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setRestoreStatus(null);
    }
  };

  const handleRestoreSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setRestoreStatus({ type: 'error', message: 'Please select a valid .json backup file to restore.' });
      return;
    }

    setRestoring(true);
    setRestoreStatus(null);
    try {
      const result = await restoreDatabaseFromFile(selectedFile);
      setRestoreStatus({ 
        type: 'success', 
        message: result.message || 'Database restored successfully! All records have been recovered.' 
      });
      setSelectedFile(null);
      if (onRestored) onRestored();
    } catch (err) {
      console.error('Restore failed:', err);
      setRestoreStatus({ type: 'error', message: 'Failed to restore: ' + (err.response?.data?.message || err.message) });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 border border-slate-200">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-start justify-between shrink-0 border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shadow-inner">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white leading-tight flex items-center gap-2">
                <span>Data Recovery & Export Center</span>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full font-semibold">
                  100% Safe
                </span>
              </h3>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Download formatted PDF dossiers, spreadsheets, or snapshot files for disaster recovery.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800">

          {/* Status Alert Banner */}
          {restoreStatus && (
            <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-medium animate-in fade-in ${
              restoreStatus.type === 'success' 
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}>
              {restoreStatus.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 leading-relaxed">
                {restoreStatus.message}
              </div>
            </div>
          )}

          {/* 1. PDF Export Card (User's Primary Request) */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-white shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-xs">
                  <FileText size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Master PDF Dossier (Data Recovery & Print)</h4>
                  <p className="text-xs text-slate-500">
                    Generates a formatted multi-page PDF with all {contacts.length} contacts, deal terms, notes, and complete conversation histories.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-indigo-100">
              <span className="text-[11px] text-indigo-700 font-medium flex items-center gap-1">
                <Sparkles size={12} />
                <span>Branded • High-res • Universal device readable</span>
              </span>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={loadingPdf}
                className="inline-flex items-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
              >
                {loadingPdf ? <RefreshCw size={14} className="animate-spin" /> : <HardDriveDownload size={14} />}
                <span>{loadingPdf ? 'Generating PDF...' : 'Download Master PDF'}</span>
              </button>
            </div>
          </div>

          {/* 2. Dual Quick Exports: Excel & Raw JSON Backup */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Excel Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors flex flex-col justify-between space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs">
                  <Table size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Excel Spreadsheet (.xlsx)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tabular export of all contacts, channels, and deal terms for spreadsheets.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={loadingExcel}
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold shadow-2xs transition-all disabled:opacity-50"
              >
                <Download size={13} />
                <span>{loadingExcel ? 'Exporting...' : 'Download Excel (.xlsx)'}</span>
              </button>
            </div>

            {/* JSON Snapshot Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors flex flex-col justify-between space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-blue-600 text-white shadow-xs">
                  <Database size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Complete JSON Backup (.json)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    100% database snapshot for instant machine recovery into MongoDB.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadJson}
                disabled={loadingJson}
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold shadow-2xs transition-all disabled:opacity-50"
              >
                <Download size={13} />
                <span>{loadingJson ? 'Exporting...' : 'Download JSON Snapshot'}</span>
              </button>
            </div>
          </div>

          {/* 3. Disaster Recovery Restore Section */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/90 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Upload size={15} className="text-slate-600" />
              <span>Restore Database from Backup Snapshot</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              If your database was reset or you need to recover contacts, choose a previously exported <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">.json</code> backup file to restore records safely into MongoDB without duplicates.
            </p>

            <form onSubmit={handleRestoreSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 transition-all cursor-pointer bg-white border border-slate-200 rounded-lg p-1"
              />
              <button
                type="submit"
                disabled={!selectedFile || restoring}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-4 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 shrink-0"
              >
                {restoring ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                <span>{restoring ? 'Restoring...' : 'Restore Database'}</span>
              </button>
            </form>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Webiox Digital Solution • Data Safety & Recovery Suite</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
