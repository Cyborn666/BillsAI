/**
 * Bill Service for BillsAI
 * Handles all API calls related to bills
 */

import { apiRequest } from '../utils/apiUtils';


// Simple pub/sub for data updates
const listeners = [];

/**
 * Subscribe to data updates
 * @param {Function} callback - Function to call when data is updated
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToDataUpdates = (callback) => {
  if (typeof callback !== 'function') {
    ////console.error('Callback must be a function');
    return () => {};
  }

  listeners.push(callback);

  // Return unsubscribe function
  return () => {
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
};

/**
 * Notify all subscribers that data has changed
 */
export const notifyDataChanged = () => {
  listeners.forEach(callback => {
    try {
      callback();
    } catch (error) {
      ////console.error('Error in data update listener:', error);
    }
  });
};

/**
 * Get all bills with optional filters
 * @param {Object} filters - Optional filters for bills
 * @returns {Promise<Object>} - Bills data with pagination
 */
export const getBills = async (filters = {}) => {
  try {
    // Build query string from filters
    const queryParams = new URLSearchParams();

    // Add each filter to query params if it exists
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    // Add pagination parameters

    queryParams.append('limit', 100);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/bills?${queryString}` : '/bills';

    const response = await apiRequest(endpoint, {
      method: 'GET',
    });

    return response;
  } catch (error) {
    ////console.error('Failed to get bills:', error);
    throw error;
  }
};

/**
 * Get a bill by ID
 * @param {string} id - Bill ID
 * @returns {Promise<Object>} - Bill data
 */
export const getBillById = async (id) => {
  try {
    if (!id) {
      ////console.warn('getBillById: Bill ID is undefined or null');
      return null;
    }

    const response = await apiRequest(`/bills/${id}`, {
      method: 'GET',
    });

    return response.bill;
  } catch (error) {
    ////console.error(`Failed to get bill with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Calculate the share amount for each user when a bill is shared
 * @param {Object} billData - Bill data with sharing information
 * @returns {Object} - Bill data with calculated share amounts
 * @private
 */
const calculateSharedBillAmounts = (billData) => {
  // If bill is not shared, return the original bill data
  if (!billData.isShared || !billData.sharedWith || billData.sharedWith.length === 0) {
    return billData;
  }

  // Create a copy of the bill data
  const processedBill = { ...billData };
  const totalAmount = parseFloat(processedBill.amount);

  // Calculate number of users sharing the bill (current user + shared users)
  const totalUsers = 1 + processedBill.sharedWith.length;

  if (processedBill.splitType === 'EQUAL') {
    // For equal split, divide the amount evenly
    const shareAmount = totalAmount / totalUsers;

    // Create or update splitDetails object
    processedBill.splitDetails = processedBill.splitDetails || {};

    // Set share amount for current user
    if (processedBill.user) {
      processedBill.splitDetails[processedBill.user] = shareAmount;
    }

    // Set share amount for each shared user
    processedBill.sharedWith.forEach(userId => {
      processedBill.splitDetails[userId] = shareAmount;
    });
  } else if (processedBill.splitType === 'CUSTOM' && processedBill.splitDetails) {
    // For custom split, splitDetails should already contain the custom amounts
    // No additional processing needed
  }

  return processedBill;
};

/**
 * Create a new bill
 * @param {Object} billData - Bill data to create
 * @returns {Promise<Object>} - Created bill data
 */
export const createBill = async (billData) => {
  try {
    if (!billData) {
      throw new Error('Bill data is required');
    }

    // Calculate share amounts for shared bills
    const processedBillData = calculateSharedBillAmounts(billData);

    const response = await apiRequest('/bills', {
      method: 'POST',
      body: JSON.stringify(processedBillData),
    });

    // Notify listeners about the data change
    notifyDataChanged();
    return response;
  } catch (error) {
    ////console.error('Failed to create bill:', error);
    throw error;
  }
};

/**
 * Update an existing bill
 * @param {string} id - Bill ID to update
 * @param {Object} billData - Updated bill data
 * @returns {Promise<Object>} - Updated bill data
 */
export const updateBill = async (id, billData) => {
  try {
    if (!id) {
      ////console.warn('updateBill: Bill ID is undefined or null');
      return { success: false, error: 'Bill ID is required' };
    }

    if (!billData) {
      throw new Error('Bill data is required');
    }

    // Calculate share amounts for shared bills
    const processedBillData = calculateSharedBillAmounts(billData);

    const response = await apiRequest(`/bills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(processedBillData),
    });

    // Notify listeners about the data change
    notifyDataChanged();
    return response;
  } catch (error) {
    ////console.error(`Failed to update bill with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Delete a bill
 * @param {string} id - Bill ID to delete
 * @returns {Promise<Object>} - Delete confirmation
 */
export const deleteBill = async (id) => {
  ////console.log('DELETE BILL ATTEMPT:', id);
  if (!id) {
    ////console.warn('deleteBill: Bill ID is undefined or null');
    return { success: false, error: 'Bill ID is required' };
  }

  try {
    // Call the backend API to delete the bill
    const response = await apiRequest(`/bills/${id}`, {
      method: 'DELETE',
    });

    // Force UI refresh
    notifyDataChanged();
    return response;
  } catch (error) {
    ////console.error('DELETE ERROR:', error);
    // If we get a 404, consider it a success (bill already deleted)
    if (error.statusCode === 404) {
      notifyDataChanged();
      return { success: true, message: 'Bill already deleted' };
    }

    if (error.statusCode === 400) {
      return { success: false, message: error.message };
    }

    // No matter what error we get, still notify data changed to refresh UI
    notifyDataChanged();
    return { success: true };
  }
};

/**
 * Add a payment to a bill
 * @param {string} billId - Bill ID
 * @param {Object} paymentData - Payment data
 * @returns {Promise<Object>} - Updated bill with new payment
 */
export const addPayment = async (billId, paymentData) => {
  try {
    if (!billId) {
      throw new Error('Bill ID is required');
    }

    if (!paymentData) {
      throw new Error('Payment data is required');
    }

    const response = await apiRequest(`/bills/${billId}/payments`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });

    // Notify listeners about the data change
    notifyDataChanged();
    return response;
  } catch (error) {
    ////console.error(`Failed to add payment to bill with ID ${billId}:`, error);
    throw error;
  }
};

/**
 * Get bill statistics
 * @returns {Promise<Object>} - Bill statistics data
 */
export const getBillStatistics = async () => {
  try {
    const response = await apiRequest('/bills/statistics', {
      method: 'GET',
    });

    return response.statistics;
  } catch (error) {
    ////console.error('Failed to get bill statistics:', error);
    throw error;
  }
};

/**
 * Get bill analytics data - generates analytics from local bills data
 * @returns {Promise<Object>} - Comprehensive analytics data for bills
 */
export const getBillAnalytics = async () => {
  try {
    // Generate analytics directly from bills data without attempting API call
    return await generateAnalyticsFromBills();
  } catch (error) {
    // Return empty data in case of error
    return { categoryDistribution: [], monthlyTrends: [], upcomingBills: [] };
  }
};

/**
 * Process recurring bills to update their status based on due dates
 * @returns {Promise<Array>} - List of updated bills
 */
export const processRecurringBills = async () => {
  try {
    const { bills } = await getBills();
    const today = new Date();
    let updatedBills = [];

    for (const bill of bills) {
      if (bill.isRecurring) {
        const dueDate = new Date(bill.dueDate);
        // Process based on recurrence period
        // Using recurringPeriod (from the Bill interface) instead of recurrenceFrequency
        const recurringPeriod = bill.recurringPeriod || bill.recurrenceFrequency;
        if (!recurringPeriod) {
          // Skip bills without a valid recurring period
          continue;
        }
        switch (recurringPeriod) {
          case 'MONTHLY':
            await handleMonthlyRecurringBill(bill, today, updatedBills);
            break;
          case 'WEEKLY':
            await handleWeeklyRecurringBill(bill, today, updatedBills);
            break;
          case 'YEARLY':
            await handleYearlyRecurringBill(bill, today, updatedBills);
            break;
          default:
            // Skip bills with unknown recurrence periods
        }
      }
    }
    return updatedBills;
  } catch (error) {
    // Return empty array in case of error
    return [];
  }
};

/**
 * Handle a monthly recurring bill
 * @param {Object} bill - Bill object
 * @param {Date} today - Today's date
 * @param {Array} updatedBills - Array to collect updated bills
 */
async function handleMonthlyRecurringBill(bill, today, updatedBills) {
  try {
    const dueDate = new Date(bill.dueDate);

    // If bill was paid in previous cycle
    if (bill.status === 'PAID') {
      const lastPaidDate = bill.lastPaidDate ? new Date(bill.lastPaidDate) : new Date(bill.dueDate);

      // Calculate next due date (same day next month)
      const nextDueDate = new Date(dueDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);

      // If today is >= next due date, we need to create a new bill cycle
      if (today >= nextDueDate || isWithinReminderWindow(bill, nextDueDate, today)) {
        // Update bill for next cycle
        const updatedBill = {
          ...bill,
          dueDate: nextDueDate.toISOString().split('T')[0],
          status: 'UPCOMING',
          isPaid: false,
          lastPaidDate: bill.lastPaidDate || bill.dueDate,
          notificationIds: [],// Reset notification IDs
        };

        // Update bill in database
        await updateBill(bill.id, updatedBill);
        updatedBills.push(updatedBill);
      }
    } else if (bill.status !== 'PAID' && dueDate < today) {
      // Bill is overdue - update its status if needed
      if (bill.status !== 'OVERDUE') {
        const updatedBill = {
          ...bill,
          status: 'OVERDUE',
        };

        await updateBill(bill.id, updatedBill);
        updatedBills.push(updatedBill);
      }
    }
  } catch (error) {
    ////console.error('Error handling monthly recurring bill:', error);
  }
}

/**
 * Handle a weekly recurring bill
 * @param {Object} bill - Bill object
 * @param {Date} today - Today's date
 * @param {Array} updatedBills - Array to collect updated bills
 */
async function handleWeeklyRecurringBill(bill, today, updatedBills) {
  try {
    const dueDate = new Date(bill.dueDate);

    // If bill was paid in previous cycle
    if (bill.status === 'PAID') {
      const lastPaidDate = bill.lastPaidDate ? new Date(bill.lastPaidDate) : new Date(bill.dueDate);

      // Calculate next due date (same day next week)
      const nextDueDate = new Date(dueDate);
      nextDueDate.setDate(nextDueDate.getDate() + 7);

      // If today is >= next due date, we need to create a new bill cycle
      if (today >= nextDueDate || isWithinReminderWindow(bill, nextDueDate, today)) {
        // Update bill for next cycle
        const updatedBill = {
          ...bill,
          dueDate: nextDueDate.toISOString().split('T')[0],
          status: 'UPCOMING',
          isPaid: false,
          lastPaidDate: bill.lastPaidDate || bill.dueDate,
          notificationIds: [],// Reset notification IDs
        };

        // Update bill in database
        await updateBill(bill.id, updatedBill);
        updatedBills.push(updatedBill);
      }
    } else if (bill.status !== 'PAID' && dueDate < today) {
      // Bill is overdue - update its status if needed
      if (bill.status !== 'OVERDUE') {
        const updatedBill = {
          ...bill,
          status: 'OVERDUE',
        };
        await updateBill(bill.id, updatedBill);
        updatedBills.push(updatedBill);
      }
    }
  } catch (error) {
    ////console.error('Error handling weekly recurring bill:', error);
  }
}

/**
 * Handle a yearly recurring bill
 * @param {Object} bill - Bill object
 * @param {Date} today - Today's date
 * @param {Array} updatedBills - Array to collect updated bills
 */
async function handleYearlyRecurringBill(bill, today, updatedBills) {
  try {
    const dueDate = new Date(bill.dueDate);

    // If bill was paid in previous cycle
    if (bill.status === 'PAID') {
      const lastPaidDate = bill.lastPaidDate ? new Date(bill.lastPaidDate) : new Date(bill.dueDate);

      // Calculate next due date (same date next year)
      const nextDueDate = new Date(dueDate);
      nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);

      // If today is >= next due date, we need to create a new bill cycle
      if (today >= nextDueDate || isWithinReminderWindow(bill, nextDueDate, today)) {
        // Update bill for next cycle
        const updatedBill = {
          ...bill,
          dueDate: nextDueDate.toISOString().split('T')[0],
          status: 'UPCOMING',
          isPaid: false,
          lastPaidDate: bill.lastPaidDate || bill.dueDate,
          notificationIds: [],// Reset notification IDs
        };

        // Update bill in database
        await updateBill(bill.id, updatedBill);
        updatedBills.push(updatedBill);
      }
    } else if (bill.status !== 'PAID' && dueDate < today) {
      // Bill is overdue - update its status if needed
      if (bill.status !== 'OVERDUE') {
        const updatedBill = {
          ...bill,
          status: 'OVERDUE',
        };

        await updateBill(bill.id, updatedBill);
        updatedBills.push(updatedBill);
      }
    }
  } catch (error) {
    ////console.error('Error handling yearly recurring bill:', error);
  }
}

/**
 * Check if today is within the reminder window for a bill
 * @param {Object} bill - Bill object
 * @param {Date} dueDate - Due date for the bill
 * @param {Date} today - Today's date
 * @returns {boolean} - True if within reminder window
 */
function isWithinReminderWindow(bill, dueDate, today) {
  // Default to 3 days if reminderDays not specified
  const reminderDays = bill.reminderDays || 3;
  const reminderStartDate = new Date(dueDate);
  reminderStartDate.setDate(dueDate.getDate() - reminderDays);

  // If today is >= reminder start date but < due date
  return today >= reminderStartDate && today < dueDate;
}

/**
 * Get recent activities for bills (payments, updates, etc.)
 * @param {number} limit - Maximum number of activities to return
 * @returns {Promise<Object>} - Recent activities data
 */
export const getRecentActivities = async (limit = 5) => {
  try {
    // Try to get from API if endpoint exists
    const response = await apiRequest(`/bills/activities?limit=${limit}`, {
      method: 'GET',
    });

    return response;
  } catch (error) {
    ////console.error('Failed to get recent activities:', error);
    // API endpoint might not exist, fall back to generating from bills
    try {
      // Generate activities from bills
      return await generateActivitiesFromBills(limit);
    } catch (fallbackError) {
      ////console.error('Failed to generate activities fallback:', fallbackError);
      throw error; // Throw the original error
    }
  }
};

/**
 * Get payments for a specific bill
 * @param {string} billId - Bill ID
 * @returns {Promise<Object>} - Payments data for the bill
 */
export const getBillPayments = async (billId) => {
  try {
    if (!billId) {
      throw new Error('Bill ID is required');
    }

    const response = await apiRequest(`/bills/${billId}/payments`, {
      method: 'GET',
    });

    return response;
  } catch (error) {
    ////console.error(`Failed to get payments for bill ${billId}:`, error);
    throw error;
  }
};

/**
 * Helper function to generate activities from bills if API endpoint doesn't exist
 * @param {number} limit - Maximum number of activities to return
 * @returns {Promise<Object>} - Generated activities data
 * @private
 */
async function generateActivitiesFromBills(limit = 5) {
  // Get bills
  const billsResponse = await getBills();
  const bills = billsResponse.bills || [];

  if (bills.length === 0) {
    return { activities: [] };
  }

  // Create activities based on bills
  const today = new Date();
  const activities = [];

  // Create payment activities
  bills.forEach(bill => {
    // Check for paid bills - look for multiple indicators
    const isPaid = bill.paid === true ||
                  (bill.status && bill.status.toUpperCase() === 'PAID') ||
                  (bill.paymentStatus && bill.paymentStatus.toUpperCase() === 'PAID');

    if (isPaid) {
      // Create a payment activity for any paid bill
      let paymentDate;
      if (bill.lastPaymentDate) {
        // Use lastPaymentDate if available
        paymentDate = new Date(bill.lastPaymentDate);
      } else {
        // Default to today if no payment date is recorded
        paymentDate = new Date();
      }

      activities.push({
        id: `payment-${bill.id}`,
        type: 'payment',
        description: `Payment made for ${bill.title}`,
        date: paymentDate.toISOString(),
        amount: bill.amount,
        billId: bill.id,
      });
    }

    // Add due date reminders for upcoming bills that are not paid
    if (!isPaid && bill.dueDate && new Date(bill.dueDate) > today) {
      activities.push({
        id: `reminder-${bill.id}`,
        type: 'reminder',
        description: `Upcoming payment for ${bill.title}`,
        date: new Date(bill.dueDate).toISOString(),
        amount: bill.amount,
        billId: bill.id,
      });
    }

    // Add overdue notifications for bills that are not paid
    if (!isPaid && bill.status && bill.status.toUpperCase() === 'OVERDUE') {
      activities.push({
        id: `overdue-${bill.id}`,
        type: 'update',
        description: `${bill.title} payment is overdue`,
        date: today.toISOString(),
        amount: bill.amount,
        billId: bill.id,
      });
    }
  });

  // Sort by date (most recent first) and limit
  activities.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    activities: activities.slice(0, limit),
    totalCount: activities.length,
  };
}

/**
 * Helper function to generate analytics data from bills if API endpoint doesn't exist
 * @returns {Promise<Object>} - Generated analytics data
 * @private
 */
async function generateAnalyticsFromBills(userId) {
  try {
    // Get all bills
    const billsResponse = await getBills();
    const bills = Array.isArray(billsResponse.bills) ? billsResponse.bills : [];

  if (bills.length === 0) {
    return {
      categoryDistribution: [],
      monthlyTrends: [],
      summaryStats: [],
    };
  }

  // Calculate category distribution
  const categoryMap = {};
  let totalAmount = 0;

  bills.forEach(bill => {
    if (!bill) { return; } // Skip any null/undefined bills
    const category = bill.category || 'Other';

    // Ensure amount is a valid positive number
    let amount = 0;
    try {
      const parsedAmount = parseFloat(bill.amount);
      // Make sure it's a valid number and not negative
      if (!isNaN(parsedAmount) && isFinite(parsedAmount) && parsedAmount >= 0) {
        amount = parsedAmount;
      } else {
        ////console.warn(`Invalid amount value for bill ${bill.title || 'Unknown'}: ${bill.amount}`);
      }
    } catch (err) {
      ////console.warn(`Error parsing amount for bill ${bill.title || 'Unknown'}: ${err.message}`);
    }

    if (!categoryMap[category]) {
      categoryMap[category] = 0;
    }
    if (bill.isShared && userId && bill.splitDetails && bill.splitDetails[userId] ) {
      amount = bill.splitDetails[userId];
    }
    categoryMap[category] += amount;
    totalAmount += amount;
  });
  const categoryDistribution = Object.keys(categoryMap).map(category => {
    // Safely calculate percentage, avoiding division by zero
    let percentage = 0;
    if (totalAmount > 0 && isFinite(categoryMap[category]) && categoryMap[category] >= 0) {
      percentage = Math.round((categoryMap[category] / totalAmount) * 100);
      // Validate the result is a valid number
      if (isNaN(percentage) || !isFinite(percentage)) {
        ////console.warn(`Invalid percentage calculation for ${category}: ${percentage}`);
        percentage = 0;
      }
    }

    return {
      category,
      amount: categoryMap[category],
      percentage,
    };
  });

  // Sort by amount descending
  categoryDistribution.sort((a, b) => b.amount - a.amount);

  // Generate monthly trends (last 6 months)
  const today = new Date();
  const monthlyTrends = [];

  for (let i = 5; i >= 0; i--) {
    const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthName = month.toLocaleString('default', { month: 'short' });

    // Calculate total amount for this month
    let monthlyTotal = 0;
    bills.forEach(bill => {
      if (!bill) { return; } // Skip any null/undefined bills
      if (bill.dueDate) {
        try {
          const dueDate = new Date(bill.dueDate);
          if (!isNaN(dueDate.getTime()) && // Check if date is valid
              dueDate.getMonth() === month.getMonth() &&
              dueDate.getFullYear() === month.getFullYear()) {

            // Safely parse and add the amount
            try {
              const parsedAmount = bill.isShared ? parseFloat(bill.splitDetails[userId]) : parseFloat(bill.amount);
              if (!isNaN(parsedAmount) && isFinite(parsedAmount) && parsedAmount >= 0) {
                monthlyTotal += parsedAmount;
              } else {
                ////console.warn(`Skipping invalid amount for bill ${bill.title || 'Unknown'} in monthly trends: ${bill.amount}`);
              }
            } catch (amountErr) {
              ////console.warn(`Error parsing amount for bill ${bill.title || 'Unknown'} in monthly trends: ${amountErr.message}`);
            }
          }
        } catch (err) {
          ////console.warn('Invalid date format in bill:', bill.title || 'Unknown bill');
        }
      }
    });

    // Ensure we have a valid amount
    if (isNaN(monthlyTotal) || !isFinite(monthlyTotal) || monthlyTotal < 0) {
      ////console.warn(`Correcting invalid monthly total for ${monthName}: ${monthlyTotal}`);
      monthlyTotal = 0;
    }

    monthlyTrends.push({
      month: monthName,
      amount: monthlyTotal,
    });
  }

  // Calculate summary statistics
  const paidBills = bills.filter(bill => bill && (
                                        bill.paid === true ||
                                        (bill.status && bill.status.toUpperCase() === 'PAID')
                                      ));
  // Unused variable commented out to fix linting
  // const unpaidBills = bills.filter(bill => !paidBills.includes(bill));

  // Safely calculate average bill amount
  let averageBillAmount = 0;
  if (bills.length > 0 && totalAmount >= 0 && isFinite(totalAmount)) {
    averageBillAmount = totalAmount / bills.length;
    // Validate the result
    if (isNaN(averageBillAmount) || !isFinite(averageBillAmount) || averageBillAmount < 0) {
      ////console.warn(`Invalid average calculation: ${averageBillAmount}. Using 0 instead.`);
      averageBillAmount = 0;
    }
  }
  const summaryStats = [
    { label: 'Total Bills', value: bills.length.toString() },
    { label: 'Paid Bills', value: paidBills.length.toString() },
    { label: 'Average Amount', value: `$${averageBillAmount.toFixed(2)}` },
    { label: 'Highest Category', value: categoryDistribution[0]?.category || 'N/A' },
  ];

  // Validate all data before returning
  // Check category distribution has valid data
  const validCategoryDistribution = categoryDistribution.filter(item => {
    return item && typeof item.amount === 'number' && isFinite(item.amount) && item.amount >= 0 &&
           typeof item.percentage === 'number' && isFinite(item.percentage) && item.percentage >= 0;
  });

  // Check monthly trends has valid data
  const validMonthlyTrends = monthlyTrends.filter(item => {
    return item && typeof item.amount === 'number' && isFinite(item.amount) && item.amount >= 0;
  });

  // Format trends data for MonthlyOverview flip component
  const trends = validMonthlyTrends.map(item => ({
    month: item.month,
    spending: item.amount,
  }));

  // Replace with validated data
  return {
    categoryDistribution: validCategoryDistribution,
    monthlyTrends: validMonthlyTrends,
    trends,
    summaryStats,
  };
  } catch (error) {
    ////console.error('Error generating analytics from bills:', error);
    // Return empty data on error
    return {
      categoryDistribution: [],
      monthlyTrends: [],
      summaryStats: [],
      trends: [],
    };
  }
}

/**
 * Update a bill's payment status and add to lastPaidDates array
 * @param {string} billId - Bill ID to update
 * @param {string} status - New status (usually 'PAID')
 * @param {Object} paymentDetails - Optional additional payment details
 * @returns {Promise<Object>} - Updated bill with payment status
 */
export const updateBillPaymentStatus = async (billId, status = 'PAID', paymentDetails = {}) => {
  try {
    if (!billId) {
      throw new Error('Bill ID is required');
    }

    // Get the current bill
    const bill = await getBillById(billId);

    if (!bill) {
      throw new Error(`Bill with ID ${billId} not found`);
    }

    const currentDate = new Date().toISOString();

    // Create lastPaidDates array if it doesn't exist
    const lastPaidDates = Array.isArray(bill.lastPaidDates) ? [...bill.lastPaidDates] : [];

    // Add the current date to the lastPaidDates array
    lastPaidDates.push(currentDate);

    // Update the status and lastPaidDates
    const updatedBill = {
      ...bill,
      status,
      lastPaidDates,
    };

    // If payment details are provided, add a payment record
    if (Object.keys(paymentDetails).length > 0) {
      // Add payment to the bill's payment history if not handled by addPayment separately
      const payment = {
        ...paymentDetails,
        date: currentDate,
      };

      // Add to payments if the array exists
      if (Array.isArray(updatedBill.payments)) {
        updatedBill.payments.push(payment);
      } else {
        updatedBill.payments = [payment];
      }
    }

    // Save the updated bill
    const response = await updateBill(billId, updatedBill);

    // Notify listeners about the data change
    notifyDataChanged();

    return response;
  } catch (error) {
    ////console.error(`Failed to update bill payment status for bill ${billId}:`, error);
    throw error;
  }
};

/**
 * Get payment history for a bill from lastPaidDates array
 * @param {string} billId - Bill ID to get history for
 * @returns {Promise<Array>} - Array of payment dates with additional context
 */
export const getBillPaymentHistory = async (billId) => {
  try {
    if (!billId) {
      throw new Error('Bill ID is required');
    }

    // Get the bill details
    const bill = await getBillById(billId);

    if (!bill) {
      throw new Error(`Bill with ID ${billId} not found`);
    }

    // If lastPaidDates exists and is an array, return it with formatted context
    if (Array.isArray(bill.lastPaidDates) && bill.lastPaidDates.length > 0) {
      // Sort by date (newest first)
      const sortedDates = [...bill.lastPaidDates].sort((a, b) => new Date(b) - new Date(a));

      // Format each date with additional context
      return sortedDates.map((date, index) => {
        const paymentDate = new Date(date);
        const formattedDate = paymentDate.toLocaleDateString();
        const formattedTime = paymentDate.toLocaleTimeString();

        // Try to find matching payment with more details
        let paymentDetails = {};
        if (Array.isArray(bill.payments)) {
          const matchingPayment = bill.payments.find(p => {
            const pDate = new Date(p.date);
            // Compare dates with some flexibility (same day)
            return pDate.toDateString() === paymentDate.toDateString();
          });

          if (matchingPayment) {
            paymentDetails = {
              amount: matchingPayment.amount,
              method: matchingPayment.method,
              notes: matchingPayment.notes,
            };
          }
        }

        return {
          id: `payment-${billId}-${index}`,
          date: formattedDate,
          time: formattedTime,
          rawDate: date,
          ...paymentDetails,
          description: `Bill paid on ${formattedDate}`,
        };
      });
    }

    // Return empty array if no payment history
    return [];
  } catch (error) {
    ////console.error(`Failed to get payment history for bill ${billId}:`, error);
    return [];
  }
};

/**
 * Mark a bill as paid (shared version)
 * @param {string} billId - ID of the bill to mark as paid
 * @returns {Promise<Object>} - Updated bill data
 */
export const markBillAsPaid = async (billId) => {
  try {
    if (!billId) {
      throw new Error('Bill ID is required');
    }

    // Use apiRequest to maintain consistency with other functions
    // and benefit from the error handling it provides
    const response = await apiRequest(`/bills/${billId}/mark-paid`, {
      method: 'POST',
    });

    // Notify listeners about the data change
    notifyDataChanged();

    // Return the bill from the response or the full response if bill property doesn't exist
    return response.bill || response;
  } catch (error) {
    ////console.error(`Failed to mark bill ${billId} as paid:`, error);
    throw error;
  }
};



// Get upcoming bills - filters bills that are not paid and due in the future
export const getUpcomingBills = async (userId) => {
  const { bills } = await getBills();
  return bills.filter(bill => {
    const status = bill.status || bill.paymentStatus || '';
    const isPaid = bill.paid === true || status.toUpperCase() === 'PAID';
    const isPaidByUser = bill.isShared && userId && Array.isArray(bill.markedAsPaidBy) && bill.markedAsPaidBy.includes(userId);
    const notUpcoming = isPaid || isPaidByUser;

    // Only include as upcoming if not paid and due in the future
    return !notUpcoming && (
      status.toUpperCase().includes('UPCOMING') ||
      status.toUpperCase() === 'FUTURE' ||
      (bill.dueDate && new Date(bill.dueDate) > new Date())
    );
  });
};

// Get overdue bills - filters bills that are past due and not paid
export const getOverdueBills = async (userId) => {
  const { bills } = await getBills();
  return bills.filter(bill => {
    const status = bill.status || bill.paymentStatus || '';
    const isPaid = bill.paid === true || status.toUpperCase() === 'PAID';
    const isPaidByUser = bill.isShared && userId && Array.isArray(bill.markedAsPaidBy) && bill.markedAsPaidBy.includes(userId);
    const notOverdue = isPaid || isPaidByUser;

    return !notOverdue && (
      status.toUpperCase().includes('OVERDUE') ||
      status.toUpperCase() === 'LATE' ||
      (bill.dueDate && new Date(bill.dueDate) < new Date())
    );
  });
};
