import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';


const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('EdvironCollectRequestId'); // ✅ fix here
  const statusFromUrl = searchParams.get('status'); // ✅ use status from query
  const [status, setStatus] = useState(statusFromUrl || 'pending');
  const [amount, setAmount] = useState(0);

  const fetchStatus = async () => {
    if (!orderId) return;
    try {
      const res = await axios.get(`/api/payments/status/${orderId}`);
      setStatus(res.data.status);
      setAmount(res.data.amount);
    } catch (err) {
      console.error(err);
    }
  };

  const queryClient = useQueryClient();

useEffect(() => {
  if (status?.toLowerCase() === 'success') {
    // ✅ Refresh transactions list cache
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  }
}, [status, queryClient]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Payment Status</h1>
      <p className="text-lg mb-2">Order ID: {orderId}</p>
      <p className="text-lg mb-2">Status: <span className={`font-semibold ${status === 'success' ? 'text-green-600' : status === 'failed' ? 'text-red-600' : 'text-yellow-600'}`}>{status}</span></p>
      <p className="text-lg">Amount: ₹{amount}</p>
      {status === 'failed' && (
        <p className="mt-4 text-red-500">Payment failed. Please try again.</p>
      )}
    </div>
  );
};

export default PaymentSuccess;
