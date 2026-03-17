/**
 * SignUp Screen for BillsAI app
 */

import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import LogoBills from '../../assets/svgs/APP120SVGC.svg';
import SignUpForm from '../../components/auth/SignUpForm';
import theme from '../../styles/theme';
import { useAuth } from '../../contexts/AuthContext';

const SignUpScreen = ({ navigation }) => {
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (userData) => {
    try {
      setIsLoading(true);
      await register(userData);
      // On successful registration, navigate to login screen with verification message
      Alert.alert(
        'Registration Successful',
        'Your account has been created. Please check your email to verify your account before logging in.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      ////console.error('Registration error:', error);
      Alert.alert('Registration Failed', error.message || 'Please try again');
      //console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginPress = () => {
    // Navigate back to login screen
    navigation.navigate('Login');
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

        <SignUpForm
          onSignUp={handleSignUp}
          onLoginPress={handleLoginPress}
          isLoading={isLoading}
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
    paddingTop: theme.spacing.xxl,
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

export default SignUpScreen;
