import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { FavoritesProvider } from './context/FavoritesContext';
import Header from './components/layout/Header';
import PageTransition from './components/layout/PageTransition';
import OfflineBanner from './components/common/OfflineBanner';
import ToastViewport from './components/common/ToastViewport';
import AppRoutes from './router';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <FavoritesProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <a
                href="#main-content"
                className="focus-ring fixed left-2 top-2 z-[200] -translate-y-16 rounded-md bg-accent-600 px-4 py-2 text-accent-contrast transition-transform focus:translate-y-0"
              >
                Перейти к содержимому
              </a>
              <Header />
              <div id="main-content">
                <PageTransition>
                  <AppRoutes />
                </PageTransition>
              </div>
              <OfflineBanner />
              <ToastViewport />
            </BrowserRouter>
          </FavoritesProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
