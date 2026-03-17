/**
 * Notification Service for BillsAI
 * Handles scheduling, canceling, and managing notifications for bills
 */

import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getBillById, updateBill, processRecurringBills, getBills } from './billService';

// Storage key for notification settings
const NOTIFICATION_SETTINGS_KEY = '@BillsAI:notificationSettings';

/**
 * Initialize push notifications
 */
export const initializeNotifications = () => {
  try {
    // Check if PushNotification is available
    if (!PushNotification) {
      //console.warn('PushNotification module is not available');
      return false;
    }

    // On iOS, need to ensure we're not in a simulator which often has issues with notifications
    try {
      const { Platform } = require('react-native');
      if (Platform && Platform.OS === 'ios' && Platform.isPad && !Platform.isTV && __DEV__) {
        //console.warn('Running on iOS simulator, notifications may not work properly');
        // Continue anyway but with a warning
      }

      // Check if we're in a test environment
      if (process.env.NODE_ENV === 'test') {
        //console.warn('Running in test environment, skipping native notification initialization');
        return false;
      }

      // Additional safety check for native modules
      if (Platform.OS === 'ios' && PushNotification._nativeModule === null) {
        //console.warn('Native module for notifications is null, cannot initialize notifications');
        return false;
      }
    } catch (platformError) {
      //console.warn('Could not check platform details', platformError);
    } // Configure push notifications with error handling wrapper
    PushNotification.configure({
      // (required) Called when a remote is received or opened, or local notification is opened
      onNotification: function (notification) {
        //console.log('NOTIFICATION:', notification);

        // Process the notification data
        if (notification.data && notification.data.billId) {
          processBillNotification(notification.data);
        }

        // Required on iOS only
        notification.finish(PushNotification.FetchResult.NoData);
      },

      // Should the initial notification be popped automatically
      popInitialNotification: true,
      
      // Set to null to disable FCM (Firebase Cloud Messaging)
      senderID: null,
      
      // We're only using local notifications, not remote
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      
      // Only request permissions on iOS (Android handled differently)
      requestPermissions: Platform.OS === 'ios',
    });

  // Create notification channel for Android
  PushNotification.createChannel(
    {
      channelId: 'bills-reminders', // (required)
      channelName: 'Bill Reminders', // (required)
      channelDescription: 'Reminders for upcoming and overdue bills', // (optional) default: undefined
      playSound: true, // (optional) default: true
      soundName: 'default', // (optional) default: 'default'
      importance: 4, // (optional) default: 4. Android only, see importance on Android docs
      vibrate: true, // (optional) default: true. Android only
    },
  );

  return true;
  } catch (error) {
    //console.error('Error initializing notifications:', error);
    return false;
  }
};

/**
 * Schedule a local notification
 * @param {Object} options - Notification options
 * @returns {string} - Notification ID
 */
export const scheduleNotification = (options) => {
  const {
    title,
    message,
    date,
    data = {},
    channelId = 'bills-reminders',
  } = options;

  // Generate a unique ID for the notification
  const notificationId = `bill-${data.billId || 'general'}-${Date.now()}`;

  const notificationOptions = {
    id: notificationId,
    channelId,
    title,
    message,
    date,
    userInfo: { ...data, notificationId },
    allowWhileIdle: true,// Works even when app is in background
    largeIcon: 'ic_launcher',
    smallIcon: 'ic_launcher',
    playSound: true,
    soundName: 'default',
    color: '#FF0000',
  };

  PushNotification.localNotification(notificationOptions);

  return notificationId;
};

/**
 * Cancel a specific notification
 * @param {string} notificationId - ID of the notification to cancel
 */
export const cancelNotification = (notificationId) => {
  if (!notificationId) {return;}
  PushNotification.cancelLocalNotification(notificationId);
};

/**
 * Cancel all notifications for a specific bill
 * @param {string} billId - ID of the bill
 */
