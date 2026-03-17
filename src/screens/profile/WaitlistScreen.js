/**
 * Waitlist Screen for BillsAI app
 * Allows users to reserve a spot on the waitlist
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Animated,
  Keyboard,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../styles/theme';
import * as waitlistService from '../../services/waitlistService';
import { useAuth } from '../../contexts/AuthContext';

const WaitlistScreen = () => {
  // Navigation
  const navigation = useNavigation();

  // Get current user from auth context
  const { user } = useAuth();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [Address, setAddress] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  // Animation values
  const formOpacity = useRef(new Animated.Value(1)).current;
  const thankYouOpacity = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0.1)).current; // Start very small

  // Animation sequence for successful submission
  const animateSuccess = useCallback(() => {
    // If already showing success screen, don't animate again
    if (isSubmitted) {
      return;
    }

    // Set submitting state right away to show loading UI
    setIsSubmitting(true);

    // Make sure keyboard is dismissed before starting animation
    Keyboard.dismiss();

    // Short delay to prevent black screen flash
    setTimeout(() => {
      // Ensure values are reset before animating
      formOpacity.setValue(1);
      thankYouOpacity.setValue(0);
      checkmarkScale.setValue(0.1); // Start very small

      // Create a smoother animation sequence - first fade form out while making checkmark visible but small
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(thankYouOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Then after a short delay, make the checkmark grow with bounce
        setTimeout(() => {
          Animated.sequence([
            // First grow to normal size
            Animated.spring(checkmarkScale, {
              toValue: 1.0,
              tension: 40,
              friction: 6,
              useNativeDriver: true,
            }),
            // Then slightly bounce for emphasis
            Animated.spring(checkmarkScale, {
              toValue: 1.2,
              tension: 80,
              friction: 5,
              useNativeDriver: true,
            }),
            // Finally settle at normal size
            Animated.spring(checkmarkScale, {
              toValue: 1.0,
              tension: 40,
              friction: 7,
              useNativeDriver: true,
            }),
          ]).start();
        }, 200);

        setIsSubmitting(false);
        setIsSubmitted(true);
      });
    }, 50); // Very short delay, just enough to let the UI update
  }, [formOpacity, thankYouOpacity, checkmarkScale, isSubmitted, setIsSubmitting, setIsSubmitted]);

  // Function to check waitlist status for a given email
  const checkWaitlistStatus = useCallback(async (emailToCheck) => {
    if (!emailToCheck || !/^\S+@\S+\.\S+$/.test(emailToCheck)) {
      return false;
    }

    try {
      //console.log('Checking waitlist status for:', emailToCheck);
      const checkResult = await waitlistService.checkWaitlistStatus(emailToCheck);

      if (checkResult && checkResult.status) {
        //console.log('User already on waitlist, showing thank you screen');
        // Use the animation sequence for a smooth transition
        animateSuccess();
        return true;
      }
      return false;
    } catch (error) {
      //console.error('Error checking waitlist status:', error);
      return false;
    }
  }, [animateSuccess]);

  // Check if user's email is already on waitlist when screen loads
  useEffect(() => {
    // First set loading state to prevent flash of form
    setIsSubmitting(true);

    const checkUserStatus = async () => {
      if (user?.email) {
        const isOnWaitlist = await checkWaitlistStatus(user.email);
        // Only turn off loading if not on waitlist (if on waitlist, animation will handle it)
        if (!isOnWaitlist) {
          setIsSubmitting(false);
        }
      } else {
        setIsSubmitting(false);
      }
    };

    checkUserStatus();
  }, [user, checkWaitlistStatus, setIsSubmitting]);

  // Check waitlist status when email is updated
  useEffect(() => {
    // Don't check if already submitted
    if (isSubmitted) {
      return;
    }

    // Debounce the check to avoid excessive API calls
    const debounceTimeout = setTimeout(() => {
      checkWaitlistStatus(email);
    }, 1000);

    return () => clearTimeout(debounceTimeout);
  }, [email, checkWaitlistStatus, isSubmitted]); // Include dependencies

  // Handle form submission
  const handleSubmit = async () => {
    // Reset errors
    setErrors({});

    // Validate form
    let isValid = true;
    const newErrors = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
      isValid = false;
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      isValid = false;
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
      isValid = false;
    }

    if (!isValid) {
      setErrors(newErrors);
      return;
    }

    // Submit form
    try {
      setIsSubmitting(true);
      //console.log('Submitting waitlist form:', { firstName, lastName, email, phone, reason });

      // Check if already on waitlist
      let checkResult;
      try {
        checkResult = await waitlistService.checkWaitlistStatus(email);
        //console.log('Check result:', checkResult);
      } catch (checkError) {
        //console.error('Error checking waitlist status:', checkError);
        // Continue with submission if we can't check the status
        checkResult = null;
      }

      //console.log('Check result status:', checkResult?.status);

      // If there's no response or no status property, the user is not registered
      if (!checkResult || !checkResult.status) {
        // Add user to waitlist with userId if available
        await waitlistService.addToWaitlist({
          firstName,
          lastName,
          email,
          phone,
          reason,
          Address,
          userId: user?.id || null, // Include userId if user is logged in
        });
        
        // Let animation sequence handle setting isSubmitted
        // instead of setting it here and potentially conflicting
      }
       else {
        Alert.alert(
          'Already on Waitlist',
          'This email is already registered on our waitlist.',
          [{ text: 'OK' }]
        );
        setIsSubmitting(false);
        return;
      }

      //console.log('Added to waitlist:', { firstName, lastName, email, phone, reason });
      
      // Let animation sequence handle everything
      animateSuccess();
    } catch (error) {
      setIsSubmitting(false);
      //console.error('Error submitting waitlist form:', error.response?.data || error.message);
      Alert.alert(
        'Submission Error',
        error.response?.data?.message || 'Failed to submit. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Reset form handler (for debugging only - intentionally unused)
  // eslint-disable-next-line no-unused-vars
  const _resetForm = () => {
    // Reset animation values
    formOpacity.setValue(1);
    thankYouOpacity.setValue(0);
    checkmarkScale.setValue(0);

    // Reset state
    setIsSubmitted(false);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setReason('');
    setErrors({});
  };
  
  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reserve Your Spot</Text>
          <View style={styles.spacer} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          {/* Form View */}
          <Animated.View 
            style={[
              styles.formContainer,
              { opacity: formOpacity },
              isSubmitted && styles.hidden
            ]}
            pointerEvents={(isSubmitted || isSubmitting) ? 'none' : 'auto'}
          >
            <Text style={styles.headlineText}>Join our exclusive waitlist</Text>
            <Text style={styles.subtitleText}>
              We'll notify you as soon as BillsAI is ready for you
            </Text>

            {/* Form Fields */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                style={[styles.input, errors.firstName ? styles.inputError : null]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Your first name"
                placeholderTextColor={theme.colors.gray600}
              />
              {errors.firstName ? (
                <Text style={styles.errorText}>{errors.firstName}</Text>
              ) : null}
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                style={[styles.input, errors.lastName ? styles.inputError : null]}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Your last name"
                placeholderTextColor={theme.colors.gray600}
              />
              {errors.lastName ? (
                <Text style={styles.errorText}>{errors.lastName}</Text>
              ) : null}
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                value={email}
                onChangeText={setEmail}
                placeholder="Your email address"
                placeholderTextColor={theme.colors.gray600}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Your phone number"
                placeholderTextColor={theme.colors.gray600}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={styles.input}
                value={Address}
                onChangeText={setAddress}
                placeholder="Your Address"
                placeholderTextColor={theme.colors.gray600}
                keyboardType="default"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Why are you interested? (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={reason}
                onChangeText={setReason}
                placeholder="Tell us why you're interested in BillsAI"
                placeholderTextColor={theme.colors.gray600}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
          
          {/* Thank You View */}
          <Animated.View 
            style={[
              styles.thankYouContainer,
              { opacity: thankYouOpacity },
              !isSubmitted && styles.hidden
            ]}
            pointerEvents={isSubmitted ? 'auto' : 'none'}
          >
            <Animated.View 
              style={[
                styles.checkmarkContainer,
              ]}
            >
              <Animated.View
                style={{
                  transform: [
                    { scale: checkmarkScale },
                  ],
                }}
              >
                <Ionicons name="checkmark-circle" size={80} color={theme.colors.success} />
              </Animated.View>
            </Animated.View>
            
            <Text style={styles.thankYouTitle}>You're on the Waitlist!</Text>
            <Text style={styles.thankYouText}>
              Thank you for your interest in BillsAI. We've added you to our waitlist and will notify you as soon as we're ready to welcome you.
            </Text>
            
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.white} />
              <Text style={styles.infoText}>
                Keep an eye on your inbox for updates from our team.
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => navigation.navigate('MainTabs')}
            >
              <Text style={styles.homeButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSizes.xlarge,
    fontWeight: theme.typography.fontWeights.bold,
  },
  spacer: {
    width: 40,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xxxl,
 
  },
  headlineText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSizes.xxlarge,
    fontWeight: theme.typography.fontWeights.bold,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitleText: {
    color: theme.colors.gray300,
    fontSize: theme.typography.fontSizes.medium,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  formContainer: {
    padding: theme.spacing.lg,
    width: '100%',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  inputContainer: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSizes.small,
    marginBottom: theme.spacing.xs,
    fontWeight: theme.typography.fontWeights.medium,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    color: theme.colors.white,
    fontSize: theme.typography.fontSizes.medium,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.fontSizes.small,
    marginTop: theme.spacing.xs,
  },
  submitButton: {
    backgroundColor: '#222',
    borderRadius: theme.borderRadius.medium,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    width: '100%',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  submitButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSizes.large,
    fontWeight: theme.typography.fontWeights.bold,
  },
  thankYouContainer: {
    padding: theme.spacing.lg,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  checkmarkContainer: {
    marginBottom: theme.spacing.lg,
  },
  thankYouTitle: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSizes.xxlarge,
    fontWeight: theme.typography.fontWeights.bold,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  thankYouText: {
    color: theme.colors.gray300,
    fontSize: theme.typography.fontSizes.medium,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
    lineHeight: 22,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  infoText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSizes.small,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  homeButton: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    width: '80%',
    alignItems: 'center',
  },
  homeButtonText: {
    color: theme.colors.black,
    fontSize: theme.typography.fontSizes.medium,
    fontWeight: theme.typography.fontWeights.bold,
  },
  hidden: {
    display: 'none',
  },
});

export default WaitlistScreen;
