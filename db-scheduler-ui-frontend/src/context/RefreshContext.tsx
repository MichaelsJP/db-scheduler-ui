/*
 * Copyright (C) Bekk
 *
 * <p>Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a copy of the License at
 *
 * <p>http://www.apache.org/licenses/LICENSE-2.0
 *
 * <p>Unless required by applicable law or agreed to in writing, software distributed under the
 * License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface RefreshContextType {
  refreshInterval: number;
  setRefreshInterval: (interval: number) => void;
  countdown: number;
  triggerManualRefresh: () => void;
  lastRefresh: number;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export const RefreshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [refreshInterval, setRefreshIntervalState] = useState(() => {
    const saved = localStorage.getItem('db-scheduler-ui-refresh-interval');
    return saved ? parseInt(saved) : 10;
  });
  const [countdown, setCountdown] = useState(refreshInterval);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const setRefreshInterval = (interval: number) => {
    setRefreshIntervalState(interval);
    localStorage.setItem('db-scheduler-ui-refresh-interval', interval.toString());
    setCountdown(interval);
  };

  const triggerManualRefresh = useCallback(() => {
    setLastRefresh(Date.now());
    if (refreshInterval > 0) {
      setCountdown(refreshInterval);
    }
    // Dispatch a global event so all components know to refetch
    window.dispatchEvent(new CustomEvent('db-scheduler-ui-refresh'));
  }, [refreshInterval]);

  useEffect(() => {
    if (refreshInterval === 0) {
      setCountdown(0);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          triggerManualRefresh();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [refreshInterval, triggerManualRefresh]);

  return (
    <RefreshContext.Provider
      value={{
        refreshInterval,
        setRefreshInterval,
        countdown,
        triggerManualRefresh,
        lastRefresh,
      }}
    >
      {children}
    </RefreshContext.Provider>
  );
};

export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
};
