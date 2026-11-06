import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Overview from '@/pages/overview';
import Konsultasi from '@/pages/konsultasi';
import Kewajiban from '@/pages/kewajiban';
import Pembayaran from '@/pages/pembayaran';
import Pustaka from '@/pages/pustaka';
import Belajar from '@/pages/belajar';
import Glosarium from '@/pages/glosarium';
import Pengaturan from '@/pages/pengaturan';
import Transaksi from '@/pages/transaksi';
import LabaRugi from '@/pages/laba-rugi';
import PiutangUtang from '@/pages/piutang-utang';
import { Shell } from '@/components/shell';
import { StoreProvider } from '@/lib/store';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60_000, retry: 1, refetchOnWindowFocus: false } } });

function Router() {
  return (
    <Shell>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={Overview} />
          <Route path="/konsultasi" component={Konsultasi} />
          <Route path="/kewajiban" component={Kewajiban} />
          <Route path="/pembayaran" component={Pembayaran} />
          <Route path="/transaksi" component={Transaksi} />
          <Route path="/laba-rugi" component={LabaRugi} />
          <Route path="/piutang-utang" component={PiutangUtang} />
          <Route path="/belajar" component={Belajar} />
          <Route path="/glosarium" component={Glosarium} />
          <Route path="/pustaka" component={Pustaka} />
          <Route path="/pengaturan" component={Pengaturan} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </Shell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
}

export default App;
