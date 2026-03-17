/**
 * Business Settings Screen
 * Shows business user's settings and profile information with a vibrant, gradient UI
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { getBusinessProfile, updateBusinessProfile } from '../services/businessApiService';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// Using MaterialIcons instead of Ionicons for consistency
import { useAuth } from '../../contexts/AuthContext';
import {BadgeCheck} from 'lucide-react-native';
import theme from '../../styles/theme';
import { getSubscription } from '../services/subscriptionService';

// Import SVG avatars directly as components
import Avatar1 from '../../assets/svgs/businessprofile/Group-1.svg';
import Avatar2 from '../../assets/svgs/businessprofile/Group-2.svg';
import Avatar4 from '../../assets/svgs/businessprofile/Group-4.svg';
import Avatar6 from '../../assets/svgs/businessprofile/Group-6.svg';
import Avatar8 from '../../assets/svgs/businessprofile/Group-8.svg';
import Avatar10 from '../../assets/svgs/businessprofile/Group-10.svg';

// Array of available avatars
const avatars = [
  { id: 1, component: Avatar1 },
  { id: 2, component: Avatar2 },
  { id: 4, component: Avatar4 },
  { id: 6, component: Avatar6 },
  { id: 8, component: Avatar8 },
  { id: 10, component: Avatar10 },
];

// Icon colors for each menu item with matching background colors at 12% opacity
const iconColors = {
  'business': {color: '#4285F4', bgColor: 'rgba(66, 133, 244, 0.12)'},        // Blue for Business Profile
  'workspace-premium': {color: '#0F9D58', bgColor: 'rgba(15, 157, 88, 0.12)'}, // Green for Subscription
  'receipt-long': {color: '#DB4437', bgColor: 'rgba(219, 68, 55, 0.12)'},    // Red for Invoice Generator
  'notifications': {color: '#F4B400', bgColor: 'rgba(244, 180, 0, 0.12)'},   // Yellow for Notifications
  'groups': {color: '#4285F4', bgColor: 'rgba(66, 133, 244, 0.12)'},          // Blue for Clients
  'headset-mic': {color: '#0F9D58', bgColor: 'rgba(15, 157, 88, 0.12)'},     // Green for Support
  'logout': {color: '#DB4437', bgColor: 'rgba(219, 68, 55, 0.12)'},          // Red for Sign Out
  'delete-forever': {color: '#FF3B30', bgColor: 'rgba(255, 59, 48, 0.12)'},  // Bright Red for Delete Account
};

// MenuItem component for settings menu options
const MenuItem = ({ icon, label, onPress }) => {
  // Get the color and background color for this icon or default to business primary color
  const iconTheme = iconColors[icon] || {color: themeColors.businessPrimary, bgColor: 'rgba(74, 111, 255, 0.12)'};

  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconTheme.bgColor }]}>
        <MaterialIcons name={icon} size={24} color={iconTheme.color} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <MaterialIcons name="chevron-right" size={22} color="#BBBBBB" />
    </TouchableOpacity>
  );
};

// Get theme colors
const themeColors = {
  businessPrimary: '#4A6FFF',
  businessSecondary: '#F5F6FA', // Light background
  textPrimary: '#333333',
  textSecondary: '#666666',
};

const BusinessSettingsScreen = ({ navigation }) => {
  const { logout } = useAuth();
  // State for business profile data
  const [loading, setLoading] = useState(false);
  const [businessProfile, setBusinessProfile] = useState({});
  const [subscriptionData, setSubscriptionData] = useState(null);
  // Avatar selection state
  const [selectedAvatar, setSelectedAvatar] = useState(businessProfile?.avatarId || 1);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Define business profile fetching function
  const fetchBusinessProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getBusinessProfile();
      //console.log('Settings screen - profile data:', response);
      // Extract business user data from nested structure
      const profileData = response.businessUser || response;
      setBusinessProfile(profileData);
      // Set subscription info
      // Set selected avatar from profile data if available
      if (profileData?.avatarId) {
        setSelectedAvatar(profileData.avatarId);
      }
    } catch (error) {
      //console.error('Error fetching business profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          getBusinessProfile(),
          getSubscription({forceRefresh: true}),
        ]);
      } catch (error) {
        //console.error('Failed to load business profile:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchBusinessProfile();
      fetchSubscriptionData(); // Also fetch subscription data when screen is focused
    }, [fetchBusinessProfile, fetchSubscriptionData])
  );

  // Navigate to profile screen
  const navigateToProfile = () => {
    navigation.navigate('BusinessProfile');
  };

  // Fetch subscription data
  const fetchSubscriptionData = useCallback(async () => {
    try {
      const response = await getSubscription({forceRefresh: true});
      if (response) {
        setSubscriptionData(response);
        //console.log('Subscription data:', response);
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

  const handleSignOut = async () => {
    try {
      await logout();
      // Navigation handled by AuthContext observer
    } catch (error) {
      //console.error('Error signing out:', error);
    }
  };

  // Get the first letter of business name for avatar
  // We'll keep this for fallback but it's not actively used with SVG avatars
  // const businessInitial = businessProfile?.businessName
  //   ? businessProfile.businessName.charAt(0).toUpperCase()
  //   : 'B';
  // Display loading indicator while fetching data
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitleText}>Settings</Text>
        <View style={styles.profileCard}>
          <View style={styles.profileCardLeft}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={() => setShowAvatarModal(true)}
            >
              {/* Render selected avatar component */}
              {React.createElement(
                avatars.find(a => a.id === selectedAvatar)?.component || Avatar1,
                { width: '100%', height: '100%' }
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.profileCardContent}>
            <View style={styles.businessNameContainer}>
              <Text style={styles.businessName}>
                {businessProfile?.businessName || 'Your Business Name'}
              </Text>
              {isPremiumSubscription() && (
              <View style={styles.verifiedBadge}>
                <BadgeCheck size={16} color={themeColors.businessPrimary} />
              </View>
              )}
            </View>
            <Text style={styles.businessRole}>
              {businessProfile?.ownerName
                ? `${businessProfile.ownerName}`
                : businessProfile?.industry
                  ? `${businessProfile.industry.charAt(0).toUpperCase() + businessProfile.industry.slice(1)} Business`
                  : 'Business Owner'}
            </Text>



            {subscriptionData ? (
              <View style={[styles.subscriptionBadge, isPremiumSubscription() ? styles.premiumBadge : styles.freeBadge]}>
                <Text style={styles.subscriptionText}>
                  {isPremiumSubscription() ? 'Premium' : 'Free'}
                </Text>
              </View>
            ) : (
              <View style={[styles.subscriptionBadge, styles.freeBadge]}>
                <Text style={styles.subscriptionText}>
                  Free
                </Text>
              </View>
            )}


          </View>
          {/*<TouchableOpacity
            style={styles.editProfileButton}
            onPress={navigateToProfile}
          >
            <MaterialIcons name="edit" size={18} color={themeColors.businessPrimary} />
          </TouchableOpacity>*/}
        </View>
      </View>
      {/* Menu items in scrollable section */}
      <ScrollView
        style={styles.menuSection}
        contentContainerStyle={styles.menuContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.menuHeaderContainer}>
          <Text style={styles.menuHeaderTitle}>Business Settings</Text>
          <Text style={styles.menuHeaderSubtitle}>Manage your business preferences</Text>
        </View>
        <MenuItem
          icon="business"
          label="Business Profile"
          onPress={navigateToProfile}
        />
        <MenuItem
          icon="workspace-premium"
          label="Subscription"
          onPress={() => navigation.navigate('BusinessSubscription')}
        />
        <MenuItem
          icon="receipt-long"
          label="Invoice Generator"
          onPress={() => navigation.navigate('BusinessCreateInvoice')}
        />
        <MenuItem
          icon="notifications"
          label="Notifications"
          onPress={() => navigation.navigate('BusinessNotifications')}
        />
        <MenuItem
          icon="groups"
          label="Clients"
          onPress={() => navigation.navigate('Clients')}
        />
        <MenuItem
          icon="headset-mic"
          label="Support"
          onPress={() => navigation.navigate('BusinessSupport')}
        />
        <MenuItem
          icon="logout"
          label="Sign Out"
          onPress={handleSignOut}
        />
        
        {/* Account deletion option */}
        <View style={styles.dangerZone}>
         {/* <Text style={styles.dangerZoneTitle}>Danger Zone</Text> */}
          <MenuItem
            icon="delete-forever"
            label="Delete Account"
            onPress={() => navigation.navigate('BusinessDeleteAccount')}
          />
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>BillsAI Business v1.2.0</Text>
        </View>
      </ScrollView>
      
      {/* Avatar selection modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAvatarModal}
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Avatar</Text>

            <FlatList
              data={avatars}
              numColumns={3}
              keyExtractor={(item) => `avatar-${item.id}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.avatarOption,
                    selectedAvatar === item.id && styles.selectedAvatarOption,
                  ]}
                  onPress={() => {
                    setSelectedAvatar(item.id);
                    setShowAvatarModal(false);
                    // Save selected avatar to backend
                    updateBusinessProfile({ avatarId: item.id })
                      .then(() => {
                        // Update was successful
                        //console.log('Avatar updated successfully');
                      })
                      .catch(error => {
                        //console.error('Error updating avatar:', error);
                        // Optionally show error message to user
                      });
                  }}
                >
                  {React.createElement(item.component, { width: 60, height: 60 })}
                </TouchableOpacity>
              )}
            />
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAvatarModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666666',
  },
  headerContainer: {
    paddingTop: 15,
    paddingBottom: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  headerTitleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginBottom: 16,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  profileCardLeft: {
    marginRight: 20,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: themeColors.businessPrimary,
  },
  profileCardContent: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginRight: 6,
  },
  verifiedBadge: {
    marginLeft: 4,
    alignSelf: 'center',
  },
  businessRole: {
    paddingVertical: 4,
    fontSize: 14,
    color: themeColors.textSecondary,
    marginBottom: 6,
  },
  subscriptionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
    alignSelf: 'flex-start',
  },
  premiumBadge: {
    backgroundColor: themeColors.businessPrimary,
  },
  freeBadge: {
    backgroundColor: themeColors.businessPrimary,
  },
  subscriptionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  autoRenewalText: {
    color: 'white',
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
  editProfileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(74, 111, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  menuSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  menuContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  menuHeaderContainer: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  menuHeaderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  menuHeaderSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 10,
  },
  versionText: {
    fontSize: 13,
    color: '#888888',
  },
  dangerZone: {
    marginTop: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },
  dangerZoneTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 10,
  },
  editAvatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: themeColors.businessPrimary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: themeColors.textPrimary,
  },
  avatarOption: {
    margin: 10,
    padding: 5,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedAvatarOption: {
    borderColor: themeColors.businessPrimary,
    backgroundColor: 'rgba(74, 111, 255, 0.1)',
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: themeColors.businessPrimary,
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  businessNameContainer:{
     flexDirection:'row',
  }
});

export default BusinessSettingsScreen;
