import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  Receipt,
  TrendingUp,
  Users,
  ArrowRight,
  DollarSign,
} from 'lucide-react';
import apiClient from '../../lib/api-client.js';
import { formatCurrency } from '../../lib/utils.js';

export default function DashboardPage() {
  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => apiClient.getTransactionAnalytics({}),
  });

  const { data: transactions } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: () => apiClient.getTransactions({ limit: 5 }),
  });

  const stats = analytics?.analytics?.overallStats?.[0] || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Welcome to School Payment System</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 text-blue-600" />
            <span className="text-xs text-gray-500">Total</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue || 0)}</p>
          <p className="text-sm text-gray-600">Total Revenue</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <Receipt className="w-8 h-8 text-green-600" />
            <span className="text-xs text-gray-500">Count</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalTransactions || 0}</p>
          <p className="text-sm text-gray-600">Total Transactions</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <span className="text-xs text-gray-500">Rate</span>
          </div>
          <p className="text-2xl font-bold">{(stats.successRate || 0).toFixed(1)}%</p>
          <p className="text-sm text-gray-600">Success Rate</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-orange-600" />
            <span className="text-xs text-gray-500">Students</span>
          </div>
          <p className="text-2xl font-bold">{stats.uniqueStudentCount || 0}</p>
          <p className="text-sm text-gray-600">Unique Students</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/payments/create" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Create Payment</h3>
              <p className="text-sm text-gray-600">Start a new payment</p>
            </div>
            <CreditCard className="w-8 h-8 text-blue-600" />
          </div>
        </Link>

        <Link to="/transactions" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">View Transactions</h3>
              <p className="text-sm text-gray-600">See all transactions</p>
            </div>
            <Receipt className="w-8 h-8 text-green-600" />
          </div>
        </Link>

        <Link to="/analytics" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Analytics</h3>
              <p className="text-sm text-gray-600">View insights</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
        </Link>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          <Link to="/transactions" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-sm font-medium">Order ID</th>
                <th className="text-left py-2 text-sm font-medium">Student</th>
                <th className="text-left py-2 text-sm font-medium">Amount</th>
                <th className="text-left py-2 text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions?.data?.slice(0, 5).map((tx: any) => (
                <tr key={tx.collect_id} className="border-b">
                  <td className="py-2 text-sm">{tx.custom_order_id?.slice(0, 15)}...</td>
                  <td className="py-2 text-sm">{tx.student_info?.name}</td>
                  <td className="py-2 text-sm">{formatCurrency(tx.order_amount)}</td>
                  <td className="py-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      tx.status === 'success' ? 'bg-green-100 text-green-800' :
                      tx.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}