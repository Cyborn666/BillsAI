/**
 * BillsAI React Native App
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import theme
import theme from './src/styles/theme';
// Import Contexts
import { AuthProvider } from './src/contexts/AuthContext';
import { OnBoardingProvider } from './src/contexts/OnBoardingContext';
// Import AppNavigator
import AppNavigator from './src/navigation';
// Import background services
import { configureBackgroundFetch } from './src/services/backgroundService';
import { initializeNotifications } from './src/services/notificationService';

// Root App component with context providers
const App = () => {
  // Initialize services when app loads
  useEffect(() => {
    try {
      // Wrap notification initialization in a try-catch block
      try {
        // Initialize notifications with error handling
        const notificationsInitialized = initializeNotifications();
        console.log('Notifications initialized:', notificationsInitialized);

        // Only configure background fetch if notifications are initialized
        if (notificationsInitialized) {
          // Configure background processing
          configureBackgroundFetch()
            .then(status => {
              console.log('Background fetch configured with status:', status);
            })
            .catch(error => {
              console.error('Failed to configure background fetch:', error);
            });
        } else {
          console.warn('Skipping background fetch configuration due to notification initialization failure');
        }
      } catch (notificationError) {
        console.error('Failed to initialize notifications:', notificationError);
        // Continue app execution even if notifications fail
      }
    } catch (error) {
      console.error('Error initializing services:', error);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={theme.colors.background}
      />
      <AuthProvider>
        <OnBoardingProvider>
          <AppNavigator />
        </OnBoardingProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;