export const cancelBillNotifications = async (billId) => {
  try {
    // Validate bill ID upfront to prevent error cascading
    if (!billId) {
      //console.warn('cancelBillNotifications: Bill ID is undefined or null');
      return { success: false, error: 'Bill ID is required' };
    }
    
    const bill = await getBillById(billId);

    if (bill && bill.notificationIds && bill.notificationIds.length > 0) {
      // Cancel each notification
      bill.notificationIds.forEach(id => {
        cancelNotification(id);
      });

      // Clear notification IDs in bill data
      await updateBill(billId, { ...bill, notificationIds: [] });
    }
  } catch (error) {
    //console.error('Error canceling bill notifications:', error);
  }
};

/**
 * Schedule bill reminder notifications
 * @param {Object} bill - Bill object
 * @returns {Promise<Object>} - Updated bill with notification IDs
 */
export const scheduleBillReminders = async (bill) => {
  try {
    
    
    // Validate bill and bill ID upfront
    if (!bill) {
      //console.warn('scheduleBillReminders: Bill object is undefined or null');
      return { success: false, error: 'Bill object is required' };
    }
    
    if (!bill.id) {
      //console.warn('scheduleBillReminders: Bill ID is undefined or null');
      return { success: false, error: 'Bill ID is required' };
    }
    
    // Cancel any existing notifications for this bill
    await cancelBillNotifications(bill.id);

    // Initialize notification IDs array
    const notificationIds = [];

    const dueDate = new Date(bill.dueDate);
    const today = new Date();

    // Get the days before due date to send reminders with better validation
    // Use null coalescing to handle 0 as a valid value, but treat undefined/null as invalid
    const reminderDays = bill.reminderDays ?? 3; // Default to 3 days if not specified
    //console.log(`[DEBUG] Using reminder days: ${reminderDays} for bill ${bill.id}`);
    
    // Validate bill name and amount for notifications
    const billName = bill.name || bill.title || 'Bill'; // Handle both name and title (API inconsistency)
    const billAmount = parseFloat(bill.amount);
    if (isNaN(billAmount)) {
      //console.warn(`[DEBUG] Bill ${bill.id} has invalid amount: ${bill.amount}`);
    }
    const formattedAmount = isNaN(billAmount) ? '' : `$${billAmount.toFixed(2)}`;
    
    // Schedule reminder only on the specific days: due date and reminder days before
    // Key days to notify: due date (0 days remaining) and exactly reminderDays before
    const keyReminderDays = [0, reminderDays]; // 0 = due date, reminderDays = start of reminder period

    // If bill is due today or in the future
    if (dueDate >= today) {
      // For each key reminder day
      keyReminderDays.forEach(daysRemaining => {
        const notificationDate = new Date(dueDate);
        notificationDate.setDate(dueDate.getDate() - daysRemaining); // Days before due date

        // Set notification time to 9:00 AM
        notificationDate.setHours(9, 0, 0, 0);

        // Only schedule if date is today or in future
        if (notificationDate >= today) {

          let message;
          if (daysRemaining === 0) {
            message = `Your ${billName} payment ${formattedAmount ? 'of ' + formattedAmount : ''} is due today!`;
          } else if (daysRemaining === 1) {
            message = `Your ${billName} payment ${formattedAmount ? 'of ' + formattedAmount : ''} is due tomorrow!`;
          } else {
            message = `Your ${billName} payment ${formattedAmount ? 'of ' + formattedAmount : ''} is due in ${daysRemaining} days`;
          }

          const notificationId = scheduleNotification({
            title: 'Bill Payment Reminder',
            message,
            date: notificationDate,
            data: { billId: bill.id, type: 'reminder' }
          });

          // Store notification ID
          notificationIds.push(notificationId);

          // Update lastNotificationDate when a notification is scheduled for today
          const todayCompare = new Date();
          if (notificationDate.setHours(0, 0, 0, 0) === todayCompare.setHours(0, 0, 0, 0)) {
            bill.lastNotificationDate = new Date().toISOString();
          }
        }
      });
    }

    // If bill is already overdue, schedule daily overdue reminders
    if (dueDate < today && (!bill.status || bill.status !== 'PAID')) {
      await scheduleOverdueReminders(bill, notificationIds);
    }

    // Update bill with notification IDs in database
    const updatedBill = { ...bill, notificationIds };
    await updateBill(bill.id, updatedBill);

    return updatedBill;
  } catch (error) {
    //console.error('Error scheduling bill reminders:', error);
    throw error;
  }
};

