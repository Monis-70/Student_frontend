import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
// Relative path
import { mapStatus } from '../../lib/utils';


// ✅ UNIFIED STATUS MAPPER - Cleaned up (removed capture_status param completely)

const PaymentStatus = () => {
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
  
  // State management
  const [status, setStatus] = useState<'success' | 'failed' | 'pending' | 'cancelled'>('pending');
  const [amount, setAmount] = useState(parseFloat(amountFromUrl || '0') || 0);
  const [orderId, setOrderId] = useState(orderIdFromUrl || localStorage.getItem('last_collect_id') || '');
  const [paymentMode, setPaymentMode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Track final status to prevent downgrades
  const finalStatusRef = useRef<'success' | 'failed' | 'cancelled' | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3095';
  
  const fetchStatus = useCallback(async () => {
    if (!orderId) {
      setError('No order ID found in URL parameters or localStorage');
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/payments/status/${orderId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `Failed to fetch status (${response.status})`);
      }
      
      const data = await response.json();
      console.log('📊 Backend response:', data);
      
      if (data) {
        // Update order ID if custom one provided
        const newOrderId = data.custom_order_id || data.customOrderId || orderId;
        setOrderId(newOrderId);
        
        // ✅ FIXED: Map status using unified logic (no capture_status param)
      const statusForMapping = data.status ?? data.payment_status ?? data.gateway_status;
const resolvedStatus = mapStatus(statusForMapping);


        
        // Extract amount
        let resolvedAmount = 0;
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
        
        // Parse from payment_details if needed
        if ((!resolvedAmount || resolvedAmount === 0) && data.payment_details) {
          try {
            const details = typeof data.payment_details === 'string' 
              ? JSON.parse(data.payment_details) 
              : data.payment_details;
            
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
                break;
              }
            }
          } catch (e) {
            console.warn('Could not parse payment_details:', e);
          }
        }
        
        // Final amount fallback
        if (!resolvedAmount || resolvedAmount === 0) {
          resolvedAmount = 
            parseFloat(amountFromUrl || '0') ||
            parseFloat(localStorage.getItem('last_amount') || '0') ||
            0;
        }

        // ✅ Extract payment_mode consistently
        const resolvedPaymentMode = 
          data.payment_mode || 
          data.paymentMode || 
          data.payment_method || 
          'N/A';
        
        // ✅ CRITICAL: Prevent status downgrades
        if (finalStatusRef.current) {
          console.log(`🔒 Final status locked: ${finalStatusRef.current}, ignoring: ${resolvedStatus}`);
          setAmount(resolvedAmount);
          setPaymentMode(resolvedPaymentMode);
          return;
        }
        
        // Check if this is a final status
        if (['success', 'failed', 'cancelled'].includes(resolvedStatus)) {
          finalStatusRef.current = resolvedStatus as 'success' | 'failed' | 'cancelled';
          console.log(`✅ Final status reached: ${resolvedStatus}`);
          
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
        
        setStatus(resolvedStatus);
        setAmount(resolvedAmount);
        setPaymentMode(resolvedPaymentMode);
        setError('');
      }
    } catch (err: any) {
      console.error('Error fetching payment status:', err);
      setError(err?.message || 'Failed to fetch payment status');
      
      // Don't show toast on every poll failure
      if (loading) {
        toast.error(err?.message || 'Failed to fetch payment status');
      }
    } finally {
      setLoading(false);
    }
  }, [orderId, amountFromUrl, loading, API_BASE]);
  
  // Initial setup and polling
  useEffect(() => {
    // ✅ FIXED: Process URL status first (no capture_status param)
    // if (gatewayStatus) {
    //   const urlMappedStatus = mapStatus(gatewayStatus);
    //   const initialAmount = parseFloat(amountFromUrl || '0') || 0;
      
    //   console.log('🔗 URL Status:', { 
    //     raw: gatewayStatus, 
    //     capture: captureStatus, 
    //     mapped: urlMappedStatus,
    //     note: 'Capture status ignored to prevent SUCCESS->pending downgrade'
    //   });
      
    //   setStatus(urlMappedStatus);
    //   setAmount(initialAmount);
      
    //   // ✅ FIXED: If URL indicates SUCCESS, always lock it as final
    //   if (urlMappedStatus === 'success') {
    //     finalStatusRef.current = 'success';
    //     console.log('✅ URL shows SUCCESS - locking as final status');
    //   } else if (['failed', 'cancelled'].includes(urlMappedStatus)) {
    //     finalStatusRef.current = urlMappedStatus as 'failed' | 'cancelled';
    //     console.log(`✅ URL shows ${urlMappedStatus} - locking as final status`);
    //   }
      
    //   setLoading(false);
    // }
    
     if (gatewayStatus) {
   setStatus(gatewayStatus.toLowerCase() as any);
 }
    // Always fetch once for complete data
    fetchStatus();
    
    // Setup polling only if not in final state
    if (!finalStatusRef.current) {
      pollingIntervalRef.current = setInterval(() => {
        if (!finalStatusRef.current) {
          fetchStatus();
        }
      }, 4000);
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []); // Empty deps - run once on mount
  
  // Invalidate queries when payment succeeds
  useEffect(() => {
    if (status === 'success') {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    }
  }, [status, queryClient]);
  
  // UI Helper functions
  const getStatusColor = (s?: string) => {
    switch (s) {
      case 'success': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      case 'cancelled': return 'text-gray-600';
      default: return 'text-gray-500';
    }
  };
  
  const getStatusIcon = (s?: string) => {
    switch (s) {
      case 'success': return '✅';
      case 'failed': return '❌';
      case 'pending': return '⏳';
      case 'cancelled': return '⚠️';
      default: return '❓';
    }
  };
  
  const getStatusMessage = (s?: string) => {
    switch (s) {
      case 'success': return 'Payment completed successfully!';
      case 'failed': return 'Payment failed. Please try again.';
      case 'pending': return 'Payment is being processed. Please wait...';
      case 'cancelled': return 'Payment was cancelled by user.';
      default: return 'Unable to determine payment status. Please contact support.';
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">Payment Status</h1>
          
          {loading && !gatewayStatus && (
            <div className="flex justify-center items-center mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Checking payment status...</span>
            </div>
          )}
          
          {(!loading || gatewayStatus) && (
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
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Amount:</p>
                <p className="text-2xl font-bold text-gray-800">
                  ₹{amount > 0 ? amount.toFixed(2) : '0.00'}
                </p>
              </div>

              {paymentMode && paymentMode !== 'N/A' && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Payment Method:</p>
                  <p className="text-lg font-medium text-gray-800 capitalize">
                    {paymentMode.replace('_', ' ')}
                  </p>
                </div>
              )}
              
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
              
              {status === 'pending' && (
                <div className="flex items-center justify-center text-sm text-gray-500">
                  <div className="animate-pulse mr-2">●</div>
                  Checking for updates...
                </div>
              )}

              {/* ✅ Success-specific actions */}
              {status === 'success' && (
                <div className="mt-6 space-y-3">
                  <button 
                    onClick={() => window.location.href = '/dashboard'}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors"
                  >
                    Continue to Dashboard
                  </button>
                  <button 
                    onClick={() => window.print()}
                    className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded hover:bg-gray-200 transition-colors"
                  >
                    Print Receipt
                  </button>
                </div>
              )}

              {/* ✅ Failed-specific actions */}
              {status === 'failed' && (
                <div className="mt-6">
                  <button 
                    onClick={() => window.location.href = '/payments/create'}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </>
          )}

          {/* ✅ Enhanced Debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-3 bg-gray-50 border rounded text-xs text-left">
              <div><strong>Debug Info:</strong></div>
              <div>Gateway Status: {gatewayStatus || 'N/A'}</div>
              <div>Capture Status: {captureStatus || 'N/A'}</div>
              <div>Status (frontend): {status}</div>
              <div>Amount (frontend): {amount}</div>
              <div>Final Status Locked: {finalStatusRef.current || 'No'}</div>
              <div>Polling Active: {pollingIntervalRef.current ? 'Yes' : 'No'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentStatus;