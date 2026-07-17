import { useEffect } from 'react';
import { useStore } from './store/useStore';
import Login from './components/Login';
import AppShell from './components/AppShell';
import Toasts from './components/Toasts';
import DispatchModal from './components/modals/DispatchModal';

export default function App() {
  const authed = useStore((s) => s.authed);
  const demoMode = useStore((s) => s.demoMode);
  const dispatchOrder = useStore((s) => s.dispatchOrder);

  // Restore session on mount
  useEffect(() => {
    useStore.getState().checkSavedAuth();
  }, []);

  // Poll for live updates every 9s
  useEffect(() => {
    const id = window.setInterval(() => useStore.getState().liveTick(), 9000);
    return () => clearInterval(id);
  }, []);

  // Demo mode: simulate streaming reports, zone updates, new cases,
  // duplicate-review flags, and incident confirmation bumps.
  useEffect(() => {
    if (!demoMode) return;
    const s = useStore.getState;
    const timers = [
      window.setInterval(() => s().demoTickReport(), 45000),
      window.setInterval(() => s().demoTickZone(), 120000),
      window.setInterval(() => s().demoTickCase(), 60000),
      window.setInterval(() => s().demoTickDuplicate(), 50000),
      window.setInterval(() => s().demoTickIncident(), 75000),
    ];
    return () => timers.forEach(clearInterval);
  }, [demoMode]);

  return (
    <>
      {authed ? <AppShell /> : <Login />}
      <Toasts />
      {dispatchOrder && <DispatchModal />}
    </>
  );
}
