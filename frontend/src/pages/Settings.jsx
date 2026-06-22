import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../api/apiClient';
import { Settings as SettingsIcon, Save, Plus, Trash2, AlertCircle } from 'lucide-react';

function Settings() {
  const [keys, setKeys] = useState(['']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await getSettings();
      if (data && data.geminiApiKeys && data.geminiApiKeys.length > 0) {
        setKeys(data.geminiApiKeys);
      } else {
        setKeys(['']);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      setMessage({ type: 'error', text: 'Failed to load settings.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');
      // Filter out empty keys
      const validKeys = keys.filter(k => k.trim().length > 0);
      await updateSettings({ geminiApiKeys: validKeys });
      setKeys(validKeys.length > 0 ? validKeys : ['']);
      setMessage({ type: 'success', text: 'Settings saved successfully.' });
    } catch (err) {
      console.error('Failed to save settings:', err);
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const updateKey = (index, value) => {
    const newKeys = [...keys];
    newKeys[index] = value;
    setKeys(newKeys);
  };

  const addKey = () => {
    setKeys([...keys, '']);
  };

  const removeKey = (index) => {
    const newKeys = keys.filter((_, i) => i !== index);
    setKeys(newKeys.length > 0 ? newKeys : ['']);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-slate-500">Loading Settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-cyan-100 text-cyan-700 rounded-xl">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings</h1>
          <p className="text-sm text-slate-500">Manage application configuration and API keys.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col gap-2">
          <h2 className="text-lg font-bold text-slate-800">AI Configuration</h2>
          <p className="text-sm text-slate-500">
            Configure your Gemini API keys here. The system will automatically use the first available key. 
            If a key fails due to rate limits or quota, the system will automatically fall back to the next key in the list.
          </p>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            Gemini API Keys
          </label>
          
          <div className="flex flex-col gap-3">
            {keys.map((key, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => updateKey(index, e.target.value)}
                    placeholder="e.g. AIzaSyB..."
                    className="w-full text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-slate-700 placeholder:text-slate-400 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeKey(index)}
                  className="p-2.5 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100"
                  title="Remove Key"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-start mt-2">
            <button
              type="button"
              onClick={addKey}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-cyan-600 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors border border-cyan-100"
            >
              <Plus size={16} />
              Add Another API Key
            </button>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div>
            {message && (
              <div className={`flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-md ${message.type === 'error' ? 'text-rose-600 bg-rose-50 border border-rose-100' : 'text-emerald-600 bg-emerald-50 border border-emerald-100'}`}>
                <AlertCircle size={16} />
                {message.text}
              </div>
            )}
          </div>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all shadow-md hover:shadow-lg disabled:opacity-70"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
