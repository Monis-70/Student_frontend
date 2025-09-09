import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import apiClient from '../../lib/api-client.js';
import { formatCurrency } from '../../lib/utils.js';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => apiClient.getTransactionAnalytics({}),
  });

  if (isLoading) {
    return <div className="flex justify-center py-8">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  const analytics = data?.analytics || {};

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      {/* Daily Trends */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Daily Transaction Trends</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.dailyTrends || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="_id" />
            <YAxis />
            <Tooltip formatter={(value: any) => formatCurrency(value)} />
            <Legend />
            <Line type="monotone" dataKey="totalAmount" stroke="#3B82F6" name="Amount" />
            <Line type="monotone" dataKey="count" stroke="#10B981" name="Count" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gateway Distribution */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Gateway Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.gatewayDistribution || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => entry._id}
                outerRadius={80}
                fill="#8884d8"
                dataKey="totalAmount"
              >
                {analytics.gatewayDistribution?.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Modes */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Payment Methods</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.paymentModes || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id" />
              <YAxis />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Bar dataKey="totalAmount" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Schools */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Top Schools by Revenue</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">School ID</th>
                <th className="text-left py-2">Transactions</th>
                <th className="text-left py-2">Revenue</th>
                <th className="text-left py-2">Avg. Transaction</th>
              </tr>
            </thead>
            <tbody>
              {analytics.schoolStats?.map((school: any) => (
                <tr key={school._id} className="border-b">
                  <td className="py-2">{school._id}</td>
                  <td className="py-2">{school.transactionCount}</td>
                  <td className="py-2">{formatCurrency(school.totalRevenue)}</td>
                  <td className="py-2">{formatCurrency(school.averageTransactionValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}