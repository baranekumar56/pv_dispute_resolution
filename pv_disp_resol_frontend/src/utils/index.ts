import { format, parseISO } from 'date-fns';
import { DATE_FORMATS } from '@/config/constants';

export const formatDate = (isoString: string, fmt = DATE_FORMATS.DISPLAY): string => {
  try {
    return format(parseISO(isoString), fmt);
  } catch {
    return isoString;
  }
};

export const formatCurrency = (amount: number, currency = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const getInitials = (name: string): string =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

export const clx = (...classes: (string | undefined | false | null)[]): string =>
  classes.filter(Boolean).join(' ');
