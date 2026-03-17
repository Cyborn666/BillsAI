/**
 * Business API Service
 * Handles API requests for business financial data
 */
import { Platform } from 'react-native';
import { apiRequest } from '../../utils/apiUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Business data storage keys
const STORAGE_KEYS = {
  BUSINESS_PROFILE: 'business_profile',
  EXPENSES: 'business_expenses',
  INVOICES: 'business_invoices',
  DAILY_REPORTS: 'business_daily_reports',
  BILLS: 'business_bills',
};

/**
 * Get all business clients (manual and from invoices)
 * @returns {Promise<Array>} List of clients
 */
export const getBusinessClients = async () => {
  return apiRequest('/business/clients', { method: 'GET' });
};

/**
 * Add a new manual business client
 * @param {Object} clientData - { name, email, address, phone }
 * @returns {Promise<Object>} Created client
 */
export const addBusinessClient = async (clientData) => {
  return apiRequest('/business/clients', {
    method: 'POST',
    body: JSON.stringify(clientData),
    headers: { 'Content-Type': 'application/json' },
  });
};

/**
 * Delete a manual business client
 * @param {string} clientId - Client ID
 * @returns {Promise<Object>} Response with deletion status
 */
export const deleteBusinessClient = async (clientId) => {
  return apiRequest(`/business/clients/${clientId}`, { method: 'DELETE' });
};

/**
 * Fetch business profile data
 * @returns {Promise<Object>} Business profile data
 */
export const getBusinessProfile = async () => {
  // Mock data to use when API is unavailable
  const mockBusinessProfile = {
    businessName: 'Acme Corporation',
    profilePhoto: null,
    email: 'business@acmecorp.com',
    subscription: {
      plan: 'Premium',
      status: 'Active',
      renewalDate: '2025-05-14',
    },
    team: {
      memberCount: 5,
      admins: 1,
      members: 4,
    },
    settings: {
      notifications: true,
      darkMode: false,
    },
  };

  try {
    //console.log('Attempting to fetch business profile from API...');
    const response = await apiRequest('/business/profile', {
      method: 'GET',
    });
    
    // Store business profile in AsyncStorage as backup
    if (response) {
      //console.log('API returned profile data:', response);
      await AsyncStorage.setItem(STORAGE_KEYS.BUSINESS_PROFILE, JSON.stringify(response));
      return response;
    }

    throw new Error('API returned empty response');
  } catch (error) {
    //console.warn('Failed to fetch business profile from API:', error.message);

    // Fallback to cached data if available
    try {
      //console.log('Attempting to retrieve cached business profile...');
      const cachedData = await AsyncStorage.getItem(STORAGE_KEYS.BUSINESS_PROFILE);
      
      if (cachedData) {
        //console.log('Using cached business profile data');
        return JSON.parse(cachedData);
      } else {
        //console.log('No cached data found, using mock data');
        // Store mock data in cache for future use
        await AsyncStorage.setItem(STORAGE_KEYS.BUSINESS_PROFILE, JSON.stringify(mockBusinessProfile));
        return mockBusinessProfile;
      }
    } catch (storageError) {
      //console.warn('Failed to retrieve cached business profile:', storageError);
      //console.log('Using mock data as final fallback');
      return mockBusinessProfile;
    }
  }
};

/**
 * Update business profile
 * @param {Object} profileData - Updated profile data
 * @returns {Promise<Object>} Updated business profile
 */
