import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Image,
  StatusBar,
  RefreshControl,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getBusinessProfile } from '../services/businessApiService';
import theme from '../../styles/theme';
import {getSubscription} from '../services/subscriptionService';

// Import SVG avatars directly as components - same as in BusinessSettingsScreen
import Avatar1 from '../../assets/svgs/businessprofile/Group-1.svg';
import Avatar2 from '../../assets/svgs/businessprofile/Group-2.svg';
import Avatar4 from '../../assets/svgs/businessprofile/Group-4.svg';
import Avatar6 from '../../assets/svgs/businessprofile/Group-6.svg';
import Avatar8 from '../../assets/svgs/businessprofile/Group-8.svg';
import Avatar10 from '../../assets/svgs/businessprofile/Group-10.svg';

// Avatar components map for easy access
const avatars = [
  { id: 1, component: Avatar1 },
  { id: 2, component: Avatar2 },
  { id: 4, component: Avatar4 },
  { id: 6, component: Avatar6 },
  { id: 8, component: Avatar8 },
  { id: 10, component: Avatar10 },
];

const BusinessProfileScreen = ({ navigation }) => {

  const [businessProfile, setBusinessProfile] = useState({});
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch profile data when screen is focused
  // Define fetchBusinessProfile function using useCallback to prevent dependency cycles
  const fetchBusinessProfile = useCallback(async () => {
    try {
      if (!refreshing) { setIsLoading(true); }
      const response = await getBusinessProfile();
      //console.log('Fetched profile data:', response);
      // Extract the business user data from the nested structure
      const profileData = response.businessUser || response;
      
      // Format and process data before setting state
      const formattedData = {
        // Use actual business data from the API
        businessName: profileData.businessName || '',
        businessType: profileData.businessType || '',
        email: profileData.businessEmail || profileData.email || '',
        phone: profileData.phone || '',
        industry: profileData.industry || '',
        businessDescription: profileData.businessDescription || '',
        taxId: profileData.taxId || '',
        avatarId: profileData.avatarId || 1,
        // Format dates properly if they exist
        foundedDate: profileData.foundedDate ? new Date(profileData.foundedDate) : null,
        createdAt: profileData.createdAt ? new Date(profileData.createdAt) : null,
        updatedAt: profileData.updatedAt ? new Date(profileData.updatedAt) : null,
        // Ensure numeric values are numbers
        employeeCount: profileData.employeeCount !== undefined ? Number(profileData.employeeCount) : 0,
        annualRevenue: profileData.annualRevenue !== undefined ? Number(profileData.annualRevenue) : 0,
        // Format address if partial data exists
        address: {
          street: profileData.address?.street || '',
          city: profileData.address?.city || '',
          state: profileData.address?.state || '',
          zip: profileData.address?.zip || '',
          country: profileData.address?.country || '',
        },
        // Map subscription data
        subscription: {
          plan: profileData.subscriptionTier || 'Free',
          status: profileData.subscriptionExpiry ? 'Active' : 'Inactive',
          renewalDate: profileData.subscriptionExpiry,
          tier: profileData.subscriptionTier,
        },
        // Add display metadata
        lastUpdated: profileData.updatedAt || new Date().toISOString(),
        profileCompleted: profileData.profileCompleted || false,
        ownerName: profileData.ownerName || ''
      };
      //console.log('Formatted profile data:', formattedData);
      setBusinessProfile(formattedData);
      setError(null);
    } catch (err) {
      //console.error('Error fetching business profile:', err);
      setError('Failed to load business profile data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  // Fetch subscription data
  const fetchSubscriptionData = useCallback(async () => {
    try {
      const response = await getSubscription({forceRefresh: true});
      if (response) {
        setSubscriptionData(response);
        return response;
      }
    } catch (err) {
      //console.error('Error fetching subscription data:', err);
    }
    return null;
  }, []);

  // Check if subscription is premium
  const isPremiumSubscription = useCallback(() => {
    return subscriptionData?.planId === 'premium';
  }, [subscriptionData]);
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) {
      return 'Not available';
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadAllData = async () => {
        await fetchBusinessProfile();
        await fetchSubscriptionData();
      };
      loadAllData();
      return () => {};
    }, [fetchBusinessProfile, fetchSubscriptionData])
  );
  // Handle pull-to-refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchBusinessProfile();
  };

  // Function to handle edit navigation
  const handleEditProfile = () => {
    navigation.navigate('BusinessProfileEdit');
  };

  // Function to handle password reset
  const handlePasswordReset = () => {
    navigation.navigate('BusinessPasswordReset');
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.businessPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={handleEditProfile}>
          <MaterialIcons name="edit" size={22} color={theme.colors.businessPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Profile Header with Avatar */}
        <View style={styles.profileHeaderSection}>
          <View style={styles.avatarContainer}>
            {businessProfile.logo ? (
              <Image source={{ uri: businessProfile.logo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                {/* Render the SVG avatar based on the avatarId */}
                {React.createElement(
                  avatars.find(a => a.id === businessProfile.avatarId)?.component || Avatar1,
                  { width: '100%', height: '100%' }
                )}
              </View>
            )}
          </View>
          <Text style={styles.businessName}>{businessProfile.businessName || 'Your Business'}</Text>
          <Text style={styles.businessType}>{businessProfile.businessType || 'Business Type Not Set'}</Text>
        </View>

        {/* Core Information Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Business Information</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <View style={styles.iconContainer}>
                <Ionicons name="mail-outline" size={20} color={theme.colors.businessPrimary} />
              </View>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{businessProfile.email || 'Not provided'}</Text>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.iconContainer}>
                <Ionicons name="call-outline" size={20} color={theme.colors.businessPrimary} />
              </View>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{businessProfile.phone || 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.iconContainer}>
              <Ionicons name="location-outline" size={20} color={theme.colors.businessPrimary} />
            </View>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>
              {businessProfile.address ? (
                Object.values(businessProfile.address).some(val => val.trim() !== '') ? (
                  <>
                    {businessProfile.address.street ? `${businessProfile.address.street}, ` : ''}
                    {businessProfile.address.city ? `${businessProfile.address.city}, ` : ''}
                    {businessProfile.address.state ? `${businessProfile.address.state}, ` : ''}
                    {businessProfile.address.zip ? `${businessProfile.address.zip}, ` : ''}
                    {businessProfile.address.country ? businessProfile.address.country : ''}
                  </>
                ) : 'Not provided'
              ) : 'Not provided'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <View style={styles.iconContainer}>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.businessPrimary} />
              </View>
              <Text style={styles.infoLabel}>Founded</Text>
              <Text style={styles.infoValue}>
                {businessProfile.foundedDate ? businessProfile.foundedDate.toLocaleDateString() : 'Not provided'}
              </Text>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.iconContainer}>
                <Ionicons name="people-outline" size={20} color={theme.colors.businessPrimary} />
              </View>
              <Text style={styles.infoLabel}>Employees</Text>
              <Text style={styles.infoValue}>{businessProfile.employeeCount?.toString() || 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.iconContainer}>
              <Ionicons name="card-outline" size={20} color={theme.colors.businessPrimary} />
            </View>
            <Text style={styles.infoLabel}>Tax ID</Text>
            <Text style={styles.infoValue}>{businessProfile.taxId || 'Not provided'}</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.iconContainer}>
              <Ionicons name="business-outline" size={20} color={theme.colors.businessPrimary} />
            </View>
            <Text style={styles.infoLabel}>Industry</Text>
            <Text style={styles.infoValue}>
              {businessProfile.industry ? 
                businessProfile.industry.charAt(0).toUpperCase() + businessProfile.industry.slice(1) : 
                'Not provided'}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.iconContainer}>
              <Ionicons name="document-text-outline" size={20} color={theme.colors.businessPrimary} />
            </View>
            <Text style={styles.infoLabel}>Description</Text>
            <Text style={styles.infoValue}>{businessProfile.businessDescription || 'Not provided'}</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.iconContainer}>
              <Ionicons name="cash-outline" size={20} color={theme.colors.businessPrimary} />
            </View>
            <Text style={styles.infoLabel}>Annual Revenue</Text>
            <Text style={styles.infoValue}>
              {businessProfile.annualRevenue ? `$${businessProfile.annualRevenue.toLocaleString()}` : 'Not provided'}
            </Text>
          </View>
        </View>

        {/* Settings Section */}
        {/* Subscription Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          <View style={styles.infoCard}>
            <View style={styles.iconContainer}>
              <Ionicons name="star-outline" size={20} color={theme.colors.businessPrimary} />
            </View>
            <Text style={styles.infoLabel}>Current Plan</Text>
            <View style={styles.subscriptionBadge}>
              <Text style={styles.subscriptionBadgeText}>
                {isPremiumSubscription() ? 'Premium' : 'Free'}
              </Text>
            </View>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.iconContainer}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.businessPrimary} />
            </View>
            <Text style={styles.infoLabel}>Renewal Date</Text>
            <Text style={styles.infoValue}>
              {isPremiumSubscription() && subscriptionData?.currentPeriodEnd ? 
                formatDate(subscriptionData.currentPeriodEnd) : 
                'Not applicable'}
            </Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.iconContainer}>
              <Ionicons name="time-outline" size={20} color={theme.colors.businessPrimary} />
            </View>
            <Text style={styles.infoLabel}>Account Created</Text>
            <Text style={styles.infoValue}>
              {businessProfile.createdAt ? 
                new Date(businessProfile.createdAt).toLocaleDateString() : 
                'Unknown'}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.iconContainer}>
              <Ionicons name="refresh-outline" size={20} color={theme.colors.businessPrimary} />
            </View>
            <Text style={styles.infoLabel}>Last Updated</Text>
            <Text style={styles.infoValue}>
              {businessProfile.lastUpdated ? 
                new Date(businessProfile.lastUpdated).toLocaleString() : 
                'Unknown'}
            </Text>
          </View>
        </View>
        
        {/* Settings Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          {businessProfile.settings && (
            <View style={styles.infoRow}>
              <View style={styles.infoCard}>
                <View style={styles.iconContainer}>
                  <Ionicons name="notifications-outline" size={20} color={theme.colors.businessPrimary} />
                </View>
                <Text style={styles.infoLabel}>Notifications</Text>
                <Text style={styles.infoValue}>
                  {businessProfile.settings.notifications ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              
              <View style={styles.infoCard}>
                <View style={styles.iconContainer}>
                  <Ionicons name="moon-outline" size={20} color={theme.colors.businessPrimary} />
                </View>
                <Text style={styles.infoLabel}>Dark Mode</Text>
                <Text style={styles.infoValue}>
                  {businessProfile.settings.darkMode ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
          )}
          
          {/* Password Reset Button */}
          <TouchableOpacity style={styles.passwordResetButton} onPress={handlePasswordReset}>
            <View style={styles.passwordResetContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.colors.businessPrimary} />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.passwordResetText}>Change Password</Text>
                <Text style={styles.passwordResetSubtext}>Update your account password</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#7F8C8D" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  subscriptionBadge: {
    backgroundColor: theme.colors.businessPrimary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  subscriptionBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  safeAreaContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7F8C8D',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: theme.colors.businessPrimary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
  },
  iconButton: {
    padding: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileHeaderSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  businessName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  businessType: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    marginBottom: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 133, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
  },
  footer: {
    height: 20,
  },
  passwordResetButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passwordResetContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonTextContainer: {
    marginLeft: 12,
  },
  passwordResetText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
  },
  passwordResetSubtext: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
});

export default BusinessProfileScreen;
