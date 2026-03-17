import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  useWindowDimensions,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';
import theme from '../../styles/theme';
import { updatePassword as changePassword, logout } from '../../services/authService';
import userService from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';





const SettingsScreen = ({ navigation }) => {
  // Get screen dimensions for responsive design
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  // Access auth context

  // Use the handleLogout function in a sign out setting item to avoid lint warning
  /*const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: handleLogout },
      ]
    );
  };*/

  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [isCurrencyModalVisible, setIsCurrencyModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('USD ($)');
  const { logout } = useAuth();
  // Default language is English (will be displayed in the settings UI)
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [preferences, setPreferences] = useState({
    currency: 'USD ($)',
    language: 'English',
    notifications: true,
    darkMode: false,
  });

  // Function to load user preferences
  const loadUserPreferences = async () => {
    try {
      ////console.log('Loading user preferences...');
      const userPrefs = await userService.getUserPreferences();
      ////console.log('Loaded preferences:', userPrefs);
      if (userPrefs) {
        // Important: Store preferences in state
        setPreferences(userPrefs);

        // Set selected currency from preferences
        if (userPrefs.currency) {
          ////console.log('Setting currency to:', userPrefs.currency);
          setSelectedCurrency(userPrefs.currency);
        }

        // Set selected language from preferences
        if (userPrefs.language) {
          ////console.log('Setting language to:', userPrefs.language);
          setSelectedLanguage(userPrefs.language);
        }
      } else {
        ////console.warn('No user preferences found, using defaults');
      }
    } catch (error) {
      ////console.error('Error loading user preferences:', error);
      // Set defaults if we can't load preferences
      setSelectedCurrency('USD ($)');
      setSelectedLanguage('English');
    }
  };

  // Load preferences on initial mount
  useEffect(() => {
    loadUserPreferences();
  }, []);

  // Reload preferences whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      ////console.log('Settings screen focused, reloading preferences...');
      // Force reload user preferences when screen gains focus
      const loadPrefs = async () => {
        try {
          ////console.log('Explicitly loading user preferences on focus');
          const userPrefs = await userService.getUserPreferences();
          //onsole.log('Focus loaded user preferences:', userPrefs);
          if (userPrefs) {
            setPreferences(userPrefs);

            if (userPrefs.currency) {
              ////console.log('Focus-setting currency to:', userPrefs.currency);
              setSelectedCurrency(userPrefs.currency);
            }

            if (userPrefs.language) {
              ////console.log('Focus-setting language to:', userPrefs.language);
              setSelectedLanguage(userPrefs.language);
            }
          }
        } catch (error) {
          ////console.error('Error loading preferences on focus:', error);
        }
      };

      loadPrefs();

      return () => {
        ////console.log('Settings screen unfocused');
      };
    }, [])
  );

  const savePreferences = async (newPrefs) => {
    try {
      ////console.log('Saving preferences, current state:', preferences);
      ////console.log('New preferences to save:', newPrefs);

      const updatedPrefs = { ...preferences, ...newPrefs };
      ////console.log('Combined preferences to save:', updatedPrefs);

      await userService.updatePreferences(updatedPrefs);
      ////console.log('Successfully saved preferences to server');

      // Update local state
      setPreferences(updatedPrefs);

      // Update specific state variables
      if (newPrefs.currency) {
        ////console.log('Updating currency state to:', newPrefs.currency);
        setSelectedCurrency(newPrefs.currency);
      }

      if (newPrefs.language) {
        ////console.log('Updating language state to:', newPrefs.language);
        setSelectedLanguage(newPrefs.language);
      }
      return true;
    } catch (error) {
      ////console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
      return false;
    }
  };

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  ];

 /* const handleReminderDaysChange = (text) => {
    // Only allow numbers
    const numericValue = text.replace(/[^0-9]/g, '');
    setLocalReminderDays(numericValue);
  };

  const saveReminderDays = () => {
    const days = parseInt(reminderDays, 10);
    if (isNaN(days) || days < 1) {
      Alert.alert('Invalid Value', 'Please enter a valid number of days greater than 0.');
      return;
    }
    setReminderDays(days);
    Alert.alert('Success', `Bill reminders will now be sent ${days} days before due date.`);
  };*/

  const handleDeleteAccount = async () => {
    try {
      // Show loading indicator or disable UI
      Alert.alert(
        'Confirm Deletion',
        'Please type DELETE to confirm account deletion.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Proceed',
            style: 'destructive',
            onPress: async () => {
              try {
                // Delete the account
                await userService.deleteAccount();

                // Show success message
                Alert.alert(
                  'Account Deleted',
                  'Your account has been successfully deleted.',
                  [
                    {
                      text: 'OK',
                      onPress: async () => {
                        // Let AuthContext handle navigation automatically
                        await logout();
                        // No manual navigation needed - AuthContext will handle it
                      },
                    },
                  ],
                  { cancelable: false }
                );
              } catch (error) {
                ////console.error('Error deleting account:', error);
                Alert.alert('Error', 'Failed to delete your account. Please try again.');
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to delete account. Please try again later.');
    }
  };

  const handleChangePassword = async () => {
    // Basic validation
    if (!currentPassword) {
      Alert.alert('Error', 'Current password is required');
      return;
    }

    if (!newPassword) {
      Alert.alert('Error', 'New password is required');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully');
      setIsPasswordModalVisible(false);
      // Clear the form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      Alert.alert('Error', 'Failed to change password. Please check your current password and try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={isTablet ? 28 : 24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={[styles.title, isTablet && styles.titleTablet]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}>
        <View style={[styles.content, isTablet && styles.contentTablet]}>
          <View style={[styles.section, isTablet && styles.sectionTablet]}>
            <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>App Preferences</Text>

            <View style={[styles.settingItem, isTablet && styles.settingItemTablet]}>
              <View style={[styles.settingInfo, isTablet && styles.settingInfoTablet]}>
                <FontAwesome name="language" size={isTablet ? 28 : 24} color={theme.colors.black} />
                <Text style={[styles.settingText, isTablet && styles.settingTextTablet]}>Language</Text>
              </View>
              <TouchableOpacity
                style={[styles.settingAction, isTablet && styles.settingActionTablet]}
                onPress={() => {
                  Alert.alert('Language', 'More languages coming soon!');
                  savePreferences({ language: 'English' });
                }}
              >
                <Text style={[styles.settingValue, isTablet && styles.settingValueTablet]}>{selectedLanguage}</Text>
                <Ionicons name="chevron-forward" size={isTablet ? 24 : 20} color="#7F8C8D" />
              </TouchableOpacity>
            </View>

            <View style={[styles.settingItem, isTablet && styles.settingItemTablet]}>
              <View style={[styles.settingInfo, isTablet && styles.settingInfoTablet]}>
                <FontAwesome name="dollar" size={isTablet ? 28 : 24} color={theme.colors.black} />
                <Text style={[styles.settingText, isTablet && styles.settingTextTablet]}>Currency</Text>
              </View>
              <TouchableOpacity
                style={[styles.settingAction, isTablet && styles.settingActionTablet]}
                onPress={() => setIsCurrencyModalVisible(true)}
              >
                <Text style={[styles.settingValue, isTablet && styles.settingValueTablet]}>Current: {selectedCurrency || preferences?.currency || 'USD ($)'}</Text>
                <Ionicons name="chevron-forward" size={isTablet ? 24 : 20} color="#7F8C8D" />
              </TouchableOpacity>
            </View>
          </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => setIsPasswordModalVisible(true)}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="lock-closed-outline" size={24} color={theme.colors.black} />
              <Text style={styles.settingText}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#7F8C8D" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={styles.settingInfo}>
              <FontAwesome name="user-o" size={24} color={theme.colors.black} />
              <Text style={styles.settingText}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#7F8C8D" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => {
              Alert.alert(
                'Delete Account',
                'Are you sure you want to delete your account? This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: handleDeleteAccount
                  },
                ],
                { cancelable: true }
              );
            }}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
              <Text style={[styles.settingText, { color: theme.colors.error }]}>Delete Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#7F8C8D" />
          </TouchableOpacity>

         {/*} <TouchableOpacity
            style={styles.settingButton}
            onPress={() => Alert.alert('Export Data', 'Your data will be exported as a CSV file.')}
          >
            <View style={styles.settingInfo}>
              <FontAwesome name="download" size={24} color={theme.colors.black} />
              <Text style={styles.settingText}>Export Data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#7F8C8D" />
          </TouchableOpacity>*/}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <View style={styles.settingInfo}>
              <FontAwesome name="shield" size={24} color={theme.colors.black} />
              <Text style={styles.settingText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#7F8C8D" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => navigation.navigate('TermsConditions')}
          >
            <View style={styles.settingInfo}>
              <FontAwesome name="file-text-o" size={24} color={theme.colors.black} />
              <Text style={styles.settingText}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#7F8C8D" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => Alert.alert('App Version', 'BillsAI v1.0.0')}
          >
            <View style={styles.settingInfo}>
              <FontAwesome name="info-circle" size={24} color={theme.colors.black} />
              <Text style={styles.settingText}>App Version</Text>
            </View>
            <Text style={styles.versionText}>1.0.0</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => {
            Alert.alert(
              'Share BillsAI',
              'Thanks for spreading the word about BillsAI!',
              [
                { text: 'OK' },
              ]
            );
            // In a real implementation, this would use the Share API
            // Share.share({
            //   message: 'Check out BillsAI - the smart way to manage your bills!',
            //   url: 'https://billsai.app',
            // });
          }}
        >
          <Ionicons name="share-social-outline" size={24} color={theme.colors.white} />
          <Text style={styles.shareButtonText}>Share App</Text>
        </TouchableOpacity>
        <View style={styles.thankYouContainer}>
          <Text style={styles.thankYouText}>Thank you for using BillsAI</Text>
          <Text style={styles.thankYouSubText}>We appreciate your support!</Text>
        </View>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={isPasswordModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => setIsPasswordModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#2C3E50" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor="#95A5A6"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor="#95A5A6"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="#95A5A6"
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setIsPasswordModalVisible(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveModalButton}
                onPress={handleChangePassword}
              >
                <Text style={styles.saveModalButtonText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Currency Selection Modal */}
      <Modal
        visible={isCurrencyModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity
                onPress={() => setIsCurrencyModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#2C3E50" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.currencyList}>
              {currencies.map((currency) => (
                <TouchableOpacity
                  key={currency.code}
                  style={[styles.currencyItem, selectedCurrency === `${currency.code} (${currency.symbol})` && styles.selectedCurrencyItem]}
                  onPress={() => {
                    const newCurrency = `${currency.code} (${currency.symbol})`;
                    //console.log('User selected new currency:', newCurrency);
                    setSelectedCurrency(newCurrency);
                    //console.log('New selected currency state:', newCurrency);
                    const success = savePreferences({ currency: newCurrency });
                    //console.log('Preferences saved successfully:', success);
                    setIsCurrencyModalVisible(false);
                  }}
                >
                  <Text style={[styles.currencyText, selectedCurrency === `${currency.code} (${currency.symbol})` && styles.selectedCurrencyText]}>
                    {currency.code} ({currency.symbol}) - {currency.name}
                  </Text>
                  {selectedCurrency === `${currency.code} (${currency.symbol})` && (
                    <Ionicons name="checkmark" size={24} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: theme.colors.white,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
  },
  backButton: {
    padding: 8,
    position: 'absolute',
    left: 8,
    zIndex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.black,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: 'transparent',
    padding: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.black,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: '#ECF0F1',
  },
  disabledSetting: {
    opacity: 0.5,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: '#2C3E50',
    marginLeft: 12,
  },
  settingAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 16,
    color: '#7F8C8D',
    marginRight: 8,
  },
  settingButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: '#ECF0F1',
  },
  versionText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  reminderDaysContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderDaysInput: {
    backgroundColor: '#F5F7FA',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#ECF0F1',
    width: 50,
    textAlign: 'center',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#3498DB',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  disabledButton: {
    backgroundColor: '#BDC3C7',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  dangerButton: {
    backgroundColor: theme.colors.black,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  dangerButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  shareButton: {
    backgroundColor: theme.colors.black,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginVertical: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  shareButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  thankYouContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  thankYouText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.black,
    marginBottom: 4,
  },
  thankYouSubText: {
    fontSize: 14,
    color: theme.colors.gray700,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  modalBody: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C3E50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.small,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.black,
    borderWidth: 1,
    borderColor: theme.colors.gray200,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ECF0F1',
  },
  cancelModalButton: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.small,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
    borderColor: theme.colors.gray200,
    borderWidth: 1,
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.black,
  },
  saveModalButton: {
    backgroundColor: theme.colors.black,
    borderRadius: theme.borderRadius.small,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  saveModalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.white,
  },
  currencyList: {
    maxHeight: 300,
  },
  currencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomColor: '#ECF0F1',
  },
  selectedCurrencyItem: {
    backgroundColor:'#fff',
  },
  currencyText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  selectedCurrencyText: {
    fontWeight: 'bold',
    color: '#000',
    
  },
});

export default SettingsScreen;