export const updateBusinessProfile = async (profileData) => {
  //console.log('Updating profile with data:', profileData);
  try {
    const response = await apiRequest('/business/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
      headers: { 'Content-Type': 'application/json' },
    });

    // Update cached profile data in AsyncStorage
    if (response) {
      const cachedProfile = await AsyncStorage.getItem(STORAGE_KEYS.BUSINESS_PROFILE);
      if (cachedProfile) {
        const updatedProfile = { ...JSON.parse(cachedProfile), ...profileData };
        await AsyncStorage.setItem(STORAGE_KEYS.BUSINESS_PROFILE, JSON.stringify(updatedProfile));
      }
    }
    
    return response;
  } catch (error) {
    //console.error('Error updating business profile:', error);
    // Fallback to updating cached data directly if API fails
    try {
      const cachedProfile = await AsyncStorage.getItem(STORAGE_KEYS.BUSINESS_PROFILE);
      if (cachedProfile) {
        const updatedProfile = { ...JSON.parse(cachedProfile), ...profileData };
        await AsyncStorage.setItem(STORAGE_KEYS.BUSINESS_PROFILE, JSON.stringify(updatedProfile));
        return updatedProfile;
      }
    } catch (storageError) {
      //console.error('Failed to update cached profile:', storageError);
    }
    throw error;
  }
};

/**
 * Reset business password
 * @param {Object} passwordData - {currentPassword, newPassword}
 * @returns {Promise<Object>} Response with status
 */
export const resetBusinessPassword = async (passwordData) => {
  const updatedPasswordData = {
    ...passwordData,
    accountType: 'business'
  };
  const response = await apiRequest('/auth/update-password', {
    method: 'PUT',
    body: JSON.stringify(updatedPasswordData),
    headers: { 'Content-Type': 'application/json' },
  });
  return response;
};

/**
 * Delete business account permanently
 * @param {Object} data - Object containing password and accountType
 * @returns {Promise<Object>} Response with deletion status
 */
