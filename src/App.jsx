import { useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { startMockApi } from '@/lib/mockApi';
import Index from './pages/Index';
import Jobs from './pages/Jobs';
import Candidates from './pages/Candidates';
import Assessments from './pages/Assessments';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  useEffect(() => {
    startMockApi();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:jobId" element={<Jobs />} />
            <Route path="/candidates" element={<Candidates />} />
            <Route path="/candidates/:id" element={<Candidates />} />
            <Route path="/assessments" element={<Assessments />} />
            <Route path="/assessments/:jobId" element={<Assessments />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;