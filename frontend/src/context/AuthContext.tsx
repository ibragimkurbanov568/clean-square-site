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
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider — источник правды о текущем пользователе для всего приложения.
 * TODO(frontend): обработка `?intent=order|chat|favorite&companyId=&returnTo=` после успешного
 * логина/регистрации (docs/02-ux.md §3, ветки гостя F5/F6/F8) — сохранить intent перед редиректом
 * на /login и выполнить отложенное действие после успешной авторизации.
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
    // TODO(frontend/backend): контракт POST /api/auth/login — см. docs/04-architecture.md §4.1.
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
    }),
    [user, status, login, verifyTwoFactor, registerClient, registerCompany, logout, loadCurrentUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
