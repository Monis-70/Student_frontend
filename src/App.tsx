import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Auth Pages
import LoginPage from './Pages/Auth/LoginPage';
import SignupPage from './Pages/Auth/SignupPage';
import ProfilePage from './Pages/Auth/ProfilePage';

// Dashboard Pages
import DashboardPage from './Pages/dashboard/DashboardPage';
import CreatePaymentPage from './Pages/Payments/CreatePaymentPage';
import PaymentStatusPage from './Pages/Payments/PaymentStatusPage';
import TransactionsPage from './Pages/transactions/TransactionsPage';
import TransactionsBySchoolPage from './Pages/transactions/TransactionsBySchoolPage';
import TransactionStatusPage from './Pages/transactions/TransactionStatusPage';
import AnalyticsPage from './Pages/analytics/AnalyticsPage';
import WebhookLogsPage from './Pages/webhooks/WebhookLogsPage';
import HealthPage from './Pages/System/HealthPage';

// Protected Route Component
import ProtectedRoute from './Components/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('darkMode') === 'true'
  );

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    document.documentElement.classList.toggle('dark', newMode);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/signup" element={<SignupPage />} />
          </Route>

          {/* Protected Dashboard Routes */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/payments/create" element={<CreatePaymentPage />} />
            <Route path="/payments/status/:orderId" element={<PaymentStatusPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/transactions/school/:schoolId" element={<TransactionsBySchoolPage />} />
            <Route path="/transactions/status" element={<TransactionStatusPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/webhooks/logs" element={<WebhookLogsPage />} />
            <Route path="/system/health" element={<HealthPage />} />
          </Route>

          {/* Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;