/**
 * Schedule overdue bill reminders
 * @param {Object} bill - Bill object
 * @param {Array} notificationIds - Array to store notification IDs
 * @returns {Promise<Array>} - Updated notification IDs array
 */
export const scheduleOverdueReminders = async (bill, notificationIds = []) => {
  try {
    const today = new Date();
    const overdueDate = new Date(today);

    // Set notification time to 9:00 AM
    overdueDate.setHours(9, 0, 0, 0);

    // For overdue bills, schedule a reminder for today
    const daysOverdue = Math.floor((today - new Date(bill.dueDate)) / (1000 * 60 * 60 * 24));

    const notificationId = scheduleNotification({
      title: 'Overdue Bill Alert',
      message: `Your ${bill.name} payment of $${bill.amount} is ${daysOverdue} days overdue!`,
      date: overdueDate,
      data: { billId: bill.id, type: 'overdue' },
    });

    notificationIds.push(notificationId);

    // Schedule another reminder for tomorrow
    const tomorrowDate = new Date(today);
    tomorrowDate.setDate(today.getDate() + 1);
    tomorrowDate.setHours(9, 0, 0, 0);

    const tomorrowNotificationId = scheduleNotification({
      title: 'Overdue Bill Alert',
      message: `Your ${bill.name} payment of $${bill.amount} will be ${daysOverdue + 1} days overdue tomorrow!`,
      date: tomorrowDate,
      data: { billId: bill.id, type: 'overdue' },
    });

    notificationIds.push(tomorrowNotificationId);

    return notificationIds;
  } catch (error) {
    //console.error('Error scheduling overdue reminders:', error);
    throw error;
  }
};

/**
 * Process a bill notification (handle user actions)
 * @param {Object} data - Notification data
 */
import { NavigationRef } from '../navigation/NavigationRef';

export const processBillNotification = async (data) => {
  try {
    if (data.billId) {
      const bill = await getBillById(data.billId);

      // Handle different notification types
      switch (data.type) {
        case 'reminder':
        case 'overdue':
          // Navigate to bill details screen
          if (NavigationRef.current && bill) {
            NavigationRef.current.navigate('BillDetails', { billId: data.billId });
          }
          break;

        default:
          // For other notifications, go to the home screen
          if (NavigationRef.current) {
            NavigationRef.current.navigate('Home');
          }
          break;
      }
    }
  } catch (error) {
    //console.error('Error processing bill notification:', error);
  }
};

/**
 * Get notification settings
 * @returns {Promise<Object>} - Notification settings
 */
export const getNotificationSettings = async () => {
  try {
    // Make sure AsyncStorage is available
    if (!AsyncStorage) {
      //console.error('AsyncStorage is not available');
      return {
        enabled: true,
        defaultReminderDays: 3,
      };
    }
    const settings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!settings) {
      // If settings don't exist, create default ones
      const defaultSettings = {
        enabled: true,
        defaultReminderDays: 3,
      };

      // Save default settings
      try {
        await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(defaultSettings));
      } catch (saveError) {
        //console.warn('Could not save default notification settings', saveError);
      }
      return defaultSettings;
    }

    return JSON.parse(settings);
  } catch (error) {
    //console.error('Error getting notification settings:', error);
    return {
      enabled: true,
      defaultReminderDays: 3,
    };
  }
};

/**
 * Save notification settings
 * @param {Object} settings - Settings object
 * @returns {Promise<boolean>} - Returns true if successful, false otherwise
 */
