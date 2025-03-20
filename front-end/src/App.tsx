import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './providers/ToastProvider';
import { MantineProvider, createTheme } from '@mantine/core';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import Stats from './pages/Stats';
import Calendar from './pages/Calendar';
import Trades from './pages/Trades';
import Journal from './pages/Journal';
import Help from './pages/Help';
import { Settings } from './pages/Settings';

import './styles/dateSlider.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const theme = createTheme({
  primaryColor: 'blue',
  primaryShade: 6
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="trades" element={<Trades />} />
                <Route path="journal" element={<Journal />} />
                <Route path="stats" element={<Stats />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="settings" element={<Settings />} />
                <Route path="help" element={<Help />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}
