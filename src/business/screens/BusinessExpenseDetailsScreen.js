/**
 * Business Expense Details Screen
 * Displays detailed information about a business expense
 */
import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { getBusinessExpenses, deleteBusinessExpense} from '../services/businessApiService';
import { EXPENSE_CATEGORIES } from '../utils/businessConstants';
import theme from '../../styles/theme';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { format, parseISO } from 'date-fns';

// Use MaterialIcons directly instead of BillIcon for consistency with new designs

const BusinessExpenseDetailsScreen = ({ route, navigation }) => {
  const { expenseId } = route.params || {};
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define expense details fetching function
  const fetchExpenseDetails = useCallback(async () => {
    try {
      setLoading(true);
      // In a real implementation, there would be a getExpenseById endpoint
      // Here we're simulating it by getting all expenses and filtering
      const expenses = await getBusinessExpenses();
      const foundExpense = expenses.find(exp => exp.id === expenseId);

      if (foundExpense) {
        setExpense(foundExpense);
      } else {
        setError('Expense not found');
      }
    } catch (err) {
      //console.error('Error fetching expense details:', err);
      setError('Failed to load expense details');
    } finally {
      setLoading(false);
    }
  }, [expenseId]);
  
  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        if (isActive) {
          await fetchExpenseDetails();
        }
      };

      loadData();

      return () => {
        isActive = false;
      };
    }, [fetchExpenseDetails])
  );

  // Delete expense
  const handleDeleteExpense = () => {
    if (!expense || !expenseId) {
      Alert.alert('Error', 'Cannot delete: expense data is missing');
      return;
    }
    
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense? This action cannot be undone.',
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
              // In a real implementation, call the API to delete the expense
              await deleteBusinessExpense(expenseId);
        
              // For now, just navigate back
              Alert.alert('Success', 'Expense deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (err) {
              //console.error('Error deleting expense:', err);
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  // Get appropriate icon for expense category
  const getCategoryIcon = (category) => {
    if (!category) {
      return 'receipt-long';
    }
    
    const iconMap = {
      [EXPENSE_CATEGORIES.RENT]: 'home',
      [EXPENSE_CATEGORIES.UTILITIES]: 'power',
      [EXPENSE_CATEGORIES.INSURANCE]: 'health-and-safety',
      [EXPENSE_CATEGORIES.FOOD]: 'restaurant',
      [EXPENSE_CATEGORIES.TRANSPORT]: 'directions-car',
      [EXPENSE_CATEGORIES.ENTERTAINMENT]: 'movie',
      [EXPENSE_CATEGORIES.HEALTHCARE]: 'medical-services',
      [EXPENSE_CATEGORIES.EDUCATION]: 'school',
      [EXPENSE_CATEGORIES.SHOPPING]: 'shopping-cart',
      [EXPENSE_CATEGORIES.TRAVEL]: 'flight',
      [EXPENSE_CATEGORIES.SALARY]: 'account-balance-wallet',
      [EXPENSE_CATEGORIES.MARKETING]: 'campaign',
      [EXPENSE_CATEGORIES.TAXES]: 'account-balance',
      [EXPENSE_CATEGORIES.OFFICE_SUPPLIES]: 'business-center',
      [EXPENSE_CATEGORIES.PROFESSIONAL_SERVICES]: 'business',
      [EXPENSE_CATEGORIES.EQUIPMENT]: 'desktop-windows',
    };
    
    return iconMap[category] || 'receipt-long';
  };

  // Format category name for display
  const formatCategory = (category) => {
    if (!category) {
      return '';
    }
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading expense details...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Error</Text>
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // Add null check for expense
  if (!expense) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>Expense not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Convert dates from ISO string if needed
  const expenseDate = typeof expense.date === 'string' 
    ? parseISO(expense.date) 
    : expense.date;

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
        <Text style={styles.headerTitle}>Expense Details</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('BusinessAddExpense', { expenseId: expense.id, isEditing: true })}
        >
          <MaterialIcons name="edit" size={24} color={theme.colors.gray800} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Main Info Section */}
        <View style={styles.headerCard}>
          <View style={styles.expenseHeaderRow}>
            <Text style={styles.expenseTitle}>{expense.title}</Text>
            <Text style={styles.expenseAmount}>{`$${parseFloat(expense.amount || 0).toFixed(2)}`}</Text>
          </View>
          <View style={styles.subHeaderRow}>
            <View style={styles.categoryRow}>
              <MaterialIcons 
                name={getCategoryIcon(expense.category)} 
                size={18} 
                color="#5A80FF"
              />
              <Text style={styles.categoryText}>{formatCategory(expense.category)}</Text>
            </View>
            <Text style={styles.dateText}>{format(expenseDate, 'MMMM d, yyyy')}</Text>
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Details</Text>
    
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Vendor</Text>
            <Text style={styles.detailValue}>{expense.vendor || 'Not specified'}</Text>
          </View>
    
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <Text style={styles.detailValue}>{expense.paymentMethod || 'Not specified'}</Text>
          </View>
    
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tax Deductible</Text>
            <View style={styles.taxDeductibleIndicator}>
              <MaterialIcons 
                name={expense.taxDeductible ? "check-circle" : "cancel"} 
                size={16} 
                color={expense.taxDeductible ? theme.colors.success : theme.colors.textDisabled} 
              />
              <Text 
                style={[
                  styles.taxDeductibleText, 
                  { 
                    color: expense.taxDeductible 
                      ? theme.colors.success 
                      : theme.colors.textDisabled 
                  }
                ]}
              >
                {expense.taxDeductible ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>

          {expense.recurring && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Recurring</Text>
              <View style={styles.recurringIndicator}>
                <MaterialIcons name="repeat" size={16} color={theme.colors.businessPrimary} />
                <Text style={styles.recurringText}>{expense.recurringPeriod}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Tax Breakdown Section */}

        {/* Tax Breakdown Section - Only show if has subtotal or sales tax */}
        {(typeof expense.subtotal === 'number' || 
          (expense.taxes && typeof expense.taxes.salesTax === 'number')) && (
          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>Tax Breakdown</Text>
            {typeof expense.subtotal === 'number' && expense.subtotal > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Subtotal</Text>
                <Text style={styles.detailValue}>{`$${parseFloat(expense.subtotal || 0).toFixed(2)}`}</Text>
              </View>
            )}
            {expense.taxes && typeof expense.taxes.salesTax === 'number' && expense.taxes.salesTax > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Sales Tax</Text>
                <View style={styles.taxDetailValue}>
                  <Text style={styles.detailValue}>{`$${parseFloat(expense.taxes?.salesTax || 0).toFixed(2)}`}</Text>
                </View>
              </View>
            )}

            {expense.taxes && typeof expense.taxes.stateTax === 'number' && expense.taxes.stateTax > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>State Tax</Text>
                <View style={styles.taxDetailValue}>
                  <Text style={styles.detailValue}>{`$${parseFloat(expense.taxes?.stateTax || 0).toFixed(2)}`}</Text>
                </View>
              </View>
            )}
      
            {expense.taxes && typeof expense.taxes.localTax === 'number' && expense.taxes.localTax > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Local Tax</Text>
                <View style={styles.taxDetailValue}>
                  <Text style={styles.detailValue}>{`$${parseFloat(expense.taxes?.localTax || 0).toFixed(2)}`}</Text>
                </View>
              </View>
            )}
      
            {expense.taxes && typeof expense.taxes.exciseTax === 'number' && expense.taxes.exciseTax > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Excise Tax</Text>
                <Text style={styles.detailValue}>{`$${parseFloat(expense.taxes?.exciseTax || 0).toFixed(2)}`}</Text>
              </View>
            )}
      
            {expense.taxes && typeof expense.taxes.importDuty === 'number' && expense.taxes.importDuty > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Import Duty</Text>
                <Text style={styles.detailValue}>{`$${parseFloat(expense.taxes?.importDuty || 0).toFixed(2)}`}</Text>
              </View>
            )}
      
            {expense.taxes && typeof expense.taxes.otherTaxes === 'number' && expense.taxes.otherTaxes > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Other Taxes</Text>
                <Text style={styles.detailValue}>{`$${parseFloat(expense.taxes?.otherTaxes || 0).toFixed(2)}`}</Text>
              </View>
            )}
      
            {typeof expense.discount === 'number' && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Discount</Text>
                <Text style={[styles.detailValue, styles.discountText]}>{`-$${parseFloat(expense.discount || 0).toFixed(2)}`}</Text>
              </View>
            )}
      
            <View style={[styles.detailRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{`$${parseFloat(expense.amount || 0).toFixed(2)}`}</Text>
            </View>

         </View>
        )}
      
        {/* Notes Section */}
        {expense.notes && (
          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{expense.notes}</Text>
          </View>
        )}

        {/* Receipt Section */}
        {expense.receiptImage && (
          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>Receipt</Text>
            <View style={styles.receiptContainer}>
              <Image
                source={{ uri: expense.receiptImage }}
                style={styles.receiptImage}
                resizeMode="cover"
              />
              {expense.ocrProcessed && (
                <View style={styles.ocrBadge}>
                  <MaterialIcons name="document-scanner" size={14} color="#fff" />
                  <Text style={styles.ocrBadgeText}>OCR Processed</Text>
                </View>
              )}
            </View>
            <TouchableOpacity 
              style={styles.viewReceiptButton}
              onPress={() => navigation.navigate('BusinessViewReceipt', { imageUri: expense.receiptImage })}
            >
              <Text style={styles.viewReceiptText}>View Full Receipt</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Actions Section */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('BusinessAddExpense', { expenseId: expense.id, isEditing: true })}
          >
            <MaterialIcons name="edit" size={20} color={theme.colors.white} />
            <Text style={styles.actionButtonText}>Edit Expense</Text>
          </TouchableOpacity>
    
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDeleteExpense}
          >
            <MaterialIcons name="delete" size={20} color={theme.colors.white} />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
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
    backgroundColor: '#3867d6',
    borderRadius: 20,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    paddingTop: Platform.OS === 'ios' ? 20: 20,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  headerCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
    padding: 16,
    shadowColor: 'transparent',
    elevation: 0,
  },
  expenseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  expenseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
    paddingRight: 8,
  },
  expenseAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 14,
    color: '#3867d6',
    marginLeft: 6,
  },
  dateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    padding: 16,
    shadowColor: 'transparent',
    elevation: 0,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  taxDeductibleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taxDeductibleText: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 6,
  },
  recurringIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recurringText: {
    fontSize: 15,
    color: '#3867d6',
    fontWeight: '500',
    marginLeft: 6,
  },
  cardSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    padding: 16,
    shadowColor: 'transparent',
    elevation: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  notesText: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  receiptContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  ocrBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: theme.colors.businessPrimary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ocrBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  taxDetailValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taxRateText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  discountText: {
    color: theme.colors.success,
  },
  viewReceiptButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignSelf: 'center',
  },
  viewReceiptText: {
    color: '#3867d6',
    fontWeight: '500',
    fontSize: 14,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3867d6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    flex: 1,
    marginHorizontal: 4,
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
  },
  actionButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
});

export default BusinessExpenseDetailsScreen;
