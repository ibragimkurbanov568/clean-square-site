import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiRequest, ApiError } from '../lib/apiClient';
import type { CurrentUser } from '../lib/types';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface RegisterClientInput {
  email: string;
  password: string;
  username: string;
  city: string;
}

export interface RegisterCompanyInput {
  email: string;
  password: string;
  companyUsername: string;
  innOgrn: string;
  city: string;
  address: string;
  phone: string;
  website?: string;
  workHours?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/** Результат логина — либо сразу пользователь, либо запрос кода 2FA (docs/04-architecture.md §4.1). */
export type LoginResult =
  | { requiresTwoFactor: false; user: CurrentUser }
  | { requiresTwoFactor: true; challengeId: string };

export interface AuthContextValue {
  user: CurrentUser | null;
  status: AuthStatus;
  login: (input: LoginInput) => Promise<LoginResult>;
  verifyTwoFactor: (challengeId: string, code: string) => Promise<CurrentUser>;
  registerClient: (input: RegisterClientInput) => Promise<CurrentUser>;
  registerCompany: (input: RegisterCompanyInput) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ ok: true; demoResetUrl?: string }>;
  resetPassword: (token: string, password: string, confirmPassword: string) => Promise<void>;
  setupTwoFactor: () => Promise<{ secret: string; otpAuthUri: string }>;
  enableTwoFactor: (code: string) => Promise<void>;
  disableTwoFactor: () => Promise<void>;
  updateLocalUser: (patch: Partial<CurrentUser>) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider — источник правды о текущем пользователе для всего приложения.
 * Intent-редиректы после логина (?intent=order|chat|favorite&companyId=&returnTo=) обрабатываются
 * в src/lib/authRedirect.ts и на стороне экранов логина/регистрации/2FA (docs/02-ux.md §3).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('idle');

  const loadCurrentUser = useCallback(async () => {
    setStatus('loading');
    try {
      const me = await apiRequest<CurrentUser>('/auth/me');
      setUser(me);
      setStatus('authenticated');
    } catch (error) {
      setUser(null);
      setStatus(error instanceof ApiError && error.status === 401 ? 'unauthenticated' : 'unauthenticated');
    }
  }, []);

  useEffect(() => {
    void loadCurrentUser();
  }, [loadCurrentUser]);

  const login = useCallback(async (input: LoginInput): Promise<LoginResult> => {
    const result = await apiRequest<LoginResult>('/auth/login', { method: 'POST', body: input });
    if (!result.requiresTwoFactor) setUser(result.user);
    setStatus(result.requiresTwoFactor ? 'unauthenticated' : 'authenticated');
    return result;
  }, []);

  const verifyTwoFactor = useCallback(async (challengeId: string, code: string) => {
    const nextUser = await apiRequest<CurrentUser>('/auth/login/2fa', {
      method: 'POST',
      body: { challengeId, code },
    });
    setUser(nextUser);
    setStatus('authenticated');
    return nextUser;
  }, []);

  const registerClient = useCallback(async (input: RegisterClientInput) => {
    const nextUser = await apiRequest<CurrentUser>('/auth/register/client', {
      method: 'POST',
      body: input,
    });
    setUser(nextUser);
    setStatus('authenticated');
    return nextUser;
  }, []);

  const registerCompany = useCallback(async (input: RegisterCompanyInput) => {
    const nextUser = await apiRequest<CurrentUser>('/auth/register/company', {
      method: 'POST',
      body: input,
    });
    setUser(nextUser);
    setStatus('authenticated');
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    await apiRequest('/auth/logout', { method: 'POST' });
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    return apiRequest<{ ok: true; demoResetUrl?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  }, []);

  const resetPassword = useCallback(async (token: string, password: string, confirmPassword: string) => {
    await apiRequest('/auth/reset-password', { method: 'POST', body: { token, password, confirmPassword } });
  }, []);

  const setupTwoFactor = useCallback(async () => {
    return apiRequest<{ secret: string; otpAuthUri: string }>('/auth/2fa/setup', { method: 'POST' });
  }, []);

  const enableTwoFactor = useCallback(async (code: string) => {
    await apiRequest('/auth/2fa/enable', { method: 'POST', body: { code } });
    setUser((prev) => (prev ? { ...prev, totpEnabled: true } : prev));
  }, []);

  const disableTwoFactor = useCallback(async () => {
    await apiRequest('/auth/2fa/disable', { method: 'POST' });
    setUser((prev) => (prev ? { ...prev, totpEnabled: false } : prev));
  }, []);

  const updateLocalUser = useCallback((patch: Partial<CurrentUser>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      login,
      verifyTwoFactor,
      registerClient,
      registerCompany,
      logout,
      refresh: loadCurrentUser,
      forgotPassword,
      resetPassword,
      setupTwoFactor,
      enableTwoFactor,
      disableTwoFactor,
      updateLocalUser,
    }),
    [
      user,
      status,
      login,
      verifyTwoFactor,
      registerClient,
      registerCompany,
      logout,
      loadCurrentUser,
      forgotPassword,
      resetPassword,
      setupTwoFactor,
      enableTwoFactor,
      disableTwoFactor,
      updateLocalUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
