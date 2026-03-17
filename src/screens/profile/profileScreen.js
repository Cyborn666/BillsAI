/**
 * Profile Screen for BillsAI app
 * Displays user profile information and provides access to account settings
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  useWindowDimensions,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
// import AsyncStorage from '@react-native-async-storage/async-storage';
import userService from '../../services/userService';
import theme from '../../styles/theme';
import { useAuth } from '../../contexts/AuthContext';
import * as NotificationService from '../../services/notificationService';

// Import all available avatars
import DefaultAvatar from '../../assets/svgs/users-avatar-svgrepo-com.svg';
import MaleAvatar1 from '../../assets/svgs/avatar-svgrepo-com.svg';
import MaleAvatar2 from '../../assets/svgs/avatar-svgrepo-com (1).svg';


const ProfileScreen = ({ navigation }) => {
  // Get screen dimensions for responsive design
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // Get auth context functions
  const { logout } = useAuth();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notificationEnabled, setNotificationEnabled] = useState(true);

  // Avatar selection state
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('male2');

  // Available avatars for selection
  const avatarOptions = [
    { id: 'default', component: DefaultAvatar, label: 'Default' },
    { id: 'male1', component: MaleAvatar1, label: 'Male' },
    { id: 'male2', component: MaleAvatar2, label: 'Female' },

  ];

  // Get current avatar component
  const getCurrentAvatar = () => {
    const avatarOption = avatarOptions.find(option => option.id === selectedAvatar);
    return avatarOption ? avatarOption.component : DefaultAvatar;
  };

  // Handle user sign-out with confirmation
  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          onPress: async () => {
            try {
              await logout();
              ////console.log('User logged out successfully');
              // Navigation will happen automatically via AuthContext
            } catch (err) {
              ////console.error('Logout failed:', err);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
          style: 'destructive',
        },
      ],
    );
  }, [logout]);

  // Fetch user profile data on component mount and when the screen comes back into focus
  useEffect(() => {
    fetchUserProfile();
    loadNotificationSettings();

    // Add focus listener to reload profile when returning to this screen
    const unsubscribe = navigation.addListener('focus', () => {
      ////console.log('Profile screen focused - refreshing data');
      fetchUserProfile();
      loadNotificationSettings();
    });

    // Clean up the listener when component unmounts
    return unsubscribe;
  }, [navigation]);

  const loadNotificationSettings = async () => {
    try {
      const settings = await NotificationService.getNotificationSettings();
      ////console.log('Loaded notification settings:', settings);
      // Check if settings exist and have enabled property
      if (settings && typeof settings.enabled !== 'undefined') {
        setNotificationEnabled(settings.enabled);
      } else {
        // Default to enabled if settings are incomplete
        ////console.log('Notification settings incomplete, defaulting to enabled');
        setNotificationEnabled(true);
      }
    } catch (err) {
      ////console.error('Error loading notification settings:', err);
      // Default to enabled if there's an error
      setNotificationEnabled(true);
    }
  };

  const handleToggleNotifications = async (value) => {
    try {
      ////console.log('Toggling notifications to:', value);
      // Update UI state immediately for better UX
      setNotificationEnabled(value);

      // Create default settings if needed
      const defaultSettings = {
        enabled: value,
        defaultReminderDays: 3,
      };

      // Save to AsyncStorage for the notification service
      let currentSettings;
      try {
        currentSettings = await NotificationService.getNotificationSettings();
      } catch (settingsErr) {
        ////console.warn('Could not get current notification settings, using defaults', settingsErr);
        currentSettings = defaultSettings;
      }

      // Ensure we have valid settings
      if (!currentSettings) {
        currentSettings = defaultSettings;
      }

      // Save the settings
      const saveResult = await NotificationService.saveNotificationSettings({
        ...currentSettings,
        enabled: value,
      });

      if (!saveResult) {
        throw new Error('Failed to save notification settings');
      }

      // Update server-side if we have user data
      if (user?.id) {
        try {
          // Send both pushEnabled and emailEnabled to match the backend model
          await userService.updateNotificationSettings({
            pushEnabled: value,
            emailEnabled: value,
          });
        } catch (serverErr) {
          ////console.warn('Could not update server notification settings, but local settings were updated', serverErr);
          // Don't throw error here - local settings were updated successfully
        }
      }
    } catch (err) {
      ////console.error('Error toggling notifications:', err);
      // Revert UI state on error
      setNotificationEnabled(!value);
      Alert.alert(
        'Error',
        'Failed to update notification settings. Please try again.'
      );
    }
  };

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setUser(null); // Reset user data before fetching
      ////console.log('Fetching user profile...');

      const userData = await userService.getUserProfile();
      ////console.log('Profile data received:', userData);

      if (!userData) {
        ////console.error('User profile data is null');
        setError('No user data received');
        return;
      }

      // Create a safe user object with defaults for missing fields
      // Based on the updated server response that provides fullName
      const fullName = userData.fullName || '';

      ////console.log('Raw user data from server:', userData);

      const safeUser = {
        id: userData.id || 'unknown',
        email: userData.email || 'No email',
        // Store fullName in both places for backward compatibility
        fullName: fullName,
        name: fullName || 'User',
        username: userData.username || `@${userData.email?.split('@')[0] || 'user'}`,
        role: userData.role || 'user',
        createdAt: userData.createdAt || new Date().toISOString(),
        // No profile image, only using avatars
        phone: userData.phone || 'Not provided',
        avatarId: userData.avatarId || 'male2',
      };


      // Set the user state and avatar selection
      setUser(safeUser);
      setSelectedAvatar(safeUser.avatarId || 'male2');
      setError(null);
    } catch (err) {
      //console.error('Error fetching profile:', err);
      setError(`Failed to load profile: ${err?.message || 'Unknown error'}`);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Save selected avatar to user profile
  const saveAvatarSelection = async (avatarId) => {
    try {
      setLoading(true);
      ////console.log('Saving avatar selection:', avatarId);

      // Update profile with new avatar ID
      await userService.updateProfile({ avatarId });
      ////console.log('Profile update response:', updatedUser);

      // Update local state
      setSelectedAvatar(avatarId);
      if (user) {
        setUser({...user, avatarId});
      }

      // Show confirmation to user
      Alert.alert('Success', 'Avatar updated successfully!');

      // Close modal
      setShowAvatarModal(false);
    } catch (err) {
      ////console.error('Error saving avatar selection:', err);
      Alert.alert('Error', 'Failed to save avatar selection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.black} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  // Error handling
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUserProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Safety check for missing user data
  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No profile data available</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUserProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/*<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.black} />
        </TouchableOpacity>*/}
        <Text style={[styles.title, isTablet && styles.titleTablet]}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.content, isTablet && styles.contentTablet]}>
          {/* Settings Label */}
          {/*<Text style={styles.sectionLabel}>Settings</Text>*/}

          {/* Profile Section */}
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.7}
          >
            <View style={styles.listItemContent}>
            <TouchableOpacity
                style={styles.avatarContainer}
                onPress={() => setShowAvatarModal(true)}
                activeOpacity={0.7}
              >
                {React.createElement(getCurrentAvatar(), {
                  width: isTablet ? 70 : 70,
                  height: isTablet ? 70 : 70,
                })}
                <View style={styles.editIconSmall}>
                  <Ionicons name="camera" size={isTablet ? 16 : 14} color="#FFFFFF" />

                </View>
              </TouchableOpacity>
              <View style={styles.listItemContentName}>
              <Text style={styles.listItemText}>
                {user ? user.name || user.fullName || 'User' : 'Loading...'}
              </Text>
              <Text style={[styles.listItemText,styles.listItemSubText]}>
                {user ? user.username || 'User' : 'Loading...'}
              </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#C7C7CC" />
          </TouchableOpacity>

          {/* Account Information */}
          <Text style={styles.sectionLabel}>Account Information</Text>

          <TouchableOpacity style={styles.listItem}>
            <View style={styles.listItemContent}>
              <View style={styles.iconContainer}>
                <FontAwesome name="user-o" size={isTablet ? 26 : 22} color="#0c0c0e" />
              </View>
              <Text style={styles.listItemText}>Name</Text>
            </View>
            <Text style={styles.listItemValue}>
              {user && (user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Not set')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.listItem}>
            <View style={styles.listItemContentFlex}>
              <View style={styles.iconContainer}>
                <FontAwesome name="envelope-o" size={isTablet ? 26 : 22} color="#0c0c0e" />
              </View>
              <Text style={styles.listItemText}>Email</Text>
            </View>
            <View style={styles.emailContainer}>
              <Text numberOfLines={1} ellipsizeMode="tail" style={styles.emailValue}>
                {user && user.email}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.listItem}>
            <View style={styles.listItemContent}>
              <View style={styles.iconContainer}>
                <FontAwesome name="phone" size={isTablet ? 26 : 22} color="#0c0c0e" />
              </View>
              <Text style={styles.listItemText}>Phone</Text>
            </View>
            <Text style={styles.listItemValue}>{user && (user.phone || 'Not provided')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.listItem}>
            <View style={styles.listItemContent}>
              <View style={styles.iconContainer}>
                <FontAwesome name="calendar-o" size={isTablet ? 26 : 22} color="#0c0c0e" />
              </View>
              <Text style={styles.listItemText}>Member Since</Text>
            </View>
            <Text style={styles.listItemValue}>
              {user && user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
            </Text>
          </TouchableOpacity>
            </View>



           {/* PREFERENCE Information */}
           <Text style={styles.sectionLabel}>Preferences</Text>

          <View style={styles.listItem}>
            <View style={styles.listItemContent}>
              <View style={styles.iconContainer}>
                <FontAwesome name="bell-o" size={isTablet ? 26 : 22} color="#0c0c0e" />
              </View>
              <Text style={styles.listItemText}>Push Notifications</Text>
            </View>
            <Switch
              trackColor={{ false: '#CCD1D1', true: '#0c0c0e' }}
              thumbColor={notificationEnabled ? '#FFFFFF' : '#FFFFFF'}
              ios_backgroundColor="#CCD1D1"
              value={notificationEnabled}
              onValueChange={handleToggleNotifications}
            />
          </View>

           {/* APP SETTINGS */}
           <Text style={styles.sectionLabel}>App Settings</Text>

          <TouchableOpacity
            style={styles.listItem}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={styles.listItemContent}>
              <View style={styles.iconContainer}>
                <FontAwesome name="cog" size={isTablet ? 26 : 22} color="#0c0c0e" />
              </View>
              <Text style={styles.listItemText}>App Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#C7C7CC" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <View style={styles.listItemContent}>
              <View style={styles.iconContainer}>
                <FontAwesome name="shield" size={isTablet ? 26 : 22} color="#0c0c0e" />
              </View>
              <Text style={styles.listItemText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#C7C7CC" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => navigation.navigate('TermsConditions')}
          >
            <View style={styles.listItemContent}>
              <View style={styles.iconContainer}>
                <FontAwesome name="file-text-o" size={isTablet ? 26 : 22} color="#0c0c0e"  />
              </View>
              <Text style={styles.listItemText}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#C7C7CC" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => navigation.navigate('HelpSupport')}
          >
            <View style={styles.listItemContent}>
              <View style={styles.iconContainer}>
                <FontAwesome name="info-circle" size={isTablet ? 26 : 22} color="#0c0c0e"   />
              </View>
              <Text style={styles.listItemText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#C7C7CC" />
          </TouchableOpacity>

          {/* Feedback */}
          <Text style={styles.sectionLabel}>Feedback</Text>

          <TouchableOpacity
            style={styles.listItem}
            onPress={() => navigation.navigate('RateBillsAI')}
          >
            <View style={styles.listItemContent}>
              <View style={styles.iconContainer}>
                <FontAwesome name="star-o" size={isTablet ? 26 : 22} color="#0c0c0e" />
              </View>
              <Text style={styles.listItemText}>Rate BillsAI</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#C7C7CC" />
          </TouchableOpacity>

         {/* <TouchableOpacity
            style={styles.listItemLast}
            onPress={() => navigation.navigate('ContactUs')}
          >
            <View style={styles.listItemContent}>
              <View style={styles.iconContainer}>
                <FontAwesome name="envelope-o" size={isTablet ? 26 : 22} color="#0c0c0e" />
              </View>
              <Text style={styles.listItemText}>Contact Us</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#C7C7CC" />
          </TouchableOpacity>*/}

          <TouchableOpacity
            style={[styles.signOutButton, isTablet && styles.signOutButtonTablet]}
            onPress={handleSignOut}
          >
            <Text style={[styles.signOutButtonText, isTablet && styles.signOutButtonTextTablet]}>Sign Out</Text>
          </TouchableOpacity>

          <View style={styles.versionContainer}>
            <Text style={[styles.versionText, isTablet && styles.versionTextTablet]}>BillsAI v1.0.0</Text>
          </View>

      </ScrollView>

      {/* Avatar Selection Modal */}
      <Modal
        visible={showAvatarModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Profile Icon</Text>
              <TouchableOpacity onPress={() => setShowAvatarModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.black} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={avatarOptions}
              numColumns={3}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.avatarOption,
                    selectedAvatar === item.id && styles.selectedAvatarOption,
                  ]}
                  onPress={() => saveAvatarSelection(item.id)}
                >
                  {React.createElement(item.component, {
                    width: isTablet ? 80 : 60,
                    height: isTablet ? 80 : 60,
                  })}
                  <Text style={styles.avatarLabel}>{item.label}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.avatarList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#000',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.black,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
  },
  backButton: {
    padding: theme.spacing.xs,
    position: 'absolute',
    left: theme.spacing.lg,
    zIndex: 1,
  },
  searchButton: {
    padding: 8,
  },
  title: {
    fontSize: theme.typography.fontSizes.large,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.black,
    flex: 1,
    textAlign: 'center',
  },
  titleTablet: {
    fontSize: 26,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.black,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,

  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
  },
  content: {
    width: '100%',
  },
  contentTablet: {
    alignSelf: 'center',
    maxWidth: 800, // Maximum width on tablets
  },
  profileListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  profileItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    position: 'relative',
  },
  editIconSmall: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.black,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.white,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  listItemLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.white,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemContentFlex: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listItemContentName: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  listItemText: {
    fontSize: 17,
    color: theme.colors.black,
    fontWeight: theme.typography.fontWeights.medium,
  },
  listItemSubText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: theme.typography.fontWeights.regular,
    marginVertical: 4,
  },
  listItemValue: {
    fontSize: 17,
    color: '#8E8E93',
    maxWidth: '50%',
    textAlign: 'right',
  },
  emailContainer: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  emailValue: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'right',
    flex: 1,
  },
  cardsContainer: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  cardsContainerTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: 'transparent',
    marginBottom: 8,
    padding: 0,
  },
  cardTablet: {
    width: '48%', // Just under half to account for margin
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.black,
    marginBottom: 16,
  },
  sectionTitleTablet: {
    fontSize:
    22,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    fontWeight: '500',
  },
  infoContent: {
    flex: 1,
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginBottom: 2,
  },
  infoLabelTablet: {
    fontSize: 16,
  },
  infoValue: {
    fontSize: 16,
    color: theme.colors.black,
  },
  infoValueTablet: {
    fontSize: 18,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  preferenceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  preferenceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    fontWeight: '500',
  },
  preferenceText: {
    fontSize: 16,
    color: theme.colors.black,
  },
  preferenceTextTablet: {
    fontSize: 18,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    fontWeight: '500',
  },
  settingsText: {
    fontSize: 16,
    color: theme.colors.black,
  },
  settingsTextTablet: {
    fontSize: 18,
  },
  signOutButton: {
    backgroundColor: theme.colors.black,
    borderRadius: theme.borderRadius.small,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'center',
    width: '100%',
    marginTop: 20,
  },
  signOutButtonTablet: {
    width: '50%',
    padding: 18,
  },
  signOutButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  signOutButtonTextTablet: {
    fontSize: 18,
  },
  versionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  versionText: {
    fontSize: 14,
    color: '#000',
  },
  versionTextTablet: {
    fontSize: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.large,
    width: '80%',
    maxHeight: '70%',
    padding: theme.spacing.lg,
  },
  modalContentTablet: {
    width: '60%',
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: theme.typography.fontSizes.large,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.black,
  },
  avatarList: {
    paddingVertical: theme.spacing.md,
  },
  avatarOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
    margin: theme.spacing.xs,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedAvatarOption: {
    borderColor: theme.colors.black,
    backgroundColor: theme.colors.gray100,
  },
  avatarLabel: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.black,
  },
});

export default ProfileScreen;
