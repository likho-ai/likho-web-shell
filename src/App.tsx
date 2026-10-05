import { LikhoProvider } from '@likho-ai/web-sdk';
import { useMemo } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router';
import { Layout, RequireSession } from './components/Layout';
import { Remote } from './lib/remotes';
import { ThemeProvider } from './lib/theme';
import { EmbedTranscriptPage } from './pages/Embed';
import { HomePage } from './pages/Home';
import { InvitePage } from './pages/Invite';
import { LoginPage } from './pages/Login';
import { ForgotPage, ResetPage } from './pages/Password';
import { SearchPage } from './pages/Search';
import { SettingsPage } from './pages/Settings';

export const config = {
  apiOrigin: import.meta.env.VITE_API_ORIGIN || window.location.origin,
  manifestUrl: import.meta.env.VITE_MFE_MANIFEST || '/mfe/manifest.json',
};

function NotFound() {
  return (
    <div className="rounded-card border border-line bg-surface p-8 text-center shadow-card">
      <h1 className="text-2xl font-bold">There is nothing here.</h1>
      <p className="mt-2 text-ink-2">The address may be old, or the recording was deleted.</p>
    </div>
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const onUnauthenticated = useMemo(() => () => navigate('/login'), [navigate]);
  return (
    <LikhoProvider baseUrl={config.apiOrigin} onUnauthenticated={onUnauthenticated}>
      {children}
    </LikhoProvider>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Providers>
          <Routes>
            {/* Another system's page: the transcript beside a call, with the token it was given. */}
            <Route
              path="embed/recordings/:ref"
              element={<EmbedTranscriptPage apiOrigin={config.apiOrigin} manifestUrl={config.manifestUrl} />}
            />
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="forgot" element={<ForgotPage />} />
              <Route path="reset/:token" element={<ResetPage />} />
              <Route path="invite/:token" element={<InvitePage />} />
              <Route element={<RequireSession />}>
                <Route
                  path="recordings"
                  element={<Remote name="library" manifestUrl={config.manifestUrl} />}
                />
                <Route
                  path="recordings/:id"
                  element={<Remote name="transcript" manifestUrl={config.manifestUrl} />}
                />
                <Route path="search" element={<SearchPage />} />
                <Route
                  path="vocabulary"
                  element={<Remote name="vocabulary" manifestUrl={config.manifestUrl} />}
                />
                <Route
                  path="insights"
                  element={<Remote name="insights" manifestUrl={config.manifestUrl} />}
                />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="admin" element={<Remote name="admin" manifestUrl={config.manifestUrl} />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Providers>
      </BrowserRouter>
    </ThemeProvider>
  );
}
