import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { connectSocket, disconnectSocket } from './lib/socket';
import Login from './components/Login';
import AppShell from './components/AppShell';
import Toasts from './components/Toasts';
import DispatchModal from './components/modals/DispatchModal';
import Lightbox from './components/common/Lightbox';

export default function App() {
  const authed = useStore((s) => s.authed);
  const demoMode = useStore((s) => s.demoMode);
  const dispatchOrder = useStore((s) => s.dispatchOrder);

  // Restore session on mount
  useEffect(() => {
    useStore.getState().checkSavedAuth();
  }, []);

  // Live updates via Socket.IO (replaces the old 9s poll). Connect while
  // authenticated and NOT in demo mode; demo mode stays fully client-side.
  // The initial data load is done by login()/checkSavedAuth(); the socket then
  // pushes incremental changes and reconciles with one fetch on reconnect.
  useEffect(() => {
    if (!authed || demoMode) return;
    connectSocket();
    return () => disconnectSocket();
  }, [authed, demoMode]);

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
      <Lightbox />
      {dispatchOrder && <DispatchModal />}
    </>
  );
}
