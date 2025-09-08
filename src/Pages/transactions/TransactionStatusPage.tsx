import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import apiClient from '../../lib/api-client';
import { formatCurrency, formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';

// ✅ Transaction status response type
interface StudentInfo {
  name: string;
  email: string;
}

interface TransactionStatus {
  status: 'success' | 'failed' | 'pending';
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
      const response: { transaction: TransactionStatus } =
        await apiClient.getTransactionStatus(orderId);
      setStatus(response.transaction);
    } catch (error) {
      setStatus(null);
      console.error('Status check error:', error);
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
      default:
        return <Clock className="w-8 h-8 text-yellow-600" />;
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

      {status && (
        <div className="card">
          <div className="flex items-center gap-4 mb-6">
            {getStatusIcon(status.status)}
            <div>
              <h2 className="text-xl font-semibold capitalize">{status.status}</h2>
              <p className="text-gray-600">Order ID: {status.customOrderId}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Student Name</p>
                <p className="font-medium">{status.studentInfo?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Student Email</p>
                <p className="font-medium">{status.studentInfo?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Amount</p>
                <p className="font-medium">{formatCurrency(status.amount)}</p>
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

            {status.bankReference && (
              <div>
                <p className="text-sm text-gray-600">Bank Reference</p>
                <p className="font-medium">{status.bankReference}</p>
              </div>
            )}

            {status.errorMessage && status.errorMessage !== 'NA' && (
              <div className="p-3 bg-red-50 rounded-md">
                <p className="text-sm text-red-800">Error: {status.errorMessage}</p>
              </div>
            )}
          </div>

          {/* 🔗 New navigation buttons */}
          <div className="flex gap-2 mt-6">
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
          </div>
        </div>
      )}
    </div>
  );
}