export const deleteBusinessAccount = async (data) => {
  const response = await apiRequest('/business/profile', {
    method: 'DELETE',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
  return response;
};

/**
 * Create a new business expense
 * @param {Object} expenseData - Expense data
 * @returns {Promise<Object>} Created expense
 */
export const createBusinessExpense = async (expenseData) => {
  //console.log('Creating expense:', expenseData);
  try {
    const response = await apiRequest('/business/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
    //console.log('Expense creation response:', response);
    return response;
  } catch (error) {
    //console.error('Error creating business expense:', error);
    //console.error('Error details:', error.message);
    if (error.response) {
      //console.error('Server response:', error.response);
    }
    throw error; // Re-throw to let caller handle it
  }
};

/**
 * Get all business expenses
 * @param {Object} filters - Optional filters for expenses
 * @returns {Promise<Array>} List of expenses
 */
export const getBusinessExpenses = async (filters = {}) => {
  try {
    const queryString = Object.keys(filters).length 
      ? '?' + new URLSearchParams(filters).toString() 
      : '';
    
    const response = await apiRequest(`/business/expenses${queryString}`, {
      method: 'GET',
    });
    
    // Store expenses in AsyncStorage as backup
    if (response) {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(response));
      } catch (storageError) {
        //console.warn('Failed to cache business expenses:', storageError);
        // Continue execution even if caching fails
      }
    }
    
    return response;
  } catch (error) {
    //console.error('Failed to fetch business expenses:', error);
    
    // Fallback to cached data if available
    try {
      const cachedData = await AsyncStorage.getItem(STORAGE_KEYS.EXPENSES);
      console.log('Cached expenses data:', cachedData);
      return cachedData ? JSON.parse(cachedData) : [];
    } catch (storageError) {
      //console.error('Failed to retrieve cached business expenses:', storageError);
      return [];
    }
  }
};

/**
 * Get a business expense by ID
 * @param {string} id - Expense ID
 * @returns {Promise<Object>} Expense data
 */
export const getBusinessExpenseById = async (id) => {
  try {
    const response = await apiRequest(`/business/expenses/${id}`, {
      method: 'GET',
    });
    return response;
  } catch (error) {
    //console.error(`Failed to fetch business expense ${id}:`, error);
    
    // Try to find the expense in cached data
    try {
      const cachedData = await AsyncStorage.getItem(STORAGE_KEYS.EXPENSES);
      if (cachedData) {
        const expenses = JSON.parse(cachedData);
        return expenses.find(expense => expense._id === id || expense.id === id) || null;
      }
      return null;
    } catch (storageError) {
      //console.error('Failed to retrieve cached expense:', storageError);
      return null;
    }
  }
};

/**
 * Update a business expense
 * @param {string} expenseId - ID of the expense to update
 * @param {Object} expenseData - Updated expense data
 * @returns {Promise<Object>} Updated expense
 */
export const updateBusinessExpense = async (expenseId, expenseData) => {
  return apiRequest(`/business/expenses/${expenseId}`, {
    method: 'PUT',
    body: JSON.stringify(expenseData),
  });
};

/**
 * Delete a business expense
 * @param {string} expenseId - ID of the expense to delete
 * @returns {Promise<Object>} Response with deletion status
 */
export const deleteBusinessExpense = async (expenseId) => {
  return apiRequest(`/business/expenses/${expenseId}`, {
    method: 'DELETE',
  });
};

/**
 * Categorize a business expense
 * @param {string} expenseId - ID of the expense to categorize
 * @param {string} category - Category to assign to the expense
 * @returns {Promise<Object>} Updated expense
 */
export const categorizeExpense = async (expenseId, category) => {
  return apiRequest(`/business/expenses/${expenseId}/categorize`, {
    method: 'POST',
    body: JSON.stringify({ category }),
  });
};

/**
 * Create a new business bill
 * @param {Object} billData - Bill data
 * @returns {Promise<Object>} Created bill
 */
export const createBusinessBill = async (billData) => {
  return apiRequest('/business/bills', {
    method: 'POST',
    body: JSON.stringify(billData),
  });
};

/**
 * Get all business bills
 * @param {Object} filters - Optional filters for bills
 * @returns {Promise<Array>} List of bills
 */
export const getBusinessBills = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Add each filter to query params if it exists
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/business/bills?${queryString}` : '/business/bills';
    
    const response = await apiRequest(endpoint, {
      method: 'GET',
    });
    
    // Store bills in AsyncStorage as backup
    if (response) {
      await AsyncStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(response));
    }
    
    return response;
  } catch (error) {
    //console.error('Failed to fetch business bills:', error);
    
    // Fallback to cached data if available
    try {
      const cachedData = await AsyncStorage.getItem(STORAGE_KEYS.BILLS);
      return cachedData ? JSON.parse(cachedData) : [];
    } catch (storageError) {
      //console.error('Failed to retrieve cached bills:', storageError);
      return [];
    }
  }
};

/**
 * Get a business bill by ID
 * @param {string} id - Bill ID
 * @returns {Promise<Object>} Bill data
 */
export const getBusinessBillById = async (id) => {
  try {
    if (!id) {
      //console.warn('getBusinessBillById: Bill ID is undefined or null');
      return null;
    }

    const response = await apiRequest(`/business/bills/${id}`, {
      method: 'GET',
    });

    return response;
  } catch (error) {
    //console.error(`Failed to get business bill with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Update a business bill
 * @param {string} billId - ID of the bill to update
 * @param {Object} billData - Updated bill data
 * @returns {Promise<Object>} Updated bill
 */
export const updateBusinessBill = async (billId, billData) => {
  return apiRequest(`/business/bills/${billId}`, {
    method: 'PUT',
    body: JSON.stringify(billData),
  });
};

/**
 * Delete a business bill
 * @param {string} billId - ID of the bill to delete
 * @returns {Promise<Object>} Response with deletion status
 */
export const deleteBusinessBill = async (billId) => {
  return apiRequest(`/business/bills/${billId}`, {
      method: 'DELETE',
    });
};

/**
 * Add a payment to a business bill
 * @param {string} billId - ID of the bill
 * @param {Object} paymentData - Payment details
 * @returns {Promise<Object>} Updated bill with payment added
 */
export const addBusinessBillPayment = async (billId, paymentData) => {
  return apiRequest(`/business/bills/${billId}/payments`, {
    method: 'POST',
    body: JSON.stringify(paymentData),
  });
};

/**
 * Get payment history for a business bill
 * @param {string} billId - ID of the bill
 * @returns {Promise<Array>} List of payment transactions
 */
export const getBusinessBillPayments = async (billId) => {
  return apiRequest(`/business/bills/${billId}/payments`, {
    method: 'GET',
  });
};

/**
 * Update a business bill payment
 * @param {string} billId - ID of the bill
 * @param {string} paymentId - ID of the payment to update
 * @param {Object} paymentData - Updated payment data
 * @returns {Promise<Object>} Updated payment
 */
export const updateBusinessBillPayment = async (billId, paymentId, paymentData) => {
  return apiRequest(`/business/bills/${billId}/payments/${paymentId}`, {
    method: 'PUT',
    body: JSON.stringify(paymentData),
  });
};

/**
 * Delete a business bill payment
 * @param {string} billId - ID of the bill
 * @param {string} paymentId - ID of the payment to delete
 * @returns {Promise<Object>} Response with deletion status
 */
export const deleteBusinessBillPayment = async (billId, paymentId) => {
  return apiRequest(`/business/bills/${billId}/payments/${paymentId}`, {
    method: 'DELETE',
  });
};

/**
 * Get business bill statistics
 * @param {Object} filters - Optional filters for statistics
 * @returns {Promise<Object>} Bill statistics
 */
export const getBusinessBillStats = async (filters = {}) => {
  const queryString = Object.keys(filters).length 
    ? '?' + new URLSearchParams(filters).toString() 
    : '';
  
  return apiRequest(`/business/bills/stats${queryString}`, {
    method: 'GET',
  });
};

/**
 * Send a reminder for a business bill
 * @param {string} billId - ID of the bill to send reminder for
 * @param {Object} reminderData - Data for the reminder message
 * @returns {Promise<Object>} Response with reminder status
 */
export const sendBusinessBillReminder = async (billId, reminderData) => {
  return apiRequest(`/business/bills/${billId}/send-reminder`, {
    method: 'POST',
    body: JSON.stringify(reminderData),
  });
};

/**
 * Create a new business invoice
 * @param {Object} invoiceData - Invoice data
 * @returns {Promise<Object>} Created invoice
 */
export const createBusinessInvoice = async (invoiceData) => {
  try {
    return await apiRequest('/business/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  } catch (error) {
    // Check if this is a duplicate invoice error
    const errorText = [error.message, JSON.stringify(error.stack || '')].join(' ').toLowerCase();
    if (errorText.includes('duplicate') || errorText.includes('e11000') || 
        errorText.includes('already exists')) {
      // Format a more specific error for duplicate invoices
      const duplicateError = new Error('Invoice with this number already exists');
      duplicateError.isDuplicateInvoice = true;
      throw duplicateError;
    }
    // Re-throw the original error if not a duplicate issue
    throw error;
  }
};

/**
 * Get all business invoices
 * @param {Object} filters - Optional filters for invoices
 * @returns {Promise<Array>} List of invoices
 */
export const getBusinessInvoices = async (filters = {}) => {
  try {
    const queryString = Object.keys(filters).length 
      ? '?' + new URLSearchParams(filters).toString() 
      : '';
      
    const response = await apiRequest(`/business/invoices${queryString}`, {
      method: 'GET',
    });
    
    // Store invoices in AsyncStorage as backup
    if (response) {
      await AsyncStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(response));
    }
    
    return response;
  } catch (error) {
    //console.error('Failed to fetch business invoices:', error);
    
    // Fallback to cached data if available
    try {
      const cachedData = await AsyncStorage.getItem(STORAGE_KEYS.INVOICES);
      return cachedData ? JSON.parse(cachedData) : [];
    } catch (storageError) {
      //console.error('Failed to retrieve cached business invoices:', storageError);
      return [];
    }
  }
};

/**
 * Get a business invoice by ID
 * @param {string} id - Invoice ID
 * @returns {Promise<Object>} Invoice data
 */
export const getBusinessInvoiceById = async (id) => {
  try {
    const response = await apiRequest(`/business/invoices/${id}`, {
      method: 'GET',
    });
    //console.log('Fetched invoice:', response);
    return response;
  } catch (error) {
    //console.error(`Failed to fetch business invoice ${id}:`, error);
    
    // Try to find the invoice in cached data
    try {
      const cachedData = await AsyncStorage.getItem(STORAGE_KEYS.INVOICES);
      if (cachedData) {
        const invoices = JSON.parse(cachedData);
        return invoices.find(invoice => invoice._id === id || invoice.id === id) || null;
      }
      return null;
    } catch (storageError) {
      //console.error('Failed to retrieve cached invoice:', storageError);
      return null;
    }
  }
};

/**
 * Update a business invoice
 * @param {string} invoiceId - ID of the invoice to update
 * @param {Object} invoiceData - Updated invoice data
 * @returns {Promise<Object>} Updated invoice
 */
export const updateBusinessInvoice = async (invoiceId, invoiceData) => {
  try {
    // Make sure we're sending the content type header
    const response = await apiRequest(`/business/invoices/${invoiceId}`, {
      method: 'PUT',
      body: JSON.stringify(invoiceData),
      headers: { 'Content-Type': 'application/json' },
    });
    
    //console.log('Update invoice response:', response);
    
    // If we got an empty response but no error was thrown, assume success
    // and return the original data with the id to maintain compatibility
    if (!response || Object.keys(response).length === 0) {
      //console.log('Received empty response from server, returning original data');
      return { 
        ...invoiceData,
        id: invoiceId, // Ensure we use 'id' not '_id'
        _id: invoiceId // Keep _id for backward compatibility
      };
    }
    
    return response;
  } catch (error) {
    //console.error('Error updating invoice:', error);
    
    // Return a local object with the update to maintain UI consistency
    // This is a fallback for when the API is unavailable or returns errors
    //console.log('Returning optimistic update for UI consistency');
    return {
      ...invoiceData,
      id: invoiceId,
      _id: invoiceId,
      _optimisticUpdate: true // Flag that this was a local update
    };
  }
};

/**
 * Update just the status of a business invoice
 * @param {string} invoiceId - ID of the invoice to update
 * @param {string} status - New status value
 * @returns {Promise<Object>} Updated invoice with new status
 */
export const updateInvoiceStatus = async (invoiceId, status) => {
  try {
    // Use PATCH method for partial update of just the status field
    const response = await apiRequest(`/business/invoices/${invoiceId}/status`, {
      method: 'PATCH', // PATCH is ideal for partial updates
      body: JSON.stringify({ status }),
      headers: { 'Content-Type': 'application/json' },
    });
    
    //console.log('Update status response:', response);
    
    if (!response || Object.keys(response).length === 0) {
      //console.log('Received empty response from status update, returning minimal data');
      return { 
        id: invoiceId,
        _id: invoiceId,
        status,
      };
    }
    
    return response;
  } catch (error) {
    //console.error('Error updating invoice status:', error);
    
    // Always return a status object for UI consistency
    return {
      id: invoiceId,
      _id: invoiceId,
      status,
      _optimisticUpdate: true
    };
  }
};

/**
 * Delete a business invoice
 * @param {string} invoiceId - ID of the invoice to delete
 * @returns {Promise<Object>} Response with deletion status
 */
export const deleteBusinessInvoice = async (invoiceId) => {
  return apiRequest(`/business/invoices/${invoiceId}`, {
    method: 'DELETE',
  });
};

/**
 * Mark a business invoice as paid
 * @param {string} invoiceId - ID of the invoice to mark as paid
 * @param {Object} paymentDetails - Payment details
 * @returns {Promise<Object>} Updated invoice
 */
export const markInvoiceAsPaid = async (invoiceId, paymentDetails) => {
  return apiRequest(`/business/invoices/${invoiceId}/pay`, {
    method: 'POST',
    body: JSON.stringify(paymentDetails),
  });
};

/**
 * Get payment history for a business invoice
 * @param {string} invoiceId - ID of the invoice
 * @returns {Promise<Array>} List of payment transactions
 */
export const getInvoicePayments = async (invoiceId) => {
  return apiRequest(`/business/invoices/${invoiceId}/payments`, {
    method: 'GET',
  });
};

/**
 * Send an invoice to a client
 * @param {string} invoiceId - ID of the invoice to send
 * @param {Object} deliveryOptions - Options for sending the invoice
 * @returns {Promise<Object>} Response with sending status
 */
export const sendInvoice = async (invoiceId, deliveryOptions) => {
  return apiRequest(`/business/invoices/${invoiceId}/send`, {
    method: 'POST',
    body: JSON.stringify(deliveryOptions),
  });
};

/**
 * Generate an invoice PDF
 * @param {string} invoiceId - ID of the invoice
 * @returns {Promise<Object>} Response with PDF data or URL
 */
export const generateInvoicePDF = async (invoiceId) => {
  return apiRequest(`/business/invoices/${invoiceId}/pdf`, {
    method: 'GET',
  });
};

/**
 * Get invoice statistics
 * @param {Object} filters - Optional filters for statistics
 * @returns {Promise<Object>} Invoice statistics
 */
export const getInvoiceStats = async (filters = {}) => {
  const queryString = Object.keys(filters).length
    ? '?' + new URLSearchParams(filters).toString()
    : '';
  
  return apiRequest(`/business/invoices/stats${queryString}`, {
    method: 'GET',
  });
};

/**
 * Send an invoice reminder
 * @param {string} invoiceId - ID of the invoice
 * @param {Object} reminderData - Data for the reminder
 * @returns {Promise<Object>} Response with reminder status
 */
export const sendInvoiceReminder = async (invoiceId, reminderData) => {
  return apiRequest(`/business/invoices/${invoiceId}/reminders`, {
    method: 'POST',
    body: JSON.stringify(reminderData),
  });
};

/**
 * Parse PDF invoice and extract data with AI
 * @param {Object} fileData - File data including uri and name
 * @returns {Promise<Object>} Parsed invoice data
 */
export const parseInvoicePDF = async (fileData) => {
  //console.log('Uploading PDF for server-side parsing:', fileData.name);
  
  try {
    // Create form data for file upload - special handling for React Native
    const formData = new FormData();
    
    // Log the file data to help with debugging
    //console.log('File data being sent:', fileData.name, fileData.size);
    
    // For React Native, we need to ensure the URI is properly formatted
    const fileUri = Platform.OS === 'android' 
      ? fileData.uri 
      : fileData.uri.replace('file://', '');
      
    // Append the file to FormData
    formData.append('invoice', {
      uri: fileUri,
      name: fileData.name || 'invoice.pdf',
      type: fileData.type || 'application/pdf',
    });
    
    // Use the API route for PDF parsing
    const response = await apiRequest('/business/invoices/parse-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });
    
    //console.log('Server successfully parsed PDF and processed with AI');
    return response;
  } catch (error) {
    //console.error('Failed to parse PDF on server:', error);
    throw new Error(`PDF parsing failed: ${error.message || 'Unknown error'}`);
  }
};



/**
 * Get recent business activities
 * @returns {Promise<Object>} List of recent activities across all business areas
 */
export const getRecentActivity = async () => {
  try {
    const response = await apiRequest('/business/recent-activity', {
      method: 'GET',
    });
    return response;
  } catch (error) {
    //console.error('Failed to fetch recent activities:', error);
    return { status: 'error', results: 0, data: [] };
  }
};

/**
 * Get dashboard statistics for business overview
 * @returns {Promise<Object>} Dashboard statistics data
 */
export const getDashboardStatistics = async () => {
  try {
    //console.log('Fetching dashboard statistics from API...');

    const response = await apiRequest('/business/dashboard/analytics', {
      method: 'GET',
    });

    //console.log('API returned dashboard statistics:', response);

    return response;
  } catch (error) {
    //console.error('Error fetching dashboard statistics:', error);
    // Return mock data when API is unavailable - simplified to monthly only
    return {
      data: {
        monthlySales: 32580.00,
        totalExpenses: 15240.00,
        netProfit: 17340.00,
        paidInvoices: {
          count: 24,
          amount: 18450.00,
        },
        pendingInvoices: {
          count: 12,
          amount: 8750.00,
        },
        dailyReportCount: 30,
        thisMonth: {
          year: 2025,
          month: 4,
        },
      },
    };
  }
};

/**
 * Get analytics tab data for visualizations
 * @param {string} period - Time period for analytics (1m, 3m, 6m, 1y)
 * @returns {Promise<Object>} Analytics data for visualizations
 */
export const getAnalyticsTabData = async (period = '6m') => {
  try {
    //console.log('Fetching analytics data from API...');
    const response = await apiRequest('/business/analytics', {
      method: 'GET',
      params: { period },
    });
    //console.log('API returned analytics data:', response);
    return response;
  } catch (error) {
    //console.error('Error fetching analytics data:', error);
    // Return mock data when API is unavailable
    return {
      data: {
        cashFlowOverview: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          income: [4000, 5000, 4500, 6000, 5500, 7000],
          expenses: [2400, 2200, 2800, 3200, 3800, 4000],
        },
        expenseBreakdown: [
          { category: 'Services', percent: 42, amount: 7728 },
          { category: 'Rent', percent: 21, amount: 3864 },
          { category: 'Utilities', percent: 7, amount: 1288 },
          { category: 'Marketing', percent: 10, amount: 1840 },
          { category: 'Supplies', percent: 6, amount: 1104 },
          { category: 'Other', percent: 15, amount: 2576 },
        ],
        incomeBreakdown: [
          { source: 'Invoices', percent: 68, amount: 21760 },
          { source: 'Daily Income', percent: 26, amount: 8320 },
          { source: 'Other', percent: 6, amount: 1920 },
        ],
        weeklyNetSales: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          sales: [750, 820, 940, 880, 1050, 1200, 950],
          overShort: [20, -15, 30, -10, 25, 40, -5],
        },
        totalIncome: 32000,
        totalExpenses: 18400,
        netProfit: 13600,
      },
    };
  }
};

