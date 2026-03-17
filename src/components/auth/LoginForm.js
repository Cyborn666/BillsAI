/**
 * Login form component for BillsAI app
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Input from '../common/Input';
import Button from '../common/Button';
import AccountTypeSelector from './AccountTypeSelector';
import theme from '../../styles/theme';

const LoginForm = ({ onLogin, onForgotPassword, onSignUpPress, initialError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState('personal'); // Default to personal
  const [errors, setErrors] = useState(initialError ? { form: initialError } : {});
  const [isLoading, setIsLoading] = useState(false);

  // Update errors when initialError changes
  useEffect(() => {
    if (initialError) {
      setErrors(prev => ({ ...prev, form: initialError }));
    }
  }, [initialError]);

  const validateForm = () => {
    const newErrors = {};

    // Validate email
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    // Validate password
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (validateForm()) {
      setIsLoading(true);
      try {
        // Call the onLogin function passed from parent component
        // Pass account type along with credentials
        //console.log('Login with:', { email, password});
        await onLogin({ email, password }, accountType);
      } catch (error) {
        setErrors({ form: error.message || 'Login failed. Please try again.' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getLabel = (field) => {
    switch (field) {
      case 'email':
        return accountType === 'business' ? 'Business Email' : 'Email';
      case 'submit':
        return accountType === 'business' ? 'Business Login' : 'Login';
      default:
        return field;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
      <Text style={styles.subtitle}>Welcome back to BillsAI</Text>

      {errors.form && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errors.form}</Text>
        </View>
      )}

      <AccountTypeSelector
        selectedType={accountType}
        onSelect={setAccountType}
      />

      <Input
        label={getLabel('email')}
        value={email}
        onChangeText={setEmail}
        placeholder={accountType === 'business' ? 'Enter business email' : 'Enter your email'}
        keyboardType="email-address"
        error={errors.email}
        autoCapitalize="none"
      />

      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Enter your password"
        secureTextEntry
        showPasswordToggle
        error={errors.password}
      />

      <TouchableOpacity
        style={styles.forgotPasswordContainer}
        onPress={onForgotPassword}
      >
        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
      </TouchableOpacity>

      <Button
        title={getLabel('submit')}
        onPress={handleLogin}
        loading={isLoading}
        style={styles.loginButton}
      />

      <View style={styles.signupContainer}>
        <Text style={styles.signupText}>Don't have an account? </Text>
        <TouchableOpacity onPress={onSignUpPress}>
          <Text style={styles.signupLink}>Sign Up</Text>
        </TouchableOpacity>
      </View>
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
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.lg,
  },
  forgotPasswordText: {
    color: theme.colors.black,
    fontSize: theme.typography.fontSizes.small,
    fontWeight: theme.typography.fontWeights.medium,
  },
  loginButton: {
    marginBottom: theme.spacing.lg,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    color: theme.colors.gray700,
    fontSize: theme.typography.fontSizes.medium,
  },
  signupLink: {
    color: theme.colors.black,
    fontSize: theme.typography.fontSizes.medium,
    fontWeight: theme.typography.fontWeights.bold,
  },
});

export default LoginForm;
