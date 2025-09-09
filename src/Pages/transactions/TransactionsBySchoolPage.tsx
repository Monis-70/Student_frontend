import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/api-client.js';
import { formatCurrency, formatDate } from '../../lib/utils.js';

export default function TransactionsBySchoolPage() {
  const { schoolId } = useParams();
  
  const { data, isLoading } = useQuery({
    queryKey: ['school-transactions', schoolId],
    queryFn: () => apiClient.getTransactionsBySchool(schoolId!, {}),
    enabled: !!schoolId,
  });

  if (isLoading) {
    return <div className="flex justify-center py-8">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">School Transactions</h1>
      <p className="text-gray-600">School ID: {schoolId}</p>

      {data?.data?.map((group: any) => (
        <div key={group._id.date} className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">{group._id.date}</h3>
            <span className="text-sm text-gray-600">
              {group.count} transactions - {formatCurrency(group.totalAmount)}
            </span>
          </div>
          
          <div className="space-y-2">
            {group.transactions.map((tx: any) => (
              <div key={tx.collect_id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{tx.student_info.name}</p>
                  <p className="text-sm text-gray-600">{tx.custom_order_id}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(tx.amount)}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    tx.status === 'success' ? 'bg-green-100 text-green-800' :
                    tx.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}