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

  // Live feed: a new report streams in every 9s (gated on authed + liveOn inside liveTick).
  useEffect(() => {
    const id = window.setInterval(() => useStore.getState().liveTick(), 9000);
    return () => clearInterval(id);
  }, []);

  // Demo mode: simulate streaming reports, zone updates, and new cases.
  useEffect(() => {
    if (!demoMode) return;
    const s = useStore.getState;
    const t1 = window.setInterval(() => s().demoTickReport(), 45000);
    const t2 = window.setInterval(() => s().demoTickZone(), 120000);
    const t3 = window.setInterval(() => s().demoTickCase(), 60000);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
      clearInterval(t3);
    };
  }, [demoMode]);

  return (
    <>
      {authed ? <AppShell /> : <Login />}
      <Toasts />
      {dispatchOrder && <DispatchModal />}
    </>
  );
}
