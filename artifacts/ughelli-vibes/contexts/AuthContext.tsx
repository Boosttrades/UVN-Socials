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
  profileImage: string | null;
  profileUpdatedAt: string | null;
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
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
  updateProfileImage: (imageUrl: string) => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = '@ughelli_vibes/session_token';
const REFRESH_TOKEN_KEY = '@ughelli_vibes/refresh_token';

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from storage on mount — handles expired access tokens by
  // attempting a silent refresh before giving up and clearing the session.
  useEffect(() => {
    async function restoreSession() {
      try {
        const [[, storedToken], [, storedRefreshToken]] = await AsyncStorage.multiGet([
          TOKEN_KEY,
          REFRESH_TOKEN_KEY,
        ]);

        if (!storedToken) return;

        // Try the stored access token first
        try {
          const data = await apiRequest<{ user: AuthUser }>('/auth/me', {
            token: storedToken,
          });
          setToken(storedToken);
          setRefreshToken(storedRefreshToken);
          setUser(data.user);
          return;
        } catch (err) {
          // If 401 and we have a refresh token, try to silently refresh
          if (err instanceof ApiError && err.status === 401 && storedRefreshToken) {
            try {
              const refreshed = await apiRequest<{ token: string; refreshToken: string }>(
                '/auth/refresh',
                { method: 'POST', body: { refreshToken: storedRefreshToken } }
              );
              const data = await apiRequest<{ user: AuthUser }>('/auth/me', {
                token: refreshed.token,
              });
              await AsyncStorage.multiSet([
                [TOKEN_KEY, refreshed.token],
                [REFRESH_TOKEN_KEY, refreshed.refreshToken],
              ]);
              setToken(refreshed.token);
              setRefreshToken(refreshed.refreshToken);
              setUser(data.user);
              return;
            } catch {
              // Refresh also failed — fall through to clear session
            }
          }
          // Token and refresh both invalid — clear storage
          await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]);
        }
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const data = await apiRequest<{
      token: string;
      refreshToken: string;
      user: AuthUser;
    }>('/auth/login', {
      method: 'POST',
      body: { identifier, password },
    });
    await AsyncStorage.multiSet([
      [TOKEN_KEY, data.token],
      [REFRESH_TOKEN_KEY, data.refreshToken],
    ]);
    setToken(data.token);
    setRefreshToken(data.refreshToken);
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

  const resetPassword = useCallback(async (tok: string, password: string) => {
    return apiRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: { token: tok, password },
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

  const updateProfileImage = useCallback(
    async (imageUrl: string) => {
      if (!token) throw new Error('Not authenticated');
      await apiRequest('/auth/profile-image', {
        method: 'PATCH',
        body: { imageUrl },
        token,
      });
      setUser((prev) => prev ? { ...prev, profileImage: imageUrl } : prev);
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
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]);
    setToken(null);
    setRefreshToken(null);
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
        updateProfileImage,
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
