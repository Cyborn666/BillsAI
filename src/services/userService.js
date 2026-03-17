import apiClient from '../utils/apiClient';

// Create an event system for profile updates
const listeners = [];

const userService = {
  // Get the current user's profile
  getUserProfile: async () => {
    try {
      // Access the correct API endpoint
      const response = await apiClient.get('/users/profile');

      // Process the response - handle all possible formats
      // Case 1: {user: {...}} format
      if (response && response.user && typeof response.user === 'object') {
        return response.user;
      }

      // Case 2: {data: {user: {...}}} format
      if (response && response.data && response.data.user && typeof response.data.user === 'object') {
        return response.data.user;
      }

      // Case 3: {data: {...}} format where data is the user object
      if (response && response.data && typeof response.data === 'object' && response.data.email) {
        return response.data;
      }

      // Case 4: Response itself is the user object
      if (response && typeof response === 'object' && (response.email || response.id)) {
        ////console.log('Using response as user data');
        ////console.log('User name data:', {
          //fullName: response.fullName,
        //});
        return response;
      }

      // No valid user data found
      ////console.error('No valid user data in response:', response);
      return {}; // Return empty object instead of throwing an error to avoid crashes
    } catch (error) {
      ////console.error('Error in getUserProfile:', error.message || 'Unknown error');
      ////console.error('Full error object:', error);
      ////console.error('Stack trace:', error.stack);
      return {}; // Return empty object instead of throwing to prevent app crashes
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      ////console.log('Updating profile with data:', JSON.stringify(profileData));
      // The result now contains status, ok, and data properties thanks to our improved apiUtils
      const response = await apiClient.put('/users/profile', profileData);

      ////console.log('Profile update response:', response);

      // Extract user data from the response
      let userData = {};

      if (response) {
        // If response has user data property, use it
        if (response.user) {
          userData = response.user;
          ////console.log('User data extracted from response:', JSON.stringify(userData));
        } else {
          // Otherwise just use the whole response
          userData = response;
        }
      }

      // Notify all listeners about profile update
      if (profileData.avatarId) {
        ////console.log('Avatar updated, notifying listeners with avatar ID:', profileData.avatarId);
        listeners.forEach(callback => callback({ type: 'AVATAR_UPDATED', data: profileData.avatarId }));
      }

      // Log final extracted data for debugging
      ////console.log('Returning user data:', userData);

      return userData;
    } catch (error) {
      ////console.error('Error in updateProfile service:', error);
      // Check if this is an authorization error
      if (error?.response?.status === 401) {
        ////console.log('Authorization error - token may be expired');
        error.message = 'AUTH_TOKEN_EXPIRED';
      }
      throw error;
    }
  },

  // Note: We only use avatars (initials) instead of profile images

  // Get current avatar ID from user preferences or local storage
  getCurrentAvatarId: async () => {
    try {
      const userProfile = await userService.getUserProfile();
      return userProfile?.avatarId || 'male2'; // Default to male2 instead of 'default'
    } catch (error) {
      ////console.error('Error getting current avatar ID:', error);
      return 'male2'; // Fallback to male2 avatar if there's an error
    }
  },

  // Change user password
  changePassword: async (currentPassword, newPassword) => {
    const response = await apiClient.post('/users/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  // Get user preferences
  getUserPreferences: async () => {
    try {
      ////console.log('Requesting user preferences from API...');
      const response = await apiClient.get('/users/preferences');

      // Log the response to debug
      ////console.log('Preferences API response:', response);

      if (response && response.data) {
        ////console.log('Preferences data received:', response.data);
        return response.data;
      }

      // If response exists but no data property
      if (response && !response.data) {
        ////console.log('Response received but no data property:', response);
        return response; // Maybe the response itself is the data
      }

      ////console.warn('No preferences data returned from API');
      // Return default preferences if nothing was returned
      return {
        currency: 'USD ($)',
        language: 'English',
        darkMode: false,
        notifications: true,
      };
    } catch (error) {
      ////console.error('Error fetching user preferences:', error);
      // Return default preferences on error so the app doesn't crash
      return {
        currency: 'USD ($)',
        language: 'English',
        darkMode: false,
        notifications: true,
      };
    }
  },

  // Update user preferences
  updatePreferences: async (preferences) => {
    try {
      ////console.log('Sending preferences to API for update:', preferences);
      const response = await apiClient.put('/users/preferences', preferences);

      ////console.log('Update preferences API response:', response);

      if (response && response.data) {
        ////console.log('Updated preferences data received:', response.data);
        return response.data;
      }

      ////console.warn('No updated preferences data returned from API');
      return preferences; // Return the preferences we tried to save if no response data
    } catch (error) {
      ////console.error('Error updating user preferences:', error);
      throw error; // Rethrow to handle in the UI
    }
  },

  // Get notification settings
  getNotificationSettings: async () => {
    try {
      const response = await apiClient.get('/users/notifications');
      ////console.log('Retrieved notification settings from API:', response.data);
      return response.data;
    } catch (error) {
      ////console.error('Error getting notification settings from API:', error);
      // Return default settings if API call fails
      return { pushEnabled: false, emailEnabled: false };
    }
  },

  // Update notification settings
  updateNotificationSettings: async (settings) => {
    try {
      const response = await apiClient.put('/users/notifications', settings);
      ////console.log('Saved notification settings to API:', response.data);
      return response.data;
    } catch (error) {
      ////console.error('Error updating notification settings:', error);
      throw error;
    }
  },

  // Search users by username
  searchUsers: async (username) => {
    try {
      ////console.log('Searching for users with username:', username);
      const response = await apiClient.get(`/users/search?username=${encodeURIComponent(username)}`);

      if (response && response.data) {
        ////console.log('User search results:', response.data);
        // If the response doesn't include preferences, try to fetch them
        if (response.data.users && response.data.users.length > 0) {
          const usersWithPreferences = await Promise.all(response.data.users.map(async (user) => {
            // If user already has preferences, return as is
            if (user.preferences && user.preferences.currency) {
              return user;
            }

            try {
              // Otherwise try to fetch the user's preferences
              const userPrefs = await apiClient.get(`/users/${user._id}/preferences`);
              return {
                ...user,
                preferences: userPrefs.data || { currency: 'USD ($)' },// Default if not found
              };
            } catch (prefError) {
              ////console.error(`Error fetching preferences for user ${user._id}:`, prefError);
              // Return user with default preferences if fetch fails
              return {
                ...user,
                preferences: { currency: 'USD ($)' },
              };
            }
          }));

          return { ...response.data, users: usersWithPreferences };
        }
        return response.data;
      }

      if (response && !response.data) {
        return response; // Maybe the response itself is the data
      }

      return { users: [] };
    } catch (error) {
      ////console.error('Error searching for users:', error);
      throw error;
    }
  },

  /**
   * Delete user account
   * @param {string} password - User password for verification (optional depending on API requirements)
   * @returns {Promise<Object>} Result of account deletion
   */
  deleteAccount: async (password) => {
    try {
      // Use a consistent API endpoint approach
      const response = password
        ? await apiClient.post('/users/delete-account', { password })
        : await apiClient.delete('/users/account');

      if (response && response.success) {
        return { success: true, message: 'Account deleted successfully' };
      }

      // Handle the case where response.data might contain the result
      if (response && response.data) {
        return response.data;
      }
      
      return { success: false, message: 'Failed to delete account' };
    } catch (error) {
      ////console.error('Error deleting account:', error);
      throw error;
    }
  },

  // Export user data
  exportUserData: async () => {
    const response = await apiClient.get('/users/export-data');
    return response.data;
  },

  // Subscribe to profile updates (returns unsubscribe function)
  subscribeToProfileUpdates: (callback) => {
    listeners.push(callback);
    return () => {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    };
  },

  // Send support message to admin
  sendSupportMessage: async (subject, message) => {
    try {
      ////console.log('Sending support message to admin:', { subject, message });
      const response = await apiClient.post('/support/messages', { subject, message });

      ////console.log('Support message sent response:', response);

      if (response && response.success) {
        return { success: true, message: 'Support message sent successfully' };
      }

      return { success: false, message: 'Failed to send support message' };
    } catch (error) {
      ////console.error('Error sending support message:', error);
      throw error;
    }
  },

   // Submit app rating and feedback
   submitAppRating: async (rating, feedback) => {
    try {
      const response = await apiClient.post('/users/app-rating', { rating, feedback });
      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }
      return response.data;
    } catch (error) {
      //console.error('Error in submitAppRating:', error);
      if (error.response && error.response.data) {
        throw new Error(error.response.data.message || 'Error submitting app rating');
      } else {
        throw new Error(error.message || 'Error submitting app rating');
      }
    }
  },

};

export default userService;
