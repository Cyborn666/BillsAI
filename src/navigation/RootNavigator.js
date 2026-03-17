/**
 * Root Navigator for BillsAI app
 * Handles switching between personal and business account navigation
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import MainNavigator from './MainNavigator';
import BusinessNavigator from '../business/navigation/BusinessNavigator';


const Stack = createStackNavigator();

// Wrap business navigator with subscription context, but not personal navigator
// Defined outside component to avoid recreation on every render


const RootNavigator = () => {
  const { isBusinessAccount } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isBusinessAccount ? (
        <Stack.Screen name="BusinessRoot" component={BusinessNavigator} />
      ) : (
        <Stack.Screen name="PersonalRoot" component={MainNavigator} />
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;
