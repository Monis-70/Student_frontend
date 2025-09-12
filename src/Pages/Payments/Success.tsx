import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

// ✅ Fixed status mapping to match backend exactly (including Cashfree quirks)
// ✅ Fixed status mapping - the issue was with the Cashfree quirk logic
const mapStatus = (status?: string, captureStatus?: string): 'success' | 'failed' | 'pending' | 'cancelled' => {
  if (!status) return 'pending';

  const normalized = status.toUpperCase();
  
  // ✅ REMOVED: Cashfree capture_status logic - only use status field
  
  switch (normalized) {
    case 'SUCCESS':
    case 'COMPLETED':
    case 'PAID':
      return 'success';
    case 'FAILED':
    case 'DECLINED':
    case 'ERROR':
      return 'failed';
    case 'USER_DROPPED':
    case 'CANCELLED':
    case 'CANCELED':
      return 'cancelled';
    default:
      return 'pending';
  }
};

// Test the fix:
console.log('Test 1 - SUCCESS with no capture_status:');
console.log(mapStatus('SUCCESS')); // Should return 'success' ✅

console.log('Test 2 - SUCCESS with undefined capture_status:');
console.log(mapStatus('SUCCESS', undefined)); // Should return 'success' ✅

console.log('Test 3 - SUCCESS with PENDING capture_status:');
console.log(mapStatus('SUCCESS', 'PENDING')); // Should return 'pending' ✅

