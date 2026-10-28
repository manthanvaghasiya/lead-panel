import { useState, useEffect } from 'react';
import { X, Sparkles, ImagePlus, ChevronDown, CheckCircle2 } from 'lucide-react';
import { updateLead, extractLeadFromText } from '../../api/apiClient';

export default function UpdateLeadModal({ lead, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: lead?.name || '',
    ownerName: lead?.ownerName || '',
    mobile: lead?.mobile || '',
    address: lead?.address || '',
    mapsUrl: lead?.mapsUrl || '',
    website: lead?.website || '',
    businessType: lead?.businessType || '',
    city: lead?.city || '',
    source: lead?.source || 'Website',
    type: lead?.type || 'Cold',
    status: lead?.status || 'Pending',
    socials: {
      instagram: lead?.socials?.instagram || '',
      facebook: lead?.socials?.facebook || '',
      youtube: lead?.socials?.youtube || '',
      linkedin: lead?.socials?.linkedin || '',
      rating: lead?.socials?.rating || '',
      reviews: lead?.socials?.reviews || '',
      summary: lead?.socials?.summary || '',
      hours: lead?.socials?.hours || '',
      emails: lead?.socials?.emails || '',
      phones: lead?.socials?.phones || '',
      addressMatch: lead?.socials?.addressMatch || '',
      instagramFollowers: lead?.socials?.instagramFollowers || '',
      facebookFollowers: lead?.socials?.facebookFollowers || '',
      youtubeSubscribers: lead?.socials?.youtubeSubscribers || '',
      platforms: lead?.socials?.platforms || []
    }
  });

  const [loading, setLoading] = useState(false);
  const [magicText, setMagicText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || '',
        ownerName: lead.ownerName || '',
        mobile: lead.mobile || '',
        address: lead.address || '',
        mapsUrl: lead.mapsUrl || '',
        website: lead.website || '',
        businessType: lead.businessType || '',
        city: lead.city || '',
        source: lead.source || 'Website',
        type: lead.type || 'Cold',
        status: lead.status || 'Pending',
        followupDate: lead.followupDate && !isNaN(new Date(lead.followupDate).getTime())
          ? new Date(lead.followupDate).toISOString().split('T')[0]
          : '',
        socials: {
          instagram: lead.socials?.instagram || '',
          facebook: lead.socials?.facebook || '',
          youtube: lead.socials?.youtube || '',
          linkedin: lead.socials?.linkedin || '',
          rating: lead.socials?.rating || '',
          reviews: lead.socials?.reviews || '',
          summary: lead.socials?.summary || '',
          hours: lead.socials?.hours || '',
          emails: lead.socials?.emails || '',
          phones: lead.socials?.phones || '',
          addressMatch: lead.socials?.addressMatch || '',
          instagramFollowers: lead.socials?.instagramFollowers || '',
          facebookFollowers: lead.socials?.facebookFollowers || '',
          youtubeSubscribers: lead.socials?.youtubeSubscribers || '',
          platforms: lead.socials?.platforms || []
        }
      });
    }
  }, [lead]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  const handleMagicFill = async () => {
    if (!magicText.trim() && !imageFile) return;
    setExtracting(true);
    setErrorMessage('');
    try {
      let imageBase64 = null;
      let mimeType = null;
      if (imageFile && imagePreview) {
        imageBase64 = imagePreview.split(',')[1];
        mimeType = imageFile.type;
      }

      const { data } = await extractLeadFromText(magicText, imageBase64, mimeType);
      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        ownerName: data.ownerName || prev.ownerName,
        mobile: data.mobile || prev.mobile,
        address: data.address || prev.address,
        mapsUrl: data.mapsUrl || prev.mapsUrl,
        website: data.website || prev.website,
        city: data.city || prev.city,
        businessType: data.businessType || prev.businessType,
        type: ['Hot', 'Warm', 'Cold', 'Won', 'Lost'].includes(data.type) ? data.type : prev.type,
        source: ['Website', 'CRM', 'Website+CRM', 'Other'].includes(data.source) ? data.source : prev.source,
        status: ['Pending', 'In Process', 'Send Detail', 'Follow-up Letter', 'Contacted', 'Won', 'Lost', 'Permanently Lost'].includes(data.status) ? data.status : prev.status,
        socials: {
          ...prev.socials,
          instagram: data.socials?.instagram || prev.socials?.instagram || '',
          facebook: data.socials?.facebook || prev.socials?.facebook || '',
          youtube: data.socials?.youtube || prev.socials?.youtube || '',
          linkedin: data.socials?.linkedin || prev.socials?.linkedin || '',
          rating: data.socials?.rating || prev.socials?.rating || '',
          reviews: data.socials?.reviews || prev.socials?.reviews || ''
        }
      }));
      setMagicText('');
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Failed to extract data. Check AI configuration.');
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const payload = {
        ...formData,
        followupDate: formData.followupDate ? formData.followupDate : null,
      };
      const { data } = await updateLead(lead._id, payload);
      onSuccess(data);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Error updating lead profile. Please check input parameters.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Update Lead Profile</h3>
            <p className="text-xs text-slate-500 font-medium truncate max-w-[320px]">{lead?.name}</p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium flex items-center gap-2">
              <span className="font-bold shrink-0">⚠️ Error:</span>
              <span className="break-words">{errorMessage}</span>
            </div>
          )}

          {/* AI Magic Fill Section */}
          <div className="bg-purple-50/80 border border-purple-200/60 rounded-xl p-3.5 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs uppercase tracking-wider text-purple-800 font-bold flex items-center gap-1.5">
                <Sparkles size={14} className="text-purple-600" /> AI Magic Fill
              </label>
              <label className="cursor-pointer text-purple-700 hover:text-purple-900 transition-colors flex items-center gap-1 text-xs font-semibold bg-white/80 px-2.5 py-1 rounded-md border border-purple-200 shadow-2xs">
                <ImagePlus size={14} /> 
                <span>Upload Card</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>

            {imagePreview && (
              <div className="relative inline-block mb-2">
                <img src={imagePreview} alt="Preview" className="h-16 rounded border border-purple-200 object-cover" />
                <button 
                  type="button" 
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-md"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <textarea 
                rows="2"
                className="w-full bg-white border border-purple-200 rounded-lg p-2.5 text-xs text-slate-800 placeholder:text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none flex-1"
                placeholder="Paste text or image (Ctrl+V) from WhatsApp or business card..."
                value={magicText}
                onChange={e => setMagicText(e.target.value)}
              />
              <button 
                type="button" 
                onClick={handleMagicFill}
                disabled={extracting || (!magicText.trim() && !imageFile)}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg px-3 py-2 text-xs font-semibold transition-colors flex items-center justify-center shrink-0 shadow-sm"
              >
                {extracting ? 'Extracting...' : '✨ Auto-Fill'}
              </button>
            </div>
          </div>

          <form id="updateLeadForm" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input 
                  required 
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input 
                  required 
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none" 
                  value={formData.mobile} 
                  onChange={e => setFormData({...formData, mobile: e.target.value})} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Owner / Contact Name</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none" 
                  value={formData.ownerName} 
                  onChange={e => setFormData({...formData, ownerName: e.target.value})} 
                  placeholder="e.g. Ramesh Bhai" 
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Business Type / Category</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none" 
                  value={formData.businessType} 
                  onChange={e => setFormData({...formData, businessType: e.target.value})} 
                  placeholder="e.g. Automotive, Real Estate"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">City</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none" 
                  value={formData.city} 
                  onChange={e => setFormData({...formData, city: e.target.value})} 
                  placeholder="e.g. Surat" 
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Address</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none" 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                  placeholder="Shop / Area address" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Google Maps Link</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none" 
                  value={formData.mapsUrl} 
                  onChange={e => setFormData({...formData, mapsUrl: e.target.value})} 
                  placeholder="https://maps.google.com/..." 
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Website URL</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none" 
                  value={formData.website} 
                  onChange={e => setFormData({...formData, website: e.target.value})} 
                  placeholder="https://example.com" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Lead Type</label>
                <select 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white focus:border-slate-800 focus:outline-none" 
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  <option value="Hot">🔥 Hot</option>
                  <option value="Warm">⚡ Warm</option>
                  <option value="Cold">❄️ Cold</option>
                  <option value="Won">🏆 Won</option>
                  <option value="Lost">❌ Lost</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Lead Status</label>
                <select 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white focus:border-slate-800 focus:outline-none" 
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Process">In Process</option>
                  <option value="Send Detail">Send Detail</option>
                  <option value="Follow-up Letter">Follow-up Letter</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                  <option value="Permanently Lost">Permanently Lost</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Source / Ask For</label>
                <select 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white focus:border-slate-800 focus:outline-none" 
                  value={formData.source} 
                  onChange={e => setFormData({...formData, source: e.target.value})}
                >
                  <option value="Website">Website</option>
                  <option value="CRM">CRM</option>
                  <option value="Website+CRM">Website+CRM</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Social Media Details */}
            <details className="group border border-slate-200 rounded-xl bg-slate-50 open:bg-white transition-colors">
              <summary className="flex items-center justify-between cursor-pointer p-3 font-semibold text-slate-700 select-none text-xs uppercase tracking-wider">
                <span className="flex items-center gap-1.5"><Sparkles size={14} className="text-purple-600" /> Social Media & Online Profiles</span>
                <ChevronDown size={16} className="text-slate-400 group-open:-rotate-180 transition-transform duration-200" />
              </summary>
              <div className="p-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Instagram</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:border-slate-800 focus:outline-none" 
                    value={formData.socials.instagram} 
                    onChange={e => setFormData({...formData, socials: {...formData.socials, instagram: e.target.value}})} 
                    placeholder="URL or handle" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Facebook</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:border-slate-800 focus:outline-none" 
                    value={formData.socials.facebook} 
                    onChange={e => setFormData({...formData, socials: {...formData.socials, facebook: e.target.value}})} 
                    placeholder="URL or page" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">LinkedIn</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:border-slate-800 focus:outline-none" 
                    value={formData.socials.linkedin} 
                    onChange={e => setFormData({...formData, socials: {...formData.socials, linkedin: e.target.value}})} 
                    placeholder="URL or profile" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">YouTube</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:border-slate-800 focus:outline-none" 
                    value={formData.socials.youtube} 
                    onChange={e => setFormData({...formData, socials: {...formData.socials, youtube: e.target.value}})} 
                    placeholder="URL or channel" 
                  />
                </div>
              </div>
            </details>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 mt-auto">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 font-medium text-sm transition-colors shadow-2xs"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="updateLeadForm" 
            disabled={loading} 
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-sm transition-all shadow-sm min-w-[120px] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>Save Updates</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
