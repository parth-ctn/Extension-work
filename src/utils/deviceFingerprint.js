import { detectIncognito } from 'detectincognitojs';
import { x86 } from 'murmurhash3js';
import { post } from '../api/httpClient.js';

const AUTH_API_KEY = import.meta.env.VITE_AUTH_API_KEY;
const VERIFY_IP_URL = import.meta.env.VITE_VERIFY_IP_URL;
const rawFingerprintBase = import.meta.env.VITE_API_FINGERPRINT_URL ?? '';
const FINGERPRINT_BASE_URL = rawFingerprintBase ? rawFingerprintBase.replace(/\/?$/, '/') : '';

export async function getDeviceFingerprint(process = 'signin') {
  if (typeof window === 'undefined') {
    return { visitorId: '', requestId: '' };
  }

  try {
    const userAgent = navigator.userAgent;
    const colorDepth = screen.colorDepth;
    const resolution = `${screen.availWidth},${screen.availHeight}`;
    const cookiesEnabled = navigator.cookieEnabled;
    const canvasPrint = getCanvasPrint();
    const localStorageEnabled = isStorageEnabled(localStorage);
    const sessionStorageEnabled = isStorageEnabled(sessionStorage);

    const hashInput = [
      userAgent,
      colorDepth,
      resolution,
      localStorageEnabled,
      sessionStorageEnabled,
      cookiesEnabled,
      canvasPrint,
      location.hostname
    ].join('|');

    const hashCode = x86.hash32(hashInput).toString();

    const incognitoResult = await detectIncognito().catch(() => ({ isPrivate: false, browserName: 'unknown' }));
    const payload = {
      hashCode,
      hashValue: hashInput,
      otherInformation: {
        ip: await getIP(),
        requestTimeStamp: Date.now().toString(),
        browserDetails: {
          browserName: getBrowserName(),
          browserMajorVersion: getBrowserVersion(),
          browserFullVersion: navigator.userAgent,
          os: getOS(),
          osVersion: getOSVersion(),
          device: 'other',
          userAgent,
          sdkVersion: '1.0.0',
          appVersion: '1.0'
        },
        confidenceParams: {
          isBot: isBot(),
          incognito: incognitoResult?.isPrivate ?? false
        },
        tag: {
          displayHeight: window.innerHeight,
          displayWidth: window.innerWidth,
          process
        }
      }
    };

    const headers = AUTH_API_KEY ? { 'Auth-API-Key': AUTH_API_KEY } : {};
    const fingerprintUrl = FINGERPRINT_BASE_URL ? `${FINGERPRINT_BASE_URL}native-fingerprint/` : 'native-fingerprint/';
    const response = await post(fingerprintUrl, payload, { headers });
    const visitorId = response?.data?.visitorId ?? '';
    const requestId = response?.data?.requestId ?? '';
    return { visitorId, requestId };
  } catch (error) {
    console.warn('Failed to capture fingerprint', error);
    return { visitorId: '', requestId: '' };
  }
}

function isBot() {
  const botPatterns = [/bot/i, /spider/i, /crawl/i, /slurp/i, /headless/i, /phantom/i, /wget/i, /curl/i];
  return botPatterns.some((pattern) => pattern.test(navigator.userAgent));
}

function isStorageEnabled(storage) {
  try {
    const testKey = '__storage_test__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function getCanvasPrint() {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context?.fillText('fingerprint', 10, 10);
    return canvas.toDataURL();
  } catch {
    return 'canvas-unavailable';
  }
}

async function getIP() {
  if (!VERIFY_IP_URL) {
    return '';
  }
  try {
    const response = await fetch(VERIFY_IP_URL);
    const text = await response.text();
    return text ?? '';
  } catch (error) {
    console.warn('Failed to resolve IP', error);
    return '';
  }
}

function getBrowserName() {
  const userAgent = navigator.userAgent;
  if (/Chrome/i.test(userAgent) && !/Edg/i.test(userAgent)) return 'Chrome';
  if (/Edg/i.test(userAgent)) return 'Edge';
  if (/Firefox/i.test(userAgent)) return 'Firefox';
  if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) return 'Safari';
  return 'Other';
}

function getBrowserVersion() {
  const match = /(Chrome|Firefox|Safari|Edg)\/(\d+)/.exec(navigator.userAgent);
  return match?.[2] ?? '';
}

function getOS() {
  const platformMatch = /\(([^)]+)\)/.exec(navigator.userAgent);
  return platformMatch?.[1] ?? '';
}

function getOSVersion() {
  const osVersion = navigator.userAgent;
  return osVersion?.split('(')[1]?.split(')')[0] ?? '';
}
