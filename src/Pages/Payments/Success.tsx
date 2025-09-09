import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  
  // ✅ Handle multiple possible orderId param names (from gateway)
  const orderIdFromUrl =
    searchParams.get('EdvironCollectRequestId') ||
    searchParams.get('order_id') ||
    searchParams.get('collect_request_id');

  const statusFromUrl = searchParams.get('status');
  const amountFromUrl = searchParams.get('amount');

  const [status, setStatus] = useState(statusFromUrl || 'pending');
  const [amount, setAmount] = useState(parseFloat(amountFromUrl || '0') || 0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const queryClient = useQueryClient();

  // Base URL for public endpoint (no auth). Adjust env if needed.
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3095';

  // Resolve orderId: prefer URL param, fallback to localStorage saved before redirect
  const orderId =
    orderIdFromUrl || localStorage.getItem('last_collect_id') || undefined;

  // ✅ Fetch payment status from backend (public endpoint, no auth header)
  const fetchStatus = async () => {
    if (!orderId) {
      setError('No order ID found in URL parameters or localStorage');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Use fetch to call public endpoint (avoids axios auth interceptor)
      const response = await fetch(`${API_BASE}/payments/status/${orderId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `Failed to fetch status (${response.status})`);
      }

      const data = await response.json();

      if (data) {
        if (data.order_info) {
          // Legacy format
          setStatus(data.order_info.status || 'unknown');
          setAmount(parseFloat(data.order_info.order_amount) || 0);
        } else if (data.order) {
          // New format
          setStatus(data.order.status || 'unknown');
          setAmount(parseFloat(data.order.orderAmount) || 0);
        } else {
          // Direct format
          setStatus(data.status || 'unknown');
          setAmount(
            parseFloat(data.amount) ||
              parseFloat(data.order_amount) ||
              0
          );
        }
        setError('');
      } else {
        throw new Error('No data received from server');
      }
    } catch (err: any) {
      console.error('Error fetching payment status:', err);
      setError(
        `Failed to fetch payment status: ${
          err?.message || err?.response?.data?.message || err?.message
        }`
      );

      // Fallback to URL values if API fails
      if (statusFromUrl) setStatus(statusFromUrl);
      if (amountFromUrl) setAmount(parseFloat(amountFromUrl) || 0);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Invalidate caches if success
  useEffect(() => {
    if (status?.toLowerCase() === 'success') {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    }
  }, [status, queryClient]);

  // ✅ Polling setup
  useEffect(() => {
    fetchStatus();

    let interval: NodeJS.Timeout | undefined;
    if (status === 'pending' || status === 'processing') {
      interval = setInterval(fetchStatus, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, status]);

  // ✅ Timeout stop after 5 minutes
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (status === 'pending' || status === 'processing') {
        setError(
          'Payment verification timeout. Please contact support if payment was deducted.'
        );
      }
    }, 300000); // 5 min

    return () => clearTimeout(timeout);
  }, [status]);

  // ✅ Helpers
  const getStatusColor = (s?: string) => {
    switch (s?.toLowerCase()) {
      case 'success':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'pending':
      case 'processing':
        return 'text-yellow-600';
      case 'cancelled':
      case 'user_dropped':
        return 'text-gray-600';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (s?: string) => {
    switch (s?.toLowerCase()) {
      case 'success':
        return '✅';
      case 'failed':
        return '❌';
      case 'pending':
      case 'processing':
        return '⏳';
      case 'cancelled':
      case 'user_dropped':
        return '⚠️';
      default:
        return '❓';
    }
  };

  const getStatusMessage = (s?: string) => {
    switch (s?.toLowerCase()) {
      case 'success':
        return 'Payment completed successfully!';
      case 'failed':
        return 'Payment failed. Please try again.';
      case 'pending':
        return 'Payment is being processed. Please wait...';
      case 'processing':
        return 'Payment is being verified. This may take a few moments.';
      case 'cancelled':
      case 'user_dropped':
        return 'Payment was cancelled by user.';
      default:
        return 'Unable to determine payment status. Please contact support.';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">Payment Status</h1>

          {loading && (
            <div className="flex justify-center items-center mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Checking payment status...</span>
            </div>
          )}

          {!loading && (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Order ID:</p>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
                  {orderId || 'Not available'}
                </p>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Status:</p>
                <div className="flex items-center justify-center">
                  <span className="text-2xl mr-2">{getStatusIcon(status)}</span>
                  <span
                    className={`text-xl font-semibold ${getStatusColor(status)}`}
                  >
                    {status?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">Amount:</p>
                <p className="text-2xl font-bold text-gray-800">
                  ₹{amount > 0 ? amount.toFixed(2) : '0.00'}
                </p>
              </div>

              <div className="mb-6">
                <p className={`text-center ${getStatusColor(status)} font-medium`}>
                  {getStatusMessage(status)}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* ✅ Action buttons */}
              <div className="space-y-3">
                {status === 'success' && (
                  <button
                    onClick={() => (window.location.href = '/dashboard')}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Continue to Dashboard
                  </button>
                )}

                {(status === 'failed' || status === 'cancelled') && (
                  <button
                    onClick={() => (window.location.href = '/payments')}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Try Payment Again
                  </button>
                )}

                {(status === 'pending' || status === 'processing') && (
                  <button
                    onClick={fetchStatus}
                    disabled={loading}
                    className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Checking...' : 'Refresh Status'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