/**
 * Generate financial report
 * @param {string} reportType - Type of report to generate
 * @param {Object} parameters - Report parameters
 * @returns {Promise<Object>} Report data
 */
//export const generateFinancialReport = async (reportType, parameters = {}) => {
//  return apiRequest('/business/analytics', {
 //   method: 'POST',
  //  body: JSON.stringify({
  //    reportType,
   //   parameters,
  //  }),
 // });
//};

/**
 * Get daily financial summary 
 * @param {string} date - Date for daily summary (YYYY-MM-DD)
 * @returns {Promise<Object>} Daily summary data
 */
export const getDailyFinancialSummary = async (date) => {
  try {
    const formattedDate = date || new Date().toISOString().split('T')[0];
    const response = await apiRequest(`/business/reports/daily/${formattedDate}`, {
      method: 'GET',
    });
    
    // Store in AsyncStorage
    if (response) {
      const key = `${STORAGE_KEYS.DAILY_REPORTS}_${formattedDate}`;
      await AsyncStorage.setItem(key, JSON.stringify(response));
    }
    
    return response;
  } catch (error) {
    //console.error(`Failed to fetch daily summary for ${date}:`, error);
    
    // Fallback to cached data
    try {
      const key = `${STORAGE_KEYS.DAILY_REPORTS}_${date || new Date().toISOString().split('T')[0]}`;
      const cachedData = await AsyncStorage.getItem(key);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (storageError) {
      //console.error('Failed to retrieve cached daily summary:', storageError);
      return null;
    }
  }
};

/**
 * Create a new daily report
 * @param {Object} reportData - Report data including date, sales, expenses, notes
 * @returns {Promise<Object>} Created report
 */
export const createDailyReport = async (reportData) => {
  try {
    //console.log('Creating daily report:', reportData);
    const response = await apiRequest('/business-reports', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
    //console.log('Daily report creation response:', response);
    return response;
  } catch (error) {
    //console.error('Error creating daily report:', error);
    throw error; // Re-throw to let caller handle it
  }
};

/**
 * Get all daily reports
 * @param {Object} filters - Optional filters for reports (page, limit, startDate, endDate, status)
 * @returns {Promise<Array>} List of daily reports
 */
export const getAllDailyReports = async (filters = {}) => {
  try {
    const queryString = Object.keys(filters).length
      ? '?' + new URLSearchParams(filters).toString()
      : '';
    
    const response = await apiRequest(`/business-reports${queryString}`, {
      method: 'GET',
    });
    
    // Store reports in AsyncStorage as backup
    if (response) {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.DAILY_REPORTS, JSON.stringify(response));
      } catch (storageError) {
        //console.warn('Failed to cache daily reports:', storageError);
        // Continue execution even if caching fails
      }
    }
    
    return response;
  } catch (error) {
    //console.error('Failed to fetch daily reports:', error);
    
    // Fallback to cached data if available
    try {
      const cachedData = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_REPORTS);
      return cachedData ? JSON.parse(cachedData) : { data: [], totalPages: 1, currentPage: 1, total: 0 };
    } catch (storageError) {
      //console.error('Failed to retrieve cached daily reports:', storageError);
      return { data: [], totalPages: 1, currentPage: 1, total: 0 };
    }
  }
};

