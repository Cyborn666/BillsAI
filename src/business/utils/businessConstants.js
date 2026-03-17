/**
 * Business module constants
 * Contains constants used throughout the business financial management module
 */

// Business expense categories
export const EXPENSE_CATEGORIES = {
  OPERATIONAL: 'operational',
  SUPPLIES: 'supplies',
  SALARIES: 'salaries',
  RENT: 'rent',
  UTILITIES: 'utilities',
  MARKETING: 'marketing',
  TAXES: 'taxes',
  INSURANCE: 'insurance',
  TRAVEL: 'travel',
  PROFESSIONAL_SERVICES: 'professional_services',
  OTHER: 'other'
};

// Business income categories
export const INCOME_CATEGORIES = {
  SALES: 'sales',
  SERVICES: 'services',
  INTEREST: 'interest',
  INVESTMENTS: 'investments',
  OTHER: 'other'
};

// Time periods for financial reports
export const REPORT_PERIODS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
  CUSTOM: 'custom'
};

// Invoice status options
export const INVOICE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled'
};

// Financial report types
export const REPORT_TYPES = {
  PROFIT_LOSS: 'profit_loss',
  CASH_FLOW: 'cash_flow',
  EXPENSE_BREAKDOWN: 'expense_breakdown',
  INCOME_BREAKDOWN: 'income_breakdown',
  TAX_SUMMARY: 'tax_summary',
  INVOICE_AGING: 'invoice_aging'
};
