/**
 * Forgot Password form component for BillsAI app
 */

import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Pressable } from 'react-native';
import Input from '../common/Input';
import Button from '../common/Button';
import theme from '../../styles/theme';

const ForgotPasswordForm = ({ onSubmit, onBackToLogin, isSubmitting }) => {
  const [email, setEmail] = useState('');
  const [accountType, setAccountType] = useState('personal'); // Default to personal account
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isResetSent, setIsResetSent] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    // Validate email
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      setIsLoading(true);
      try {
        // Here you would normally call an API to initiate password reset
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        onSubmit({ email, accountType });
        setIsResetSent(true);
      } catch (error) {
        setErrors({ form: 'Password reset failed. Please try again.' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (isResetSent) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Reset Email Sent</Text>
        <Text style={styles.subtitle}>
          We've sent password reset instructions to {email} for your {accountType} account. Please check your email.
        </Text>

        <Button
          title="Back to Login"
          onPress={onBackToLogin}
          style={styles.button}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>
        Enter your email address and we'll send you instructions to reset your password.
      </Text>

      {errors.form && <Text style={styles.formError}>{errors.form}</Text>}

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="Enter your email"
        keyboardType="email-address"
        error={errors.email}
      />
      
      {/* Account type selector */}
      <Text style={styles.sectionTitle}>Account Type</Text>
      <View style={styles.accountTypeContainer}>
        <Pressable
          style={[styles.accountTypeButton, accountType === 'personal' && styles.accountTypeButtonActive]}
          onPress={() => setAccountType('personal')}
        >
          <Text style={[styles.accountTypeText, accountType === 'personal' && styles.accountTypeTextActive]}>
            Personal
          </Text>
        </Pressable>
        <Pressable
          style={[styles.accountTypeButton, accountType === 'business' && styles.accountTypeButtonActive]}
          onPress={() => setAccountType('business')}
        >
          <Text style={[styles.accountTypeText, accountType === 'business' && styles.accountTypeTextActive]}>
            Business
          </Text>
        </Pressable>
      </View>

      <Button
        title="Send Reset Link"
        onPress={handleSubmit}
        loading={isLoading || isSubmitting}
        style={styles.button}
      />

      <TouchableOpacity
        style={styles.backToLoginContainer}
        onPress={onBackToLogin}
      >
        <Text style={styles.backToLoginText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    width: '100%',
  },
  title: {
    fontSize: theme.typography.fontSizes.xxlarge,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.black,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.fontSizes.medium,
    color: theme.colors.gray700,
    marginBottom: theme.spacing.lg,
  },
  formError: {
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  button: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  backToLoginContainer: {
    alignItems: 'center',
  },
  backToLoginText: {
    color: theme.colors.black,
    fontSize: theme.typography.fontSizes.medium,
    fontWeight: theme.typography.fontWeights.medium,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSizes.small,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.gray700,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  accountTypeContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.xs,
  },
  accountTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.sm,


    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTypeButtonActive: {
    backgroundColor:'#1d2951',
  },
  accountTypeText: {
    color: theme.colors.gray700,
    fontWeight: theme.typography.fontWeights.medium,
  },
  accountTypeTextActive: {
    color: theme.colors.white,
  },
});

export default ForgotPasswordForm;
