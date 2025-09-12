import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import apiClient from '../../lib/api-client.js';
import { formatCurrency, formatDate } from '../../lib/utils.js';
import { toast } from 'react-hot-toast';

// ✅ Transaction status response type
interface StudentInfo {
  name: string;
  email: string;
}

interface TransactionStatus {
  status: string; // normalized status
  customOrderId: string;
  amount: number;
  gateway: string;
  paymentMode?: string;
  paymentTime?: string;
  bankReference?: string;
  errorMessage?: string;
  studentInfo?: StudentInfo;
  schoolId?: string;
}

// ✅ Normalize status - matches your backend mapGatewayStatus exactly
function mapStatus(apiStatus?: string, captureStatus?: string): 'success' | 'failed' | 'pending' | 'cancelled' {
  if (!apiStatus) return 'pending';

  const normalized = apiStatus.toUpperCase();
  const capture = captureStatus?.toUpperCase();

  // ✅ Cashfree quirk - matches backend logic
  if (normalized === 'SUCCESS' && capture === 'PENDING') {
    return 'pending';
  }

  if (['SUCCESS', 'COMPLETED', 'PAID'].includes(normalized)) return 'success';
  if (['FAILED', 'ERROR', 'DECLINED'].includes(normalized)) return 'failed';
  if (['CANCELLED', 'USER_DROPPED', 'CANCELED'].includes(normalized)) return 'cancelled';

  return 'pending';
}

export default function TransactionStatusPage() {
  const { orderId: paramOrderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [orderId, setOrderId] = useState(paramOrderId || '');
  const [status, setStatus] = useState<TransactionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (paramOrderId) {
      handleSearch(); // auto fetch if navigated with /transactions/status/:orderId
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramOrderId]);

  const handleSearch = async () => {
    if (!orderId.trim()) {
      toast.error('Please enter an order ID');
      return;
    }

    setIsLoading(true);
    try {
      const response: { transaction: any } = await apiClient.getTransactionStatus(orderId);
      const raw = response.transaction;

      console.log('🔍 Raw backend response:', raw); // Debug logging

      // ✅ Use backend's normalized status directly (matches getTransactionStatus response)
      const normalizedStatus = mapStatus(
        raw.status ?? raw.payment_status ?? raw.gateway_status,
        raw.capture_status
      );

      // ✅ Extract amount matching your backend's getTransactionStatus structure
      const safeAmount = Number(
        raw.order_amount ??        // from orderStatus collection
        raw.transaction_amount ??  // from orderStatus collection  
        raw.amount ??             // from order document
        0
      ) || 0;

      const normalized: TransactionStatus = {
        status: normalizedStatus,
        customOrderId: raw.custom_order_id ?? orderId,
        amount: safeAmount,
        gateway: raw.gateway_name ?? 'N/A',
        paymentMode: raw.payment_mode ?? 'N/A',
        paymentTime: raw.payment_time ?? null,
        bankReference: raw.bank_reference ?? null,
        errorMessage: raw.error_message ?? null,
        studentInfo: raw.student_info ?? {},
        schoolId: raw.school_id ?? null,
      };

      console.log('✅ Normalized status data:', normalized); // Debug logging
      setStatus(normalized);

      // Show success/error toast based on status
      if (normalizedStatus === 'success') {
        toast.success('Payment completed successfully!');
      } else if (normalizedStatus === 'failed') {
        toast.error('Payment failed');
      } else if (normalizedStatus === 'pending') {
        toast.loading('Payment is still processing...', { duration: 3000 });
      }

    } catch (error) {
      setStatus(null);
      console.error('Status check error:', error);
      toast.error('Failed to fetch transaction status');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'failed':
        return <XCircle className="w-8 h-8 text-red-600" />;
      case 'cancelled':
        return <XCircle className="w-8 h-8 text-gray-600" />;
      default:
        return <Clock className="w-8 h-8 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'cancelled':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Check Transaction Status</h1>

      {!paramOrderId && (
        <div className="card">
          <div className="flex gap-2">
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="Enter Order ID (e.g., ORD_1234567890_abcd1234)"
              className="input flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="btn btn-primary flex items-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {isLoading && !status && (
        <div className="card text-center py-8">
          <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Checking transaction status...</p>
        </div>
      )}

      {status && (
        <div className="card">
          <div className="flex items-center gap-4 mb-6">
            {getStatusIcon(status.status)}
            <div>
              <h2 className="text-xl font-semibold">
                <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(status.status)}`}>
                  {status.status.toUpperCase()}
                </span>
              </h2>
              <p className="text-gray-600 mt-2">Order ID: {status.customOrderId}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Student Name</p>
                <p className="font-medium">{status.studentInfo?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Student Email</p>
                <p className="font-medium">{status.studentInfo?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Amount</p>
                <p className="font-medium text-lg">
                  {formatCurrency(status.amount)}
                </p>
                {/* Debug info for amount */}
                {process.env.NODE_ENV === 'development' && status.amount === 0 && (
                  <p className="text-xs text-red-500">Debug: Amount is 0 - check backend response</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">Gateway</p>
                <p className="font-medium">{status.gateway}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Mode</p>
                <p className="font-medium">{status.paymentMode || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Time</p>
                <p className="font-medium">
                  {status.paymentTime ? formatDate(status.paymentTime) : 'N/A'}
                </p>
              </div>
            </div>

            {status.bankReference && status.bankReference !== 'N/A' && (
              <div>
                <p className="text-sm text-gray-600">Bank Reference</p>
                <p className="font-medium font-mono text-sm">{status.bankReference}</p>
              </div>
            )}

            {status.errorMessage && status.errorMessage !== 'NA' && status.errorMessage !== 'N/A' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm font-medium text-red-800">Error Details:</p>
                <p className="text-sm text-red-700 mt-1">{status.errorMessage}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-6 pt-4 border-t">
            <button
              onClick={() => navigate('/transactions')}
              className="btn btn-secondary"
            >
              View All Transactions
            </button>
            {status.schoolId && (
              <button
                onClick={() => navigate(`/schools/${status.schoolId}/transactions`)}
                className="btn btn-primary"
              >
                View School Transactions
              </button>
            )}
            <button
              onClick={handleSearch}
              className="btn btn-outline flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Refresh Status
            </button>
          </div>
        </div>
      )}

      {!isLoading && !status && orderId && (
        <div className="card text-center py-8">
          <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Transaction Not Found</h3>
          <p className="text-gray-600">
            No transaction found with Order ID: <code className="bg-gray-100 px-2 py-1 rounded">{orderId}</code>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Please check the Order ID and try again.
          </p>
        </div>
      )}
    </div>
  );
}