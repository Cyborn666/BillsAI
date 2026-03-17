/**
 * SignUp form component for BillsAI app
 */

import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Input from '../common/Input';
import Button from '../common/Button';
import AccountTypeSelector from './AccountTypeSelector';
import theme from '../../styles/theme';

const SignUpForm = ({ onSignUp, onLoginPress, isLoading = false }) => {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState('personal'); // Default to personal
  const [errors, setErrors] = useState({});
  const [username, setUsername] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  // Business-specific fields
  const [businessFields, setBusinessFields] = useState({
    businessOwner: '', // Adding business owner field
    taxId: '',
    businessType: '',
    industry: '',
    phone: '',
    businessDescription: ''
  });

  const validateForm = () => {
    const newErrors = {};

    // Validate name
    if (!name) {
      newErrors.name = 'Name is required';
    }

    // Validate username
    if (!username) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

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
    
    // Validate business-specific fields if account type is business
    if (accountType === 'business') {
      if (!businessFields.businessOwner) {
        newErrors.businessOwner = 'Business owner name is required';
      }

      if (!businessFields.taxId) {
        newErrors.taxId = 'Tax ID is required';
      }
      
      if (!businessFields.businessType) {
        newErrors.businessType = 'Business type is required';
      }
      
      if (!businessFields.industry) {
        newErrors.industry = 'Industry is required';
      }
    }

    // Validate confirm password
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Validate terms acceptance
    if (!acceptTerms) {
      newErrors.terms = 'You must accept the Privacy Policy and Terms of Service';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = () => {
    //console.log('handleSignUp called');
    if (validateForm()) {
      // Check if passwords match
      if (password !== confirmPassword) {
        setErrors({ ...errors, confirmPassword: 'Passwords do not match' });
        return;
      }

      // Check if terms are accepted
      if (!acceptTerms) {
        setErrors({ ...errors, terms: 'You must accept the Privacy Policy and Terms of Service' });
        return;
      }

      // Clear previous errors
      setErrors({});

      //console.log('accountType:', accountType);

      // Handle differently based on account type
      if (accountType === 'personal') {
        // For personal accounts, send basic user data
        const userData = { 
          fullName: name, 
          email, 
          password, 
          username, 
          accountType 
        };
        //console.log('userData:', userData);
        onSignUp(userData, accountType);
      } else if (accountType === 'business') {
        // For business accounts, send business data including owner information
        const businessData = {
          businessName: name,
          businessEmail: email,
          password,
          businessOwner: businessFields.businessOwner, // Explicitly include business owner
          ...businessFields,
          accountType
        };
        //console.log('businessData:', businessData);
        onSignUp(businessData);
      }
    }
  };

  const getLabel = (field) => {
    switch (field) {
      case 'name':
        return accountType === 'business' ? 'Business Name' : 'Full Name';
      case 'username':
        return accountType === 'business' ? 'Business Username' : 'Username';
      case 'email':
        return accountType === 'business' ? 'Business Email' : 'Email';
      case 'submit':
        return accountType === 'business' ? 'Register Business' : 'Create Account';
      default:
        return field;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Sign up to manage your bills with BillsAI</Text>

      {errors.form && <Text style={styles.formError}>{errors.form}</Text>}
      
      <AccountTypeSelector
        selectedType={accountType}
        onSelect={setAccountType}
      />

      <Input
        label={getLabel('name')}
        value={name}
        onChangeText={setName}
        placeholder={accountType === 'business' ? 'Enter business name' : 'Enter your full name'}
        autoCapitalize="words"
        error={errors.name}
      />

      <Input
        label={getLabel('email')}
        value={email}
        onChangeText={setEmail}
        placeholder="Enter your email"
        keyboardType="email-address"
        error={errors.email}
      />
      <Input
        label={getLabel('username')}
        value={username}
        onChangeText={setUsername}
        placeholder={accountType === 'business' ? 'Choose a business username' : 'Enter your username'}
        keyboardType="default"
        error={errors.username}
      />

      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Create a password"
        secureTextEntry
        showPasswordToggle
        error={errors.password}
      />

      <Input
        secureTextEntry
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Confirm your password"
        error={errors.confirmPassword}
      />

      {/* Business specific fields that only show when business account type is selected */}
      {accountType === 'business' && (
        <View style={styles.businessFieldsContainer}>
          <Text style={styles.sectionTitle}>Business Information</Text>

          <Input
            label="Business Owner Name"
            value={businessFields.businessOwner}
            onChangeText={(text) => setBusinessFields({...businessFields, businessOwner: text})}
            placeholder="Enter business owner's full name"
            error={errors.businessOwner}
          />

          <Input
            label="Tax ID / EIN"
            value={businessFields.taxId}
            onChangeText={(text) => setBusinessFields({...businessFields, taxId: text})}
            placeholder="Enter business tax ID"
            error={errors.taxId}
          />
          
          <Input
            label="Business Type"
            value={businessFields.businessType}
            onChangeText={(text) => setBusinessFields({...businessFields, businessType: text})}
            placeholder="E.g. LLC, Corporation, Sole Proprietorship"
            error={errors.businessType}
          />
          
          <Input
            label="Industry"
            value={businessFields.industry}
            onChangeText={(text) => setBusinessFields({...businessFields, industry: text})}
            placeholder="E.g. Technology, Retail, Healthcare"
            error={errors.industry}
          />
          
          <Input
            label="Business Phone"
            value={businessFields.phone}
            onChangeText={(text) => setBusinessFields({...businessFields, phone: text})}
            placeholder="Enter business phone number"
            keyboardType="phone-pad"
          />
          
          <Input
            label="Business Description"
            value={businessFields.businessDescription}
            onChangeText={(text) => setBusinessFields({...businessFields, businessDescription: text})}
            placeholder="Brief description of your business"
            multiline
            numberOfLines={4}
            style={styles.textArea}
          />
        </View>
      )}

      {/* Privacy Policy and Terms Checkbox */}
      <View style={styles.termsContainer}>
        <TouchableOpacity 
          style={styles.checkbox} 
          onPress={() => setAcceptTerms(!acceptTerms)}
        >
          <View style={[styles.checkboxSquare, acceptTerms && styles.checkboxChecked]}>
            {acceptTerms && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>
        <View style={styles.termsTextContainer}>
          <Text style={styles.termsText}>
            I agree to the {' '}
            <Text 
              style={styles.termsLink} 
              onPress={() => navigation.navigate('PrivacyPolicy')}
            >
              Privacy Policy
            </Text>
            {' '}and{' '}
            <Text 
              style={styles.termsLink} 
              onPress={() => navigation.navigate('TermsConditions')}
            >
              Terms of Service
            </Text>
          </Text>
        </View>
      </View>
      {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

      <Button
        title={getLabel('submit')}
        onPress={handleSignUp}
        loading={isLoading}
        disabled={isLoading}
        style={styles.signupButton}
      />

      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>Already have an account? </Text>
        <TouchableOpacity onPress={onLoginPress}>
          <Text style={styles.loginLink}>Sign In</Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  businessFieldsContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  signupButton: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: theme.colors.gray700,
    fontSize: theme.typography.fontSizes.medium,
  },
  loginLink: {
    color: theme.colors.black,
    fontSize: theme.typography.fontSizes.medium,
    fontWeight: theme.typography.fontWeights.bold,
  },
  termsContainer: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    padding: 5,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  termsTextContainer: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 10,
  },
  termsText: {
    fontSize: 14,
    color: theme.colors.gray700,
  },
  termsLink: {
    color: theme.colors.primary,
    fontWeight: 'bold',
   
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: 2,
    marginBottom: theme.spacing.sm,
  },
});

export default SignUpForm;
