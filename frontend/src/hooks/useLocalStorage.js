/**
 * useLocalStorage Hook
 * A React hook for managing localStorage with automatic JSON serialization
 * and React state synchronization
 */

import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage(key, initialValue) {
  // Get value from localStorage or use initial value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      if (typeof window === 'undefined') {
        return initialValue;
      }
      
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback((value) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        if (valueToStore === null || valueToStore === undefined) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Listen for changes to this localStorage key from other tabs/windows
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(`Error parsing localStorage value for key "${key}":`, error);
        }
      } else if (e.key === key && e.newValue === null) {
        setStoredValue(initialValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
}

/**
 * useSessionStorage Hook
 * Similar to useLocalStorage but uses sessionStorage instead
 */
export function useSessionStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      if (typeof window === 'undefined') {
        return initialValue;
      }
      
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        if (valueToStore === null || valueToStore === undefined) {
          window.sessionStorage.removeItem(key);
        } else {
          window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
        }
      }
    } catch (error) {
      console.error(`Error setting sessionStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

/**
 * useStorageState Hook
 * A more advanced hook that can use either localStorage or sessionStorage
 */
export function useStorageState(key, initialValue, storageType = 'localStorage') {
  const storage = storageType === 'sessionStorage' ? 
    (typeof window !== 'undefined' ? window.sessionStorage : null) : 
    (typeof window !== 'undefined' ? window.localStorage : null);

  const [storedValue, setStoredValue] = useState(() => {
    try {
      if (!storage) {
        return initialValue;
      }
      
      const item = storage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading ${storageType} key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (storage) {
        if (valueToStore === null || valueToStore === undefined) {
          storage.removeItem(key);
        } else {
          storage.setItem(key, JSON.stringify(valueToStore));
        }
      }
    } catch (error) {
      console.error(`Error setting ${storageType} key "${key}":`, error);
    }
  }, [key, storedValue, storage, storageType]);

  // Listen for storage changes (only works for localStorage)
  useEffect(() => {
    if (!storage || storageType !== 'localStorage') {
      return;
    }

    const handleStorageChange = (e) => {
      if (e.key === key) {
        try {
          if (e.newValue !== null) {
            setStoredValue(JSON.parse(e.newValue));
          } else {
            setStoredValue(initialValue);
          }
        } catch (error) {
          console.error(`Error parsing ${storageType} value for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue, storage, storageType]);

  return [storedValue, setValue];
}

/**
 * useStorageReducer Hook
 * Combines useReducer with localStorage persistence
 */
export function useStorageReducer(key, reducer, initialState, storageType = 'localStorage') {
  const [storedState, setStoredState] = useStorageState(key, initialState, storageType);

  const dispatch = useCallback((action) => {
    const newState = reducer(storedState, action);
    setStoredState(newState);
  }, [reducer, storedState, setStoredState]);

  return [storedState, dispatch];
}

export default useLocalStorage;