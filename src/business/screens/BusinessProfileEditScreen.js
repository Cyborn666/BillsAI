import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  SafeAreaView,
  StatusBar,
  Switch,
} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import * as businessApiService from '../services/businessApiService';
import theme from '../../styles/theme';

const BusinessProfileEditScreen = ({ navigation }) => {
  // Get screen dimensions for responsive design
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [businessProfile, setBusinessProfile] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    country: '',
  });
  const [employeeCount, setEmployeeCount] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [taxId, setTaxId] = useState('');
  const [annualRevenue, setAnnualRevenue] = useState('');
  const [foundedDate, setFoundedDate] = useState('');



  useEffect(() => {
    fetchBusinessProfile();
  }, []);

  const fetchBusinessProfile = async () => {
    try {
      setIsLoading(true);
      const response = await businessApiService.getBusinessProfile();
      //console.log('Edit screen - profile data:', response);

      // Extract business user data from nested structure
      const profileData = response.businessUser || response;

      setBusinessProfile(profileData);
      setBusinessName(profileData.businessName || '');
      setBusinessType(profileData.businessType || '');
      setBusinessDescription(profileData.businessDescription || '');
      setIndustry(profileData.industry || '');
      setEmail(profileData.businessEmail || profileData.email || '');
      setPhone(profileData.phone || '');
      setTaxId(profileData.taxId || '');
      setEmployeeCount(profileData.employeeCount?.toString() || '');
      setAnnualRevenue(profileData.annualRevenue?.toString() || '');
      // Format founded date if available (from ISO date to YYYY-MM-DD for input field)
      if (profileData.foundedDate) {
        const date = new Date(profileData.foundedDate);
        setFoundedDate(date.toISOString().split('T')[0]);
      } else {
        setFoundedDate('');
      }

      // Set address if available
      if (profileData.address) {
        setAddress({
          street: profileData.address.street || '',
          city: profileData.address.city || '',
          state: profileData.address.state || '',
          zip: profileData.address.zip || '',
          country: profileData.address.country || '',
        });
      }

      // Set settings if available
      if (profileData.settings) {
        setNotificationsEnabled(profileData.settings.notifications || false);
        setDarkModeEnabled(profileData.settings.darkMode || false);
      }

      setError(null);
    } catch (err) {
      //console.error('Error fetching business profile:', err);
      setError('Failed to load business profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    if (!businessName.trim()) {
      Alert.alert('Validation Error', 'Business name is required.');
      return false;
    }

    if (!email.trim()) {
      Alert.alert('Validation Error', 'Email is required.');
      return false;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) { return; }

    setIsLoading(true);

    try {
      // Create update data object with validation
      const updateData = {
        businessName,
        businessType,
        businessDescription,
        industry,
        // Use businessEmail field to match API
        businessEmail: email,
        email,
        phone,
        taxId,
        address,
        annualRevenue: annualRevenue ? parseFloat(annualRevenue) : 0,
        // Fix timezone issue by parsing date parts directly
        foundedDate: foundedDate ? (function() {
          const [year, month, day] = foundedDate.split('-').map(Number);
          // Create date using local timezone (month is 0-indexed in JS Date)
          return new Date(year, month - 1, day, 12, 0, 0);
        })() : null,
        employeeCount: employeeCount ? parseInt(employeeCount, 10) : 0,
        // Preserve settings
        settings: {
          notifications: notificationsEnabled,
          darkMode: darkModeEnabled,
        },
      };

      //console.log('Updating profile with:', updateData);

      // Use PATCH to update profile
      await businessApiService.updateBusinessProfile(updateData);

      Alert.alert('Success', 'Business profile updated successfully');
      navigation.goBack();
    } catch (err) {
      //console.error('Error updating business profile:', err);
      Alert.alert('Error', 'Failed to update business profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading business profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchBusinessProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!businessProfile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No business profile data available</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, isTablet && styles.titleTablet]}>Edit Business Profile</Text>
          </View>
          <View style={styles.placeholderView} />
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}>
          <View style={[styles.content, isTablet && styles.contentTablet]}>
            <View style={[styles.formCard, isTablet && styles.formCardTablet]}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, isTablet && styles.labelTablet]}>Business Name</Text>
                <TextInput
                  style={[styles.input, isTablet && styles.inputTablet]}
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="Enter your business name"
                  placeholderTextColor="#95A5A6"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, isTablet && styles.labelTablet]}>Business Email</Text>
                <TextInput
                  style={[styles.input, isTablet && styles.inputTablet]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your business email"
                  placeholderTextColor="#95A5A6"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>


              <View style={styles.inputGroup}>
                <Text style={[styles.label, isTablet && styles.labelTablet]}>Business Type</Text>
                <TextInput
                  style={[styles.input, isTablet && styles.inputTablet]}
                  value={businessType}
                  onChangeText={setBusinessType}
                  placeholder="LLC, Corporation, etc."
                  placeholderTextColor="#95A5A6"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, isTablet && styles.labelTablet]}>Industry</Text>
                <TextInput
                  style={[styles.input, isTablet && styles.inputTablet]}
                  value={industry}
                  onChangeText={setIndustry}
                  placeholder="Retail, Technology, etc."
                  placeholderTextColor="#95A5A6"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, isTablet && styles.labelTablet]}>Business Description</Text>
                <TextInput
                  style={[styles.input, isTablet && styles.inputTablet, styles.textArea]}
                  value={businessDescription}
                  onChangeText={setBusinessDescription}
                  placeholder="Brief description of your business"
                  placeholderTextColor="#95A5A6"
                  multiline={true}
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, isTablet && styles.labelTablet]}>Tax ID</Text>
                <TextInput
                  style={[styles.input, isTablet && styles.inputTablet]}
                  value={taxId}
                  onChangeText={setTaxId}
                  placeholder="Enter your Tax ID"
                  placeholderTextColor="#95A5A6"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, isTablet && styles.labelTablet]}>Phone</Text>
                <TextInput
                  style={[styles.input, isTablet && styles.inputTablet]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter your business phone"
                  placeholderTextColor="#95A5A6"
                  keyboardType="phone-pad"
                />
              </View>


              <View style={styles.inputGroup}>
                <Text style={[styles.label, isTablet && styles.labelTablet]}>Street Address</Text>
                <TextInput
                  style={[styles.input, isTablet && styles.inputTablet]}
                  value={address.street}
                  onChangeText={(text) => setAddress({...address, street: text})}
                  placeholder="Enter street address"
                  placeholderTextColor="#95A5A6"
                  keyboardType="default"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.label, isTablet && styles.labelTablet]}>City</Text>
                <TextInput
                  style={[styles.input, isTablet && styles.inputTablet]}
                  value={address.city}
                  onChangeText={(text) => setAddress({...address, city: text})}
                  placeholder="Enter city"
                  placeholderTextColor="#95A5A6"
                  keyboardType="default"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.label, isTablet && styles.labelTablet]}>State/Province</Text>
                <TextInput
                  style={[styles.input, isTablet && styles.inputTablet]}
                  value={address.state}
                  onChangeText={(text) => setAddress({...address, state: text})}
                  placeholder="Enter state or province"
                  placeholderTextColor="#95A5A6"
                  keyboardType="default"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.label, isTablet && styles.labelTablet]}>ZIP/Postal Code</Text>
                <TextInput
                  style={[styles.input, isTablet && styles.inputTablet]}
                  value={address.zip}
                  onChangeText={(text) => setAddress({...address, zip: text})}
                  placeholder="Enter ZIP or postal code"
                  placeholderTextColor="#95A5A6"
                  keyboardType="default"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.label, isTablet && styles.labelTablet]}>Country</Text>
                <TextInput
                  style={[styles.input, isTablet && styles.inputTablet]}
                  value={address.country}
                  onChangeText={(text) => setAddress({...address, country: text})}
                  placeholder="Enter country"
                  placeholderTextColor="#95A5A6"
                  keyboardType="default"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, isTablet && styles.labelTablet]}>Annual Revenue</Text>
                <TextInput
                  style={[styles.input, isTablet && styles.inputTablet]}
                  value={annualRevenue}
                  onChangeText={setAnnualRevenue}
                  placeholder="Enter your business annual revenue"
                  placeholderTextColor="#95A5A6"
                  keyboardType="numeric"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, isTablet && styles.labelTablet]}>Founded Date</Text>
                <TextInput
                  style={[styles.input, isTablet && styles.inputTablet]}
                  value={foundedDate}
                  onChangeText={setFoundedDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#95A5A6"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, isTablet && styles.labelTablet]}>Employee Count</Text>
                <TextInput
                  style={[styles.input, isTablet && styles.inputTablet]}
                  value={employeeCount}
                  onChangeText={setEmployeeCount}
                  placeholder="Enter your business employee count"
                  placeholderTextColor="#95A5A6"
                  keyboardType="numeric"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, isTablet && styles.labelTablet]}>Business Type</Text>
                <TextInput
                  style={[styles.input, isTablet && styles.inputTablet]}
                  value={businessType}
                  onChangeText={setBusinessType}
                  placeholder="Enter your business type"
                  placeholderTextColor="#95A5A6"
                  keyboardType="default"
                  autoCapitalize="none"
                />
              </View>

              {businessProfile.subscription && (
                <View style={styles.infoCard}>
                  <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>Subscription Info</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Plan:</Text>
                    <Text style={styles.infoValue}>{businessProfile.subscription.plan}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <Text style={styles.infoValue}>{businessProfile.subscription.status}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Renewal Date:</Text>
                    <Text style={styles.infoValue}>{businessProfile.subscription.renewalDate}</Text>
                  </View>
                </View>
              )}

              {businessProfile.team && (
                <View style={styles.infoCard}>
                  <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>Team Info</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Total Members:</Text>
                    <Text style={styles.infoValue}>{businessProfile.team.memberCount}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Admins:</Text>
                    <Text style={styles.infoValue}>{businessProfile.team.admins}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Regular Members:</Text>
                    <Text style={styles.infoValue}>{businessProfile.team.members}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={[styles.buttonContainer, isTablet && styles.buttonContainerTablet]}>
              <TouchableOpacity
                style={[styles.cancelButton, isTablet && styles.cancelButtonTablet]}
                onPress={() => navigation.goBack()}
                disabled={isLoading}
              >
                <Text style={[styles.cancelButtonText, isTablet && styles.cancelButtonTextTablet]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, isTablet && styles.saveButtonTablet]}
                onPress={handleSave}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Text style={[styles.saveButtonText, isTablet && styles.saveButtonTextTablet]}>
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.text,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderView: {
    width: 40, // Same width as the back button for symmetry
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  titleTablet: {
    fontSize: 24,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  scrollContentTablet: {
    padding: 24,
  },
  content: {
    flex: 1,
  },
  contentTablet: {
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  formCardTablet: {
    padding: 24,
    borderRadius: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  labelTablet: {
    fontSize: 18,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: '#ffffff',
  },
  inputTablet: {
    height: 56,
    fontSize: 18,
    paddingHorizontal: 16,
  },
  settingsCard: {
    marginTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  sectionTitleTablet: {
    fontSize: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  infoCard: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  infoLabel: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 24,
  },
  buttonContainerTablet: {
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    paddingVertical: 14,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonTablet: {
    paddingVertical: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  cancelButtonTextTablet: {
    fontSize: 18,
  },
  saveButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  saveButtonTablet: {
    paddingVertical: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  saveButtonTextTablet: {
    fontSize: 18,
  },
});

export default BusinessProfileEditScreen;
