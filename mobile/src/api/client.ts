import axios from 'axios';
import { Platform } from 'react-native';

// In Android emulator, 10.0.2.2 connects to host machine's localhost
// In iOS simulator, localhost connects directly to host
const DEFAULT_API_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:5000/api/v1' : 'http://localhost:5000/api/v1';

export const API_URL = DEFAULT_API_URL;

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
