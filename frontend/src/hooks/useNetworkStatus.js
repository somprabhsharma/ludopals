/**
 * useNetworkStatus Hook
 * A React hook for monitoring network connectivity status
 * Provides online/offline detection and connection quality information
 */

import { useState, useEffect, useCallback } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true; // Assume online for SSR
  });

  const [connectionType, setConnectionType] = useState(() => {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      return navigator.connection?.effectiveType || 'unknown';
    }
    return 'unknown';
  });

  const [isSlowConnection, setIsSlowConnection] = useState(false);

  // Update online status
  const updateOnlineStatus = useCallback(() => {
    setIsOnline(navigator.onLine);
  }, []);

  // Update connection information
  const updateConnectionInfo = useCallback(() => {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      const effectiveType = connection?.effectiveType || 'unknown';
      setConnectionType(effectiveType);
      
      // Consider 2g and slow-2g as slow connections
      setIsSlowConnection(effectiveType === '2g' || effectiveType === 'slow-2g');
    }
  }, []);

  useEffect(() => {
    // Add event listeners for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Add event listener for connection changes
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', updateConnectionInfo);
    }

    // Initial setup
    updateOnlineStatus();
    updateConnectionInfo();

    // Cleanup
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      
      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', updateConnectionInfo);
      }
    };
  }, [updateOnlineStatus, updateConnectionInfo]);

  return {
    isOnline,
    isOffline: !isOnline,
    connectionType,
    isSlowConnection
  };
}

/**
 * useNetworkStatusWithPing Hook
 * Enhanced network status hook that includes ping testing
 */
export function useNetworkStatusWithPing(pingUrl = '/api/ping', pingInterval = 30000) {
  const basicStatus = useNetworkStatus();
  const [lastPingTime, setLastPingTime] = useState(null);
  const [pingLatency, setPingLatency] = useState(null);
  const [isReachable, setIsReachable] = useState(true);

  const performPing = useCallback(async () => {
    if (!basicStatus.isOnline) {
      setIsReachable(false);
      return;
    }

    try {
      const startTime = Date.now();
      const response = await fetch(pingUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      if (response.ok) {
        setPingLatency(latency);
        setIsReachable(true);
        setLastPingTime(new Date());
      } else {
        setIsReachable(false);
      }
    } catch (error) {
      console.warn('Ping failed:', error.message);
      setIsReachable(false);
      setPingLatency(null);
    }
  }, [pingUrl, basicStatus.isOnline]);

  useEffect(() => {
    if (!basicStatus.isOnline) {
      return;
    }

    // Perform initial ping
    performPing();

    // Set up interval for regular pings
    const interval = setInterval(performPing, pingInterval);

    return () => {
      clearInterval(interval);
    };
  }, [performPing, pingInterval, basicStatus.isOnline]);

  return {
    ...basicStatus,
    isReachable,
    pingLatency,
    lastPingTime,
    performPing
  };
}

/**
 * useConnectionQuality Hook
 * Provides detailed connection quality information
 */
export function useConnectionQuality() {
  const networkStatus = useNetworkStatus();
  const [quality, setQuality] = useState('good');

  useEffect(() => {
    if (!networkStatus.isOnline) {
      setQuality('offline');
      return;
    }

    switch (networkStatus.connectionType) {
      case 'slow-2g':
        setQuality('poor');
        break;
      case '2g':
        setQuality('poor');
        break;
      case '3g':
        setQuality('fair');
        break;
      case '4g':
        setQuality('good');
        break;
      case '5g':
        setQuality('excellent');
        break;
      default:
        setQuality('good');
    }
  }, [networkStatus.isOnline, networkStatus.connectionType]);

  const getQualityColor = useCallback(() => {
    switch (quality) {
      case 'offline':
        return 'red';
      case 'poor':
        return 'red';
      case 'fair':
        return 'yellow';
      case 'good':
        return 'green';
      case 'excellent':
        return 'blue';
      default:
        return 'gray';
    }
  }, [quality]);

  const getQualityIcon = useCallback(() => {
    switch (quality) {
      case 'offline':
        return '❌';
      case 'poor':
        return '📶';
      case 'fair':
        return '📶';
      case 'good':
        return '📶';
      case 'excellent':
        return '📶';
      default:
        return '❓';
    }
  }, [quality]);

  const shouldShowWarning = useCallback(() => {
    return quality === 'poor' || quality === 'offline';
  }, [quality]);

  return {
    ...networkStatus,
    quality,
    qualityColor: getQualityColor(),
    qualityIcon: getQualityIcon(),
    shouldShowWarning: shouldShowWarning()
  };
}

/**
 * useOnlineManager Hook
 * Manages online/offline behavior for the application
 */
export function useOnlineManager() {
  const networkStatus = useNetworkStatus();
  const [offlineActions, setOfflineActions] = useState([]);

  const addOfflineAction = useCallback((action) => {
    if (!networkStatus.isOnline) {
      setOfflineActions(prev => [...prev, { ...action, timestamp: Date.now() }]);
    }
  }, [networkStatus.isOnline]);

  const clearOfflineActions = useCallback(() => {
    setOfflineActions([]);
  }, []);

  const executeOfflineActions = useCallback(async () => {
    if (networkStatus.isOnline && offlineActions.length > 0) {
      for (const action of offlineActions) {
        try {
          await action.execute();
        } catch (error) {
          console.error('Failed to execute offline action:', error);
        }
      }
      clearOfflineActions();
    }
  }, [networkStatus.isOnline, offlineActions, clearOfflineActions]);

  // Execute offline actions when coming back online
  useEffect(() => {
    if (networkStatus.isOnline) {
      executeOfflineActions();
    }
  }, [networkStatus.isOnline, executeOfflineActions]);

  return {
    ...networkStatus,
    offlineActions,
    addOfflineAction,
    clearOfflineActions,
    executeOfflineActions
  };
}

export default useNetworkStatus;