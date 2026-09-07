import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

/** Глобальная плашка потери/восстановления сети — docs/02-ux.md §6. */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      return;
    }
    if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 2000);
      setWasOffline(false);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOnline, wasOffline]);

  return (
    <AnimatePresence>
      {!isOnline ? (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          role="alert"
          className="fixed inset-x-0 bottom-0 z-[90] bg-error px-4 py-2 text-center text-sm font-medium text-white"
        >
          Нет соединения с интернетом
        </motion.div>
      ) : showReconnected ? (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          role="status"
          className="fixed inset-x-0 bottom-0 z-[90] bg-success px-4 py-2 text-center text-sm font-medium text-white"
        >
          Соединение восстановлено
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default OfflineBanner;