/**
 * Get a daily report by ID
 * @param {string} id - Report ID
 * @returns {Promise<Object>} Report data
 */
export const getDailyReportById = async (id) => {
  try {
    const response = await apiRequest(`/business-reports/${id}`, {
      method: 'GET',
    });
    return response;
  } catch (error) {
    //console.error(`Failed to fetch daily report ${id}:`, error);
    
    // Try to find the report in cached data
    try {
      const cachedData = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_REPORTS);
      if (cachedData) {
        const reportsData = JSON.parse(cachedData);
        const reports = reportsData.data || [];
        return reports.find(report => report._id === id || report.id === id) || null;
      }
      return null;
    } catch (storageError) {
      //console.error('Failed to retrieve cached report:', storageError);
      return null;
    }
  }
};

/**
 * Update a daily report
 * @param {string} reportId - ID of the report to update
 * @param {Object} reportData - Updated report data
 * @returns {Promise<Object>} Updated report
 */
export const updateDailyReport = async (reportId, reportData) => {
  return apiRequest(`/business-reports/${reportId}`, {
    method: 'PUT',
    body: JSON.stringify(reportData),
  });
};

/**
 * Delete a daily report
 * @param {string} reportId - ID of the report to delete
 * @returns {Promise<Object>} Response with deletion status
 */
