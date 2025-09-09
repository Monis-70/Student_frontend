import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, AlertCircle } from 'lucide-react';
import apiClient from '../../lib/api-client.js';
import { formatDate } from '../../lib/utils.js';

import { toast } from 'react-hot-toast';


export default function WebhookLogsPage() {
  const [filters, setFilters] = useState({
    status: '',
    limit: 50,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['webhook-logs', filters],
    queryFn: () => apiClient.getWebhookLogs(filters),
  });

  const handleRetry = async () => {
    try {
      const response = await apiClient.retryWebhooks();
      toast.success(`Retried ${response.processed} webhooks`);
      refetch();
    } catch (error) {
      console.error('Retry error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Webhook Logs</h1>
        <button
          onClick={handleRetry}
          className="btn btn-primary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Failed
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="input"
          >
            <option value="">All Status</option>
            <option value="processed">Processed</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>

          <select
            value={filters.limit}
            onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
            className="input"
          >
            <option value="50">50 logs</option>
            <option value="100">100 logs</option>
            <option value="200">200 logs</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Webhook ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </td>
                </tr>
              ) : data?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No webhook logs found
                  </td>
                </tr>
              ) : (
                data?.map((log: any) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono">{log.webhook_id}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        log.status === 'processed' ? 'bg-green-100 text-green-800' :
                        log.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{log.event_type}</td>
                    <td className="px-4 py-3 text-sm">{log.ip_address}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-3 text-sm">
                      {log.error_message && (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          {log.error_message}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}