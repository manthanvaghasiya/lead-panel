import React, { useState, useRef } from 'react';
import { extractLeadFromText, bulkImportLeads } from '../api/apiClient';
import { Images, UploadCloud, Play, CheckCircle2, AlertCircle, Loader2, X, Save, Trash2, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function BulkImageImport({ isComponent = false }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // Handle file selection
  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    const newItems = await Promise.all(selectedFiles.map(async (file) => {
      // Create object URL for preview
      const preview = URL.createObjectURL(file);
      // Convert to base64 for API
      const base64 = await convertToBase64(file);
      
      return {
        id: Math.random().toString(36).substring(7),
        file,
        preview,
        base64: base64.split(',')[1], // Remove data URL part
        mimeType: file.type,
        status: 'pending', // pending, extracting, done, error
        errorMsg: '',
        data: {
          name: '',
          mobile: '',
          address: '',
          city: '',
          businessType: '',
          type: 'Cold',
          status: 'Pending',
          source: 'Bulk Import'
        }
      };
    }));

    setItems(prev => [...prev, ...newItems]);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const removeItem = (id) => {
    setItems(prev => {
      const newItems = prev.filter(item => item.id !== id);
      // Clean up object URLs to prevent memory leaks
      const itemToRemove = prev.find(item => item.id === id);
      if (itemToRemove && itemToRemove.preview) {
        URL.revokeObjectURL(itemToRemove.preview);
      }
      return newItems;
    });
  };

  const updateItemData = (id, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          data: { ...item.data, [field]: value }
        };
      }
      return item;
    }));
  };

  const startExtraction = async () => {
    setIsExtracting(true);
    setSubmitResult(null);

    const itemsToProcess = items.filter(item => item.status === 'pending' || item.status === 'error');

    for (const item of itemsToProcess) {
      // Mark as extracting
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'extracting', errorMsg: '' } : i));

      try {
        const res = await extractLeadFromText('', item.base64, item.mimeType);
        
        // Merge extracted data with defaults
        const extracted = res.data;
        const newData = {
          name: extracted.name || '',
          mobile: extracted.mobile || '',
          address: extracted.address || '',
          city: extracted.city || '',
          businessType: extracted.businessType || '',
          type: extracted.type || 'Cold',
          status: extracted.status || 'Pending',
          source: extracted.source || 'Bulk Import'
        };

        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'done', data: newData } : i));
      } catch (error) {
        console.error("Extraction error for item", item.id, error);
        setItems(prev => prev.map(i => i.id === item.id ? { 
          ...i, 
          status: 'error', 
          errorMsg: error.response?.data?.message || 'Failed to extract. Rate limit or invalid image.' 
        } : i));
      }
    }

    setIsExtracting(false);
  };

  const submitAll = async () => {
    const readyItems = items.filter(item => item.status === 'done');
    if (readyItems.length === 0) return;

    // Validate if mandatory fields exist (name, mobile)
    const invalidItems = readyItems.filter(item => !item.data.name || !item.data.mobile);
    if (invalidItems.length > 0) {
      alert(`There are ${invalidItems.length} leads missing a Name or Mobile number. Please fix them before submitting.`);
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const payload = readyItems.map(item => item.data);
      const res = await bulkImportLeads(payload);
      
      setSubmitResult({
        success: true,
        imported: res.data.imported,
        skipped: res.data.skipped
      });

      // Remove successfully submitted items
      setItems(prev => prev.filter(item => item.status !== 'done'));

    } catch (err) {
      console.error(err);
      setSubmitResult({
        success: false,
        message: err.response?.data?.message || 'Failed to import leads.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = items.filter(i => i.status === 'pending').length;
  const doneCount = items.filter(i => i.status === 'done').length;

  return (
    <div className={`flex flex-col gap-6 ${isComponent ? '' : 'max-w-7xl mx-auto pb-12'}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
          <Images size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bulk Image Import</h1>
          <p className="text-sm text-slate-500">Upload multiple screenshots, business cards, or photos to instantly extract and import leads.</p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center border-dashed">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-400">
          <UploadCloud size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Upload Lead Photos</h3>
        <p className="text-slate-500 text-sm max-w-md mb-6">Select multiple images at once. We'll automatically review each one and extract the lead's data using AI.</p>
        
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange}
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
        >
          Select Images
        </button>
      </div>

      {/* Action Bar */}
      {items.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
          <div className="flex items-center gap-4 text-sm font-semibold text-slate-600">
            <span>Total: {items.length}</span>
            <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded">Pending: {pendingCount}</span>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Ready: {doneCount}</span>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button 
              onClick={startExtraction}
              disabled={isExtracting || pendingCount === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isExtracting ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} className="fill-current" />}
              {isExtracting ? 'Extracting...' : 'Start Extraction'}
            </button>
            <button 
              onClick={submitAll}
              disabled={isSubmitting || doneCount === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isSubmitting ? 'Importing...' : 'Submit All Ready'}
            </button>
          </div>
        </div>
      )}

      {/* Submit Result */}
      {submitResult && (
        <div className={`p-4 rounded-xl border ${submitResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {submitResult.success ? (
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 size={20} className="text-emerald-600" />
              Successfully imported {submitResult.imported} leads! ({submitResult.skipped} duplicates skipped based on mobile number).
            </div>
          ) : (
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle size={20} className="text-red-600" />
              {submitResult.message}
            </div>
          )}
        </div>
      )}

      {/* Grid of Images and Forms */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {items.map((item, index) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col sm:flex-row relative group">
              
              {/* Status Badge */}
              <div className="absolute top-2 left-2 z-10">
                {item.status === 'pending' && <span className="bg-slate-800 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow">Pending</span>}
                {item.status === 'extracting' && <span className="bg-blue-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Extracting</span>}
                {item.status === 'done' && <span className="bg-emerald-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow flex items-center gap-1"><CheckCircle2 size={10}/> Ready</span>}
                {item.status === 'error' && <span className="bg-rose-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow">Error</span>}
              </div>

              {/* Remove Button */}
              <button 
                onClick={() => removeItem(item.id)}
                className="absolute top-2 right-2 z-10 bg-white/80 hover:bg-rose-500 hover:text-white text-slate-600 p-1.5 rounded-lg shadow backdrop-blur transition-all"
                title="Remove Image"
              >
                <Trash2 size={14} />
              </button>

              {/* Image Preview */}
              <div className="sm:w-2/5 bg-slate-50 border-r border-slate-100 flex items-center justify-center p-4 min-h-[200px]">
                <img src={item.preview} alt={`Upload ${index}`} className="max-w-full max-h-[300px] object-contain rounded drop-shadow-sm" />
              </div>

              {/* Data Form */}
              <div className="p-4 flex-1 flex flex-col gap-3 relative">
                {item.status === 'error' && (
                  <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-100 mb-2">
                    {item.errorMsg}
                  </div>
                )}
                
                {/* Overlay while pending or extracting */}
                {(item.status === 'pending' || item.status === 'extracting') && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    {item.status === 'extracting' && <Loader2 size={32} className="text-primary animate-spin" />}
                  </div>
                )}

                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Edit3 size={14} /> Review Data
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Name / Business Name <span className="text-rose-500">*</span></label>
                    <input 
                      type="text" 
                      value={item.data.name} 
                      onChange={(e) => updateItemData(item.id, 'name', e.target.value)}
                      className="w-full text-sm font-medium border border-slate-200 rounded px-2.5 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Mobile <span className="text-rose-500">*</span></label>
                    <input 
                      type="text" 
                      value={item.data.mobile} 
                      onChange={(e) => updateItemData(item.id, 'mobile', e.target.value)}
                      className="w-full text-sm font-medium border border-slate-200 rounded px-2.5 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">City</label>
                    <input 
                      type="text" 
                      value={item.data.city} 
                      onChange={(e) => updateItemData(item.id, 'city', e.target.value)}
                      className="w-full text-sm font-medium border border-slate-200 rounded px-2.5 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Business Type</label>
                    <input 
                      type="text" 
                      value={item.data.businessType} 
                      onChange={(e) => updateItemData(item.id, 'businessType', e.target.value)}
                      className="w-full text-sm font-medium border border-slate-200 rounded px-2.5 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Address</label>
                    <input 
                      type="text" 
                      value={item.data.address} 
                      onChange={(e) => updateItemData(item.id, 'address', e.target.value)}
                      className="w-full text-sm font-medium border border-slate-200 rounded px-2.5 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export default BulkImageImport;
