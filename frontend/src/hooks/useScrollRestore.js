import { useEffect } from 'react';

export function useScrollRestore(containerId, dependency = null) {
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const routeKey = window.location.pathname;
    const storageKey = `scroll-${containerId}-${routeKey}`;

    // Restore scroll position when dependency changes (e.g. data finishes loading)
    const savedScroll = sessionStorage.getItem(storageKey);
    if (savedScroll) {
      // Use setTimeout to ensure DOM has painted the updated dependency content
      setTimeout(() => {
        container.scrollTop = parseInt(savedScroll, 10);
      }, 0);
    }

    // Save scroll position on scroll
    let timeoutId = null;
    const handleScroll = () => {
      // Debounce slightly to prevent excessive writes
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        sessionStorage.setItem(storageKey, container.scrollTop.toString());
      }, 100);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [containerId, dependency]);
}
