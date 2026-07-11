import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, ApiError } from '@/utils/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  emailVerified: boolean;
  profileUpdatedAt: string | null;
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    name: string;
    username: string;
    email: string;
    password: string;
  }) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  resetPassword: (token: string, password: string) => Promise<{ message: string }>;
  updateProfile: (data: {
    name?: string;
    username?: string;
    password: string;
  }) => Promise<{ message: string; user: AuthUser }>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = '@ughelli_vibes/session_token';

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from storage on mount
  useEffect(() => {
    async function restoreSession() {
      try {
        const stored = await AsyncStorage.getItem(TOKEN_KEY);
        if (!stored) return;

        const data = await apiRequest<{ user: AuthUser }>('/auth/me', {
          token: stored,
        });
        setToken(stored);
        setUser(data.user);
      } catch {
        // Token expired or invalid — clear it
        await AsyncStorage.removeItem(TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiRequest<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const signup = useCallback(
    async (body: { name: string; username: string; email: string; password: string }) => {
      const data = await apiRequest<{ message: string }>('/auth/signup', {
        method: 'POST',
        body,
      });
      return data;
    },
    []
  );

  const resendVerification = useCallback(async (email: string) => {
    await apiRequest('/auth/resend-verification', {
      method: 'POST',
      body: { email },
    });
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    return apiRequest<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    return apiRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    });
  }, []);

  const updateProfile = useCallback(
    async (data: { name?: string; username?: string; password: string }) => {
      if (!token) throw new Error('Not authenticated');
      const result = await apiRequest<{ message: string; user: AuthUser }>('/auth/profile', {
        method: 'PATCH',
        body: data,
        token,
      });
      setUser(result.user);
      return result;
    },
    [token]
  );

  const logout = useCallback(async () => {
    try {
      if (token) {
        await apiRequest('/auth/logout', { method: 'POST', token });
      }
    } catch {
      // Best-effort — always clear locally
    }
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        signup,
        logout,
        resendVerification,
        forgotPassword,
        resetPassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
