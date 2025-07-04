// src/hooks/useRealtimeStatus.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CHANNEL_STATES } from '@supabase/supabase-js';

export const useRealtimeStatus = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('unknown');

  useEffect(() => {
    const checkStatus = () => {
      const channels = supabase.getChannels();
      const hasActiveChannels = channels.length > 0;
      const allConnected = channels.every(channel => channel.state === 'joined');
      
      setIsConnected(hasActiveChannels && allConnected);
      
      if (channels.length === 0) {
        setConnectionState('no_channels');
      } else if (allConnected) {
        setConnectionState('connected');
      } else {
        const states = channels.map(c => c.state);
        if (states.includes(CHANNEL_STATES.closed)) {
          setConnectionState('closed');
        } else if (states.includes(CHANNEL_STATES.errored)) {
          setConnectionState('error');
        } else {
          setConnectionState('connecting');
        }
      }
    };

    // Check immediately
    checkStatus();

    // Check periodically
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  return { isConnected, connectionState };
};