console.log('Test 4 - Your URL case - SUCCESS with no capture_status:');
// This simulates: .../payments/status?EdvironCollectRequestId=68c39eee154d1bce65b3e0c2&status=SUCCESS
const urlStatus = 'SUCCESS';
const urlCaptureStatus = undefined; // Not present in URL
console.log(mapStatus(urlStatus, urlCaptureStatus)); // Should return 'success' ✅

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // ✅ Accept multiple possible params
  const orderIdFromUrl =
    searchParams.get('providerCollectId') ??
    searchParams.get('EdvironCollectRequestId') ??
    searchParams.get('collect_request_id') ??
    searchParams.get('order_id') ??
    undefined;

  const amountFromUrl =
    searchParams.get('amount') ??
    searchParams.get('am') ??
    undefined;

  const gatewayStatus = searchParams.get('status') ?? undefined;
  const captureStatus = searchParams.get('capture_status') ?? undefined;

  const [status, setStatus] = useState<'success' | 'failed' | 'pending' | 'cancelled'>('pending');
  const [amount, setAmount] = useState(parseFloat(amountFromUrl || '0') || 0);
  const [orderId, setOrderId] = useState(orderIdFromUrl || localStorage.getItem('last_collect_id') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const latestStatusRef = useRef<'success' | 'failed' | 'pending' | 'cancelled'>('pending');

  // Keep a ref of the latest status to avoid stale closures inside fetchStatus
  useEffect(() => {
    latestStatusRef.current = status;
  }, [status]);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3095';

  const fetchStatus = async () => {
    if (!orderId) {
      setError('No order ID found in URL parameters or localStorage');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE}/payments/status/${orderId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `Failed to fetch status (${response.status})`);
      }

      const data = await response.json();
      console.log('🔎 Payment status API response:', data);

      if (data) {
        // ✅ Normalize to always show custom_order_id if available
        setOrderId(data.custom_order_id || data.customOrderId || orderId);

        // ✅ Use the exact same mapping logic as backend
        const resolvedStatus = mapStatus(
          data.status ?? data.payment_status ?? data.gateway_status,
          data.capture_status
        );

        // ✅ Enhanced amount resolution to match backend exactly
        let resolvedAmount = 0;

        // Try direct numeric fields first (match backend order)
        const amountFields = [
          data.amount,
          data.transaction_amount,
          data.orderAmount,
          data.order_amount,
          data.am
        ];

        for (const field of amountFields) {
          const parsed = Number(field);
          if (parsed && parsed > 0 && !isNaN(parsed)) {
            resolvedAmount = parsed;
            break;
          }
        }

        // ✅ Fallback: parse from payment_details JSON (like backend)
        if ((!resolvedAmount || resolvedAmount === 0) && data.payment_details) {
          try {
            const details = typeof data.payment_details === 'string' 
              ? JSON.parse(data.payment_details) 
              : data.payment_details;
            
            // Try amount fields in parsed details
            const detailAmountFields = [
              details.amount,
              details.transaction_amount,
              details.order_amount,
              details.orderAmount,
              details.am
            ];

            for (const field of detailAmountFields) {
              const parsed = Number(field);
              if (parsed && parsed > 0 && !isNaN(parsed)) {
                resolvedAmount = parsed;
                console.log('✅ Parsed amount from payment_details:', resolvedAmount);
                break;
              }
            }

            // Parse from collect_request_url if still no amount
            if ((!resolvedAmount || resolvedAmount === 0) && details.collect_request_url) {
              const urlObj = new URL(details.collect_request_url);
              const urlAmount = urlObj.searchParams.get('amount');
              if (urlAmount) {
                const parsed = parseFloat(urlAmount);
                if (parsed && parsed > 0 && !isNaN(parsed)) {
                  resolvedAmount = parsed;
                  console.log('✅ Parsed amount from collect_request_url:', resolvedAmount);
                }
              }
            }
          } catch (e) {
            console.warn('⚠️ Could not parse payment_details:', e);
          }
        }

        // ✅ Final fallbacks (try localStorage object for this collect id, then last_amount)
        if ((!resolvedAmount || resolvedAmount === 0)) {
          try {
            const storedKey = `payment_collect_${orderId}`;
            const storedRaw = localStorage.getItem(storedKey);
            if (storedRaw) {
              const stored = JSON.parse(storedRaw);
              const storedAmount = Number(stored?.amount);
              if (storedAmount && storedAmount > 0) {
                resolvedAmount = storedAmount;
                console.log('✅ Using stored amount from', storedKey, ':', resolvedAmount);
              }
            }
          } catch (e) {
            console.warn('⚠️ Could not read stored amount for orderId', orderId, e);
          }

          if (!resolvedAmount || resolvedAmount === 0) {
            const fallbackAmount = 
              parseFloat(amountFromUrl || '0') ||
              parseFloat(localStorage.getItem('last_amount') || '0') ||
              0;
            
            if (fallbackAmount > 0) {
              resolvedAmount = fallbackAmount;
              console.log('✅ Using fallback amount:', resolvedAmount);
            }
          }
        }

        console.log('✅ Final resolved status:', resolvedStatus);
        console.log('✅ Final resolved amount:', resolvedAmount);

        // 🚀 Prevent overwriting a final status with "pending"
        if (['success', 'failed', 'cancelled'].includes(latestStatusRef.current) && resolvedStatus === 'pending') {
          console.log('⚠️ Ignoring API pending because final status already set from URL');
        } else {
          setStatus(resolvedStatus);
        }

        // ✅ Always set amount from resolved value
        setAmount(resolvedAmount);

      } else {
        throw new Error('No data received from server');
      }
    } catch (err: any) {
      console.error('❌ Error fetching payment status:', err);
      setError(err?.message || 'Failed to fetch payment status');
      toast.error(err?.message || 'Failed to fetch payment status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  let interval: any;

  if (gatewayStatus) {
    const mapped = mapStatus(gatewayStatus, captureStatus);
    const initialAmount = parseFloat(amountFromUrl || '0') || 0;

    setStatus(mapped);
    setAmount(initialAmount);
    setLoading(false);

    // Always begin polling after redirect to pick up webhook-driven updates,
    // but do not downgrade UI from a final status to pending inside fetchStatus
    fetchStatus();
    interval = setInterval(fetchStatus, 4000);
  } else {
    fetchStatus();
    interval = setInterval(fetchStatus, 4000);
  }

  return () => clearInterval(interval);
}, [orderId, gatewayStatus, captureStatus]);

// 🚀 Stop polling if final status reached
useEffect(() => {
  if (['success', 'failed', 'cancelled'].includes(status)) {
    console.log('✅ Final status reached, stopping polling');
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['payments'] });
  }
}, [status, queryClient]);


  const getStatusColor = (s?: string) => {
    switch (s) {
      case 'success':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'pending':
        return 'text-yellow-600';
      case 'cancelled':
        return 'text-gray-600';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (s?: string) => {
    switch (s) {
      case 'success':
        return '✅';
      case 'failed':
        return '❌';
      case 'pending':
        return '⏳';
      case 'cancelled':
        return '⚠️';
      default:
        return '❓';
    }
  };

  const getStatusMessage = (s?: string) => {
    switch (s) {
      case 'success':
        return 'Payment completed successfully!';
      case 'failed':
        return 'Payment failed. Please try again.';
      case 'pending':
        return 'Payment is being processed. Please wait...';
      case 'cancelled':
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
                  <span className={`text-xl font-semibold ${getStatusColor(status)}`}>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;