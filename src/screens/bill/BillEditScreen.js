/**
 * Edit Bill Screen for BillsAI app
 * Allows users to edit an existing bill's details
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import theme from '../../styles/theme';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Icon from 'react-native-vector-icons/Ionicons';
import * as billService from '../../services/billService';

// Available categories based on the enum in the model
const CATEGORIES = [
  'RENT',
  'UTILITIES',
  'SUBSCRIPTION',
  'CREDIT_CARD',
  'LOAN',
  'INSURANCE',
  'GROCERY',
  'TRANSPORTATION',
  'ENTERTAINMENT',
  'HEALTHCARE',
  'EDUCATION',
  'OTHER',
];

// Available recurring periods based on the enum in the model
const RECURRING_PERIODS = [
  'DAILY',
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'SEMIANNUAL',
  'ANNUAL',
];

const BillEditScreen = ({ route, navigation }) => {
  const { billId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [originalBill, setOriginalBill] = useState(null);

  // State for form fields
  const [billName, setBillName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueDateObj, setDueDateObj] = useState(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPeriod, setRecurringPeriod] = useState('MONTHLY');
  const [reminderDays, setReminderDays] = useState('3'); // Default reminder of 3 days
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('UNPAID');

  // Modal visibility states
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [periodModalVisible, setPeriodModalVisible] = useState(false);

  // State for form validation
  const [errors, setErrors] = useState({});

  // Fetch bill data when component mounts
  useEffect(() => {
    const fetchBillDetails = async () => {
      if (!billId) {
        Alert.alert(
          'Error',
          'No bill ID provided. Please go back and try again.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      try {
        setLoading(true);
        const response = await billService.getBillById(billId);

        if (response) {
          setOriginalBill(response);

          // Format date from ISO string to MM/DD/YYYY
          const formatDate = (isoString) => {
            const date = new Date(isoString);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const year = date.getFullYear();
            return `${month}/${day}/${year}`;
          };

          // Populate form fields
          setBillName(response.title || '');
          setAmount(response.amount ? response.amount.toString() : '');

          // Set both the date string and Date object
          if (response.dueDate) {
            const dateObj = new Date(response.dueDate);
            setDueDateObj(dateObj);
            setDueDate(formatDate(response.dueDate));
          }

          setCategory(response.category || '');
          setIsRecurring(response.isRecurring || false);
          setRecurringPeriod(response.recurringPeriod || 'MONTHLY');
          setReminderDays(response.reminderDays ? response.reminderDays.toString() : '3');
          setNotes(response.description || '');
          setStatus(response.status || 'UNPAID');
        } else {
          Alert.alert(
            'Error',
            'Bill not found.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } catch (error) {
        ////console.error('Error fetching bill details:', error);
        Alert.alert(
          'Error',
          'Failed to load bill details. Please try again.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBillDetails();
  }, [billId, navigation]);

  // Handle form submission
  const handleSubmit = async () => {
    // Validate the form data
    const newErrors = {};
    if (!billName) { newErrors.billName = 'Bill name is required'; }
    if (!amount) { newErrors.amount = 'Amount is required'; }
    if (!parseFloat(amount)) { newErrors.amount = 'Amount must be a valid number'; }
    if (!dueDate) { newErrors.dueDate = 'Due date is required'; }

    // Check if date format is valid
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/; // MM/DD/YYYY format
    if (dueDate && !dateRegex.test(dueDate)) {
      newErrors.dueDate = 'Due date must be in MM/DD/YYYY format';
    }

    if (!category) { newErrors.category = 'Category is required'; }

    // If there are errors, show them and don't proceed
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Clear any existing errors
    setErrors({});

    // Parse the date correctly from MM/DD/YYYY format
    const [month, day, year] = dueDate.split('/');
    const formattedDate = new Date(`${year}-${month}-${day}`);

    const updatedBill = {
      title: billName,
      amount: parseFloat(amount),
      dueDate: formattedDate.toISOString(),
      category: category,
      description: notes || '',
      status: status, // Preserve original status
      isRecurring: isRecurring,
      reminderDays: parseInt(reminderDays, 10) || 3, // Add reminder days
      // Preserve existing fields
      notificationIds: originalBill.notificationIds || [],
      lastNotificationDate: originalBill.lastNotificationDate || null,
      lastPaidDate: originalBill.lastPaidDate || null,
      // Only add recurringPeriod if the bill is recurring
      ...(isRecurring && { recurringPeriod }),
    };

    ////console.log('Updating bill data:', JSON.stringify(updatedBill, null, 2));

    try {
      await billService.updateBill(billId, updatedBill);
      ////console.log('Bill updated successfully:', result);

      Alert.alert(
        'Success',
        'Bill updated successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      //console.error('Error updating bill:', error);
      Alert.alert('Error', 'Failed to update bill: ' + (error.message || 'Unknown error'));
    }
  };

  // Handle back button press
  const handleBack = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'android' && styles.androidSafeArea]}>
      {/* Category Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={categoryModalVisible}
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <FlatList
              data={CATEGORIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setCategory(item);
                    setCategoryModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemText, category === item && styles.selectedItem]}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setCategoryModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Recurring Period Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={periodModalVisible}
        onRequestClose={() => setPeriodModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Recurring Period</Text>
            <FlatList
              data={RECURRING_PERIODS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setRecurringPeriod(item);
                    setPeriodModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemText, recurringPeriod === item && styles.selectedItem]}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setPeriodModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={theme.colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Bill</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Form */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.formContainer}>
            {/* Bill Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Bill Name</Text>
              <Input
                placeholder="Enter bill name"
                value={billName}
                onChangeText={setBillName}
                error={errors.billName}
                style={styles.input}
              />
            </View>

            {/* Amount */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Amount</Text>
              <Input
                placeholder="Enter amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                error={errors.amount}
                style={styles.input}
              />
            </View>

            {/* Due Date */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Due Date</Text>
              <TouchableOpacity
                style={[styles.pickerButton, errors.dueDate && styles.inputError]}
                onPress={() => setDatePickerOpen(true)}
              >
                <Text style={dueDate ? styles.pickerText : styles.pickerPlaceholder}>
                  {dueDate || 'Select a date'}
                </Text>
                <Icon name="calendar" size={20} color={theme.colors.gray600} />
              </TouchableOpacity>
              {errors.dueDate && (
                <Text style={styles.errorText}>{errors.dueDate}</Text>
              )}

              <DatePicker
                modal
                open={datePickerOpen}
                date={dueDateObj}
                mode="date"
                onConfirm={(date) => {
                  setDatePickerOpen(false);
                  setDueDateObj(date);
                  // Format the date as MM/DD/YYYY
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const year = date.getFullYear();
                  setDueDate(`${month}/${day}/${year}`);
                }}
                onCancel={() => {
                  setDatePickerOpen(false);
                }}
              />
            </View>

            {/* Category */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Category</Text>
              <TouchableOpacity
                style={[styles.pickerButton, errors.category && styles.inputError]}
                onPress={() => setCategoryModalVisible(true)}
              >
                <Text style={category ? styles.pickerText : styles.pickerPlaceholder}>
                  {category || 'Select a category'}
                </Text>
                <Icon name="chevron-down" size={20} color={theme.colors.gray600} />
              </TouchableOpacity>
              {errors.category && (
                <Text style={styles.errorText}>{errors.category}</Text>
              )}
            </View>

            {/* Recurring Bill */}
            <View style={styles.switchContainer}>
              <Text style={styles.label}>Recurring Bill</Text>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  isRecurring ? styles.toggleActive : styles.toggleInactive,
                ]}
                onPress={() => setIsRecurring(!isRecurring)}
              >
                <View
                  style={[
                    styles.toggleCircle,
                    isRecurring
                      ? styles.toggleCircleRight
                      : styles.toggleCircleLeft,
                  ]}
                />
              </TouchableOpacity>
            </View>

            {/* Recurring Period (shown only if isRecurring is true) */}
            {isRecurring && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Recurring Period</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setPeriodModalVisible(true)}
                >
                  <Text style={styles.pickerText}>{recurringPeriod}</Text>
                  <Icon name="chevron-down" size={20} color={theme.colors.gray600} />
                </TouchableOpacity>
              </View>
            )}

            {/* Reminder Days */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Reminder Days</Text>
              <Input
                placeholder="Days before due date for reminder"
                value={reminderDays}
                onChangeText={setReminderDays}
                keyboardType="numeric"
                style={styles.input}
                info="How many days before the due date you want to receive a reminder"
              />
            </View>

            {/* Notes */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <Input
                placeholder="Add notes about this bill"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                style={[styles.input, styles.textArea]}
              />
            </View>

            {/* Submit Button */}
            <Button
              title="Update Bill"
              variant="primary"
              onPress={handleSubmit}
              style={styles.submitButton}
            />

            {/* Cancel Button */}
            <Button
              title="Cancel"
              variant="outline"
              onPress={handleBack}
              style={styles.cancelButton}
              textStyle={styles.cancelButtonText}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    padding: theme.spacing.sm,
    marginLeft: -theme.spacing.sm,
  },
  headerRight: {
    width: 24, // Same width as the back button for balance
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: theme.spacing.lg,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.typography.fontSizes.regular,
    fontWeight: theme.typography.fontWeights.semibold,
    marginBottom: theme.spacing.xs,
    color: theme.colors.gray800,
  },
  input: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.gray300,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSizes.regular,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.fontSizes.small,
    marginTop: theme.spacing.xs,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.gray300,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  pickerText: {
    fontSize: theme.typography.fontSizes.regular,
    color: theme.colors.black,
  },
  pickerPlaceholder: {
    fontSize: theme.typography.fontSizes.regular,
    color: theme.colors.gray500,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  toggleButton: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleInactive: {
    backgroundColor: theme.colors.gray300,
  },
  toggleCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.white,
  },
  toggleCircleLeft: {
    alignSelf: 'flex-start',
  },
  toggleCircleRight: {
    alignSelf: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: theme.typography.fontSizes.large,
    fontWeight: theme.typography.fontWeights.bold,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
  },
  modalItemText: {
    fontSize: theme.typography.fontSizes.regular,
  },
  selectedItem: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeights.bold,
  },
  closeButton: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray200,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  closeButtonText: {
    color: theme.colors.black,
    fontSize: theme.typography.fontSizes.regular,
    fontWeight: theme.typography.fontWeights.medium,
  },
  submitButton: {
    marginVertical: theme.spacing.lg,
  },
  cancelButton: {
    marginBottom: theme.spacing.xl,
  },
  cancelButtonText: {
    color: theme.colors.primary,
  },
});

export default BillEditScreen;