export const deleteDailyReport = async (reportId) => {
  return apiRequest(`/business-reports/${reportId}`, {
    method: 'DELETE',
  });
};

/**
 * Create a new miscellaneous transaction
 * @param {Object} transactionData - Transaction data including date, title, amount, type (income/expense)
 * @returns {Promise<Object>} Created transaction
 */
export const createMiscellaneousTransaction = async (transactionData) => {
  try {
    //console.log('Creating miscellaneous transaction:', transactionData);
    const response = await apiRequest('/business/misc-transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
    //console.log('Miscellaneous transaction creation response:', response);
    return response;
  } catch (error) {
    //console.error('Error creating miscellaneous transaction:', error);
    throw error; // Re-throw to let caller handle it
  }
};

/**
 * Get all miscellaneous transactions
 * @param {Object} filters - Optional filters for transactions (type, startDate, endDate, category)
 * @returns {Promise<Array>} List of transactions
 */
export const getMiscellaneousTransactions = async (filters = {}) => {
  try {
    const queryString = Object.keys(filters).length
      ? '?' + new URLSearchParams(filters).toString()
      : '';

    const response = await apiRequest(`/business/misc-transactions${queryString}`, {
      method: 'GET',
    });

    return response;
  } catch (error) {
    //console.error('Failed to fetch miscellaneous transactions:', error);
    // Return empty array structure if fetch fails
    return { data: [], totalPages: 1, currentPage: 1, total: 0 };
  }
};

/**
 * Delete a miscellaneous transaction
 * @param {string} transactionId - ID of the transaction to delete
 * @returns {Promise<Object>} Response with deletion status
 */
export const deleteMiscellaneousTransaction = async (transactionId) => {
  return apiRequest(`/business/misc-transactions/${transactionId}`, {
    method: 'DELETE',
  });
};
