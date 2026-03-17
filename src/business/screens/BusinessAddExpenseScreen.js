/**
 * Business Add Expense Screen
 * Form for adding new business expenses with enhanced modern UI
 */
import React, { useState, useEffect, useCallback } from 'react';
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
  Image,
  StatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { createBusinessExpense, getBusinessExpenses, updateBusinessExpense } from '../services/businessApiService';
import { EXPENSE_CATEGORIES } from '../utils/businessConstants';
import theme from '../../styles/theme';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import * as ocrService from '../services/ocrService';

const BusinessAddExpenseScreen = ({ route, navigation }) => {
  const { expenseId, isEditing } = route.params || {};
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [category, setCategory] = useState(EXPENSE_CATEGORIES.OPERATIONAL);
  const [notes, setNotes] = useState('');
  const [receiptImage, setReceiptImage] = useState(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPeriod, setRecurringPeriod] = useState('monthly');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  
  // OCR related state
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrData, setOcrData] = useState(null);
  const [showOcrReviewModal, setShowOcrReviewModal] = useState(false);
  const [subtotal, setSubtotal] = useState('');
  
  // Tax breakdown state
  const [taxes, setTaxes] = useState({
    salesTax: '',
    stateTax: '',
    localTax: '',
    exciseTax: '',
    importDuty: '',
    otherTaxes: ''
  });
  
  // Tax rates state
  const [taxRates, setTaxRates] = useState({
    salesTaxRate: '',
    stateTaxRate: '',
    localTaxRate: ''
  });
  
  const [discount, setDiscount] = useState('');
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  // Fetch the expense details for editing
  const fetchExpenseDetails = useCallback(async () => {
    try {
      setLoading(true);
      // In a real implementation, there would be a getExpenseById endpoint
      // Here we're simulating it by getting all expenses and filtering
      const expenses = await getBusinessExpenses();
      const expense = expenses.find(exp => exp.id === expenseId);
      if (expense) {
        // Populate form with existing data
        setTitle(expense.title || '');
        setAmount(expense.amount ? expense.amount.toString() : '');
        setDate(expense.date ? new Date(expense.date) : new Date());
        setCategory(expense.category || EXPENSE_CATEGORIES.OPERATIONAL);
        setNotes(expense.description || expense.notes || '');
        setReceiptImage(expense.receiptImage ? { uri: expense.receiptImage } : null);
        setIsRecurring(expense.isRecurring || false);
        setRecurringPeriod(expense.recurringPeriod || 'monthly');
      }
    } catch (error) {
      //console.error('Error fetching expense details:', error);
      Alert.alert('Error', 'Failed to load expense details');
    } finally {
      setLoading(false);
    }
  }, [expenseId]);

  // Fetch expense data when in edit mode
  useEffect(() => {
    if (isEditing && expenseId) {
      fetchExpenseDetails();
    }
  }, [isEditing, expenseId, fetchExpenseDetails]);



  // Format category for display
  const formatCategory = (cat) => {
    return cat
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  // Map frontend category to backend category
  const mapCategoryToBackend = (frontendCategory) => {
    // Mapping of frontend categories to valid backend enum values
    const categoryMap = {
      [EXPENSE_CATEGORIES.OPERATIONAL]: 'PROFESSIONAL_SERVICES', // Map operational to professional services
      [EXPENSE_CATEGORIES.SUPPLIES]: 'OFFICE_SUPPLIES',
      [EXPENSE_CATEGORIES.SALARIES]: 'SALARY',
      [EXPENSE_CATEGORIES.RENT]: 'RENT',
      [EXPENSE_CATEGORIES.UTILITIES]: 'UTILITIES',
      [EXPENSE_CATEGORIES.MARKETING]: 'MARKETING',
      [EXPENSE_CATEGORIES.TAXES]: 'TAXES',
      [EXPENSE_CATEGORIES.INSURANCE]: 'INSURANCE',
      [EXPENSE_CATEGORIES.TRAVEL]: 'TRAVEL',
      [EXPENSE_CATEGORIES.PROFESSIONAL_SERVICES]: 'PROFESSIONAL_SERVICES',
      [EXPENSE_CATEGORIES.OTHER]: 'OTHER'
    };
    
    // Return the mapped category or 'OTHER' as fallback
    return categoryMap[frontendCategory] || 'OTHER';
  };

  // Get appropriate icon for category
  const getCategoryIcon = (cat) => {
    switch (cat) {
      case EXPENSE_CATEGORIES.OPERATIONAL:
        return 'settings';
      case EXPENSE_CATEGORIES.SUPPLIES:
        return 'shopping-cart';
      case EXPENSE_CATEGORIES.MARKETING:
        return 'campaign';
      case EXPENSE_CATEGORIES.TRAVEL:
        return 'flight';
      case EXPENSE_CATEGORIES.UTILITIES:
        return 'power';
      case EXPENSE_CATEGORIES.RENT:
        return 'home';
      case EXPENSE_CATEGORIES.PAYROLL:
        return 'people';
      case EXPENSE_CATEGORIES.INSURANCE:
        return 'health-and-safety';
      case EXPENSE_CATEGORIES.TAXES:
        return 'account-balance';
      case EXPENSE_CATEGORIES.PROFESSIONAL_SERVICES:
        return 'business-center';
      case EXPENSE_CATEGORIES.EQUIPMENT:
        return 'computer';
      case EXPENSE_CATEGORIES.DEBT_PAYMENT:
        return 'credit-card';
      case EXPENSE_CATEGORIES.OTHER:
        return 'more-horiz';
      default:
        return 'receipt';
    }
  };

  // Handle date change
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  // Take or select receipt image
  const handleReceiptImage = (type) => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1200,
      maxHeight: 1600,
      includeBase64: true,
    };

    if (type === 'camera') {
      launchCamera(options, response => {
        if (response.didCancel) {
          return;
        } else if (response.errorCode) {
          Alert.alert('Error', response.errorMessage);
          return;
        }
        setReceiptImage(response.assets[0]);
        processReceiptWithOcr(response.assets[0]);
      });
    } else {
      launchImageLibrary(options, response => {
        if (response.didCancel) {
          return;
        } else if (response.errorCode) {
          Alert.alert('Error', response.errorMessage);
          return;
        }
        setReceiptImage(response.assets[0]);
        processReceiptWithOcr(response.assets[0]);
      });
    }
  };
  
  // Process receipt image with OCR
  const processReceiptWithOcr = async (imageData) => {
    try {
      setIsOcrProcessing(true);

      // Use the base64 data if available or fetch it from URI
      const fileUri = imageData.uri;
      //console.log('Preparing image data, size:', imageData.fileSize, 'bytes', 'uri:', fileUri);
      
      // Get base64 data - it's already in the format we need from image picker
      const base64Data = imageData.base64;
      
      // Call OCR service with base64 data
      const result = await ocrService.scanExpenseReceipt(base64Data);

      //console.log('OCR result:', result);

      // Support both response formats (old format with result.data.extractedExpense and new format with result.extractedExpense)
      if (result && result.data && result.data.extractedExpense) {
        // Old format
        setOcrData(result.data.extractedExpense);
        setShowOcrReviewModal(true);
      } else if (result && result.extractedExpense) {
        // New format (direct from metadata-based processing)
        setOcrData(result.extractedExpense);
        setShowOcrReviewModal(true);
      } else {
        //console.log('OCR returned without expected data structure:', result);
        Alert.alert(
          'OCR Processing',
          'Image scanned, but no expense data could be extracted. Please fill in the details manually.'
        );
      }
    } catch (error) {
      //console.error('OCR processing error:', error);
      Alert.alert(
        'OCR Processing Failed',
        'Could not process the receipt image. Please try again or enter details manually.'
      );
    } finally {
      setIsOcrProcessing(false);
    }
  };
  
  // Apply OCR data to form
  const applyOcrData = () => {
    if (!ocrData) return;
    
    // Update form fields with extracted data
    if (ocrData.title) { setTitle(ocrData.title); }
    if (ocrData.amount) { setAmount(ocrData.amount.toString()); }
    if (ocrData.subtotal) { setSubtotal(ocrData.subtotal.toString()); }
    if (ocrData.date) { setDate(new Date(ocrData.date)); }
    if (ocrData.vendor) { setNotes(`Vendor: ${ocrData.vendor}\n${ocrData.notes || ''}`); }
    
    // Apply tax breakdown if available
    const newTaxes = { ...taxes };
    if (ocrData.salesTax) { newTaxes.salesTax = ocrData.salesTax.toString(); }
    if (ocrData.stateTax) { newTaxes.stateTax = ocrData.stateTax.toString(); }
    if (ocrData.localTax) { newTaxes.localTax = ocrData.localTax.toString(); }
    if (ocrData.exciseTax) { newTaxes.exciseTax = ocrData.exciseTax.toString(); }
    if (ocrData.importDuty) { newTaxes.importDuty = ocrData.importDuty.toString(); }
    if (ocrData.otherTaxes) { newTaxes.otherTaxes = ocrData.otherTaxes.toString(); }
    setTaxes(newTaxes);
    
    // Apply tax rates if available
    const newTaxRates = { ...taxRates };
    if (ocrData.salesTaxRate) { newTaxRates.salesTaxRate = ocrData.salesTaxRate.toString(); }
    if (ocrData.stateTaxRate) { newTaxRates.stateTaxRate = ocrData.stateTaxRate.toString(); }
    if (ocrData.localTaxRate) { newTaxRates.localTaxRate = ocrData.localTaxRate.toString(); }
    setTaxRates(newTaxRates);
    
    // Apply discount if available
    if (ocrData.discount) { setDiscount(ocrData.discount.toString()); }
    
    // If tax information is found, show the tax breakdown section
    if (ocrData.salesTax || ocrData.stateTax || ocrData.localTax) {
      setShowTaxBreakdown(true);
    }
    
    // Map OCR category to expense category if possible
    if (ocrData.category) {
      const categoryMapping = {
        'FOOD': EXPENSE_CATEGORIES.FOOD,
        'TRANSPORTATION': EXPENSE_CATEGORIES.TRAVEL,
        'ACCOMMODATION': EXPENSE_CATEGORIES.TRAVEL,
        'ENTERTAINMENT': EXPENSE_CATEGORIES.ENTERTAINMENT,
        'MISCELLANEOUS': EXPENSE_CATEGORIES.OTHER,
      };

      // Return the mapped category or 'OTHER' as fallback
      setCategory(categoryMapping[ocrData.category] || EXPENSE_CATEGORIES.OTHER);
    }
    
    // Close the review modal
    setShowOcrReviewModal(false);
  };

  // Select receipt image method (camera or gallery)
  const selectReceiptImageMethod = () => {
    Alert.alert(
      'Add Receipt',
      'Choose a method to add receipt',
      [
        {
          text: 'Camera',
          onPress: () => handleReceiptImage('camera'),
        },
        {
          text: 'Photo Library',
          onPress: () => handleReceiptImage('gallery'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  // Remove receipt image
  const removeReceiptImage = () => {
    setReceiptImage(null);
  };

  // Reset form fields function
  const resetForm = () => {
    setTitle('');
    setAmount('');
    setSubtotal('');
    setDate(new Date());
    setCategory(EXPENSE_CATEGORIES.OTHER);
    setNotes('');
    setReceiptImage(null);
    setIsRecurring(false);
    setRecurringPeriod('monthly');
    setTaxes({
      salesTax: '',
      stateTax: '',
      localTax: '',
      exciseTax: '',
      importDuty: '',
      otherTaxes: ''
    });
    setTaxRates({
      salesTaxRate: '',
      stateTaxRate: '',
      localTaxRate: ''
    });
    setDiscount('');
    setShowTaxBreakdown(false);
    setOcrData(null);
  };

  // Save expense
  const saveExpense = async () => {
    if (!title || !amount) {
      Alert.alert('Missing Information', 'Please provide expense title and amount');
      return;
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      
      // Prepare expense data
      const expenseData = {
        title,
        description: notes,
        amount: parseFloat(amount),
        subtotal: subtotal ? parseFloat(subtotal) : parseFloat(amount),
        date,
        category: mapCategoryToBackend(category),
        isRecurring,
        recurringPeriod: isRecurring ? recurringPeriod : null,
        receiptImage: receiptImage?.uri || null,
        discount: discount ? parseFloat(discount) : 0,
        taxes: {
          salesTax: taxes.salesTax ? parseFloat(taxes.salesTax) : 0,
          stateTax: taxes.stateTax ? parseFloat(taxes.stateTax) : 0,
          localTax: taxes.localTax ? parseFloat(taxes.localTax) : 0,
          exciseTax: taxes.exciseTax ? parseFloat(taxes.exciseTax) : 0,
          importDuty: taxes.importDuty ? parseFloat(taxes.importDuty) : 0,
          otherTaxes: taxes.otherTaxes ? parseFloat(taxes.otherTaxes) : 0
        },
        taxRates: {
          salesTaxRate: taxRates.salesTaxRate ? parseFloat(taxRates.salesTaxRate) : 0,
          stateTaxRate: taxRates.stateTaxRate ? parseFloat(taxRates.stateTaxRate) : 0,
          localTaxRate: taxRates.localTaxRate ? parseFloat(taxRates.localTaxRate) : 0
        }
      };
      
      // For debugging
      //console.log('Mapped category:', category, '→', mapCategoryToBackend(category));
      //console.log('About to call API with data:', expenseData);
      // The API call will throw an error for 403 responses (subscription limits)
      // Make API call
      let response;
      if (isEditing && expenseId) {
        // Update existing expense
        response = await updateBusinessExpense(expenseId, expenseData);
      } else {
        // Create new expense
        response = await createBusinessExpense(expenseData);
      }
      
      // Check if the response indicates a subscription limit error
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
      
      // Only show success message if we got here (no errors)
      const successMessage = isEditing ? 'Expense updated successfully' : 'Expense added successfully';
      Alert.alert('Success', successMessage, [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      //console.error(`Error ${isEditing ? 'updating' : 'creating'} expense:`, error);
      
      // Generic error handling for all other types of errors
      const errorMessage = error.message || `Failed to ${isEditing ? 'update' : 'create'} expense. Please try again.`;
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Expense' : 'Add Expense'}</Text>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={saveExpense}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>{isEditing ? 'Update' : 'Save'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.formContainer}>
        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Expense Title *</Text>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter expense title"
            placeholderTextColor={theme.colors.textTertiary}
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
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>
          
          {/* Tax & Discount Toggle */}
          <TouchableOpacity
            style={styles.taxToggleContainer}
            onPress={() => setShowTaxBreakdown(!showTaxBreakdown)}
          >
            <Text style={styles.taxToggleText}>Show Tax & Discount Details</Text>
            <MaterialIcons
              name={showTaxBreakdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={20}
              color={theme.colors.businessPrimary}
            />
          </TouchableOpacity>
          
          {/* Tax & Discount Details */}
          {showTaxBreakdown && (
            <View style={styles.taxBreakdownContainer}>
              {/* Subtotal */}
              <View style={styles.taxInputGroup}>
                <Text style={styles.taxInputLabel}>Subtotal</Text>
                <View style={styles.amountContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={subtotal}
                    onChangeText={setSubtotal}
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>
              </View>
              
              {/* Sales Tax */}
              <View style={styles.taxRowContainer}>
                <View style={styles.taxAmountContainer}>
                  <Text style={styles.taxInputLabel}>Sales Tax</Text>
                  <View style={styles.amountContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={taxes.salesTax}
                      onChangeText={(value) => setTaxes({...taxes, salesTax: value})}
                      placeholderTextColor={theme.colors.textTertiary}
                    />
                  </View>
                </View>
                <View style={styles.taxRateContainer}>
                  <Text style={styles.taxInputLabel}>Rate %</Text>
                  <TextInput
                    style={styles.taxRateInput}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    value={taxRates.salesTaxRate}
                    onChangeText={(value) => setTaxRates({...taxRates, salesTaxRate: value})}
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>
              </View>
              
              {/* State Tax */}
              <View style={styles.taxRowContainer}>
                <View style={styles.taxAmountContainer}>
                  <Text style={styles.taxInputLabel}>State Tax</Text>
                  <View style={styles.amountContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={taxes.stateTax}
                      onChangeText={(value) => setTaxes({...taxes, stateTax: value})}
                      placeholderTextColor={theme.colors.textTertiary}
                    />
                  </View>
                </View>
                <View style={styles.taxRateContainer}>
                  <Text style={styles.taxInputLabel}>Rate %</Text>
                  <TextInput
                    style={styles.taxRateInput}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    value={taxRates.stateTaxRate}
                    onChangeText={(value) => setTaxRates({...taxRates, stateTaxRate: value})}
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>
              </View>
              
              {/* Local Tax */}
              <View style={styles.taxRowContainer}>
                <View style={styles.taxAmountContainer}>
                  <Text style={styles.taxInputLabel}>Local Tax</Text>
                  <View style={styles.amountContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={taxes.localTax}
                      onChangeText={(value) => setTaxes({...taxes, localTax: value})}
                      placeholderTextColor={theme.colors.textTertiary}
                    />
                  </View>
                </View>
                <View style={styles.taxRateContainer}>
                  <Text style={styles.taxInputLabel}>Rate %</Text>
                  <TextInput
                    style={styles.taxRateInput}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    value={taxRates.localTaxRate}
                    onChangeText={(value) => setTaxRates({...taxRates, localTaxRate: value})}
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>
              </View>
              
              {/* Other Taxes */}
              <View style={styles.taxInputGroup}>
                <Text style={styles.taxInputLabel}>Excise Tax</Text>
                <View style={styles.amountContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={taxes.exciseTax}
                    onChangeText={(value) => setTaxes({...taxes, exciseTax: value})}
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>
              </View>
              
              <View style={styles.taxInputGroup}>
                <Text style={styles.taxInputLabel}>Import Duty</Text>
                <View style={styles.amountContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={taxes.importDuty}
                    onChangeText={(value) => setTaxes({...taxes, importDuty: value})}
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>
              </View>
              
              <View style={styles.taxInputGroup}>
                <Text style={styles.taxInputLabel}>Other Taxes</Text>
                <View style={styles.amountContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={taxes.otherTaxes}
                    onChangeText={(value) => setTaxes({...taxes, otherTaxes: value})}
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>
              </View>
              
              {/* Discount */}
              <View style={styles.taxInputGroup}>
                <Text style={styles.taxInputLabel}>Discount</Text>
                <View style={styles.amountContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={discount}
                    onChangeText={setDiscount}
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>
              </View>
              
              
            </View>
          )}
        </View>

        {/* Date Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Date</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {format(date, 'MMMM d, yyyy')}
            </Text>
            <MaterialIcons name="calendar-today" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}
        </View>

        {/* Category Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Category</Text>
          <TouchableOpacity
            style={[styles.pickerButton, showCategoryPicker && styles.pickerButtonActive]}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            activeOpacity={0.7}
          >
            <View style={styles.pickerContent}>
              <MaterialIcons
                name={getCategoryIcon(category)}
                size={22}
                color={theme.colors.businessPrimary}
                style={styles.categoryIcon}
              />
              <Text style={styles.pickerButtonText}>
                {formatCategory(category)}
              </Text>
            </View>
            <MaterialIcons
              name={showCategoryPicker ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={24}
              color={theme.colors.businessPrimary}
            />
          </TouchableOpacity>
          
          {showCategoryPicker && (
            <View style={styles.categoryPickerContainer}>
              <ScrollView style={styles.categoryScrollView} showsVerticalScrollIndicator={false}>
                {Object.values(EXPENSE_CATEGORIES).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryOption,
                      cat === category && styles.selectedCategoryOption,
                    ]}
                    onPress={() => {
                      setCategory(cat);
                      setShowCategoryPicker(false);
                    }}
                    activeOpacity={0.6}
                  >
                    <View style={styles.categoryOptionContent}>
                      <MaterialIcons
                        name={getCategoryIcon(cat)}
                        size={20}
                        color={cat === category ? theme.colors.businessPrimary : theme.colors.gray700}
                        style={styles.categoryIcon}
                      />
                      <Text
                        style={[
                          styles.categoryOptionText,
                          cat === category && styles.selectedCategoryOptionText,
                        ]}
                      >
                        {formatCategory(cat)}
                      </Text>
                    </View>
                    {cat === category && (
                      <MaterialIcons name="check-circle" size={20} color={theme.colors.businessPrimary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Notes Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Notes</Text>
          <TextInput
            style={[styles.textInput, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add details about this expense"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Receipt Image */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Receipt</Text>
          {isOcrProcessing ? (
            <View style={styles.uploadButton}>
              <ActivityIndicator size="small" color={theme.colors.businessPrimary} />
              <Text style={styles.processingText}>Scanning receipt...</Text>
            </View>
          ) : receiptImage ? (
            <View style={styles.imagePreview}>
              <Image
                source={{ uri: receiptImage.uri }}
                style={styles.uploadedImage}
                resizeMode="contain"
              />
              <View style={styles.imageActions}>
                <TouchableOpacity
                  style={styles.imageActionButton}
                  onPress={selectReceiptImageMethod}
                >
                  <MaterialIcons name="camera-alt" size={20} color={theme.colors.businessPrimary} />
                  <Text style={styles.imageActionText}>Replace</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.imageActionButton}
                  onPress={() => setReceiptImage(null)}
                >
                  <MaterialIcons name="delete" size={20} color={theme.colors.error} />
                  <Text style={[styles.imageActionText, { color: theme.colors.error }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={selectReceiptImageMethod}>
              <MaterialIcons name="document-scanner" size={24} color={theme.colors.businessPrimary} />
              <Text style={styles.uploadText} color={theme.colors.businessPrimary}>   Scan Receipt</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recurring Toggle */}
        <View style={styles.inputGroup}>
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Recurring Expense</Text>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: '#ccc', true: theme.colors.primary + '80' }}
              thumbColor={isRecurring ? theme.colors.primary : '#f4f3f4'}
            />
          </View>
          
          {isRecurring && (
            <View style={styles.recurringOptionsContainer}>
              <Text style={styles.inputLabel}>Recurring Period</Text>
              <View style={styles.recurringOptions}>
                {['weekly', 'monthly', 'quarterly', 'yearly'].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.recurringOption,
                      recurringPeriod === period && styles.selectedRecurringOption
                    ]}
                    onPress={() => setRecurringPeriod(period)}
                  >
                    <Text
                      style={[
                        styles.recurringOptionText,
                        recurringPeriod === period && styles.selectedRecurringOptionText,
                      ]}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* OCR Review Modal */}
      <Modal
        visible={showOcrReviewModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOcrReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scanned Receipt Data</Text>
              <TouchableOpacity onPress={() => setShowOcrReviewModal(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.gray700} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {ocrData && (
                <>
                  <View style={styles.ocrDataItem}>
                    <Text style={styles.ocrDataLabel}>Vendor:</Text>
                    <Text style={styles.ocrDataValue}>{ocrData.title || 'Not detected'}</Text>
                  </View>
                  
                  <View style={styles.ocrDataItem}>
                    <Text style={styles.ocrDataLabel}>Amount:</Text>
                    <Text style={styles.ocrDataValue}>
                      ${ocrData.amount ? parseFloat(ocrData.amount).toFixed(2) : 'Not detected'}
                    </Text>
                  </View>
                  
                  <View style={styles.ocrDataItem}>
                    <Text style={styles.ocrDataLabel}>Date:</Text>
                    <Text style={styles.ocrDataValue}>
                      {ocrData.date 
                        ? format(new Date(ocrData.date), 'MMMM d, yyyy') 
                        : 'Not detected'}
                    </Text>
                  </View>
                  
                  {ocrData.subtotal && (
                    <View style={styles.ocrDataItem}>
                      <Text style={styles.ocrDataLabel}>Subtotal:</Text>
                      <Text style={styles.ocrDataValue}>
                        ${parseFloat(ocrData.subtotal).toFixed(2)}
                      </Text>
                    </View>
                  )}
                  
                  {ocrData.salesTax && (
                    <View style={styles.ocrDataItem}>
                      <Text style={styles.ocrDataLabel}>Sales Tax:</Text>
                      <Text style={styles.ocrDataValue}>
                        ${parseFloat(ocrData.salesTax).toFixed(2)}
                      </Text>
                    </View>
                  )}
                  
                  {/* Other tax fields could be added here */}
                  
                  {ocrData.notes && (
                    <View style={styles.ocrDataItem}>
                      <Text style={styles.ocrDataLabel}>Notes:</Text>
                      <Text style={styles.ocrDataValue}>{ocrData.notes}</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.secondaryButton]}
                onPress={() => setShowOcrReviewModal(false)}
              >
                <Text style={styles.secondaryButtonText}>Edit Manually</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.primaryButton]}
                onPress={applyOcrData}
              >
                <Text style={styles.primaryButtonText}>Use This Data</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.gray900,
  },
  submitButton: {
    backgroundColor: theme.colors.businessPrimary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.businessPrimary + '80',
  },
  buttonText: {
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
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
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
    color: theme.colors.text,
  },
  pickerButton: {
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
  pickerButtonActive: {
    borderColor: theme.colors.businessPrimary,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    marginRight: 10,
  },
  pickerButtonText: {
    fontSize: 16,
    color: theme.colors.gray900,
  },
  categoryPickerContainer: {
    marginTop: -1,
    borderWidth: 1,
    borderColor: theme.colors.businessPrimary,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: theme.colors.white,
    maxHeight: 250,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
    zIndex: 10,
  },
  categoryScrollView: {
    maxHeight: 220,
  },
  categoryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
  },
  categoryOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedCategoryOption: {
    backgroundColor: theme.colors.businessPrimary + '15',
  },
  categoryOptionText: {
    fontSize: 16,
    color: theme.colors.gray800,
  },
  selectedCategoryOptionText: {
    color: theme.colors.businessPrimary,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  selectedRecurringOption: {
    backgroundColor: theme.colors.businessPrimary + '20',
    borderColor: theme.colors.businessPrimary,
  },
  recurringOptionText: {
    fontSize: 14,
    color: theme.colors.gray700,
  },
  selectedRecurringOptionText: {
    color: theme.colors.businessPrimary,
    fontWeight: '600',
  },
  // Receipt scanning styles
  uploadButton: {
    flexDirection: 'row',
    height: 60,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.gray100,
  },
  processingText: {
  uploadText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.businessPrimary,
   marginLeft: 8,
  },
  uploadHint: {
    fontSize: 12,
    color: theme.colors.gray600,
    fontStyle: 'italic',
    marginTop: 4,
  },
  
    marginBottom: 8,
  },
  imageActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  imageActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  imageActionText: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.businessPrimary,
  },
  // OCR Review Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.gray900,
  },
  modalBody: {
    padding: 24,
    maxHeight: 400,
  },
  ocrDataItem: {
    marginBottom: 16,
  },
  ocrDataLabel: {
    fontSize: 14,
    color: theme.colors.gray600,
    marginBottom: 4,
  },
  ocrDataValue: {
    fontSize: 16,
    color: theme.colors.gray900,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray200,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: theme.colors.businessPrimary,
    marginLeft: 12,
  },
  secondaryButton: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.businessPrimary,
    marginRight: 12,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: theme.colors.businessPrimary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Tax breakdown styles
  taxToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray300,
    marginTop: 10,
  },
  taxToggleText: {
    fontSize: 15,
    color: theme.colors.businessPrimary,
    fontWeight: '500',
  },
  taxBreakdownContainer: {
    backgroundColor: theme.colors.gray100,
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  taxInfoText: {
    fontSize: 14,
    color: theme.colors.gray600,
    marginTop: 12,
    lineHeight: 20,
  },
  taxInputGroup: {
    marginBottom: 12,
  },
  taxInputLabel: {
    fontSize: 14,
    color: theme.colors.gray700,
    marginBottom: 6,
  },
  taxRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  taxAmountContainer: {
    flex: 3,
    marginRight: 12,
  },
  taxRateContainer: {
    flex: 1,
  },
  taxRateInput: {
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.colors.gray900,
    backgroundColor: theme.colors.white,
  },
  addReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.gray300,
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: theme.colors.gray100,
  },
  addReceiptText: {
    marginLeft: 10,
    fontSize: 16,
    color: theme.colors.businessPrimary,
    fontWeight: '500',
  },
  receiptImageContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeReceiptButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: theme.colors.businessError,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});



export default BusinessAddExpenseScreen;
