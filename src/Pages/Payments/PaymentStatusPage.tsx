import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

// Status mapping function
const mapStatus = (status?: string, captureStatus?: string): 'success' | 'failed' | 'pending' | 'cancelled' => {
  console.log('🔍 mapStatus called with:', { status, captureStatus });
  
  if (!status) {
    console.log('🔍 mapStatus: No status provided, returning pending');
    return 'pending';
  }

  const normalized = status.toUpperCase();
  console.log('🔍 mapStatus: Normalized status:', normalized);
  
  switch (normalized) {
    case 'SUCCESS':
    case 'COMPLETED':
    case 'PAID':
      console.log('🔍 mapStatus: Returning success');
      return 'success';
    case 'FAILED':
    case 'DECLINED':
    case 'ERROR':
      console.log('🔍 mapStatus: Returning failed');
      return 'failed';
    case 'USER_DROPPED':
    case 'CANCELLED':
    case 'CANCELED':
      console.log('🔍 mapStatus: Returning cancelled');
      return 'cancelled';
    default:
      console.log('🔍 mapStatus: Default case, returning pending for status:', normalized);
      return 'pending';
  }
};

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Extract URL parameters
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

  console.log('🔍 URL Parameters extracted:', {
    orderIdFromUrl,
    amountFromUrl,
    gatewayStatus,
    captureStatus,
    fullURL: window.location.href
  });

  const [status, setStatus] = useState<'success' | 'failed' | 'pending' | 'cancelled'>('pending');
  const [amount, setAmount] = useState(parseFloat(amountFromUrl || '0') || 0);
  const [orderId, setOrderId] = useState(orderIdFromUrl || localStorage.getItem('last_collect_id') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3095';

  const fetchStatus = async () => {
    console.log('🔄 fetchStatus() called for orderId:', orderId);
    console.log('🔄 Current status before API call:', status);
    
    if (!orderId) {
      console.log('❌ fetchStatus: No orderId, setting error');
      setError('No order ID found in URL parameters or localStorage');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Making API request to:', `${API_BASE}/payments/status/${orderId}`);

      const response = await fetch(`${API_BASE}/payments/status/${orderId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `Failed to fetch status (${response.status})`);
      }

      const data = await response.json();
      console.log('🔎 Backend API full response:', JSON.stringify(data, null, 2));

      if (data) {
        // Normalize to always show custom_order_id if available
        const newOrderId = data.custom_order_id || data.customOrderId || orderId;
        console.log('🔎 Order ID resolution:', { 
          current: orderId, 
          fromAPI: data.custom_order_id, 
          resolved: newOrderId 
        });
        setOrderId(newOrderId);

        // Use the exact same mapping logic as backend
        const statusForMapping = data.status ?? data.payment_status ?? data.gateway_status;
        const captureForMapping = data.capture_status;
        
        console.log('🔎 Status fields from API:', {
          'data.status': data.status,
          'data.payment_status': data.payment_status, 
          'data.gateway_status': data.gateway_status,
          'data.capture_status': data.capture_status,
          'statusForMapping': statusForMapping,
          'captureForMapping': captureForMapping
        });

        const resolvedStatus = mapStatus(statusForMapping, captureForMapping);
        console.log('🔎 Status resolution result:', {
          input: statusForMapping,
          capture: captureForMapping,
          mapped: resolvedStatus,
          previousStatus: status
        });

        // Enhanced amount resolution
        let resolvedAmount = 0;

        const amountFields = [
          data.amount,
          data.transaction_amount,
          data.orderAmount,
          data.order_amount,
          data.am
        ];

        console.log('🔎 Amount fields from API:', {
          'data.amount': data.amount,
          'data.transaction_amount': data.transaction_amount,
          'data.orderAmount': data.orderAmount,
          'data.order_amount': data.order_amount,
          'data.am': data.am
        });

        for (const field of amountFields) {
          const parsed = Number(field);
          if (parsed && parsed > 0 && !isNaN(parsed)) {
            resolvedAmount = parsed;
            console.log('✅ Found amount from field:', field, '=', resolvedAmount);
            break;
          }
        }

        // Fallback: parse from payment_details JSON
        if ((!resolvedAmount || resolvedAmount === 0) && data.payment_details) {
          console.log('🔎 Trying to parse amount from payment_details...');
          try {
            const details = typeof data.payment_details === 'string' 
              ? JSON.parse(data.payment_details) 
              : data.payment_details;
            
            console.log('🔎 Parsed payment_details:', details);
            
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

        // Final fallbacks
        if ((!resolvedAmount || resolvedAmount === 0)) {
          const fallbackAmount = 
            parseFloat(amountFromUrl || '0') ||
            parseFloat(localStorage.getItem('last_amount') || '0') ||
            0;
          
          if (fallbackAmount > 0) {
            resolvedAmount = fallbackAmount;
            console.log('✅ Using fallback amount:', resolvedAmount);
          }
        }

        console.log('✅ FINAL VALUES BEING SET:', {
          status: resolvedStatus,
          amount: resolvedAmount,
          orderId: newOrderId
        });

        console.log('✅ STATUS CHANGE:', {
          from: status,
          to: resolvedStatus,
          reason: 'Backend API response'
        });

       console.log('✅ STATUS CHANGE:', {
  from: status,
  to: resolvedStatus,
  reason: 'Backend API response'
});

// 🚀 Prevent overwriting a final status with "pending"
if (['success', 'failed', 'cancelled'].includes(status) && resolvedStatus === 'pending') {
  console.log('⚠️ Ignoring API pending because final status already set from URL');
} else {
  setStatus(resolvedStatus);
}

setAmount(resolvedAmount);
setError('');

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
    console.log('🔍 useEffect triggered with:');
    console.log('- gatewayStatus (from URL):', gatewayStatus);
    console.log('- captureStatus (from URL):', captureStatus);
    console.log('- orderId:', orderId);
    console.log('- Current status:', status);

    // If Edviron redirected with ?status, use it immediately
    if (gatewayStatus) {
      const mapped = mapStatus(gatewayStatus, captureStatus);
      const initialAmount = parseFloat(amountFromUrl || '0') || 0;
      
      console.log('✅ URL PARAMS PROCESSING:');
      console.log('- Raw gatewayStatus:', gatewayStatus);
      console.log('- Raw captureStatus:', captureStatus); 
      console.log('- Mapped result:', mapped);
      console.log('- Initial amount:', initialAmount);
      
      console.log('✅ STATUS CHANGE:', {
        from: status,
        to: mapped,
        reason: 'URL parameters'
      });

      setStatus(mapped);
      setAmount(initialAmount);
      setLoading(false);

      // **FIX: Only fetch once for complete data, don't poll if status is final**
      if (mapped === 'pending') {
        console.log('🔄 Status is pending, starting polling...');
        fetchStatus();
        const interval = setInterval(fetchStatus, 4000);
        return () => clearInterval(interval);
      } else {
        console.log('🔄 Status is final, fetching once for complete data...');
        // Fetch once to get complete payment details but don't override the URL status
        fetchStatus();
        return; // Don't start polling
      }
    } else {
      console.log('🔄 No gatewayStatus in URL, starting normal polling...');
      fetchStatus();
      const interval = setInterval(fetchStatus, 4000);
      return () => clearInterval(interval);
    }
  }, []); // **FIX: Empty dependency array to prevent re-running**

  useEffect(() => {
    if (status === 'success') {
      console.log('✅ Status is success, invalidating queries...');
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

  console.log('🔍 Component render with status:', status);

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

              {/* Manual refresh button for debugging */}
              {status === 'pending' && (
                <button 
                  onClick={() => fetchStatus(false)} 
                  className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  disabled={loading}
                >
                  {loading ? 'Refreshing...' : 'Refresh Status'}
                </button>
              )}

              {/* Enhanced Debug Info - Remove in production */}
              <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-left">
                <strong>Debug Info:</strong>
                <div>URL Status: {gatewayStatus || 'none'}</div>
                <div>URL Capture: {captureStatus || 'none'}</div>
                <div>Current Status: {status}</div>
                <div>Loading: {loading.toString()}</div>
                <div>Has URL Status: {(gatewayStatus !== undefined).toString()}</div>
                <div>Status is Final: {['success', 'failed', 'cancelled'].includes(status).toString()}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;