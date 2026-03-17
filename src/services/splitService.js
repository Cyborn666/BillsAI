/**
 * Split Service - Handles API calls for expense splitting functionality
 */
import { apiRequest } from '../utils/apiUtils';

// API service for split expense functionality

// Local error handler function
const handleApiError = (error) => {
  console.error('API Error:', error);
  // Return null to handle errors gracefully
  return null;
};

// Split User Profile
export const createSplitProfile = async () => {
  try {
    const response = await apiRequest('/split/users/profile', {
      method: 'POST',
      body: JSON.stringify({})
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getSplitProfile = async () => {
  try {
    const response = await apiRequest('/split/users/profile');
    return response.data;
  } catch (error) {
    // If profile doesn't exist yet, return null instead of throwing an error
    if (error.status === 404) {
      return null;
    }
    return handleApiError(error);
  }
};

export const updateSplitProfile = async (profileData) => {
  try {
    const response = await apiRequest('/split/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const searchUsers = async (query) => {
  try {
    const response = await apiRequest(`/split/users/search?query=${query}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getRecentContacts = async () => {
  try {
    const response = await apiRequest('/split/users/contacts');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Groups
export const createSplitGroup = async (groupData) => {
  try {
    const response = await apiRequest('/split/groups', {
      method: 'POST',
      body: JSON.stringify(groupData),
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getSplitGroups = async () => {
  try {
    const response = await apiRequest('/split/groups');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getSplitGroup = async (groupId) => {
  try {
    const response = await apiRequest(`/split/groups/${groupId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const updateSplitGroup = async (groupId, groupData) => {
  try {
    const response = await apiRequest(`/split/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(groupData),
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const addGroupMembers = async (groupId, memberIds) => {
  try {
    const response = await apiRequest(`/split/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ members: memberIds }),
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const removeGroupMember = async (groupId, memberId) => {
  try {
    const response = await apiRequest(`/split/groups/${groupId}/members/${memberId}`, {
      method: 'DELETE',
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const updateMemberRole = async (groupId, memberId, role) => {
  try {
    const response = await apiRequest(`/split/groups/${groupId}/members/${memberId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const deleteSplitGroup = async (groupId) => {
  try {
    const response = await apiRequest(`/split/groups/${groupId}`, {
      method: 'DELETE',
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Expenses
export const createSplitExpense = async (expenseData) => {
  console.log('Creating expense with data:', expenseData);
  try {
    const response = await apiRequest('/split/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
    
    // Log entire response to debug
    console.log('Raw expense response:', response);
    
    // Check all possible response formats
    let createdExpense;
    
    // Format 1: response.data contains expense
    if (response && response.data) {
      createdExpense = response.data;
    }
    // Format 2: response itself is the expense
    else if (response && response._id) {
      createdExpense = response;
    }
    // Format 3: response.expense contains the data
    else if (response && response.expense) {
      createdExpense = response.expense;
    }
    // Format 4: response contains data property with expense
    else if (response && response.data && response.data.expense) {
      createdExpense = response.data.expense;
    }
    
    console.log('Expense created:', createdExpense);
    return createdExpense;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getSplitExpenses = async (params = {}) => {
  try {
    let url = '/split/expenses';
    
    // Add query params if provided
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      queryParams.append(key, value);
    }
    
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
    
    const response = await apiRequest(url);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Get all expenses with a specific friend
export const getExpensesWithFriend = async (friendId) => {
  try {
    console.log('Getting expenses with friend ID:', friendId);
    // Use the existing getSplitExpenses endpoint with otherUser parameter
    const response = await apiRequest(`/split/expenses?otherUser=${friendId}`);
    console.log('Expenses with friend response:', response);
    return response?.data || [];
  } catch (error) {
    console.error('Error getting expenses with friend:', error);
    return [];
  }
};

export const getSplitExpense = async (expenseId) => {
  try {
    const response = await apiRequest(`/split/expenses/${expenseId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const updateSplitExpense = async (expenseId, expenseData) => {
  try {
    const response = await apiRequest(`/split/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(expenseData),
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const deleteSplitExpense = async (expenseId) => {
  try {
    const response = await apiRequest(`/split/expenses/${expenseId}`, {
      method: 'DELETE',
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const addExpenseComment = async (expenseId, text) => {
  try {
    const response = await apiRequest(`/split/expenses/${expenseId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Balances
export const getUserBalances = async () => {
  try {
    const response = await apiRequest('/split/balances');
    console.log('User balances response structure:', {
      responseExists: !!response,
      dataExists: response ? !!response.data : false,
      fullResponseKeys: response ? Object.keys(response) : [],
      dataKeys: response && response.data ? Object.keys(response.data) : [],
      balances: response?.data?.balances || []
    });
    
    // The server is sending the data directly in response.data, not in response.data.data
    if (response && response.data) {
      // Return the data object directly
      console.log('Returning balance data:', response.data);
      return response.data;
    }
    
    return null;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getBalanceWithUser = async (otherUserId) => {
  try {
    const response = await apiRequest(`/split/balances/user/${otherUserId}`);
    if (response && response.data && response.data.data) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getGroupBalances = async (groupId) => {
  try {
    const response = await apiRequest(`/split/balances/group/${groupId}`);
    if (response && response.data && response.data.data) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getSimplifiedBalances = async () => {
  try {
    const response = await apiRequest('/split/balances/simplify');
    if (response && response.data && response.data.data) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getBalanceDetails = async (otherUserId, params = {}) => {
  try {
    let url = `/split/balances/details/${otherUserId}`;
    
    // Add query params if provided
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      queryParams.append(key, value);
    }
    
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
    
    const response = await apiRequest(url);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Settlements
export const createSettlement = async (settlementData) => {
  try {
    const response = await apiRequest('/split/settlements', {
      method: 'POST',
      body: JSON.stringify(settlementData),
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getSettlementHistory = async (params = {}) => {
  try {
    let url = '/split/settlements';
    
    // Add query params if provided
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      queryParams.append(key, value);
    }
    
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
    
    const response = await apiRequest(url);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getSettlementsWithUser = async (userId) => {
  try {
    const response = await apiRequest(`/split/settlements/user/${userId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getSettlement = async (settlementId) => {
  try {
    const response = await apiRequest(`/split/settlements/${settlementId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Combined utility for recent activity (combines expenses and settlements)
export const getRecentActivity = async (limit = 10) => {
  try {
    // Get profile first to avoid multiple calls and the await inside map
    const profile = await getSplitProfile();
    const profileId = profile._id;
    
    // Get recent expenses
    const expensesResponse = await getSplitExpenses({ limit });
    const expenses = expensesResponse.data.map(expense => ({
      ...expense,
      type: 'expense',
      date: expense.date,
      youPaid: expense.paidBy._id === profileId,
    }));

    // Map settlements to a consistent format
    const settlementsResponse = await getSettlementHistory({ limit });
    const settlements = settlementsResponse.data.map(settlement => ({
      _id: settlement?._id,
      type: 'settlement',
      amount: settlement?.amount,
      date: settlement?.date,
      description: 'Settlement',
      currency: settlement?.currency,
      with: settlement?.payer?._id === profile?._id ? settlement?.receiver : settlement?.payer,
      youPaid: settlement?.payer?._id === profile?._id,
      youReceived: settlement?.receiver?._id === profile?._id,
    }));

    // Combine and sort by date
    const combined = [...expenses, ...settlements].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    return combined.slice(0, limit);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
};
