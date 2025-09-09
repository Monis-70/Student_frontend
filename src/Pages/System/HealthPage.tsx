import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Database, Server, Clock } from 'lucide-react';
import apiClient from '../../lib/api-client.js';

export default function HealthPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient.getHealth(),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const isHealthy = data?.status === 'healthy';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">System Health</h1>

      {/* Overall Status */}
      <div className="card">
        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          ) : isHealthy ? (
            <CheckCircle className="w-8 h-8 text-green-600" />
          ) : (
            <XCircle className="w-8 h-8 text-red-600" />
          )}
          <div>
            <h2 className="text-xl font-semibold">
              System Status: {isLoading ? 'Checking...' : isHealthy ? 'Healthy' : 'Unhealthy'}
            </h2>
            {data && (
              <p className="text-gray-600">Last checked: {new Date(data.timestamp).toLocaleString()}</p>
            )}
          </div>
        </div>
      </div>

      {/* Components Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Server className="w-6 h-6 text-blue-600" />
            <h3 className="font-semibold">API Server</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Status</span>
              <span className={`text-sm font-medium ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
                {isHealthy ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Environment</span>
              <span className="text-sm font-medium">{data?.environment || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-green-600" />
            <h3 className="font-semibold">Database</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Status</span>
              <span className={`text-sm font-medium ${
                data?.database?.status === 'connected' ? 'text-green-600' : 'text-red-600'
              }`}>
                {data?.database?.status || 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Name</span>
              <span className="text-sm font-medium">{data?.database?.name || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Uptime */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-6 h-6 text-purple-600" />
          <h3 className="font-semibold">Uptime</h3>
        </div>
        <div className="text-2xl font-bold">
          {data ? `${Math.floor(data.uptime / 3600)}h ${Math.floor((data.uptime % 3600) / 60)}m` : 'N/A'}
        </div>
      </div>

      {error && (
        <div className="card bg-red-50 border-red-200">
          <p className="text-red-800">Error checking system health: {(error as Error).message}</p>
        </div>
      )}
    </div>
  );
}