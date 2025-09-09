import { useQuery } from '@tanstack/react-query';
import { User, Mail, Shield } from 'lucide-react';
import apiClient from '../../lib/api-client.js';

export default function ProfilePage() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiClient.getProfile(),
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{user.name}</h2>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{profile?.email || user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Role</p>
              <p className="font-medium capitalize">{profile?.role || user.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">User ID</p>
              <p className="font-medium">{profile?.userId || user.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}