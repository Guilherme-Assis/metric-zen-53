import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import ClientsPage from "./pages/ClientsPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import CompanyMonthsPage from "@/pages/CompanyMonthsPage";
import CompanyDashboard from "@/pages/CompanyDashboard";
import NotFound from "./pages/NotFound";
import ClientCrmPage from "@/pages/ClientCrmPage.tsx";

const queryClient = new QueryClient();

const App = () => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Layout com menu */}
              <Route element={<AppLayout />}>
                <Route path="/" element={<ClientsPage />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/clients/:id" element={<ClientDetailPage />} />
                <Route path="/clients/:id/detail" element={<ClientCrmPage />} /> {/* NOVO */}
                <Route path="/company" element={<CompanyDashboard />} />
                <Route path="/company/months" element={<CompanyMonthsPage />} />
              </Route>

              {/* catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
);

export default App;