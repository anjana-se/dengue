import { useEffect } from 'react';
import { useStore } from './store/useStore';
import Login from './components/Login';
import AppShell from './components/AppShell';
import Toasts from './components/Toasts';
import DispatchModal from './components/modals/DispatchModal';

export default function App() {
  const authed = useStore((s) => s.authed);
  const dispatchOrder = useStore((s) => s.dispatchOrder);

  // Restore session on mount
  useEffect(() => {
    useStore.getState().checkSavedAuth();
  }, []);

  // Poll for live updates every 30s
  useEffect(() => {
    const id = window.setInterval(() => useStore.getState().liveTick(), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {authed ? <AppShell /> : <Login />}
      <Toasts />
      {dispatchOrder && <DispatchModal />}
    </>
  );
}
