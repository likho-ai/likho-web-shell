import { Button, Logo } from '@likho-ai/ui';
import { useLogout, useMe } from '@likho-ai/web-sdk';
import {
  BookOpenText,
  LogOut,
  Mic,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router';
import { useTheme } from '../lib/theme';

const links = [
  { to: '/recordings', label: 'Recordings', icon: Mic },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/insights', label: 'Insights', icon: Sparkles },
  { to: '/vocabulary', label: 'Vocabulary', icon: BookOpenText },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/admin', label: 'Admin', icon: ShieldCheck, role: 'admin' },
];

/** The white pill at the top: logo, the sections, theme and the upload button. */
export function NavBar() {
  const me = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const { effective, setTheme } = useTheme();
  const signedIn = Boolean(me.data);
  const role = me.data?.role ?? '';
  // A viewer reads: no upload button for them. Admin is a section only admins see.
  const shown = links.filter((link) => !link.role || link.role === role);

  return (
    <header className="sticky top-0 z-20 px-4 pt-4 sm:px-6">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-[1240px] items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 shadow-card"
      >
        <NavLink
          to="/"
          className="mr-2 flex items-center gap-2 rounded-full px-2 py-1"
          aria-label="Likho home"
        >
          <Logo size={32} />
        </NavLink>
        {signedIn && (
          <ul className="hidden items-center gap-1 sm:flex">
            {shown.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
                      isActive ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                    }`
                  }
                >
                  <Icon aria-hidden="true" className="size-[18px]" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label={effective === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => setTheme(effective === 'dark' ? 'light' : 'dark')}
          >
            {effective === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </Button>
          {signedIn ? (
            <>
              {role !== 'viewer' && (
                <Button variant="primary" onClick={() => navigate('/recordings?upload=1')}>
                  <Upload aria-hidden="true" />
                  Upload call
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Sign out ${me.data?.name ?? ''}`.trim()}
                title={me.data?.email}
                onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })}
              >
                <LogOut aria-hidden="true" />
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => navigate('/login')}>
              Sign in
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
