/**
 * Add Bill Screen for BillsAI app
 * Allows users to add a new bill with all required details
 */

import React, { useState, useEffect, useCallback } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import theme from '../../styles/theme';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Icon from 'react-native-vector-icons/Ionicons';
import BillIcon from '../../components/bill/BillIcon';
import * as billService from '../../services/billService';
import userService from '../../services/userService';

// Available categories based on the enum in the model
const CATEGORIES = [
  'RENT',
  'UTILITIES',
  'SUBSCRIPTION',
  'CREDIT_CARD',
  'EMI',
  'LOAN',
  'INSURANCE',
  'FOOD',
  'GROCERY',
  'TRANSPORTATION',
  'TRAVEL',
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

const AddBillScreen = ({ navigation }) => {
  // Get current user from auth context

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

  // Bill splitting states
  const [isShared, setIsShared] = useState(false);
  const [sharedWith, setSharedWith] = useState([]);
  const [usernameSearch, setUsernameSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [splitType, setSplitType] = useState('EQUAL'); // EQUAL or CUSTOM
  const [currentUser, setCurrentUser] = useState(null); // Store current user info

  // Modal visibility states
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  // Currency preference state
  const [currencyPreference, setCurrencyPreference] = useState('USD ($)');
  const [periodModalVisible, setPeriodModalVisible] = useState(false);
  const [userSearchModalVisible, setUserSearchModalVisible] = useState(false);

  // State for form validation
  const [errors, setErrors] = useState({});

  // State for percentage and split calculations
  const [percentage, setPercentage] = useState({});
  const [splitAmount, setSplitAmount] = useState({});

  // Fetch current user profile on component mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const profile = await userService.getUserProfile();
        setCurrentUser(profile);
        // Set currency preference from user profile
        if (profile?.preferences?.currency) {
          setCurrencyPreference(profile.preferences.currency);
        }
      } catch (error) {
        ////console.error('Error fetching current user profile:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  // Search for users by username
  const handleUserSearch = async (username) => {
    if (!username || username.trim() === '') {
      setSearchResults([]);
      return;
    }
    try {
      setIsSearching(true);
      const result = await userService.searchUsers(username);
      setSearchResults(result.users || []);
    } catch (error) {
      ////console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users: ' + (error.message || 'Unknown error'));
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Effect to debounce user search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (usernameSearch) {
        handleUserSearch(usernameSearch);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [usernameSearch]);

  // Add user to shared list with currency validation
  const addUserToSharedList = (user) => {
    // Check if user is already in list
    if (sharedWith.some(u => u._id === user._id)) {
      Alert.alert('User already added', 'This user is already on the shared list.');
      return;
    }
    // Get current user's currency preference
    const currentUserCurrency = currentUser?.preferences?.currency || currencyPreference;
    // Get the user's currency preference
    const userCurrency = user?.preferences?.currency || 'USD ($)';

    // Check if currencies match
    if (currentUserCurrency !== userCurrency) {
      Alert.alert(
        'Currency Mismatch',
        `This user has a different currency preference (${userCurrency}) than yours (${currentUserCurrency}). Bills can only be shared between users with the same currency setting.`,
        [
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }
    // Add user to shared list if currencies match
    setSharedWith([...sharedWith, user]);
    setUsernameSearch('');
    setUserSearchModalVisible(false);
  };

  // Remove user from shared list
  const removeUserFromSharedList = (userId) => {
    setSharedWith(sharedWith.filter(user => user._id !== userId));
  };

  // Helper function to calculate split amounts based on percentages or equal split
  // Helper function to format currency with user's preferred currency symbol
  const formatCurrency = useCallback((value) => {
    // Format the numeric part of the currency
    return `${parseFloat(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }, []);

  // Helper function to get currency symbol from preferences
  const getCurrencySymbol = useCallback(() => {
    const symbolMatch = currencyPreference.match(/\(([^)]+)\)/);
    return symbolMatch ? symbolMatch[1] : '$';
  }, [currencyPreference]);

  const calculateSplitAmounts = useCallback(() => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return {};
    }

    const billAmount = parseFloat(amount);
    const result = {};

    if (!isShared || sharedWith.length === 0) {
      // If not shared, creator pays full amount
      result.currentUser = billAmount;
      return result;
    }

    // Handle equal split - divide the bill amount equally among all participants
    if (splitType === 'EQUAL') {
      // Total participants = current user + shared users
      const totalParticipants = sharedWith.length + 1;
      // Equal amount per person
      const equalAmount = billAmount / totalParticipants;

      // Set amount for current user
      result.currentUser = equalAmount;

      // Set equal amount for each shared user
      for (const user of sharedWith) {
        result[user._id] = equalAmount;
      }

      return result;
    }

    // For CUSTOM split - calculate display amounts based on percentages
    // Note: These are only for UI display - server calculates the official values
    const creatorPercentage = parseFloat(percentage.currentUser || '0');
    if (!isNaN(creatorPercentage)) {
      result.currentUser = (creatorPercentage / 100) * billAmount;
    }

    for (const user of sharedWith) {
      const userPercentage = parseFloat(percentage[user._id] || '0');
      if (!isNaN(userPercentage)) {
        result[user._id] = (userPercentage / 100) * billAmount;
      }
    }

    return result;
  }, [amount, isShared, sharedWith, percentage, splitType]);

  // Recalculate split amounts whenever relevant values change
  useEffect(() => {
    const newSplitAmounts = calculateSplitAmounts();
    setSplitAmount(newSplitAmounts);
  }, [calculateSplitAmounts]);

  // Validate percentages for custom split
  const validatePercentages = () => {
    // Only need to validate for custom split with shared users
    if (splitType !== 'CUSTOM' || !isShared || sharedWith.length === 0) {
      return true;
    }

    // Reset any previous errors
    setErrors({}); // Clear any previous errors
    let newErrors = {};
    let isValid = true;

    // Calculate the total percentage
    let total = 0;

    // Validate the current user percentage
    const creatorPercentage = parseFloat(percentage.currentUser || '0');
    if (isNaN(creatorPercentage)) {
      newErrors.currentUser = 'Must be a number';
      isValid = false;
    } else if (creatorPercentage < 0) {
      newErrors.currentUser = 'Cannot be negative';
      isValid = false;
    } else {
      total += creatorPercentage;
    }

    // Validate each shared user's percentage
    for (const user of sharedWith) {
      const userPercentage = parseFloat(percentage[user._id] || '0');
      if (isNaN(userPercentage)) {
        newErrors[user._id] = 'Must be a number';
        isValid = false;
      } else if (userPercentage < 0) {
        newErrors[user._id] = 'Cannot be negative';
        isValid = false;
      } else {
        total += userPercentage;
      }
    }

    // Check if the total is reasonably close to 100%
    if (isValid && Math.abs(total - 100) > 0.5) { // More lenient epsilon for usability
      // If validation is for form submission, show an alert
      Alert.alert(
        'Percentages Don\'t Add Up',
        `Total percentage should be 100%. Current total: ${total.toFixed(1)}%\n\nWould you like to automatically adjust the values?`,
        [
          {
            text: 'Yes, Adjust',
            onPress: () => {
              // Normalize percentages to add up to 100%
              const adjustedPercentages = {};
              adjustedPercentages.currentUser = (creatorPercentage / total * 100).toFixed(1);

              for (const user of sharedWith) {
                const userPercentage = parseFloat(percentage[user._id] || '0');
                if (!isNaN(userPercentage)) {
                  adjustedPercentages[user._id] = (userPercentage / total * 100).toFixed(1);
                }
              }

              setPercentage(adjustedPercentages);
            },
          },
          {
            text: 'No, I\'ll Fix Manually',
            style: 'cancel',
          },
        ]
      );
      isValid = false;
    }

    // Update errors state if there are any
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
    }

    return isValid;
  };

  // Handle form submission
  const handleSubmit = async() => {
    ////console.log('Submit button pressed');

    // Simple required field validation
    if (!billName) {
      Alert.alert('Error', 'Bill name is required');
      return;
    }

    if (!amount || isNaN(parseFloat(amount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!dueDate) {
      Alert.alert('Error', 'Due date is required');
      return;
    }

    if (!category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    try {
      setErrors({}); // Clear any previous errors

      // Parse the date correctly
      const [month, day, year] = dueDate.split('/');
      const formattedDate = new Date(`${year}-${month}-${day}`);

      // Create the basic bill object
      const simpleBill = {
        title: billName,
        amount: parseFloat(amount),
        dueDate: formattedDate.toISOString(),
        category: category,
        description: notes || '',
        status: 'UNPAID',
        isRecurring: isRecurring,
        recurringPeriod: isRecurring ? recurringPeriod : 'MONTHLY',
        reminderDays: parseInt(reminderDays, 10) || 3,
        isShared: isShared,
        splitType: splitType,
      };

      // Add shared users if any are selected
      if (isShared && sharedWith.length > 0) {
        simpleBill.sharedWithUsernames = sharedWith.map(user => user.username);
        simpleBill.sharedWith = sharedWith.map(user => user._id);

        // Only handle custom split
        if (splitType === 'CUSTOM') {
          // Validate percentages
          if (!validatePercentages()) {
            return; // Stop submission if validation fails
          }

          // Create splitPercentages only - server will calculate amounts
          const splitPercentages = {};

          // Add current user percentage with special key
          const creatorPercentage = parseFloat(percentage.currentUser || '0');
          splitPercentages.currentUser = creatorPercentage;

          // Add shared users percentages with their actual IDs
          for (const sharedUser of sharedWith) {
            const userPercentage = parseFloat(percentage[sharedUser._id] || '0');
            splitPercentages[sharedUser._id] = userPercentage;
          }

          // Store the split information
          simpleBill.splitPercentages = splitPercentages;
          // No need to send splitDetails as server will calculate it
        }
      }

      ////console.log('Submitting bill:', JSON.stringify(simpleBill, null, 2));

      // Call the API to create the bill
      await billService.createBill(simpleBill);
      ////console.log('Bill created successfully:', result);

      // Show success message and navigate back
      Alert.alert(
        'Success',
        'Bill created successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      ////console.error('Error creating bill:', error);
      Alert.alert('Error', 'Failed to create bill: ' + (error.message || 'Unknown error'));
    }
  };

  // Handle back button press
  const handleBack = () => {
    navigation.goBack();
  };


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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={theme.colors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Bill</Text>
          {/*<View style={styles.headerRight} >
            <TouchableOpacity onPress={billScan} style={styles.addBillButton}>
              <Icon name="camera" size={24} color={theme.colors.black} />
            </TouchableOpacity>
          </View>*/}
        </View>
        <ScrollView style={styles.scrollView}>
          <View style={styles.formContainer}>
            {/* Bill Name with dynamic icon */}
            <View style={styles.inputWithIconContainer}>
              <View style={styles.inputContainer}>
                <Input
                  label="Bill Name"
                  value={billName}
                  onChangeText={setBillName}
                  placeholder="Enter bill name"
                  error={errors.billName}
                  containerStyle={styles.billNameInput}
                />
              </View>
              {billName.trim() !== '' && (
                <View style={styles.billIconPreview}>
                  <BillIcon
                    billName={billName}
                    category={category}
                    size={28}
                    showBrandLogo={true}
                  />
                </View>
              )}
            </View>

            {/* Amount */}
            <Input
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              placeholder="Enter amount"
              keyboardType="numeric"
              error={errors.amount}
            />

            {/* Due Date */}
            <Text style={styles.inputLabel}>Due Date</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setDatePickerOpen(true)}
            >
              <Text style={[styles.dropdownText, !dueDate && styles.placeholderText]}>
                {dueDate || 'Select due date'}
              </Text>
              <Icon name="calendar-outline" size={20} color={theme.colors.gray} />
            </TouchableOpacity>
            {errors.dueDate ? (
              <Text style={styles.errorText}>{errors.dueDate}</Text>
            ) : null}

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

            {/* Category Dropdown */}
            <Text style={styles.inputLabel}>Category</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setCategoryModalVisible(true)}
            >
              <Text style={[styles.dropdownText, !category && styles.placeholderText]}>
                {category || 'Select category'}
              </Text>
              <Icon name="chevron-down-outline" size={20} color={theme.colors.gray} />
            </TouchableOpacity>
            {errors.category ? (
              <Text style={styles.errorText}>{errors.category}</Text>
            ) : null}

            {/* Recurring Bill Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Icon name="repeat" size={22} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Recurring Bill Settings</Text>
              </View>

              {/* Recurring Toggle with improved UI */}
              <View style={styles.toggleContainer}>
                <View style={styles.toggleLabelContainer}>
                  <Text style={styles.toggleLabel}>Is this a recurring bill?</Text>
                  <Text style={styles.toggleHint}>Bills that repeat regularly</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    isRecurring ? styles.toggleActive : styles.toggleInactive,
                  ]}
                  onPress={() => {
                    setIsRecurring(!isRecurring);
                    // If turning off recurring, reset to default period
                    if (isRecurring) {
                      setRecurringPeriod('MONTHLY');
                    }
                  }}
                >
                  <View style={[
                    styles.toggleKnob,
                    isRecurring ? styles.toggleKnobRight : styles.toggleKnobLeft,
                  ]} />
                </TouchableOpacity>
              </View>

              {/* Recurring Period - only shown if isRecurring is true */}
              {isRecurring && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.inputLabel}>Recurring Period</Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setPeriodModalVisible(true)}
                  >
                    <Text style={styles.dropdownText}>{recurringPeriod}</Text>
                    <Icon name="chevron-down-outline" size={20} color={theme.colors.gray} />
                  </TouchableOpacity>
                  <Text style={styles.helperText}>
                    <Icon name="information-circle-outline" size={14} color={theme.colors.darkGray} style={styles.infoIcon} />
                    This bill will repeat every {recurringPeriod.toLowerCase()}
                  </Text>
                </View>
              )}
            </View>

            {/* Bill Sharing Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Icon name="people" size={22} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Bill Sharing</Text>
              </View>

              {/* Sharing Toggle with improved UI */}
              <View style={styles.toggleContainer}>
                <View style={styles.toggleLabelContainer}>
                  <Text style={styles.toggleLabel}>Share this bill with others?</Text>
                  <Text style={styles.toggleHint}>Split the cost with roommates or friends</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    isShared ? styles.toggleActive : styles.toggleInactive,
                  ]}
                  onPress={() => setIsShared(!isShared)}
                >
                  <View style={[
                    styles.toggleKnob,
                    isShared ? styles.toggleKnobRight : styles.toggleKnobLeft,
                  ]} />
                </TouchableOpacity>
              </View>

              {/* Shared bill settings - only shown if isShared is true */}
              {isShared && (
                <View>
                  {/* Selected Users */}
                  <Text style={styles.inputLabel}>Shared With:</Text>
                  {sharedWith.length > 0 ? (
                    <View style={styles.selectedUsersContainer}>
                      {sharedWith.map(user => (
                        <View key={user._id} style={styles.selectedUserItem}>
                          <View style={styles.userInitialBadge}>
                            <Text style={styles.userInitialText}>{user.username.charAt(0).toUpperCase()}</Text>
                          </View>
                          <Text style={styles.selectedUserText}>{user.username}</Text>
                          <TouchableOpacity
                            onPress={() => removeUserFromSharedList(user._id)}
                            style={styles.removeUserButton}
                          >
                            <Icon name="close-circle" size={16} color={theme.colors.black} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.noUsersText}>No users selected</Text>
                  )}
                  {errors.sharedWith ? (
                    <Text style={styles.errorText}>{errors.sharedWith}</Text>
                  ) : null}

                  {/* Add Users Button */}
                  <TouchableOpacity
                    style={styles.addUserButton}
                    onPress={() => setUserSearchModalVisible(true)}
                  >
                    <Icon name="add-circle-outline" size={18} color={theme.colors.black} />
                    <Text style={styles.addUserButtonText}>Find Users to Share With</Text>
                  </TouchableOpacity>

                  {/* Split Type Selection */}
                  <Text style={styles.splitTypeLabel}>How should we split the bill?</Text>
                  <View style={styles.splitTypeContainer}>
                    <TouchableOpacity
                      style={[
                        styles.splitTypeButton,
                        splitType === 'EQUAL' && styles.splitTypeButtonActive,
                      ]}
                      onPress={() => setSplitType('EQUAL')}
                    >
                      <Icon
                        name="people-outline"
                        size={18}
                        color={splitType === 'EQUAL' ? theme.colors.white : theme.colors.darkGray}
                        style={styles.splitTypeIcon}
                      />
                      <Text style={[
                        styles.splitTypeText,
                        splitType === 'EQUAL' && styles.splitTypeTextActive,
                      ]}>Equal Split</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.splitTypeButton,
                        splitType === 'CUSTOM' && styles.splitTypeButtonActive,
                      ]}
                      onPress={() => setSplitType('CUSTOM')}
                    >
                      <Icon
                        name="calculator-outline"
                        size={18}
                        color={splitType === 'CUSTOM' ? theme.colors.white : theme.colors.darkGray}
                        style={styles.splitTypeIcon}
                      />
                      <Text style={[
                        styles.splitTypeText,
                        splitType === 'CUSTOM' && styles.splitTypeTextActive,
                      ]}>Custom Split</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Split Info */}
                  {sharedWith.length > 0 && (
                    <View style={styles.splitInfoContainer}>
                      <Icon name="information-circle" size={20} color={theme.colors.primary} style={styles.infoIconLarge} />
                      <Text style={styles.splitInfoText}>
                        {splitType === 'EQUAL'
                          ? `Each person will pay ${getCurrencySymbol()}${(parseFloat(amount || 0) / (sharedWith.length + 1)).toFixed(2)}`
                          : 'Custom split amounts can be adjusted after creation'}
                      </Text>
                      {splitType === 'CUSTOM' && sharedWith?.length > 0 ? (
                        <View style={styles.customSplitInfoContainer}>
                          <Text style={styles.sectionTitle}>Custom Split Percentages</Text>
                          <View style={styles.customSplitContainer}>
                            {/* Current User - Always shown first */}
                            <View style={styles.customSplitRow}>
                              <View style={[styles.customSplitContainerUsers, { backgroundColor: theme.colors.primary }]}>
                                <View style={styles.customSplitUserContainer}>
                                  <Text style={styles.customSplitUserText}>You (Creator)</Text>
                                </View>
                                <View style={styles.customSplitInputContainer}>
                                  <Input
                                    label=""
                                    value={percentage.currentUser || ''}
                                    onChangeText={(value) => setPercentage((prev) => ({ ...prev, 'currentUser': value }))}
                                    placeholder="%"
                                    keyboardType="numeric"
                                    error={errors.currentUser}
                                    style={styles.customSplitInput}
                                    maxLength={3}
                                  />
                                </View>
                              </View>
                            </View>

                            {/* Shared Users */}
                            {sharedWith.map((user) => (
                              <View style={styles.customSplitRow} key={user._id}>
                                <View style={[styles.customSplitContainerUsers, { backgroundColor: theme.colors.primary }]}>
                                  <View style={styles.customSplitUserContainer}>
                                    <Text style={styles.customSplitUserText}>{user.username}</Text>
                                  </View>
                                  <View style={styles.customSplitInputContainer}>
                                    <Input
                                      label=""
                                      value={percentage[user._id] || ''}
                                      onChangeText={(value) => setPercentage((prev) => ({ ...prev, [user._id]: value }))}
                                      placeholder="%"
                                      keyboardType="numeric"
                                      error={errors[user._id]}
                                      style={styles.customSplitInput}
                                      maxLength={3}
                                    />
                                  </View>
                                </View>
                                <TouchableOpacity
                                  style={styles.customSplitRemoveButton}
                                  onPress={() => removeUserFromSharedList(user._id)}
                                >
                                  <Text style={styles.customSplitRemoveButtonText}>X</Text>
                                </TouchableOpacity>
                              </View>
                            ))
                          }

                          </View>

                          <Text style={styles.customSplitNote}>
                            Note: Percentages should add up to 100% (will be adjusted automatically if needed)
                          </Text>
                          <TouchableOpacity
                            style={styles.distributeEquallyButton}
                            onPress={() => {
                              // Calculate equal percentages
                              const totalUsers = sharedWith.length + 1; // +1 for current user
                              const equalPercentage = (100 / totalUsers).toFixed(1);

                              // Create new percentages object with equal distribution
                              const newPercentages = { 'currentUser': equalPercentage };
                              sharedWith.forEach(user => {
                                newPercentages[user._id] = equalPercentage;
                              });

                              // Update state
                              setPercentage(newPercentages);
                            }}
                          >
                            <Text style={styles.distributeEquallyButtonText}>Distribute Equally</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {/* Split Preview - shows who pays what */}
                  {sharedWith.length > 0 && amount && parseFloat(amount) > 0 && splitType === 'EQUAL' && (
                    <View style={styles.splitPreviewContainer}>
                      <Text style={styles.splitPreviewTitle}>Payment Preview</Text>
                      <View style={styles.splitPreviewItem}>
                        <Text style={styles.splitPreviewLabel}>You pay:</Text>
                        <Text style={styles.splitPreviewAmount}>
                          {formatCurrency(splitAmount.currentUser || 0)}
                        </Text>
                      </View>
                      {sharedWith.map(user => (
                        <View key={`split-${user._id}`} style={styles.splitPreviewItem}>
                          <Text style={styles.splitPreviewLabel}>{user.username} pays:</Text>
                          <Text style={styles.splitPreviewAmount}>
                            {formatCurrency(splitAmount[user._id] || 0)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                 {sharedWith.length > 0 && amount && parseFloat(amount) > 0 && splitType === 'CUSTOM' && (
                    <View style={styles.splitPreviewContainer}>
                      <Text style={styles.splitPreviewTitle}>Payment Preview (Based on Percentages)</Text>
                      <View style={styles.splitPreviewItem}>
                        <Text style={styles.splitPreviewLabel}>You pay:</Text>
                        <Text style={styles.splitPreviewAmount}>
                          {splitAmount.currentUser ? splitAmount.currentUser.toFixed(2) : (0).toFixed(2)}
                          {percentage.currentUser ? ` (${percentage.currentUser}%)` : ''}
                        </Text>
                      </View>
                      {sharedWith.map(user => (
                        <View key={`split-${user._id}`} style={styles.splitPreviewItem}>
                          <Text style={styles.splitPreviewLabel}>{user.username} pays:</Text>
                          <Text style={styles.splitPreviewAmount}>
                            {splitAmount[user._id] ? splitAmount[user._id].toFixed(2) : (0).toFixed(2)}
                            {percentage[user._id] ? ` (${percentage[user._id]}%)` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}


                </View>
              )}


            </View>
            {/* User Search Modal */}
            <Modal
              animationType="slide"
              transparent={true}
              visible={userSearchModalVisible}
              onRequestClose={() => setUserSearchModalVisible(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Search Users</Text>
                  <Input
                    value={usernameSearch}
                    onChangeText={setUsernameSearch}
                    placeholder="Enter username to search"
                    autoCapitalize="none"
                  />

                  {isSearching ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
                  ) : searchResults.length > 0 ? (
                    <FlatList
                      data={searchResults}
                      keyExtractor={(item) => item._id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.userItem}
                          onPress={() => addUserToSharedList(item)}
                        >
                          <Text style={styles.username}>{item.username}</Text>
                          {item.fullName && <Text style={styles.fullName}>{item.fullName}</Text>}
                        </TouchableOpacity>
                      )}
                      style={styles.searchResultsList}
                    />
                  ) : usernameSearch.length > 0 ? (
                    <Text style={styles.noResultsText}>No users found</Text>
                  ) : null}

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setUserSearchModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Reminder Days */}
            <Input
              label="Reminder Days"
              value={reminderDays}
              onChangeText={setReminderDays}
              placeholder="Days before due date for reminder"
              keyboardType="numeric"
              info="How many days before the due date you want to receive a reminder"
            />

            {/* Notes */}
            <Input
              label="Notes (Optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes"
              multiline={true}
              numberOfLines={4}
              style={styles.notesInput}
            />

            {/* Submit Button */}
            <Button
              title="Add Bill"
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
  androidSafeArea: {
    paddingTop: StatusBar.currentHeight || 0,
  },
  inputWithIconContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  inputContainer: {
    flex: 1,
  },
  billNameInput: {
    marginRight: 10,
  },
  billIconPreview: {
    marginBottom: 15,
    justifyContent: 'flex-end',
  },
  distributeEquallyButton: {
    backgroundColor: theme.colors.gray800,
    padding: 10,
    borderRadius: 4,
    alignSelf: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  distributeEquallyButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  datePicker: {
    width: '100%',
    height: 120,
    marginVertical: 15,
    backgroundColor: theme.colors.lightGray + '20',
    borderRadius: 10,
  },
  // Section styles
  sectionContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: theme.colors.white,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  // User sharing styles
  selectedUsersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  splitTypeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.black,
    marginTop: 16,
    marginBottom: 8,
  },
  selectedUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  selectedUserText: {
    fontSize: 14,
    marginRight: 4,
  },
  removeUserButton: {
    padding: 2,
  },
  addUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.blue,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 8,
  },
  addUserButtonText: {
    color: theme.colors.black,
    marginLeft: 8,
    fontWeight: '600',
  },
  noUsersText: {
    color: theme.colors.gray,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  userItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  fullName: {
    fontSize: 14,
    color: theme.colors.gray,
    marginTop: 2,
  },
  searchResultsList: {
    maxHeight: 200,
  },
  loader: {
    marginVertical: 20,
  },
  noResultsText: {
    textAlign: 'center',
    marginVertical: 20,
    fontStyle: 'italic',
    color: theme.colors.gray,
  },
  splitTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  splitTypeButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  splitTypeButtonActive: {
    backgroundColor: theme.colors.black ,
    borderColor: theme.colors.primary,
  },
  splitTypeText: {
    fontWeight: '600',
  },
  splitTypeTextActive: {
    color: theme.colors.white,
  },
  splitInfoContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: theme.colors.lightGray + '50',
    borderRadius: 8,
  },
  splitInfoText: {
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: theme.colors.primary,
  },
  helperText: {
    fontSize: 14,
    color: theme.colors.gray,
    marginTop: 4,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  // Dropdown styles
  dropdown: {
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.gray,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
  },
  dropdownText: {
    fontSize: 16,
    color: theme.colors.black,
  },
  placeholderText: {
    color: theme.colors.gray,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.black,
  },
  errorText: {
    color: theme.colors.black,
    marginTop: -12,
    marginBottom: 12,
    fontSize: 14,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: theme.typography.fontWeights.bold,
  },
  modalItem: {
    paddingVertical: 12,

  },
  modalItemText: {
    fontSize: 16,
  },
  selectedItem: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.lightGray,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.black,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  keyboardAvoidingView: {
    flex: 1,
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
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerRight: {
    width: 24, // Same width as back button for balance
  },
  scrollView: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  formContainer: {
    padding: theme.spacing.lg,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: theme.spacing.md,
  },
  toggleLabel: {
    fontSize: theme.typography.fontSizes.medium,
    color: theme.colors.black,
  },
  toggleButton: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: theme.colors.black,
  },
  toggleInactive: {
    backgroundColor: theme.colors.gray400,
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.white,
  },
  toggleKnobLeft: {
    alignSelf: 'flex-start',
  },
  toggleKnobRight: {
    alignSelf: 'flex-end',
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: theme.spacing.xl,
  },
  cancelButton: {
    marginTop: theme.spacing.md,
    borderColor: theme.colors.gray400,
  },
  cancelButtonText: {
    color: theme.colors.black,
  },
  customSplitInfoContainer: {
    marginTop: theme.spacing.md,
    width: '100%',
  },
  customSplitContainer: {
    marginTop: 8,
    width: '100%',
  },
  customSplitUserContainer: {
    flex: 1,
    padding: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
    marginRight: 80, /* Make room for the input on the right */
  },
  customSplitContainerView: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    marginBottom: 10,
    borderRadius: 8,
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    position: 'relative',
  },
  customSplitText: {
    color: theme.colors.black,
    fontSize: theme.typography.fontSizes.medium,
    fontWeight: theme.typography.fontWeights.bold,
    flex: 1,
  },
  customSplitUserText: {
    color: theme.colors.black,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  customSplitInput: {
    width: 40,
    backgroundColor: theme.colors.white,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    textAlign: 'center',
    marginHorizontal: 10,
    padding: 0,
  },
  customSplitRemoveButton: {
    backgroundColor: theme.colors.black,
    borderRadius: 4,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    alignSelf: 'center',
  },
  customSplitRemoveButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSizes.medium,
    fontWeight: theme.typography.fontWeights.bold,
  },
  customSplitNote: {
    marginTop: 10,
    fontStyle: 'italic',
    color: theme.colors.secondary,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  customSplitContainerUsers: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    marginBottom: 10,
    borderRadius: 8,
    width: '90%', /* Reduced width to make room for remove button */
    paddingVertical: 8,
    paddingHorizontal: 12,
    position: 'relative',
  },
  customSplitInputContainer: {
    width: 60,
    position: 'absolute',
    right: 10,
    justifyContent: 'center',
    alignItems: 'center',
    top: '50%',
    transform: [{ translateY: -15 }],
  },
  customSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },

});

export default AddBillScreen;
