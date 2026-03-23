function safeExecute(fn) {
  try {
    return fn();
  } catch (error) {
    console.warn('Storage operation failed', error);
    return undefined;
  }
}

export function setJSON(key, value) {
  safeExecute(() => {
    if (value === undefined) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  });
}

export function getJSON(key, fallback = null) {
  const value = safeExecute(() => localStorage.getItem(key));
  if (value === undefined || value === null) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Failed to parse JSON from storage', key, error);
    return fallback;
  }
}

export function setRaw(key, value) {
  safeExecute(() => {
    if (value === undefined || value === null) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, value);
  });
}

export function getRaw(key, fallback = null) {
  const value = safeExecute(() => localStorage.getItem(key));
  return value ?? fallback;
}

export function setSession(key, value) {
  safeExecute(() => {
    if (value === undefined) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, JSON.stringify(value));
  });
}

export function getSession(key, fallback = null) {
  const value = safeExecute(() => sessionStorage.getItem(key));
  if (value === undefined || value === null) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Failed to parse JSON from session storage', key, error);
    return fallback;
  }
}

export function clearAll() {
  safeExecute(() => localStorage.clear());
  safeExecute(() => sessionStorage.clear());
}

/**
 * Write data to Chrome extension storage (local)
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @returns {Promise<void>}
 */
export async function writeExtensionStorage(key, value) {
  if (typeof chrome !== "undefined" && chrome?.storage?.local) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
  // Fallback to localStorage if chrome.storage is not available
  setJSON(key, value);
}

/**
 * Read data from Chrome extension storage (local)
 * @param {string} key - Storage key
 * @returns {Promise<any>}
 */
export async function readExtensionStorage(key) {
  if (typeof chrome !== "undefined" && chrome?.storage?.local) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result[key]);
        }
      });
    });
  }
  // Fallback to localStorage if chrome.storage is not available
  return getJSON(key);
}
