import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Filter, RefreshCw } from 'lucide-react';
import { DatePicker } from 'react-datepicker';
import apiClient from '../../lib/api-client.js';
import { formatCurrency, formatDate } from '../../lib/utils.js';
import { toast } from 'react-hot-toast';

// ✅ helper to normalize status - matches your backend exactly
function mapStatus(apiStatus?: string, captureStatus?: string): 'success' | 'failed' | 'pending' | 'cancelled' {
  if (!apiStatus) return 'pending';

  const normalized = apiStatus.toUpperCase();
  const capture = captureStatus?.toUpperCase();

  // ✅ Cashfree quirk - matches backend logic
  if (normalized === 'SUCCESS' && capture === 'PENDING') {
    return 'pending';
  }

  if (['SUCCESS', 'COMPLETED', 'PAID'].includes(normalized)) return 'success';
  if (['FAILED', 'DECLINED', 'ERROR'].includes(normalized)) return 'failed';
  if (['CANCELLED', 'USER_DROPPED', 'CANCELED'].includes(normalized)) return 'cancelled';

  return 'pending';
}

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    gateway: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
    search: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['transactions', page, filters],
    queryFn: () =>
      apiClient.getTransactions({
        page,
        limit: 10,
        status: filters.status || undefined,
        gateway: filters.gateway || undefined,
        startDate: filters.startDate?.toISOString(),
        endDate: filters.endDate?.toISOString(),
        search: filters.search || undefined,
      }),
    refetchInterval: 5000, // ✅ auto-refresh every 5s
  });

  const handleExport = async (format: string) => {
    try {
      await apiClient.exportTransactions(format, filters);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="btn btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5" />
          <h2 className="font-semibold">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="input"
          />

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="input"
          >
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={filters.gateway}
            onChange={(e) => setFilters({ ...filters, gateway: e.target.value })}
            className="input"
          >
            <option value="">All Gateways</option>
            <option value="PhonePe">PhonePe</option>
            <option value="Razorpay">Razorpay</option>
            <option value="Paytm">Paytm</option>
            <option value="GooglePay">Google Pay</option>
            <option value="Cashfree">Cashfree</option>
            <option value="edviron">Edviron</option>
          </select>

          <DatePicker
            selected={filters.startDate}
            onChange={(date) => setFilters({ ...filters, startDate: date })}
            placeholderText="Start Date"
            className="input"
            isClearable
          />

          <DatePicker
            selected={filters.endDate}
            onChange={(date) => setFilters({ ...filters, endDate: date })}
            placeholderText="End Date"
            className="input"
            isClearable
          />
        </div>
      </div>

      {/* Summary */}
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-xl font-bold">{formatCurrency(data.summary.totalAmount || 0)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Success</p>
            <p className="text-xl font-bold text-green-600">{data.summary.successCount || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Failed</p>
            <p className="text-xl font-bold text-red-600">{data.summary.failedCount || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-xl font-bold text-yellow-600">{data.summary.pendingCount || 0}</p>
          </div>
        </div>
      )}

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 p-4 rounded text-xs">
          <strong>Debug - API Response:</strong>
          <pre>{JSON.stringify(data?.data?.slice(0, 2), null, 2)}</pre>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Order ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Gateway
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </td>
                </tr>
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                data?.data?.map((tx: any) => {
                  // ✅ Use backend's normalized status directly (matches your backend mapGatewayStatus)
                  const status = mapStatus(tx.status ?? tx.gateway_status);

                  // ✅ Extract amount safely - matches your backend field structure
                  const safeAmount = Number(
                    tx.order_amount ??
                    tx.transaction_amount ??
                    tx.amount ??
                    tx.status_info?.order_amount ??
                    tx.status_info?.transaction_amount ??
                    0
                  );

                  // ✅ Safe date handling
                  const createdAt = tx.created_at ?? tx.createdAt ?? tx.createdAt ?? null;

                  return (
                    <tr key={tx.collect_id || tx.custom_order_id || tx._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <span title={tx.custom_order_id}>
                          {tx.custom_order_id ? `${tx.custom_order_id.slice(0, 15)}...` : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <p className="font-medium">{tx.student_info?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{tx.student_info?.email || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {formatCurrency(safeAmount)}
                        {/* Show debug info for amount in dev */}
                        {process.env.NODE_ENV === 'development' && safeAmount === 0 && (
                          <div className="text-xs text-red-500">
                            Debug: order_amount={tx.order_amount}, transaction_amount={tx.transaction_amount}, amount={tx.amount}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            status === 'success'
                              ? 'bg-green-100 text-green-800'
                              : status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : status === 'cancelled'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {status.toUpperCase()}
                        </span>
                        {/* Show debug info for status in dev */}
                        {process.env.NODE_ENV === 'development' && (
                          <div className="text-xs text-gray-500">
                            Raw: {tx.status || tx.gateway_status || 'none'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{tx.gateway || tx.gateway_name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {createdAt ? formatDate(createdAt) : 'N/A'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && (
          <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, data.pagination.total)} of{' '}
              {data.pagination.total} results
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="btn btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= data.pagination.pages}
                className="btn btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}