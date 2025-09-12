import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/api-client.js';
import { formatCurrency } from '../../lib/utils.js';

// ✅ Match backend's normalized status mapping exactly
function mapStatus(apiStatus?: string): 'success' | 'failed' | 'pending' | 'cancelled' {
  if (!apiStatus) return 'pending';
  
  const normalized = apiStatus.toLowerCase();
  
  if (['success', 'completed', 'paid'].includes(normalized)) return 'success';
  if (['failed', 'declined', 'error'].includes(normalized)) return 'failed';
  if (['cancelled', 'canceled', 'user_dropped'].includes(normalized)) return 'cancelled';
  
  return 'pending';
}

// ✅ Safely extract amount from various possible field locations
function extractAmount(tx: any): number {
  // Try multiple field names in order of preference
  const amount = 
    tx.amount ??
    tx.order_amount ??
    tx.transaction_amount ??
    tx.status_info?.order_amount ??
    tx.status_info?.transaction_amount ??
    0;
  
  const parsed = Number(amount);
  return isNaN(parsed) ? 0 : parsed;
}

export default function TransactionsBySchoolPage() {
  const { schoolId } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['school-transactions', schoolId],
    queryFn: () => apiClient.getTransactionsBySchool(schoolId!, {}),
    enabled: !!schoolId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error loading transactions: {error.message}</p>
      </div>
    );
  }

  // Debug: Log the actual data structure
  console.log('🔍 School transactions data:', data);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">School Transactions</h1>
      <p className="text-gray-600">School ID: {schoolId}</p>

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 p-4 rounded text-xs">
          <strong>Debug Info:</strong>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}

      {!data?.data || data.data.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No transactions found for this school.</p>
        </div>
      ) : (
        data.data.map((group: any) => (
          <div key={`${group._id.date}-${group._id.status}`} className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">
                {group._id.date} - Status: {group._id.status || 'Unknown'}
              </h3>
              <span className="text-sm text-gray-600">
                {group.count} transactions - {formatCurrency(group.totalAmount || 0)}
              </span>
            </div>

            <div className="space-y-2">
              {group.transactions?.map((tx: any, index: number) => {
                // ✅ Use backend's normalized status directly (no remapping needed)
                const status = mapStatus(tx.status);
                
                // ✅ Extract amount safely
                const safeAmount = extractAmount(tx);

                console.log(`🔍 Transaction ${index}:`, {
                  original_tx: tx,
                  extracted_status: status,
                  extracted_amount: safeAmount,
                });

                return (
                  <div
                    key={tx.collect_id || tx.custom_order_id || index}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded"
                  >
                    <div>
                      <p className="font-medium">
                        {tx.student_info?.name || 'Unknown Student'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Order: {tx.custom_order_id || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Gateway: {tx.gateway || 'N/A'}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(safeAmount)}</p>
                      
                      {/* Payment time if available */}
                      {tx.payment_time && (
                        <p className="text-xs text-gray-500">
                          {new Date(tx.payment_time).toLocaleString()}
                        </p>
                      )}
                      
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
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
                    </div>
                  </div>
                );
              }) || (
                <p className="text-gray-500 text-center py-4">No transactions in this group</p>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}