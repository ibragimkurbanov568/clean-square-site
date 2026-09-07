import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';

/** Текущий пользователь + действия auth (F1). Должен использоваться внутри <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth должен использоваться внутри <AuthProvider>');
  return ctx;
}
