import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TruthSeekerPage from './app/TruthSeekerPage.jsx';
import './styles.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TruthSeekerPage />
    </QueryClientProvider>
  </React.StrictMode>
);
