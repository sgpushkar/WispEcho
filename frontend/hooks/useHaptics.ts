"use client";

import { useCallback } from 'react';

export function useHaptics() {
  const trigger = useCallback((type: 'light' | 'medium' | 'heavy' = 'medium') => {
    try {
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        if (type === 'light') window.navigator.vibrate(10);
        else if (type === 'heavy') window.navigator.vibrate(30);
        else window.navigator.vibrate(20);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  return { triggerImpact: trigger, triggerSelection: () => trigger('light') };
}
