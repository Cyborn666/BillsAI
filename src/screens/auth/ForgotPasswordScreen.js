/**
 * Forgot Password Screen for BillsAI app
 */

import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, Alert } from 'react-native';
import LogoBills from '../../assets/svgs/APP120SVGC.svg';
import ForgotPasswordForm from '../../components/auth/ForgotPasswordForm';
import theme from '../../styles/theme';
import { requestPasswordReset } from '../../services/authService';

const ForgotPasswordScreen = ({ navigation }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      // Call the reset API with both email and account type
      await requestPasswordReset(data.email, data.accountType);
      //console.log('Password reset requested for:', data.email, 'Account type:', data.accountType);
      // The form component will handle showing a success message
    } catch (error) {
      Alert.alert(
        'Password Reset Failed',
        error.message || 'Unable to request password reset. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    // Navigate back to login screen
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <LogoBills width="100%" height="100%" />
          </View>
        </View>

        <ForgotPasswordForm
          onSubmit={handleSubmit}
          onBackToLogin={handleBackToLogin}
          isSubmitting={isSubmitting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: theme.spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});

export default ForgotPasswordScreen;
