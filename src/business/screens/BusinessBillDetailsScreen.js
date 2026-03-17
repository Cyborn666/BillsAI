/**
 * Business Bill Details Screen
 * Displays detailed information about a business bill
 * Leverages existing bill functionality with business-specific display elements
 */
import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar
} from 'react-native';
import theme from '../../styles/theme';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { format, parseISO } from 'date-fns';

// Using MaterialIcons directly for consistency with modern design

// Use existing bill service - avoid code duplication
import { getBusinessBillById , deleteBusinessBill} from '../services/businessApiService';

const BusinessBillDetailsScreen = ({ route, navigation }) => {
  const { billId } = route.params;
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define bill details fetching function
  const fetchBillDetails = useCallback(async () => {
    try {
      setLoading(true);
      //console.log('Fetching business bill with ID:', billId);
      const billData = await getBusinessBillById(billId);
      
      if (billData) {
        //console.log('Business bill data received:', billData);
        setBill(billData);
      } else {
        //console.warn('Business bill not found for ID:', billId);
        setError('Bill not found');
      }
    } catch (err) {
      //console.error('Error fetching bill details:', err);
      setError('Failed to load bill details');
    } finally {
      setLoading(false);
    }
  }, [billId]);
  
  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchBillDetails();
      return () => {
        // Optional cleanup
      };
    }, [fetchBillDetails])
  );

  // Get appropriate icon for bill category
  const getCategoryIcon = (category) => {
    const iconMap = {
      'RENT': 'home',
      'UTILITIES': 'tungsten',
      'INTERNET': 'wifi',
      'PHONE': 'phone-android',
      'INSURANCE': 'health-and-safety',
      'SUBSCRIPTION': 'subscriptions',
      'CREDIT_CARD': 'credit-card',
      'LOAN': 'account-balance',
      'TAX': 'receipt',
      'MEMBERSHIP': 'card-membership',
      'MORTGAGE': 'home',
      'SERVICE': 'miscellaneous-services',
    };
    
    return iconMap[category] || 'receipt-long';
  };

  // Mark as paid functionality moved to BusinessBillsList swipeable actions
  // Delete bill
  const handleDeleteBill = () => {
    Alert.alert(
      'Delete Bill',
      'Are you sure you want to delete this bill? This action cannot be undone.',
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
              // Call the API to delete the bill, with local fallback
              const result = await deleteBusinessBill(billId);
              
              // Display different messages based on whether it was API or local-only deletion
              if (result && result.localOnly) {
                Alert.alert('Success', 'Bill deleted locally. It will be removed from the server when connectivity is restored.', [
                  { text: 'OK', onPress: () => {
                    // Reset navigation to avoid potential stacking issues
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'BusinessExpenseManagementScreen', params: { activeTab: 'bills' } }],
                    });
                  }}
                ]);
              } else {
                Alert.alert('Success', 'Bill deleted successfully', [
                  { text: 'OK', onPress: () => {
                    // Reset navigation to avoid potential stacking issues
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'BusinessExpenseManagementScreen', params: { activeTab: 'bills' } }],
                    });
                  }}
                ]);
              }
            } catch (err) {
              //console.error('Error deleting bill:', err);
              Alert.alert('Error', 'Failed to delete bill. Please try again later.');
            }
          },
        },
      ]
    );
  };

  // Format recurring period for display
  const formatRecurringPeriod = (period) => {
    if (!period) return 'Not recurring';
    return period.charAt(0) + period.slice(1).toLowerCase();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading bill details...</Text>
      </View>
    );
  }

  if (error || !bill) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>{error || 'Bill not found'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Parse dates
  const dueDate = new Date(bill.dueDate);
  
  const lastPaidDate = bill.lastPaidDate 
    ? (typeof bill.lastPaidDate === 'string' ? parseISO(bill.lastPaidDate) : bill.lastPaidDate)
    : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bill Details</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('BusinessAddBill', { billId: bill.id, isEditing: true })}
        >
          <MaterialIcons name="edit" size={24} color={theme.colors.businessPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Main Info Section */}
        <View style={styles.headerCard}>
          <View style={styles.billHeaderRow}>
            <Text style={styles.billTitle}>{bill.title}</Text>
            <Text style={styles.billAmount}>${parseFloat(bill.amount).toFixed(2)}</Text>
          </View>
          <View style={styles.subHeaderRow}>
            <View style={styles.categoryRow}>
              <MaterialIcons 
                name={getCategoryIcon(bill.category)} 
                size={18} 
                color={theme.colors.businessPrimary}
              />
              <Text style={styles.categoryText}>{bill.category || 'Uncategorized'}</Text>
            </View>
            <Text style={styles.dateText}>Due: {format(dueDate, 'MMMM d, yyyy')}</Text>
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Vendor/Provider</Text>
            <Text style={styles.detailValue}>{bill.vendor || 'Not specified'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Budget Category</Text>
            <Text style={styles.detailValue}>
              {bill.budgetCategory ? bill.budgetCategory.replace('_', ' ') : 'Not categorized'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tax Deductible</Text>
            <View style={styles.taxDeductibleIndicator}>
              <MaterialIcons 
                name={bill.taxDeductible ? 'check-circle' : 'cancel'} 
                size={18} 
                color={bill.taxDeductible ? theme.colors.success : theme.colors.textDisabled} 
              />
              <Text style={[styles.taxDeductibleText, { color: bill.taxDeductible ? theme.colors.success : theme.colors.textDisabled }]}>
                {bill.taxDeductible ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Bill Status</Text>
            <Text style={[styles.detailValue, {
              color: bill.status === 'PAID' ? theme.colors.success :
                     bill.status === 'PARTIALLY_PAID' ? theme.colors.warning :
                     bill.status === 'OVERDUE' || bill.status === 'UNPAID' ? theme.colors.error :
                     bill.status === 'UPCOMING' ? theme.colors.businessPrimary :
                     theme.colors.gray700,
            }]}>{bill.status}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Due Date</Text>
            <Text style={styles.detailValue}>{format(dueDate, 'MMMM d, yyyy')}</Text>
          </View>
        </View>
        
        {/* Business Information Section */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Bill Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>{bill.category}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Recurring</Text>
            <Text style={styles.detailValue}>
              {bill.isRecurring ? formatRecurringPeriod(bill.recurringPeriod) : 'No'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reminder</Text>
            <Text style={styles.detailValue}>
              {bill.reminderDays} day{bill.reminderDays !== 1 ? 's' : ''} before due date
            </Text>
          </View>
          
          {lastPaidDate && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Last Paid</Text>
              <Text style={styles.detailValue}>{format(lastPaidDate, 'MMMM d, yyyy')}</Text>
            </View>
          )}
        </View>

        {bill.description && (
          <View style={styles.notesCard}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{bill.description}</Text>
          </View>
        )}

        <View style={styles.actionsContainer}>
          <View style={styles.editDeleteContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => navigation.navigate('BusinessAddBill', { billId: bill.id, isEditing: true })}
            >
              <MaterialIcons name="edit" size={20} color={theme.colors.white} />
              <Text style={styles.actionButtonText}>Edit Bill</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeleteBill}
            >
              <MaterialIcons name="delete" size={20} color={theme.colors.white} />
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 50 : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 12,
    backgroundColor: theme.colors.businessPrimary,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    elevation: 0,
    shadowColor: 'transparent',
  },
  headerButton: {
    padding: 8,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.gray900,
  },
  scrollView: {
    flex: 1,
  },
  headerCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  billHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  billTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  billAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  dateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },

  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5A80FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  payButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginLeft: 8,
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    textAlign: 'right',
  },
  taxDeductibleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taxDeductibleText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  notesCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  notesText: {
    fontSize: 15,
    color: theme.colors.gray800,
    lineHeight: 22,
  },
  actionsContainer: {
    flexDirection: 'column',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 32,
  },
  editDeleteContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
  },
  editButton: {
    backgroundColor: theme.colors.businessPrimary,
    flex: 1,
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },

});

export default BusinessBillDetailsScreen;
