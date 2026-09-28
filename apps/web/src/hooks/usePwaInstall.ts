'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PwaInstallState {
  isStandalone: boolean;
  canInstall: boolean;
  isIos: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  isBypassed: boolean;
  promptInstall: () => Promise<boolean>;
  bypassPwa: () => void;
}

export function usePwaInstall(): PwaInstallState {
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isBypassed, setIsBypassed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Detect standalone PWA mode
    const checkStandalone = () => {
      const matchMediaStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const navigatorStandalone = (window.navigator as any).standalone === true;
      const isAndroidApp = document.referrer.includes('android-app://');
      const queryStandalone = new URLSearchParams(window.location.search).get('pwa') === '1';

      return matchMediaStandalone || navigatorStandalone || isAndroidApp || queryStandalone;
    };

    setIsStandalone(checkStandalone());

    // 2. Detect platform
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    const android = /android/.test(ua);
    setIsIos(ios);
    setIsAndroid(android);
    setIsDesktop(!ios && !android);

    // 3. Check session bypass
    const bypassed = sessionStorage.getItem('dfz_pwa_bypass') === 'true';
    setIsBypassed(bypassed);

    // 4. Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 5. Listen for appinstalled event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setCanInstall(false);
      setIsStandalone(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsStandalone(true);
        setCanInstall(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [deferredPrompt]);

  const bypassPwa = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('dfz_pwa_bypass', 'true');
      setIsBypassed(true);
    }
  }, []);

  return {
    isStandalone,
    canInstall,
    isIos,
    isAndroid,
    isDesktop,
    isBypassed,
    promptInstall,
    bypassPwa,
  };
}
