import { LikhoProvider } from '@likho-ai/web-sdk';
import { useMemo } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router';
import { Layout, RequireSession } from './components/Layout';
import { Remote } from './lib/remotes';
import { ThemeProvider } from './lib/theme';
import { HomePage } from './pages/Home';
import { LoginPage } from './pages/Login';
import { SettingsPage } from './pages/Settings';
import { VocabularyPage } from './pages/Vocabulary';

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
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="login" element={<LoginPage />} />
              <Route element={<RequireSession />}>
                <Route
                  path="recordings"
                  element={<Remote name="library" manifestUrl={config.manifestUrl} />}
                />
                <Route
                  path="recordings/:id"
                  element={<Remote name="transcript" manifestUrl={config.manifestUrl} />}
                />
                <Route path="vocabulary" element={<VocabularyPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Providers>
      </BrowserRouter>
    </ThemeProvider>
  );
}
