import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Filter, RefreshCw } from 'lucide-react';
import DatePicker from 'react-datepicker';
import apiClient from '../../lib/api-client';
import { formatCurrency, formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';

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
    queryFn: () => apiClient.getTransactions({
      page,
      limit: 10,
      status: filters.status || undefined,
      gateway: filters.gateway || undefined,
      startDate: filters.startDate?.toISOString(),
      endDate: filters.endDate?.toISOString(),
      search: filters.search || undefined,
    }),
  });

  const handleExport = async (format: string) => {
    try {
      await apiClient.exportTransactions(format, filters);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
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
            <p className="text-xl font-bold">{formatCurrency(data.summary.totalAmount)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Success</p>
            <p className="text-xl font-bold text-green-600">{data.summary.successCount}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Failed</p>
            <p className="text-xl font-bold text-red-600">{data.summary.failedCount}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-xl font-bold text-yellow-600">{data.summary.pendingCount}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gateway</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
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
                data?.data?.map((tx: any) => (
                // Fixed section of TransactionsPage.tsx - replace the table row
<tr key={tx.collect_id} className="hover:bg-gray-50">
  <td className="px-4 py-3 text-sm">{tx.custom_order_id?.slice(0, 15)}...</td>
  <td className="px-4 py-3 text-sm">
    <div>
      <p className="font-medium">{tx.student_info?.name}</p>
      <p className="text-xs text-gray-500">{tx.student_info?.email}</p>
    </div>
  </td>
  <td className="px-4 py-3 text-sm font-medium">{formatCurrency(tx.order_amount)}</td>
  <td className="px-4 py-3">
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
      tx.status === 'success' ? 'bg-green-100 text-green-800' :
      tx.status === 'failed' ? 'bg-red-100 text-red-800' :
      'bg-yellow-100 text-yellow-800'
    }`}>
      {tx.status}
    </span>
  </td>
  <td className="px-4 py-3 text-sm">{tx.gateway}</td>
  <td className="px-4 py-3 text-sm text-gray-500">
    {/* ✅ Safe date formatting with fallback */}
    {tx.created_at ? formatDate(tx.created_at) : 'N/A'}
  </td>
</tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && (
          <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, data.pagination.total)} of {data.pagination.total} results
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