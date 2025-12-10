import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

export function useLocationState<T>() {
  const [state, setState] = useState<T | null>(null);
  const [location] = useLocation();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const historyState = window.history.state;
      if (historyState && historyState.state) {
        setState(historyState.state as T);
      }
    }
  }, [location]);

  return state;
}