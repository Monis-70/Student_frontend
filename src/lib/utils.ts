import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type PaymentStatus = 'success' | 'failed' | 'pending' | 'cancelled';

/**
 * ✅ Unified status mapper (same as backend)
 * Always maps raw API/gateway statuses to one of:
 * 'success' | 'failed' | 'pending' | 'cancelled'
 */
export function mapStatus(apiStatus?: string): PaymentStatus {
  if (!apiStatus) return 'pending';

  const normalized = apiStatus.toUpperCase();

  switch (normalized) {
    case 'SUCCESS':
    case 'COMPLETED':
    case 'PAID':
      return 'success';

    case 'FAILED':
    case 'ERROR':
    case 'DECLINED':
      return 'failed';

    case 'CANCELLED':
    case 'CANCELED':
    case 'USER_DROPPED':
      return 'cancelled';

    default:
      return 'pending';
  }
}

/**
 * ✅ Merge Tailwind + conditional classnames
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * ✅ Format numbers as INR currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

/**
 * ✅ Format date/time safely
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }

  try {
    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(dateObj);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
}
