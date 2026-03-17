/**
 * Login Screen for BillsAI app
 */

import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import LogoBills from '../../assets/svgs/APP120SVGC.svg';
import LoginForm from '../../components/auth/LoginForm';
import theme from '../../styles/theme';
import { useAuth } from '../../contexts/AuthContext';

const LoginScreen = ({ navigation }) => {
  const { login, showResendVerificationAlert } = useAuth();
  const [loginError, setLoginError] = useState(null);

  const handleLogin = async (credentials, accountType) => {
    try {
      //console.log('Login with:', credentials, accountType);
      // Use await here to properly catch any thrown errors
      const result = await login(credentials, accountType);
      // If we reach this point, login was successful
      //console.log('Login successful', result);
      // Navigation to home happens automatically via the AuthContext useEffect
    } catch (error) {
      //console.error('Login error:', error);
      
      // Check if this is an email verification error
      if ((error.message && error.message.includes('not verified')) ||
          error.needsVerification ||
          error.errorType === 'email_not_verified' ||
          error.verificationRequired) {

        // Use the central verification alert from AuthContext
        showResendVerificationAlert(credentials.email);
      } else {
        // Regular error handling
        setLoginError(error.message || 'Login failed');
      }
    }
  };

  const handleForgotPassword = () => {
    // Navigate to forgot password screen
    navigation.navigate('ForgotPassword');
  };

  const handleSignUpPress = () => {
    // Navigate to sign up screen
    navigation.navigate('SignUp');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} >
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

        <LoginForm
          onLogin={handleLogin}
          onForgotPassword={handleForgotPassword}
          onSignUpPress={handleSignUpPress}
          initialError={loginError}
        />
      </ScrollView>
    </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
    justifyContent: 'center',
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

export default LoginScreen;
