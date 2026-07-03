import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/theme-provider';
import './i18n';
import App from './App.tsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);

// Smoothly remove splash screen
const splashScreen = document.getElementById('splash-screen');
if (splashScreen) {
  setTimeout(() => {
    splashScreen.style.opacity = '0';
    splashScreen.style.visibility = 'hidden';
    setTimeout(() => {
      splashScreen.remove();
      document.body.classList.add('loaded');
    }, 500); // transition duration
  }, 1000); // minimum visible time
}
