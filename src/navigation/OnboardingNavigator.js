/**
 * Onboarding Navigator for BillsAI app
 */
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TransitionPresets, TransitionSpecs } from '@react-navigation/stack';
import Onboarding1Screen from '../screens/onboarding/Onboarding1Screen';
import Onboarding2Screen from '../screens/onboarding/Onboarding2Screen';
import Onboarding3Screen from '../screens/onboarding/Onboarding3Screen';
import Onboarding4Screen from '../screens/onboarding/Onboarding4Screen';

const Stack = createStackNavigator();

// Custom navigation options for the Onboarding flow
{/*const CustomTransitionConfig = {
  // Forward navigation: content slides in from right
  forwardTransition: TransitionPresets.SlideFromRightIOS,
  // Back navigation: previous content slides in from left
  backTransition: {
    gestureDirection: 'horizontal',
    transitionSpec: {
      open: TransitionPresets.SlideFromRightIOS.transitionSpec.open,
      close: TransitionPresets.SlideFromRightIOS.transitionSpec.close,
    },
    cardStyleInterpolator: ({ current, next, layouts }) => {
      return {
        cardStyle: {
          transform: [
            {
              translateX: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [layouts.screen.width, 0],
              }),
            },
          ],
        },
      };
    },
  },
}; */}

const OnboardingNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding1"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyle: { backgroundColor: '#fff' },
        detachPreviousScreen: false,
       
      }}

    >
      <Stack.Screen 
        name="Onboarding1" 
        component={Onboarding1Screen} 
        options={{
          gestureEnabled: false, // Disable back gesture for first screen
        }}
      />
      <Stack.Screen name="Onboarding3" component={Onboarding3Screen} />
      <Stack.Screen name="Onboarding2" component={Onboarding2Screen} />
      <Stack.Screen name="Onboarding4" component={Onboarding4Screen} />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
