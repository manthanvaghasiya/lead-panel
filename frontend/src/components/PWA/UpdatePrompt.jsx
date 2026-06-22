import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex flex-col gap-3 animate-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <RefreshCw size={16} className="text-cyan-400" />
            Update Available
          </h4>
          <p className="text-xs text-slate-300 mt-1">
            A new version of Webiox Lead Panel is ready.
          </p>
        </div>
        <button 
          onClick={() => setNeedRefresh(false)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      <button 
        onClick={() => updateServiceWorker(true)}
        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold py-2 rounded-lg transition-colors"
      >
        Reload to Update
      </button>
    </div>
  );
}
