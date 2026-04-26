import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { VisitorTracker } from "@/components/VisitorTracker";
import Landing from "./pages/Landing.tsx";
import Index from "./pages/Index.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import AcceptInvite from "./pages/AcceptInvite.tsx";
import InstallApp from "./pages/InstallApp.tsx";
import NotificationHistory from "./pages/NotificationHistory.tsx";
import EmailPreview from "./pages/EmailPreview.tsx";
import VisitorLog from "./pages/VisitorLog.tsx";
import VisitorDetails from "./pages/VisitorDetails.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = window.location;
  const params = new URLSearchParams(location.search);
  const redirect = params.get("redirect");
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (user) return <Navigate to={redirect || "/app"} replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <VisitorTracker />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationHistory /></ProtectedRoute>} />
            <Route path="/email-preview" element={<ProtectedRoute><EmailPreview /></ProtectedRoute>} />
            <Route path="/visitors" element={<ProtectedRoute><VisitorLog /></ProtectedRoute>} />
            <Route path="/visitors/:sessionId" element={<ProtectedRoute><VisitorDetails /></ProtectedRoute>} />
            <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/install" element={<ProtectedRoute><InstallApp /></ProtectedRoute>} />
            <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
