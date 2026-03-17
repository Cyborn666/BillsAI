/**
 * Navigation configuration for BillsAI app
 */

import React, { useEffect, useState, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationRef } from './NavigationRef';

import AuthNavigator from './AuthNavigator';
import RootNavigator from './RootNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import { SplashScreen } from '../screens/onboarding';
import { useAuth } from '../contexts/AuthContext';
import theme from '../styles/theme';
import { useOnBoardingProvider } from '../contexts/OnBoardingContext';

const RootStack = createStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();
  const [initializing, setInitializing] = useState(true);
  const [showSplash, setShowSplash] = useState(false);  // Splash screen disabled

  // Use OnBoardingProvider to wrap the app
  const { hasSeenOnboarding, completeOnboarding } = useOnBoardingProvider();

  // Update initializing state once we have determined the onboarding status
  useEffect(() => {
    if (hasSeenOnboarding !== null) {
      setInitializing(false);
    }
  }, [hasSeenOnboarding]);

  // Set a timer to hide the splash screen
  /* Splash screen timer commented out
  useEffect(() => {
    // Only set the timer once when the component mounts
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 4000);  // Increased duration for splash screen visibility

    return () => clearTimeout(timer);
  }, []);
  */

  // Make completeOnboarding available globally for legacy code that might use it
  if (NavigationRef.current && completeOnboarding) {
    NavigationRef.current.markOnboardingComplete = completeOnboarding;
  }

  // Show a loading screen while auth state or onboarding status is being determined
  // Only after splash screen has been shown
  if (!showSplash && (loading || initializing || hasSeenOnboarding === null)) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Determine which navigator to render after splash screen
  const getAppNavigator = () => {
    if (!hasSeenOnboarding) {
      // If onboarding is not seen, show OnboardingNavigator
      //console.log('Onboarding not seen, showing OnboardingNavigator');
      return OnboardingNavigator;
    }
    // If onboarding is seen, show RootNavigator (which decides between personal/business) or AuthNavigator based on authentication state
    //console.log('Onboarding seen, showing RootNavigator or AuthNavigator');
    return isAuthenticated ? RootNavigator : AuthNavigator;
  };

  // Store navigator component in a variable to avoid issues with function calls in component props
  const CurrentNavigator = getAppNavigator();

  return (
    <NavigationContainer ref={NavigationRef}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {showSplash ? (
          // Show splash screen when app first opens
          <RootStack.Screen name="Splash" component={SplashScreen} />
        ) : (
          // After splash screen timer, show the appropriate navigator
          <RootStack.Screen 
            name="App" 
            component={CurrentNavigator} 
            // Prevent going back to splash screen
            options={{ gestureEnabled: false }}
          />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});

export default AppNavigator;
