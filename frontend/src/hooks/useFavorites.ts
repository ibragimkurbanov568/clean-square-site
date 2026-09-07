import { useContext } from 'react';
import { FavoritesContext, type FavoritesContextValue } from '../context/FavoritesContext';

/** Избранные компании клиента (F8). Должен использоваться внутри <FavoritesProvider>. */
export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites должен использоваться внутри <FavoritesProvider>');
  return ctx;
}
