import axios from 'axios';
import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

const getHostIp = (): string => {
  // 1. Try Expo hostUri (populated in Expo Go, e.g. "192.168.0.112:8081")
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }

  // 2. Try NativeModules.SourceCode.scriptURL (the URL the JS bundle was downloaded from)
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    const host = scriptURL.split('://')[1]?.split('/')[0]?.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return host;
    }
  }

  // 3. Fallback for physical devices connected via local Wi-Fi
  return '192.168.0.112';
};

const resolveApiBaseUrl = (): string => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api/v1';
  }

  const hostIp = getHostIp();
  return `http://${hostIp}:5000/api/v1`;
};

export const API_URL = resolveApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let authToken: string | null = null;

export const setApiAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};