export const saveNotificationSettings = async (settings) => {
  try {
    // Make sure AsyncStorage is available
    if (!AsyncStorage) {
      //console.error('AsyncStorage is not available');
      return false;
    }
    // Ensure we have valid settings
    if (!settings) {
      settings = {
        enabled: true,
        defaultReminderDays: 3,
      };
    }

    // Make sure enabled property exists
    if (typeof settings.enabled === 'undefined') {
      settings.enabled = true;
    }
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    //console.error('Error saving notification settings:', error);
    return false;
  }
};

/**
 * Process all bill reminders
 * Used for daily background task to ensure recurring bills are updated
 * and notifications are scheduled
 */
export const processAllBillReminders = async () => {
  try {
    // Process recurring bills first to update their status
    const updatedBills = await processRecurringBills();
    //console.log(`Processed ${updatedBills.length} recurring bills`);

    // Get notification settings
    const settings = await getNotificationSettings();

    // If notifications are disabled, exit
    if (!settings.enabled) {
      return;
    }

    try {
      // Now schedule reminders for all bills
      const response = await getBills();
      
      // Check if we have valid bills data
      if (!response || !response.bills) {
        //console.log('No bills data available or invalid format returned');
        return;
      }
      
      const { bills } = response;
      
      //console.log(`[DEBUG] Retrieved ${bills.length} bills for processing reminders`);
      // Process each bill
      let processedCount = 0;
      //console.log(`[DEBUG] Processing ${bills.length} bills for reminders`);
      for (const bill of bills) {
        try {
          // Validate bill data
          if (!bill || typeof bill !== 'object') {
            //console.warn('[DEBUG] Invalid bill object:', bill);
            continue;
          }

          // Add id if missing but _id exists (MongoDB format)
          if (!bill.id && bill._id) {
            bill.id = bill._id;
            //console.log(`[DEBUG] Using _id as id for bill: ${bill.id}`);
          }

          // Check for required fields
          if (!bill.id) {
            //console.warn('[DEBUG] Bill missing ID, skipping');
            continue;
          }

          if (!bill.dueDate) {
            //console.warn(`[DEBUG] Bill ${bill.id} missing dueDate, skipping`);
            continue;
          }

          // Ensure bill has title or name (API expects title, types use name)
          if (!bill.name && !bill.title) {
            //console.warn(`[DEBUG] Bill ${bill.id} missing name/title, using generic name`);
            bill.name = 'Bill';
            // Also set title since API expects it
            bill.title = 'Bill';
          } else if (!bill.name && bill.title) {
            // Handle API inconsistency (API expects title, types use name)
            bill.name = bill.title;
          } else if (bill.name && !bill.title) {
            // Handle reverse inconsistency (has name but no title)
            bill.title = bill.name;
          }

          // Ensure recurring period is valid for recurring bills
          if (bill.isRecurring === true && !bill.recurringPeriod) {
            //console.warn(`[DEBUG] Bill ${bill.id} is recurring but missing recurringPeriod, defaulting to MONTHLY`);
            bill.recurringPeriod = 'MONTHLY';
          }
          
          // Set default reminder days if not specified
          if (bill.reminderDays === undefined || bill.reminderDays === null) {
            bill.reminderDays = settings.defaultReminderDays;
            //console.log(`[DEBUG] Using default reminder days ${settings.defaultReminderDays} for bill ${bill.id}`);
          }

          // Schedule reminders
          try {
            await scheduleBillReminders(bill);
            //console.log(`[DEBUG] Successfully scheduled reminders for bill ${bill.id}`);
            processedCount++;
          } catch (reminderError) {
            //console.error(`[DEBUG] Error scheduling reminders for bill ${bill.id}:`, reminderError);
          }
        } catch (billError) {
          // Catch errors per bill to prevent one bill from breaking the entire process
          //console.log(`Error processing bill ${bill.id || 'unknown'}:`, billError.message);
        }
      }

      // Successfully processed reminders
    } catch (billsError) {
      // Handle API errors - silent fail
    }
  } catch (error) {
    // Error in processing bill reminders - silent fail
  }
};
