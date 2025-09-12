import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, AlertCircle, Eye, Info } from 'lucide-react';
import apiClient from '../../lib/api-client.js';
import { formatDate } from '../../lib/utils.js';
import { toast } from 'react-hot-toast';

interface WebhookLog {
  _id: string;
  webhook_id: string;
  event_type: string;
  payload: any;
  headers: any;
  ip_address: string;
  user_agent: string;
  status: 'pending' | 'processing' | 'processed' | 'failed' | 'retrying';
  error_message?: string;
  response?: any;
  related_order_id?: string;
  processing_time_ms?: number;
  retry_count?: number;
  next_retry_at?: string;
  createdAt: string;
  processed_at?: string;
}

export default function WebhookLogsPage() {
  const [filters, setFilters] = useState({
    status: '',
    eventType: '',
    limit: 50,
    startDate: '',
    endDate: '',
  });

  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [showPayloadModal, setShowPayloadModal] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['webhook-logs', filters],
    queryFn: () => apiClient.getWebhookLogs(filters),
    staleTime: 5000,
    refetchInterval: 10000, // Auto-refresh every 10 seconds for real-time updates
  });

  const handleRetry = async () => {
    try {
      const response = await apiClient.retryWebhooks();
      toast.success(`Retried ${response.processed || 0} webhooks`);
      refetch();
    } catch (error: any) {
      console.error('Retry error:', error);
      toast.error(error?.message || 'Failed to retry webhooks');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'retrying':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getRowBgColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50';
      case 'processing':
        return 'bg-blue-50';
      case 'retrying':
        return 'bg-orange-50';
      case 'failed':
        return 'bg-red-50';
      case 'processed':
        return 'bg-green-50';
      default:
        return '';
    }
  };

  const getEventTypeFromPayload = (payload: any) => {
    // Extract event type from various webhook formats
    if (payload?.type) return payload.type;
    if (payload?.event_type) return payload.event_type;
    if (payload?.data?.payment_status) return 'payment_update';
    if (payload?.order_info) return 'payment_status';
    if (payload?.collect_request_id) return 'collect_request';
    return 'unknown';
  };

  const getOrderIdFromLog = (log: WebhookLog) => {
    // Try to extract order ID from various sources
    return (
      log.related_order_id ||
      log.payload?.order_id ||
      log.payload?.collect_request_id ||
      log.payload?.data?.order_id ||
      log.payload?.order_info?.order_id ||
      log.response?.orderId ||
      log.response?.customOrderId ||
      'N/A'
    );
  };

  const getGatewayFromPayload = (payload: any) => {
    if (payload?.data) return 'Cashfree';
    if (payload?.gateway) return payload.gateway;
    if (payload?.payment_gateway) return payload.payment_gateway;
    return 'Unknown';
  };

  const openPayloadModal = (log: WebhookLog) => {
    setSelectedLog(log);
    setShowPayloadModal(true);
  };

  const closePayloadModal = () => {
    setSelectedLog(null);
    setShowPayloadModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Webhook Logs</h1>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleRetry}
            className="btn btn-primary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Failed
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="input"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="processed">Processed</option>
            <option value="failed">Failed</option>
            <option value="retrying">Retrying</option>
          </select>

          <select
            value={filters.eventType}
            onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
            className="input"
          >
            <option value="">All Events</option>
            <option value="payment_update">Payment Update</option>
            <option value="payment_status">Payment Status</option>
            <option value="collect_request">Collect Request</option>
          </select>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="input"
            placeholder="Start Date"
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="input"
            placeholder="End Date"
          />

          <select
            value={filters.limit}
            onChange={(e) =>
              setFilters({ ...filters, limit: parseInt(e.target.value, 10) })
            }
            className="input"
          >
            <option value="50">50 logs</option>
            <option value="100">100 logs</option>
            <option value="200">200 logs</option>
            <option value="500">500 logs</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      {data && data.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['pending', 'processing', 'processed', 'failed', 'retrying'].map((status) => {
            const count = data.filter((log: WebhookLog) => log.status === status).length;
            return (
              <div key={status} className="card text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-gray-600 capitalize">{status}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Logs Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Webhook ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Event Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Order ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Gateway
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  IP Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Processing Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Received At
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center">
                    <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </td>
                </tr>
              ) : !data || data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No webhook logs found
                  </td>
                </tr>
              ) : (
                data.map((log: WebhookLog) => (
                  <tr
                    key={log._id}
                    className={`hover:bg-gray-50 ${getRowBgColor(log.status)}`}
                  >
                    <td className="px-4 py-3 text-sm font-mono">
                      {log.webhook_id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                        {log.retry_count && log.retry_count > 0 && (
                          <span className="text-xs text-orange-600">
                            (Retry {log.retry_count})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.event_type || getEventTypeFromPayload(log.payload)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {getOrderIdFromLog(log)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getGatewayFromPayload(log.payload)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.ip_address || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.processing_time_ms ? `${log.processing_time_ms}ms` : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openPayloadModal(log)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {log.error_message && (
                          <div className="text-red-600" title={log.error_message}>
                            <AlertCircle className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Modal */}
      {showPayloadModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                Webhook Details: {selectedLog.webhook_id}
              </h2>
              <button
                onClick={closePayloadModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedLog.status)}`}>
                      {selectedLog.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Processing Time</label>
                    <div>{selectedLog.processing_time_ms ? `${selectedLog.processing_time_ms}ms` : 'N/A'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">IP Address</label>
                    <div>{selectedLog.ip_address || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User Agent</label>
                    <div className="text-sm">{selectedLog.user_agent || 'N/A'}</div>
                  </div>
                </div>

                {/* Error Message */}
                {selectedLog.error_message && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Error Message</label>
                    <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800">
                      {selectedLog.error_message}
                    </div>
                  </div>
                )}

                {/* Payload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payload</label>
                  <pre className="bg-gray-50 border rounded p-3 text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>

                {/* Headers */}
                {selectedLog.headers && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Headers</label>
                    <pre className="bg-gray-50 border rounded p-3 text-sm overflow-x-auto">
                      {JSON.stringify(selectedLog.headers, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Response */}
                {selectedLog.response && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Response</label>
                    <pre className="bg-gray-50 border rounded p-3 text-sm overflow-x-auto">
                      {JSON.stringify(selectedLog.response, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}