import axios, { AxiosInstance } from 'axios';
import toast from 'react-hot-toast';

/// <reference types="vite/client" />
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// utils function to convert camelCase to snake_case recursively
function camelToSnake(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(camelToSnake);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      acc[snakeKey] = camelToSnake(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await this.client.post('/auth/refresh', { refreshToken });
              const { accessToken, refreshToken: newRefreshToken } = response.data;
              
              localStorage.setItem('accessToken', accessToken);
              localStorage.setItem('refreshToken', newRefreshToken);
              
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            localStorage.clear();
            window.location.href = '/auth/login';
            return Promise.reject(refreshError);
          }
        }

        const message = error.response?.data?.message || 'Something went wrong';
        toast.error(message);
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user } = response.data;
    
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    
    return response.data;
  }

  async signup(data: any) {
    const response = await this.client.post('/auth/signup', data);
    return response.data;
  }

  async logout() {
    await this.client.post('/auth/logout');
    localStorage.clear();
  }

  async getProfile() {
    const response = await this.client.get('/auth/profile');
    return response.data;
  }

  // Payment endpoints
async createPayment(data: any) {
  // convert camelCase to snake_case before sending
  const payload = camelToSnake(data);

  const response = await this.client.post('/payments/create-payment', payload);

  return {
    ...response.data,
    orderId: response.data.collect_request_id || response.data.orderId,
    paymentUrl: response.data.Collect_request_url || response.data.paymentUrl,
    success: true,
  };
}


  async collectPaymentStatus(customOrderId: string) {
    const response = await this.client.get(`/payments/collect-payment/${customOrderId}`);
    return {
      status: response.data.status?.toLowerCase() || 'pending',
      amount: response.data.amount || 0,
      orderId: customOrderId,
      paymentMode: response.data.details?.payment_methods || 'N/A',
      paymentTime: response.data.details?.payment_time || null,
      message: response.data.message || '',
    };
  }

  async getPaymentStatus(customOrderId: string) {
    const response = await this.client.get(`/payments/status/${customOrderId}`);
    return {
      status: response.data.status?.toLowerCase() || 'pending',
      amount: response.data.amount || 0,
      orderId: customOrderId,
      paymentMode: response.data.details?.payment_methods || 'N/A',
      paymentTime: response.data.details?.payment_time || null,
      message: response.data.message || '',
    };
  }

  // Transaction endpoints
  async getTransactions(params: any) {
    const response = await this.client.get('/transactions', { params });
    return response.data;
  }

  async getTransactionsBySchool(schoolId: string, params: any) {
    const response = await this.client.get(`/transactions/school/${schoolId}`, { params });
    return response.data;
  }

  async getTransactionStatus(customOrderId: string) {
    const response = await this.client.get(`/transaction-status/${customOrderId}`);
    return response.data;
  }

  async getTransactionAnalytics(params: any) {
    const response = await this.client.get('/transactions/analytics', { params });
    return response.data;
  }

  async exportTransactions(format: string, params: any) {
    const response = await this.client.get('/transactions/export', {
      params: { format, ...params },
      responseType: format === 'csv' ? 'blob' : 'json',
    });
    
    if (format === 'csv') {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    
    return response.data;
  }

  // Webhook endpoints
  async getWebhookLogs(params: any) {
    const response = await this.client.get('/webhook/logs', { params });
    return response.data;
  }

  async retryWebhooks() {
    const response = await this.client.post('/webhook/retry');
    return response.data;
  }

  // Health endpoint
  async getHealth() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export default new ApiClient();
