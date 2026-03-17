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
} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import userService from '../../services/userService';
import theme from '../../styles/theme';

// Import avatar SVGs
import DefaultAvatar from '../../assets/svgs/users-avatar-svgrepo-com.svg';
import MaleAvatar1 from '../../assets/svgs/avatar-svgrepo-com.svg';
import MaleAvatar2 from '../../assets/svgs/avatar-svgrepo-com (1).svg';

const EditProfileScreen = ({ navigation }) => {
  // Get screen dimensions for responsive design
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarId, setAvatarId] = useState('default');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      const userData = await userService.getUserProfile();
      ////console.log('Fetched user profile:', userData);

      // Process name - attempt to get it from any available source
      let displayName = '';
      if (userData.fullName) {
        displayName = userData.fullName;
      } else if (userData.name) {
        displayName = userData.name;
      } else if (userData.firstName || userData.lastName) {
        displayName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
      } else if (userData.email) {
        // If no name is available, use email username
        displayName = userData.email.split('@')[0];
      }
      // Set avatar if available
      if (userData.avatarId) {
        setAvatarId(userData.avatarId);
      }
      setUser(userData);
      setName(displayName);
      setEmail(userData.email || '');
      setPhone(userData.phone || '');
      setError(null);
      setUsername(userData.username || '');
    } catch (err) {
      ////console.error('Error fetching user profile:', err);
      setError('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  // No image handling functions - using avatars only

  // Helper function to get the avatar component based on avatarId
  const getAvatarComponent = (id) => {
    switch (id) {
      case 'male1':
        return MaleAvatar1;
      case 'male2':
        return MaleAvatar2;
      case 'default':
      default:
        return DefaultAvatar;
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name is required.');
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

    // Simple phone validation (optional field)
    if (phone.trim() && !/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(phone)) {
      Alert.alert('Validation Error', 'Please enter a valid phone number.');
      return false;
    }

    if (!username.trim()) {
      Alert.alert('Validation Error', 'Username is required.');
      return false;
    }

    return true;
  };



  const handleSave = async () => {
    if (!validateForm()){ return;}

    setIsLoading(true);

    try {
      // Save the name as fullName to match the server model, including avatarId
      await userService.updateProfile({
        fullName: name, // Use fullName field to match server model
        email,
        phone,
        username,

      });

      // If we reach here without an error being thrown, the update was successful
      // Let's assume that the API call succeeded if we got any response without an error
      ////console.log('Profile update completed, result:', result);
      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (err) {
      ////console.error('Error updating profile:', err);
      if (err?.message?.includes('AUTH_TOKEN_EXPIRED')) {
        // This will be handled by the global error handler
        // in the AuthContext which will show the appropriate message
      } else {
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

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

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No profile data available</Text>
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
        <Text style={[styles.title, isTablet && styles.titleTablet]}>Edit Profile</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}>
        <View style={[styles.content, isTablet && styles.contentTablet]}>
          <View style={styles.imageSection}>
            <View style={[styles.profileImageContainer, isTablet && styles.profileImageContainerTablet]}>
              {/* Display avatar without edit option */}
              <View style={[styles.avatarContainer, isTablet && styles.avatarContainerTablet]}>
                {React.createElement(getAvatarComponent(avatarId), {
                  width: isTablet ? 160 : 120,
                  height: isTablet ? 160 : 120,
                })}
              </View>
            </View>
          </View>

          <View style={[styles.formCard, isTablet && styles.formCardTablet]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isTablet && styles.labelTablet]}>Name</Text>
              <TextInput
                style={[styles.input, isTablet && styles.inputTablet]}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#95A5A6"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isTablet && styles.labelTablet]}>Email</Text>
              <TextInput
                style={[styles.input, isTablet && styles.inputTablet]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#95A5A6"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isTablet && styles.labelTablet]}>Phone (optional)</Text>
              <TextInput
                style={[styles.input, isTablet && styles.inputTablet]}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                placeholderTextColor="#95A5A6"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isTablet && styles.labelTablet]}>Username</Text>
              <TextInput
                style={[styles.input, isTablet && styles.inputTablet]}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                placeholderTextColor="#95A5A6"
                keyboardType="default"
              />
            </View>
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
    backgroundColor: theme.colors.white,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
    overflow: 'hidden',
  },
  avatarContainerTablet: {
    width: 160,
    height: 160,
    borderRadius: 80,
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
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.gray700,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
    position: 'relative',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.black,
    textAlign: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
  },
  titleTablet: {
    fontSize: 24,
  },
  scrollContent: {
    padding: 16,
  },
  scrollContentTablet: {
    padding: 24,
  },
  content: {
    width: '100%',
  },
  contentTablet: {
    maxWidth: 600,
    alignSelf: 'center',
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImageContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    marginBottom: 16,
    marginTop:20,
    backgroundColor: '#ffffff',
  },
  profileImageContainerTablet: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profileImageTablet: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  profileInitial: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitialTablet: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  initialText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  initialTextTablet: {
    fontSize: 60,
  },
  imageButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  selectButton: {
    backgroundColor: theme.colors.primary,
  },
  removeButton: {
    backgroundColor: theme.colors.error,
  },
  imageButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  formCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.medium,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.gray700,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.small,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.black,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: theme.borderRadius.small,
    paddingVertical: 14,
    marginRight: 8,
    alignItems: 'center',
    borderColor: theme.colors.black,
    borderWidth:1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.black,
  },
  saveButton: {
    flex: 1,
    backgroundColor: theme.colors.black,
    borderRadius: theme.borderRadius.small,
    paddingVertical: 14,
    marginLeft: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.white,
  },
});

export default EditProfileScreen;
