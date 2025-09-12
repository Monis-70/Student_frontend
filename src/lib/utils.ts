import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function mapStatus(apiStatus?: string, captureStatus?: string): 'success' | 'failed' | 'pending' | 'cancelled' {
  if (!apiStatus) return 'pending';

  const normalized = apiStatus.toUpperCase();
  const capture = captureStatus?.toUpperCase();

  if (normalized === 'SUCCESS') return 'success';
  if (normalized === 'FAILED' || normalized === 'ERROR' || normalized === 'DECLINED') return 'failed';
  if (normalized === 'CANCELLED' || normalized === 'USER_DROPPED' || normalized === 'CANCELED') return 'cancelled';

  // fallback if API is unclear
  if (capture === 'PENDING') return 'pending';

  return 'pending';
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

export function formatDate(date: string | Date | null | undefined): string {
  // Handle null, undefined, or empty string
  if (!date) {
    return 'N/A';
  }

  try {
    const dateObj = new Date(date);
    
    // Check if the date is valid
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