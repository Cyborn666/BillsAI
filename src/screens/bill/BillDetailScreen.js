/**
 * Bill Detail Screen for BillsAI app
 * Displays detailed information about a specific bill
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import theme from '../../styles/theme';
import Button from '../../components/common/Button';
import Icon from 'react-native-vector-icons/Ionicons';
import * as billService from '../../services/billService';
import userService from '../../services/userService';
import Toast from 'react-native-toast-message';
import BillIcon from '../../components/bill/BillIcon';


const BillDetailScreen = ({ route, navigation }) => {


  const { billId } = route.params || {};
  // Check if billId exists early to prevent unnecessary processing
  const billIdMissing = !billId;
  const [bill, setBill] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleted, setIsDeleted] = useState(false); // Track if bill is deleted
  const [userInitiatedDelete, setUserInitiatedDelete] = useState(false); // Track if deletion was initiated by user
  const [isLoading, setIsLoading] = useState(false);

  const [user, setUser] = useState(null);
  const [currencyPreference, setCurrencyPreference] = useState('USD ($)');

  // Helper function to format currency with user's preferred currency symbol
  const formatCurrency = useCallback((amount) => {
    // Extract symbol from preference string (e.g., 'USD ($)' -> '$')
    const symbolMatch = currencyPreference.match(/\(([^)]+)\)/);
    const symbol = symbolMatch ? symbolMatch[1] : '$';
    return `${symbol}${parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }, [currencyPreference]);

  // Function to fetch bill details - wrapped in useCallback to prevent dependency issues
  const fetchBillDetails = useCallback(async () => {
    // Skip if bill is deleted or missing
    if (isDeleted) {
      ////console.log('Bill is marked as deleted, skipping fetch');
      setLoading(false);
      return;
    }

    if (billIdMissing) {
      ////console.error('No bill ID provided');
      setLoading(false);
      Alert.alert(
        'Error',
        'No bill ID provided. Please go back and try again.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    try {
      setLoading(true);
      // Fetch bill from service using getBillById
      const response = await billService.getBillById(billId);
      ////console.log('Bill details:', response);

      if (response) {
        setBill(response);

        // Fetch payment history from billService using the bill ID
        try {
          const history = await billService.getBillPaymentHistory(billId);
          setPaymentHistory(history);
        } catch (historyError) {
          ////console.error('Error fetching payment history:', historyError);
          // If there's an error fetching history, set an empty array
          setPaymentHistory([]);
        }
      } else {
        // Bill not found - it might have been deleted from another screen
        // Avoid //console errors by not logging this as an error
        ////console.log('Bill not available:', billId, '- Setting isDeleted flag');
        setIsDeleted(true);
        setLoading(false);
        // Only show the alert if this wasn't a user-initiated deletion
        if (!userInitiatedDelete) {
          Alert.alert(
            'Error',
            'Bill not found. It may have been deleted.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      ////console.error('Error fetching bill details:', error);
      Alert.alert(
        'Error',
        'Failed to load bill details. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, [billId, billIdMissing, navigation, isDeleted, userInitiatedDelete]);


  // Add this to your useEffect
useEffect(() => {
  const fetchUserProfile = async () => {
    try {
      const userData = await userService.getUserProfile();
      setUser(userData);

      // Load currency preferences
      const prefs = await userService.getUserPreferences();
      setCurrencyPreference(prefs.currency || 'USD ($)');
    } catch (error) {
      ////console.error('Error fetching user profile:', error);
    }
  };

  fetchUserProfile();
}, []);

  // Effect to handle navigation after bill deletion
  useEffect(() => {
    // If bill is deleted (by any means), don't try to fetch it
    if (isDeleted) {
      ////console.log('Bill is deleted, preventing data fetch');
      return;
    }

    ////console.log('Bill not deleted, proceeding with data fetch');
    // Initial data load - only runs if bill is NOT deleted

    // Add listener for when the screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      // Skip if bill is marked as deleted
      if (isDeleted) {
        return;
      }
      ////console.log('BillDetailScreen is focused, reloading data...');
      fetchBillDetails();
    });

    // Subscribe to data updates from billService
    const dataUpdateUnsubscribe = billService.subscribeToDataUpdates(() => {
      // Skip if bill is marked as deleted
      if (isDeleted) {
        return;
      }
      ////console.log('Data update received, reloading bill details...');
      fetchBillDetails();
    });

    // Clean up the listeners when component unmounts
    return () => {
      ////console.log('Cleaning up BillDetailScreen listeners');
      unsubscribe();
      dataUpdateUnsubscribe();
    };
  }, [billId, billIdMissing, navigation, fetchBillDetails, isDeleted, userInitiatedDelete]);

  // Handle back button press
  const handleBack = () => {
    navigation.goBack();
  };

  // Handle edit bill button press
  const handleEditBill = () => {
    // Navigate to edit bill screen with the current billId
    if (billId) {
      navigation.navigate('BillEdit', { billId });
    } else {
      Alert.alert('Error', 'Cannot edit this bill as no bill ID is available.');
    }
  };


  // Handle mark as paid button press
  const handleMarkAsPaid = async () => {
    if (!billId) {
      Alert.alert('Error', 'Cannot mark bill as paid. No bill ID available.');
      return;
    }

    // Set marking as paid flag to true to disable button


    try {
      // Create a payment record with additional details
      const paymentData = {
        amount: bill.amount,
        method: 'OTHER', // Use a valid payment method from enum
        notes: `Payment for ${bill.title || 'bill'}`,
      };

      // Use the new updateBillPaymentStatus function that handles lastPaidDates array
      const updatedBill = await billService.updateBillPaymentStatus(billId, 'PAID', paymentData);

      // Update local state with the updated bill
      setBill(updatedBill);

      // Refresh payment history
      const history = await billService.getBillPaymentHistory(billId);
      setPaymentHistory(history);

      Alert.alert('Success', 'Bill has been marked as paid!');
    } catch (error) {
      ////console.error('Error marking bill as paid:', error);
      Alert.alert('Error', 'Failed to mark bill as paid. Please try again.');
    } finally {
      // Reset marking as paid flag after operation completes (success or failure)

    }
  };

  // Handle marking a shared bill as paid by the current user
const handleMarkAsPaidShared = async () => {
  // Check for bill ID first - most critical validation
  if (!billId) {
    ////console.error('Cannot mark bill as paid: Missing bill ID');
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Cannot mark bill as paid: Missing bill ID',
    });
    return;
  }



  // Check if bill data is loaded
  if (!bill) {
    //console.error('Cannot mark bill as paid: Bill data not loaded');
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Bill data not fully loaded. Please try again.',
    });
    return;
  }

  // Check if user data is loaded and has proper ID
  if (!user) {
    ////console.error('Cannot mark bill as paid: User data not loaded');
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'User data not loaded. Please try again.',
    });

    // Try to fetch user data again before giving up
  try {
      const userData = await userService.getUserProfile();
      if (!userData || !userData._id) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Unable to verify your user account. Please try again.',
        });
        return;
      }
      // Update user state with fresh data
      setUser(userData);
    } catch (userError) {
      ////console.error('Error fetching user data:', userError);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Unable to verify your user account. Please try again.',
      });
      return;
    }
  }

  try {
    ////console.log('Marking shared bill as paid, billId:', billId, 'userId:', user._id);
    setIsLoading(true);

    // Call the API to mark the bill as paid
    const result = await billService.markBillAsPaid(billId);

    // Check if we got a valid response
    if (!result) {
      throw new Error('No response received from server');
    }

    // Extract the updated bill data, handling both response formats
    // Some API responses return {bill: {...}} and others return the bill object directly
    const updatedBill = result.bill || result;

    ////console.log('Bill marked as paid, response:', updatedBill);

    // Check if the updatedBill is actually an object with the expected structure
    if (!updatedBill || typeof updatedBill !== 'object') {
      throw new Error('Invalid bill data received from server');
    }

    // Update the local state with the updated bill
    setBill(updatedBill);

    // Show success message
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: 'You have marked this bill as paid',
    });

    // Trigger a refetch of payment history if needed
    if (billId) {
      try {
        const history = await billService.getBillPaymentHistory(billId);
        setPaymentHistory(history || []);
      } catch (historyError) {
        ////console.error('Error fetching payment history:', historyError);
      }
    }
  } catch (error) {
    ////console.error('Error marking bill as paid:', error);
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: error.message || 'Failed to mark bill as paid',
    });
  } finally {
    setIsLoading(false);

  }
};


  // Handle delete bill button press
  const handleDeleteBill = async () => {
    Alert.alert(
      'Delete Bill',
      'Are you sure you want to delete this bill?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // FIRST: Set these flags immediately to prevent any bill fetching
              setIsDeleted(true);
              setUserInitiatedDelete(true);
              setLoading(true);

              // SECOND: Delete bill from database
              const response = await billService.deleteBill(billId);

              // SUCCESS CASE - regardless of the response structure
              // Show a simple alert first
              Alert.alert(
                'Success',
                'Bill has been deleted successfully.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Navigate back when user presses OK
                      navigation.goBack();
                    },
                  },
                ]
              );

              // Handle any unsuccessful cases if needed (but don't show another alert)
              if (!response.success) {
                ////console.log('Delete response indicated failure but proceeding anyway');
              }

              return; // Exit immediately
            } catch (error) {
              ////console.error('Error deleting bill:', error);
              setLoading(false); // Hide loading indicator
              Alert.alert('Error', error.message || 'Failed to delete bill. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Get status color based on bill status
  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID':
        return theme.colors.success;
      case 'OVERDUE':
        return theme.colors.error;
      case 'UPCOMING':
        return theme.colors.info;
      default:
        return theme.colors.gray600;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  // Get screen dimensions
  const { width, height } = Dimensions.get('window');
  // Determine if in landscape mode
  const isLandscape = width > height;
  // Responsive styles based on screen size
  const dynamicStyles = {
    billCard: {
      margin: isLandscape ? theme.spacing.md : theme.spacing.lg,
      padding: isLandscape ? theme.spacing.md : theme.spacing.lg,
      width: isLandscape ? width * 0.6 : undefined,
      alignSelf: isLandscape ? 'center' : undefined,
    },
    historyCard: {
      margin: isLandscape ? theme.spacing.md : theme.spacing.lg,
      marginTop: 0,
      padding: isLandscape ? theme.spacing.md : theme.spacing.lg,
      width: isLandscape ? width * 0.6 : undefined,
      alignSelf: isLandscape ? 'center' : undefined,
    },
    actionButtons: {
      margin: isLandscape ? theme.spacing.md : theme.spacing.lg,
      marginTop: 0,
      width: isLandscape ? width * 0.6 : undefined,
      alignSelf: isLandscape ? 'center' : undefined,
    },
    statusContainer: {
      flexDirection: width < 350 ? 'column' : 'row',
      alignItems: width < 350 ? 'flex-start' : 'center',
    },
    statusItem: {
      marginBottom: width < 350 ? theme.spacing.sm : 0,
      alignItems: width < 350 ? 'flex-start' : 'center',
      flex: width < 350 ? 0 : 1,
    },
    fontSize: {
      billName: width < 350 ? theme.typography.fontSizes.large : theme.typography.fontSizes.xlarge,
      amountValue: width < 350 ? 28 : 32,
    },
  };

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'android' && styles.androidSafeArea]} >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={theme.colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bill Details</Text>
        <TouchableOpacity onPress={handleEditBill} style={styles.editButton}>
          <Icon name="create-outline" size={24} color={theme.colors.black} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Bill Card */}
        <View style={[styles.billCard, dynamicStyles.billCard]}>
          <View style={styles.billHeader}>
            <View style={styles.titleContainer}>
              <BillIcon
                billName={bill?.title || ''}
                category={bill?.category || ''}
                size={40}
                showBrandLogo={true}
                style={styles.billIcon}
              />
              <Text
                style={[styles.billName, { fontSize: dynamicStyles.fontSize.billName }]}
                numberOfLines={1}
                ellipsizeMode="tail"
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                {bill?.title || 'Unnamed Bill'}
              </Text>
            </View>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>
                {bill?.category ? bill.category.charAt(0) + bill.category.slice(1).toLowerCase() : 'Uncategorized'}
              </Text>
            </View>
          </View>

          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>{bill?.isShared ? 'Your Share' : 'Amount'}</Text>
            <Text style={[styles.amountValue, { fontSize: dynamicStyles.fontSize.amountValue }]}>
              {bill?.isShared && bill?.splitDetails ?
                // If the bill is shared, use the user's split amount with proper currency
                formatCurrency(bill.splitDetails[user.id] || bill.amount) :
                // Otherwise just use the total amount with proper currency
                bill?.amount ? formatCurrency(bill.amount) : formatCurrency(0)}
            </Text>
            {bill?.isShared && (
              <Text style={styles.totalAmountText}>
                Total bill amount: {formatCurrency(bill?.amount || 0)}
              </Text>
            )}
          </View>

          <View style={[styles.statusContainer, dynamicStyles.statusContainer]}>
            <View style={[styles.statusItem, dynamicStyles.statusItem]}>
              <Text style={styles.statusLabel}>Status</Text>
              <View style={styles.statusValueContainer}>
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: getStatusColor(bill?.status || 'UNPAID') },
                  ]}
                />
                <Text style={styles.statusValue}>
                  {bill?.status ? bill.status.charAt(0) + bill.status.slice(1).toLowerCase() : 'Unpaid'}
                </Text>
              </View>
            </View>

            <View style={[styles.statusItem, dynamicStyles.statusItem]}>
              <Text style={styles.statusLabel}>Due Date</Text>
              <Text style={styles.statusValue}>
                {bill?.dueDate ? new Date(bill.dueDate).toLocaleDateString() : 'Not set'}
              </Text>
            </View>

            <View style={[styles.statusItem, dynamicStyles.statusItem]}>
              <Text style={styles.statusLabel}>Recurring</Text>
              <Text style={styles.statusValue}>
                {bill?.isRecurring ?
                  (bill?.recurrenceFrequency ?
                    bill.recurrenceFrequency.charAt(0) + bill.recurrenceFrequency.slice(1).toLowerCase() :
                    'Yes') :
                  'No'}
              </Text>
            </View>
          </View>

          {bill?.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.notesText}>{bill?.description}</Text>
            </View>
          ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Category</Text>
            <Text style={styles.payeeText}>{bill?.category || 'Not specified'}</Text>
            </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Created</Text>
            <Text style={styles.payeeText}>{bill?.createdDate || new Date(Date.now()).toLocaleDateString()}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reminder</Text>
            <Text style={styles.payeeText}>
              {bill?.reminderDays ? `${bill.reminderDays} days before due date` : 'No reminder set'}
            </Text>
          </View>
        </View>

        {/* Payment History */}
        <View style={[styles.historyCard, dynamicStyles.historyCard]}>
          <Text style={styles.historyTitle}>Payment History</Text>

          {paymentHistory.length > 0 ? (
            paymentHistory.map(payment => (
              <View key={payment.id} style={styles.paymentItem}>
                <View>
                  <Text style={styles.paymentDate}>{payment.date}</Text>
                  <Text style={styles.paymentTime}>{payment.time}</Text>
                  {payment.notes && <Text style={styles.paymentNotes}>{payment.notes}</Text>}
                </View>
                <Text style={styles.paymentAmount}>
                  {payment.amount ? payment.amount : bill?.amount || '$0.00'}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noHistoryText}>No payment history available</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={[styles.actionButtons, dynamicStyles.actionButtons]}>
          {/* For shared bills that the user hasn't marked as paid yet */}
          {/* Shared bill mark as paid button - only show if user hasn't already marked it */}
         {/* { bill && user && bill.isShared && bill.status !== 'PAID' &&
           !(bill.markedAsPaidBy && Array.isArray(bill.markedAsPaidBy) &&
             bill.markedAsPaidBy.some(id => id === user._id || (id?.toString && user._id?.toString && id.toString() === user._id.toString()))) && (
            <Button
              title="Mark as Paid"
              variant="primary"
              onPress={handleMarkAsPaidShared}
              style={styles.markAsPaidButton}
              disabled={bill?.status === 'PAID' || isMarkingAsPaid}
            />
          )} */}
          {/* For regular non-shared bills */}
          {bill && !bill.isShared && bill.status !== 'PAID' && (
            <Button
              title="Mark as Paid"
              variant="primary"
              onPress={handleMarkAsPaid}
              style={styles.markAsPaidButton}
              disabled={bill?.status === 'PAID'}
            />
          )}
          {/* for shared bills */}
          {bill && bill.isShared && bill.status !== 'PAID' && (
            <Button
              title="Mark as Paid"
              variant="primary"
              onPress={handleMarkAsPaidShared}
              style={styles.markAsPaidButton}
              disabled={bill?.status === 'PAID' || bill?.status === 'PARTIALLY_PAID' && user && user.id && Array.isArray(bill.markedAsPaidBy) && bill.markedAsPaidBy.includes(user.id)}
            />
          )}
          {/* Display payment status for semi-paid shared bills */}
          {bill && bill.status === 'semi-paid' && bill.markedAsPaidBy && bill.sharedWith && (
            <View style={styles.semiPaidInfo}>
              <Text>Partially Paid ({bill.markedAsPaidBy.length}/{bill.sharedWith.length + 1})</Text>
            </View>
          )}

          <Button
            title="Delete Bill"
            variant="outline"
            onPress={handleDeleteBill}
            style={styles.deleteButton}
            textStyle={styles.deleteButtonText}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  androidSafeArea: {
    paddingTop: StatusBar.currentHeight || 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
  },
  loadingText: {
    fontSize: theme.typography.fontSizes.medium,
    color: theme.colors.gray700,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
  },
  headerTitle: {
    fontSize: theme.typography.fontSizes.large,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.black,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  editButton: {
    padding: theme.spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  billCard: {
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.gray200,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    maxWidth: '75%',
  },
  billIcon: {
    marginRight: theme.spacing.sm,
  },
  billName: {
    fontSize: theme.typography.fontSizes.xlarge,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.black,
    flexShrink: 1,
    maxWidth: '70%',
  },
  categoryTag: {
    backgroundColor: theme.colors.black,
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.white,
  },
  amountContainer: {
    marginBottom: theme.spacing.lg,
  },
  amountLabel: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.gray700,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.black,
  },
  totalAmountText: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.gray700,
    marginTop: 4,
    fontStyle: 'italic',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray200,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
    marginBottom: theme.spacing.md,
    flexWrap: 'wrap',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.gray700,
    marginBottom: 4,
  },
  statusValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusValue: {
    fontSize: theme.typography.fontSizes.medium,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.black,
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.gray700,
    marginBottom: 4,
  },
  notesText: {
    fontSize: theme.typography.fontSizes.medium,
    color: theme.colors.black,
    lineHeight: 22,
  },
  payeeText: {
    fontSize: theme.typography.fontSizes.medium,
    color: theme.colors.black,
  },
  createdText: {
    fontSize: theme.typography.fontSizes.medium,
    color: theme.colors.black,
  },
  historyCard: {
    margin: theme.spacing.lg,
    marginTop: 0,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.gray200,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  historyTitle: {
    fontSize: theme.typography.fontSizes.medium,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.black,
    marginBottom: theme.spacing.md,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
  },
  paymentDate: {
    fontSize: theme.typography.fontSizes.medium,
    color: theme.colors.black,
  },
  paymentStatus: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.gray700,
  },
  paymentAmount: {
    fontSize: theme.typography.fontSizes.medium,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.black,
  },
  noHistoryText: {
    fontSize: theme.typography.fontSizes.medium,
    color: theme.colors.gray600,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },
  actionButtons: {
    margin: theme.spacing.lg,
    marginTop: 0,
  },
  markAsPaidButton: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.success,
  },
  payButton: {
    marginBottom: theme.spacing.md,
  },
  deleteButton: {
    borderColor: theme.colors.error,
  },
  deleteButtonText: {
    color: theme.colors.error,
  },
  alreadyPaidContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.success + '20', // Light green background with opacity
    borderRadius: theme.borderRadius.small,
    marginBottom: theme.spacing.md,
  },
  alreadyPaidText: {
    marginLeft: theme.spacing.xs,
    fontSize: theme.typography.fontSizes.medium,
    color: theme.colors.success,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  partiallyPaidText: {
    fontSize: theme.typography.fontSizes.medium,
    color: theme.colors.warning,
    fontWeight: theme.typography.fontWeights.medium,
  },
});

export default BillDetailScreen;
