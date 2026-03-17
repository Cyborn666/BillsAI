/**
 * Authentication Navigator for BillsAI app
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import { LoginScreen, SignUpScreen, ForgotPasswordScreen, PrivacyPolicyScreen, TermsConditionsScreen } from '../screens/auth';

const Stack = createStackNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
      }}
    >
      {/*<Stack.Screen name="ModeSelection" component={ModeSelectionScreen} />*/}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsConditions" component={TermsConditionsScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
