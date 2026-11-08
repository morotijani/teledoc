import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient, setApiAuthToken, API_URL } from '../api/client';

export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface User {
  id: string;
  role: UserRole;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  avatarUrl?: string | null;
}

export interface SubscriptionStatus {
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'GRACE_PERIOD';
  trialEndsAt: string;
  trialDaysRemaining: number;
  isAccessAllowed: boolean;
}

export interface DoctorVerification {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectionReason?: string | null;
  specialty: string;
  licenseNumber: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  subscription: SubscriptionStatus | null;
  doctorVerification: DoctorVerification | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; message?: string }>;
  registerPatient: (data: any) => Promise<{ success: boolean; message?: string }>;
  registerDoctor: (data: any) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [doctorVerification, setDoctorVerification] = useState<DoctorVerification | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleAuthSuccess = (data: any) => {
    setToken(data.token);
    setUser(data.user);
    setApiAuthToken(data.token);
    if (data.subscription) {
      setSubscription(data.subscription);
    }
    if (data.doctorVerification) {
      setDoctorVerification(data.doctorVerification);
    }
  };

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { identifier, password });
      handleAuthSuccess(res.data);
      return { success: true };
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        (err.code === 'ECONNABORTED'
          ? `Connection timed out connecting to ${API_URL}`
          : err.message?.includes('Network Error')
          ? `Network error: Cannot reach server at ${API_URL}. Ensure your phone and PC are on the same Wi-Fi.`
          : `Login failed: ${err.message || 'Please check credentials'}`);
      return {
        success: false,
        message: errorMsg,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const registerPatient = async (patientData: any) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post('/auth/register-patient', patientData);
      handleAuthSuccess(res.data);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Patient registration failed.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const registerDoctor = async (doctorData: any) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post('/auth/register-doctor', doctorData);
      handleAuthSuccess(res.data);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Doctor registration failed.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const res = await apiClient.get('/auth/me');
      setUser(res.data.user);
      if (res.data.subscription) setSubscription(res.data.subscription);
      if (res.data.doctorVerification) setDoctorVerification(res.data.doctorVerification);
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setSubscription(null);
    setDoctorVerification(null);
    setApiAuthToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        subscription,
        doctorVerification,
        isLoading,
        login,
        registerPatient,
        registerDoctor,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
