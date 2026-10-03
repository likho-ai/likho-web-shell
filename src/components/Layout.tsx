import { useMe } from '@likho-ai/web-sdk';
import { Navigate, Outlet, useLocation } from 'react-router';
import { NavBar } from './NavBar';

export function Layout() {
  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-[1240px] px-4 pb-8 text-sm text-ink-3 sm:px-6">
        Likho — every call, every word, written in Hinglish.
      </footer>
    </div>
  );
}

/** Pages behind this need a session; otherwise the sign-in page is shown, and the way back is kept. */
export function RequireSession() {
  const me = useMe();
  const location = useLocation();
  if (me.isPending) return null;
  if (!me.data) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}
