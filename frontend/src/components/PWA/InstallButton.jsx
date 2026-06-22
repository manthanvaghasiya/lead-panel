import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function InstallButton({ isMobile = false }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  if (!isInstallable || isInstalled) return null;

  if (isMobile) {
    return (
      <button 
        onClick={handleInstallClick}
        className="flex items-center gap-2 w-full px-4 py-3 bg-cyan-600/10 text-cyan-600 font-semibold text-sm border-t border-slate-200"
      >
        <Download size={18} />
        Install Webiox App
      </button>
    );
  }

  return (
    <button 
      onClick={handleInstallClick}
      className="flex items-center gap-3 w-full px-3 py-3 mt-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md transition-all group"
    >
      <div className="flex items-center justify-center shrink-0">
        <Download size={20} className="group-hover:-translate-y-0.5 transition-transform" />
      </div>
      <div className="flex flex-col items-start min-w-0">
        <span className="text-sm font-bold tracking-wide">Install App</span>
        <span className="text-[10px] text-cyan-100 font-medium">Get the native experience</span>
      </div>
    </button>
  );
}
