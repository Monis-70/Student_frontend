import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function PaymentFailureRedirect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // ✅ Extract all possible ID parameters that your backend handles
    const collectId = 
      searchParams.get('collect_id') ||
      searchParams.get('provider_collect_id') ||
      searchParams.get('collect_request_id') ||
      searchParams.get('EdvironCollectRequestId') ||
      searchParams.get('providerCollectId') ||
      searchParams.get('order_id') ||
      searchParams.get('custom_order_id');

    // ✅ Extract status and amount for immediate display
    const status = searchParams.get('status');
    const captureStatus = searchParams.get('capture_status');
    const amount = searchParams.get('amount') || searchParams.get('am');

    console.log('PaymentFailureRedirect - Extracted params:', {
      collectId,
      status,
      captureStatus,
      amount,
      allParams: Object.fromEntries(searchParams.entries()),
    });

    if (collectId) {
      console.log('Redirecting with providerCollectId:', collectId);
      
      // ✅ Build query params to preserve all relevant data
      const queryParams = new URLSearchParams();
      queryParams.set('providerCollectId', collectId);
      
      if (status) queryParams.set('status', status);
      if (captureStatus) queryParams.set('capture_status', captureStatus);
      if (amount) queryParams.set('amount', amount);

      // ✅ Redirect to unified status page with all parameters
      const redirectUrl = `/payments/status?${queryParams.toString()}`;
      console.log('Redirecting to:', redirectUrl);
      navigate(redirectUrl, { replace: true });
    } else {
      console.warn('No collect_id found in query params, redirecting to basic status page');
      
      // ✅ Still try to preserve status and amount even without ID
      const queryParams = new URLSearchParams();
      if (status) queryParams.set('status', status);
      if (captureStatus) queryParams.set('capture_status', captureStatus);
      if (amount) queryParams.set('amount', amount);
      
      const redirectUrl = queryParams.toString() 
        ? `/payments/status?${queryParams.toString()}`
        : '/payments/status';
      
      navigate(redirectUrl, { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to payment status...</p>
      </div>
    </div>
  );
}