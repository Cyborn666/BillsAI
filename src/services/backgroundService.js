/**
 * Background Service
 * Handles background tasks for bills like notifications and status updates
 */
import BackgroundFetch from 'react-native-background-fetch';
import { updateBill, isWithinReminderWindow } from './billService';
import { initializeNotifications, processAllBillReminders } from './notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Background task configuration
const BACKGROUND_FETCH_CONFIG = {
  minimumFetchInterval: 15, // Fetch interval in minutes (minimum allowed is 15 minutes)
  stopOnTerminate: false,
  startOnBoot: true,
  enableHeadless: true,
  requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
};

// AsyncStorage keys
const LAST_BACKGROUND_CHECK_KEY = '@BillsAI:lastBackgroundCheck';

/**
 * Configure and initialize background fetch
 */
export const configureBackgroundFetch = async () => {
  try {
    // Initialize notifications first with error handling
    const notificationsInitialized = initializeNotifications();

    if (!notificationsInitialized) {
      //console.warn('Notifications were not initialized properly. Some background features may be limited.');
    }

    // Configure background fetch
    const status = await BackgroundFetch.configure(BACKGROUND_FETCH_CONFIG, onBackgroundFetch, onBackgroundFetchTimeout);

    // Background fetch configured

    // Execute a background fetch immediately to set up initial notifications
    BackgroundFetch.scheduleTask({
      taskId: 'com.billsai.initialcheck',
      delay: 1000, // 1 second delay
      forceAlarmManager: true,
    });

    return status;
  } catch (error) {
    // Error in configuring background fetch
    return BackgroundFetch.STATUS_RESTRICTED;
  }
};

/**
 * Background fetch event handler
 * This executes when the OS wakes your app for a background fetch event
 */
const onBackgroundFetch = async (taskId) => {
  //console.log('[BackgroundFetch] Task:', taskId);

  // Get the last check time
  const lastCheckTimeStr = await AsyncStorage.getItem(LAST_BACKGROUND_CHECK_KEY);
  const now = new Date();
  let shouldProcessBills = true;

  // Only process bills once per day to avoid unnecessary processing
  if (lastCheckTimeStr) {
    const lastCheckTime = new Date(lastCheckTimeStr);
    const hoursSinceLastCheck = (now - lastCheckTime) / (1000 * 60 * 60);
    shouldProcessBills = hoursSinceLastCheck >= 24;
  }

  // Process bill statuses and updates
  if (shouldProcessBills) {
    // Store the current time as the last check time
    await AsyncStorage.setItem(LAST_BACKGROUND_CHECK_KEY, now.toISOString());
  }

  // Check if there's an auth token before trying to process reminders
  const authToken = await AsyncStorage.getItem('authToken');

  // Only process reminders if authenticated
  if (authToken) {
    try {
      // Process all bill reminders (this includes processing recurring bills and scheduling notifications)
      await processAllBillReminders();
    } catch (error) {
      //console.log('[BackgroundFetch] Error processing bill reminders:', error.message);
      // Continue execution - don't let this error stop the background task
    }
  } else {
    //console.log('[BackgroundFetch] Skipping bill reminders processing - not authenticated');
  }

  // IMPORTANT: You must signal completion of your task
  BackgroundFetch.finish(taskId);
};

/**
 * Background fetch timeout handler
 * Called when the OS decides to terminate a background fetch task
 */
const onBackgroundFetchTimeout = async (taskId) => {
  //console.warn('[BackgroundFetch] TIMEOUT Task:', taskId);
  // Required: Signal completion of your task
  BackgroundFetch.finish(taskId);
};

// Using processAllBillReminders from notificationService.js instead of duplicating functionality

/**
 * Update bill status based on due date
 * @param {Object} bill - Bill object
 * @returns {Promise<Object>} - Updated bill with correct status
 */
export const updateBillStatus = async (bill) => {
  try {
    if (!bill) {return null;}

    const today = new Date();
    const dueDate = new Date(bill.dueDate);
    dueDate.setHours(23, 59, 59, 999); // End of due date

    let status = bill.status;

    // Only update if not PAID
    if (status !== 'PAID') {
      if (dueDate < today) {
        status = 'OVERDUE';
      } else if (isWithinReminderWindow(bill, dueDate, today)) {
        status = 'UPCOMING';
      } else {
        status = 'UNPAID';
      }
    }

    // If status changed, update the bill
    if (status !== bill.status) {
      const updatedBill = { ...bill, status };
      await updateBill(bill.id, updatedBill);
      return updatedBill;
    }

    return bill;
  } catch (error) {
    //console.error('Error updating bill status:', error);
    return bill;
  }
};

// Using imported isWithinReminderWindow from billService.js
