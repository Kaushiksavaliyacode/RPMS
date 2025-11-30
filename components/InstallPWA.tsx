
import React, { useEffect, useState } from 'react';
import { X, Share, Download, Smartphone } from 'lucide-react';

export const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Check for Android/Desktop "beforeinstallprompt"
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // 2. Check for iOS (iPhone/iPad) not in standalone mode
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone = ('standalone' in window.navigator) && (window.navigator as any).standalone;

    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      setShowBanner(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowBanner(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-500 no-print">
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl p-4 border border-slate-700 max-w-md mx-auto relative overflow-hidden">
        
        {/* Close Button */}
        <button 
          onClick={() => setShowBanner(false)}
          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white bg-white/10 rounded-full transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex gap-4 items-start pr-6">
          <div className="bg-white p-2 rounded-xl shrink-0">
             <img 
               src="https://cdn-icons-png.flaticon.com/512/3652/3652191.png" 
               alt="App Icon" 
               className="w-10 h-10 object-contain"
             />
          </div>
          
          <div className="flex-1">
            <h3 className="font-bold text-lg leading-tight mb-1">Install Reliance PMS</h3>
            
            {isIOS ? (
              <div className="text-sm text-slate-300">
                <p className="mb-2">To install this app on your iPhone:</p>
                <div className="flex items-center gap-2 mb-1">
                   1. Tap the <Share size={16} className="text-blue-400 inline" /> Share button
                </div>
                <div className="flex items-center gap-2">
                   2. Scroll down and tap <span className="font-bold text-white flex items-center gap-1"><span className="bg-white text-slate-900 rounded-sm px-1 text-[10px] pb-0.5">+</span> Add to Home Screen</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-300">
                <p className="mb-3">Install this application on your home screen for quick and offline access.</p>
                <button 
                  onClick={handleInstallClick}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 w-full justify-center transition-all active:scale-95"
                >
                  <Download size={18} /> Install App
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
