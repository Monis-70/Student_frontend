import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard, User, Mail, Phone, AlertCircle } from 'lucide-react';
import apiClient from '../../lib/api-client.js';
import { toast } from 'react-hot-toast';

const paymentSchema = z.object({
  amount: z.string().min(1, 'Amount is required'),
  studentInfo: z.object({
    name: z.string().min(2, 'Name is required'),
    id: z.string().min(1, 'Student ID is required'),
    email: z.string().email('Invalid email'),
    phone: z.string().optional(),
    class: z.string().optional(),
    section: z.string().optional(),
  }),
  feeType: z.string().min(1, 'Fee type is required'),
  description: z.string().optional(),
  gateway: z.string().min(1, 'Gateway is required'),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function CreatePaymentPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handlePaymentSuccess = (orderId: string, schoolId: string) => {
    navigate(`/transactions/status/${orderId}`, { replace: true });
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      gateway: 'PhonePe',
      feeType: 'tuition',
      amount: '100',
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    setIsLoading(true);
    try {
      const numericAmount = Math.max(1, parseFloat(data.amount) || 0);
      
      const payload = {
        amount: numericAmount,
        student_info: {
          name: data.studentInfo.name,
          id: data.studentInfo.id,
          email: data.studentInfo.email,
          ...(data.studentInfo.phone && { phone: data.studentInfo.phone }),
          ...(data.studentInfo.class && { class: data.studentInfo.class }),
          ...(data.studentInfo.section && { section: data.studentInfo.section }),
        },
        feeType: data.feeType,
        gateway: data.gateway,
        returnUrl: `${window.location.origin}/payments/status`,
        description: data.description ?? undefined,
      };

      console.log('Sending payment data:', payload);

      const respData = await apiClient.createPayment(payload);
      console.log('Payment response data:', respData);

      if (respData?.success) {
        toast.success('Payment initiated successfully!');

        // ✅ Backend returns: payment_url (not paymentUrl), collect_request_id, order_id
        const paymentUrl = respData.payment_url || respData.paymentUrl;
        const serverOrderId = respData.order_id; // This is the MongoDB _id
        const providerCollectId = respData.collect_request_id; // This is the external provider ID

        console.log('Payment response breakdown:', {
          paymentUrl,
          serverOrderId,
          providerCollectId,
        });

        if (paymentUrl && (serverOrderId || providerCollectId)) {
          // ✅ Store amount for fallback in status pages
          localStorage.setItem('last_amount', String(numericAmount));
          
          // ✅ Store the provider collect ID as the primary reference for status checking
          if (providerCollectId) {
            localStorage.setItem('last_collect_id', providerCollectId);
          }

          try {
            // ✅ Use provider collect ID as the key for consistent lookup
            const storageKey = `payment_collect_${providerCollectId || serverOrderId}`;
            const toStore = {
              serverOrderId, // MongoDB _id
              providerCollectId, // External provider ID (Edviron collect_request_id)
              customOrderId: respData.custom_order_id || serverOrderId, // Internal custom ID
              studentId: data.studentInfo.id,
              amount: numericAmount,
              feeType: data.feeType,
              gateway: data.gateway,
              createdAt: new Date().toISOString(),
            };
            localStorage.setItem(storageKey, JSON.stringify(toStore));

            const listKey = 'payment_collect_list';
            const rawList = localStorage.getItem(listKey);
            const list = rawList ? (JSON.parse(rawList) as string[]) : [];
            list.unshift(storageKey);
            localStorage.setItem(listKey, JSON.stringify(list.slice(0, 20)));

            console.log('Stored payment data in localStorage:', toStore);
          } catch (e) {
            console.warn('Could not write payment data to localStorage', e);
          }

          // ✅ Redirect to payment gateway
          console.log('Redirecting to payment URL:', paymentUrl);
          window.location.href = paymentUrl;
        } else {
          toast.error('Payment URL or Order ID missing from server.');
          console.error('Missing data in response:', {
            paymentUrl,
            serverOrderId,
            providerCollectId,
            fullResponse: respData,
          });
        }
      } else {
        const msg = respData?.message || 'Failed to create payment';
        toast.error(msg);
        console.error('Payment API returned failure:', respData);
      }
    } catch (error: any) {
      console.error('Payment network/error:', error);
      const serverMsg =
        error?.message || error?.response?.data?.message || 'Failed to create payment';
      toast.error(serverMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Payment</h1>

      {/* Test Environment Notice */}
      <div className="card bg-yellow-50 border-yellow-200 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-yellow-800">Test Environment</p>
            <p className="text-yellow-700 mt-1">
              This is a test environment. Do not pay using real UPI or QR codes.
            </p>
            <p className="text-yellow-700 mt-1">
              Use test cards from:{' '}
              <a
                href="https://www.cashfree.com/docs/payments/online/resources/sandbox-environment"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Cashfree Test Credentials
              </a>
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Student Information */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Student Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Student Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('studentInfo.name')}
                  className="input pl-10"
                  placeholder="John Doe"
                />
              </div>
              {errors.studentInfo?.name && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.studentInfo.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Student ID *</label>
              <input {...register('studentInfo.id')} className="input" placeholder="STU001" />
              {errors.studentInfo?.id && (
                <p className="text-red-500 text-sm mt-1">{errors.studentInfo.id.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('studentInfo.email')}
                  type="email"
                  className="input pl-10"
                  placeholder="john@example.com"
                />
              </div>
              {errors.studentInfo?.email && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.studentInfo.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register('studentInfo.phone')} className="input pl-10" placeholder="9876543210" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Class</label>
              <input {...register('studentInfo.class')} className="input" placeholder="10" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Section</label>
              <input {...register('studentInfo.section')} className="input" placeholder="A" />
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Payment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount (₹) *</label>
              <input
                {...register('amount')}
                type="number"
                min="1"
                step="1"
                className="input"
                placeholder="100"
              />
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Min: ₹1 (Test with small amounts)</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Fee Type *</label>
              <select {...register('feeType')} className="input">
                <option value="tuition">Tuition Fee</option>
                <option value="admission">Admission Fee</option>
                <option value="exam">Exam Fee</option>
                <option value="library">Library Fee</option>
                <option value="sports">Sports Fee</option>
                <option value="transport">Transport Fee</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Payment Gateway *</label>
              <select {...register('gateway')} className="input">
                <option value="edviron">Edviron (Default)</option>
                <option value="PhonePe">PhonePe</option>
                <option value="Razorpay">Razorpay</option>
                <option value="Paytm">Paytm</option>
                <option value="GooglePay">Google Pay</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input {...register('description')} className="input" placeholder="Monthly tuition fee" />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn btn-primary flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              Create Payment Link
            </>
          )}
        </button>
      </form>
    </div>
  );
}