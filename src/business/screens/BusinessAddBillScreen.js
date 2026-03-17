/**
 * Business Add/Edit Bill Screen
 * Form for adding or editing business-related bills with enhanced modern UI
 * Note: Reuses existing bill functionality but adds business-specific fields
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import theme from '../../styles/theme';

// Import business bill API services
import { createBusinessBill, getBusinessBillById, updateBusinessBill } from '../services/businessApiService';
// Modern design uses MaterialIcons directly instead of BillIcon component

const BusinessAddBillScreen = ({ navigation, route }) => {
  // Check if we're editing an existing bill
  const isEditing = route.params?.isEditing || false;
  const billId = route.params?.billId;
  // Note: Using 'title' instead of 'name' due to API expectation (from memory)
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [dueDate, setDueDate] = useState(new Date());
  // No longer using description field
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPeriod, setRecurringPeriod] = useState('MONTHLY');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reminderDays, setReminderDays] = useState('3');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  
  // Business-specific fields
  const [taxDeductible, setTaxDeductible] = useState(false);
  const [vendor, setVendor] = useState('');

  // Categories specifically for business bills, aligned with the model on the backend
  const categories = [
    'RENT', 'UTILITIES', 'SUBSCRIPTION', 'CREDIT_CARD', 'LOAN', 'INSURANCE',
    'TAXES', 'SALARY', 'MARKETING', 'OFFICE_SUPPLIES', 'PROFESSIONAL_SERVICES',
    'EQUIPMENT', 'OTHER',
  ];

  // Fetch existing bill data when editing
  useEffect(() => {
    const fetchBillData = async () => {
      if (isEditing && billId) {
        try {
          setInitialLoading(true);
          const billData = await getBusinessBillById(billId);
          
          if (billData) {
            // Populate form with existing bill data
            setTitle(billData.title || billData.name || '');
            setAmount(billData.amount ? billData.amount.toString() : '');
            setCategory(billData.category || 'OTHER');
            setDueDate(billData.dueDate ? new Date(billData.dueDate) : new Date());
            setVendor(billData.vendor || '');
            setTaxDeductible(billData.taxDeductible || false);
            setIsRecurring(billData.isRecurring || false);
            setRecurringPeriod(billData.recurringPeriod || 'MONTHLY');
            setReminderDays(billData.reminderDays ? billData.reminderDays.toString() : '3');
          } else {
            Alert.alert('Error', 'Could not find bill data');
            navigation.goBack();
          }
        } catch (error) {
          //console.error('Error fetching bill for editing:', error);
          Alert.alert('Error', 'Failed to load bill data');
          navigation.goBack();
        } finally {
          setInitialLoading(false);
        }
      }
    };
    
    fetchBillData();
  }, [isEditing, billId, navigation]);

  // Reset form function
  const resetForm = () => {
    setTitle('');
    setAmount('');
    setDueDate(new Date());
    setCategory('OTHER');
    setVendor('');
    setTaxDeductible(false);
    setIsRecurring(false);
    setRecurringPeriod('MONTHLY');
    setReminderDays('3');
  };

  // Handle date change
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  // Format categories for display
  const formatCategory = (cat) => {
    return cat
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Save or update bill
  const saveBill = async () => {
    // Validate inputs
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a bill title');
      return;
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      
      // Prepare bill data with business fields
      // Note: Using 'title' instead of 'name' based on API expectations
      const billData = {
        title: title.trim(),
        amount: parseFloat(amount),
        category,
        dueDate: format(dueDate, 'yyyy-MM-dd'),
        vendor: vendor.trim(),
        isBusinessExpense: true,
        taxDeductible,
        isRecurring,
        // Don't send recurringPeriod at all for non-recurring bills instead of sending null
        ...(isRecurring ? { recurringPeriod } : {}),
        reminderDays: parseInt(reminderDays, 10),
      };

      // Make API call and store response
      let response;
      if (isEditing && billId) {
        // Update existing bill
        response = await updateBusinessBill(billId, billData);
      } else {
        // Create new bill
        response = await createBusinessBill(billData);
      }
      
      // Check if the response indicates a subscription limit error (only for new bills, not updates)
      if (!isEditing && response && 
          (response.status === 403 || response.action === 'upgrade' || response.actionRequired === true)) {
        // This is a subscription limit error, handle it separately
        Alert.alert(
          'Subscription Limit Reached',
          `${response.message}\n\n${response.details || ''}`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Upgrade Plan',
              onPress: () => navigation.navigate('BusinessSubscription'),
            },
          ],
        );
        return; // Exit the function here
      }
      
      // Check for other API errors
      if (!response || response.error || (response.status && response.status >= 400)) {
        throw {
          message: (response && response.message) || 'API error occurred'
        };
      }
      
      // Only show success if we reach this point (no errors)
      const successMessage = isEditing ? 'Bill updated successfully' : 'Bill added successfully';
      Alert.alert(
        'Success',
        successMessage,
        [
          { 
            text: 'OK', 
            onPress: () => {
              resetForm();
              // Navigate back to expense management screen with bills tab active
              navigation.navigate('BusinessExpenseManagementScreen', { activeTab: 'bills' });
            }, 
          },
        ]);
    } catch (error) {
      //console.error(`Error ${isEditing ? 'updating' : 'adding'} business bill:`, error);
      
      // Generic error handling for all other types of errors
      const errorMessage = error.message || `Failed to ${isEditing ? 'update' : 'add'} bill. Please try again.`;
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Get appropriate icon for category
  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'RENT':
        return 'home';
      case 'MORTGAGE':
        return 'house';
      case 'UTILITIES':
        return 'power';
      case 'INSURANCE':
        return 'health-and-safety';
      case 'PHONE':
        return 'phone';
      case 'INTERNET':
        return 'wifi';
      case 'STREAMING':
        return 'movie';
      case 'SUBSCRIPTION':
        return 'subscriptions';
      case 'CREDIT_CARD':
        return 'credit-card';
      case 'LOAN':
        return 'account-balance';
      case 'TAX':
        return 'receipt';
      case 'OTHER':
        return 'more-horiz';
      default:
        return 'description';
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Bill' : 'Add Bill'}</Text>
        <TouchableOpacity
          style={[styles.saveButton, (!title || !amount) && styles.saveButtonDisabled]}
          onPress={saveBill}
          disabled={!title || !amount || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>{isEditing ? 'Update' : 'Save'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.formContainer}>
        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Bill Title *</Text>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter bill title"
            placeholderTextColor={theme.colors.gray500}
          />
        </View>


         {/* Vendor Input */}
         <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Vendor/Payee</Text>
          <TextInput
            style={styles.textInput}
            value={vendor}
            onChangeText={setVendor}
            placeholder="Enter vendor name"
            placeholderTextColor={theme.colors.gray500}
          />
        </View>

        {/* Amount Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Amount *</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor={theme.colors.gray500}
            />
          </View>
        </View>

        {/* Due Date Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Due Date *</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {format(dueDate, 'MMMM d, yyyy')}
            </Text>
            <MaterialIcons name="calendar-today" size={20} color={theme.colors.businessPrimary} />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}
        </View>

       

        {/* Category Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Bill Category</Text>
          <View style={styles.categoriesContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScrollContent}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryOption,
                    cat === category ? styles.selectedCategoryOption : { opacity: 0.6 },
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <View style={styles.categoryIconContainer}>
                    <MaterialIcons 
                      name={getCategoryIcon(cat)} 
                      size={24} 
                      color={cat === category ? theme.colors.businessPrimary : theme.colors.gray700} 
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryOptionText,
                      cat === category && styles.selectedCategoryOptionText,
                    ]}
                  >
                    {formatCategory(cat)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        

        {/* Tax Deductible Toggle */}
        <View style={styles.inputGroup}>
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Tax Deductible</Text>
            <Switch
              value={taxDeductible}
              onValueChange={setTaxDeductible}
              trackColor={{ false: theme.colors.gray300, true: theme.colors.businessPrimary + '80' }}
              thumbColor={taxDeductible ? theme.colors.businessPrimary : theme.colors.gray100}
            />
          </View>
        </View>

        {/* Recurring Toggle */}
        <View style={styles.inputGroup}>
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Recurring Bill</Text>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: theme.colors.gray300, true: theme.colors.businessPrimary + '80' }}
              thumbColor={isRecurring ? theme.colors.businessPrimary : theme.colors.gray100}
            />
          </View>
          
          {isRecurring && (
            <View style={styles.recurringOptionsContainer}>
              <Text style={styles.inputLabel}>Recurring Period</Text>
              <View style={styles.recurringOptions}>
                {['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.recurringOption,
                      recurringPeriod === period && styles.selectedRecurringOption,
                    ]}
                    onPress={() => setRecurringPeriod(period)}
                  >
                    <Text
                      style={[
                        styles.recurringOptionText,
                        recurringPeriod === period && styles.selectedRecurringOptionText,
                      ]}
                    >
                      {period.charAt(0) + period.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Reminder Slider */}
        <View style={styles.inputGroup}>
          <View style={styles.reminderHeader}>
            <Text style={styles.inputLabel}>Payment Reminder</Text>
            <Text style={styles.reminderDaysText}>{reminderDays} days before due date</Text>
          </View>
          
          <View style={styles.sliderContainer}>
            <TouchableOpacity
              style={styles.sliderButton}
              onPress={() => {
                const days = parseInt(reminderDays, 10);
                if (days > 1) setReminderDays((days - 1).toString());
              }}
            >
              <MaterialIcons name="remove" size={20} color={theme.colors.white} />
            </TouchableOpacity>
            
            <View style={styles.sliderTrack}>
              <View 
                style={[
                  styles.sliderFill,
                  { width: `${(parseInt(reminderDays, 10) / 30) * 100}%` },
                ]}
              />
            </View>
            
            <TouchableOpacity
              style={styles.sliderButton}
              onPress={() => {
                const days = parseInt(reminderDays, 10);
                if (days < 30) setReminderDays((days + 1).toString());
              }}
            >
              <MaterialIcons name="add" size={20} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 50 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.gray900,
  },
  saveButton: {
    backgroundColor: theme.colors.businessPrimary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.businessPrimary + '80',
  },
  saveButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.gray800,
    marginBottom: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.gray900,
    backgroundColor: theme.colors.white,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    borderRadius: 12,
    backgroundColor: theme.colors.white,
  },
  currencySymbol: {
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.businessPrimary,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.white,
  },
  dateText: {
    fontSize: 16,
    color: theme.colors.gray900,
  },
  categoriesContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  categoriesScrollContent: {
    paddingBottom: 8,
    paddingLeft: 4,
  },
  categoryOption: {
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
    width: 84,
  },
  categoryIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  selectedCategoryOption: {
    opacity: 1,
  },
  categoryOptionText: {
    fontSize: 12,
    color: theme.colors.gray800,
    textAlign: 'center',
  },
  selectedCategoryOptionText: {
    color: theme.colors.businessPrimary,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggleLabel: {
    fontSize: 16,
    color: theme.colors.gray800,
    fontWeight: '500',
  },
  recurringOptionsContainer: {
    marginTop: 16,
  },
  recurringOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  recurringOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    marginRight: 8,
    marginBottom: 4,
  },
  selectedRecurringOption: {
    backgroundColor: theme.colors.businessPrimary + '20',
    borderColor: theme.colors.businessPrimary,
  },
  recurringOptionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  selectedRecurringOptionText: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reminderDaysText: {
    fontSize: 16,
    color: theme.colors.gray800,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  sliderButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.businessPrimary,
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.border,
    marginHorizontal: 12,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
});



export default BusinessAddBillScreen;
