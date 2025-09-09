import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast} from 'react-hot-toast';
import apiClient from '../../lib/api-client.js';
import { formatCurrency, formatDate } from '../../lib/utils.js';

// ✅ Strongly typed payment status response
interface PaymentStatus {
  orderId: string;
  status: 'success' | 'failed' | 'pending';
  amount: number;
  paymentMode?: string;
  paymentTime?: string;
  message?: string;
}

export default function PaymentStatusPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [polling, setPolling] = useState<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = async () => {
    if (!orderId) return;
    try {
      const data: PaymentStatus = await apiClient.collectPaymentStatus(orderId);
      setPaymentStatus(data);

      // Stop polling if payment is final
      if (data.status === 'success' || data.status === 'failed') {
        if (polling) clearInterval(polling);
      }

      setIsLoading(false);
    } catch (err: unknown) {
      console.error(err);
      const message =
        (err as any)?.response?.data?.message || 'Failed to fetch payment status';
      toast.error(message);
      setIsLoading(false);
      if (polling) clearInterval(polling);
    }
  };

  useEffect(() => {
    fetchStatus(); // immediate fetch
    const interval = setInterval(fetchStatus, 5000);
    setPolling(interval);
    return () => clearInterval(interval);
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-600" />;
      case 'failed':
        return <XCircle className="w-12 h-12 text-red-600" />;
      default:
        return <Clock className="w-12 h-12 text-yellow-600" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Payment Status</h1>

      <div className="card text-center">
        <div className="flex flex-col items-center gap-4">
          {getStatusIcon(paymentStatus?.status || 'pending')}
          <h2 className="text-xl font-semibold capitalize">{paymentStatus?.status}</h2>
          <p className="text-gray-600">Order ID: {paymentStatus?.orderId}</p>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Amount</span>
            <span className="font-medium">{formatCurrency(paymentStatus?.amount || 0)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Payment Mode</span>
            <span className="font-medium">{paymentStatus?.paymentMode || 'N/A'}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Payment Time</span>
            <span className="font-medium">
              {paymentStatus?.paymentTime ? formatDate(paymentStatus.paymentTime) : 'N/A'}
            </span>
          </div>
        </div>

        {paymentStatus?.message && (
          <div className="mt-4 p-3 bg-blue-50 rounded">
            <p className="text-sm text-blue-800">{paymentStatus.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
