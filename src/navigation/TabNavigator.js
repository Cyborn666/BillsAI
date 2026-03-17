/**
 * Tab Navigator for BillsAI app
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// Import your screens
import { HomeScreen, AIAssistantScreen } from '../screens/home';
import { AddBillScreen, AllBillsScreen, BillDetailScreen, BillEditScreen } from '../screens/bill';
import { MembershipScreen, ProfileScreen, EditProfileScreen, SettingsScreen, HelpSupportScreen, TermsConditionsScreen, RateBillsAIScreen, ContactUsScreen, WaitlistScreen } from '../screens/profile';
import { SplitExpensesScreen, AddExpenseScreen ,AddContactScreen,CreateGroupScreen,GroupDetailScreen,SettleUpScreen,ActivityHistoryScreen,GroupsScreen,ContactDetailScreen} from '../screens/assistant';
import theme from '../styles/theme';

// Create individual stack navigators for each tab
const HomeStack = createStackNavigator();
const BillsStack = createStackNavigator();
const CardStack = createStackNavigator();
const SplitStack = createStackNavigator();
const ProfileStack = createStackNavigator();

// Home Stack Navigator
const HomeStackScreen = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="HomeScreen" component={HomeScreen} />
    <HomeStack.Screen name="BillDetails" component={BillDetailScreen} />
    <HomeStack.Screen name="AddBill" component={AddBillScreen} />
    <HomeStack.Screen name="BillEdit" component={BillEditScreen} />
    <HomeStack.Screen name="AIAssistant" component={AIAssistantScreen} />
  </HomeStack.Navigator>
);

// Bills Stack Navigator
const BillsStackScreen = () => (
  <BillsStack.Navigator screenOptions={{ headerShown: false }}>
    <BillsStack.Screen name="AllBillsScreen" component={AllBillsScreen} />
    <BillsStack.Screen name="BillDetails" component={BillDetailScreen} />
    <BillsStack.Screen name="AddBill" component={AddBillScreen} />
    <BillsStack.Screen name="BillEdit" component={BillEditScreen} />
  </BillsStack.Navigator>
);

// Card Stack Navigator
const CardStackScreen = () => (
  <CardStack.Navigator screenOptions={{ headerShown: false }}>
    <CardStack.Screen name="MembershipScreen" component={MembershipScreen} />
  </CardStack.Navigator>
);

// Split Expenses Stack Navigator
const SplitStackScreen = () => (
  <SplitStack.Navigator screenOptions={{ headerShown: false }}>
    <SplitStack.Screen name="SplitExpensesScreen" component={SplitExpensesScreen} />
    <SplitStack.Screen name="AddExpenseScreen" component={AddExpenseScreen} />
    <SplitStack.Screen name="AddContactScreen" component={AddContactScreen} />
    <SplitStack.Screen name="CreateGroupScreen" component={CreateGroupScreen} />
    <SplitStack.Screen name="GroupDetailScreen" component={GroupDetailScreen} />
    <SplitStack.Screen name="SettleUpScreen" component={SettleUpScreen} />
    <SplitStack.Screen name="ActivityHistoryScreen" component={ActivityHistoryScreen} />
    <SplitStack.Screen name="GroupsScreen" component={GroupsScreen} />
    <SplitStack.Screen name="ContactDetailScreen" component={ContactDetailScreen} />

  </SplitStack.Navigator>
);

// Profile Stack Navigator
const ProfileStackScreen = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileScreen" component={ProfileScreen} />
    <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
    <ProfileStack.Screen name="Settings" component={SettingsScreen} />
    <ProfileStack.Screen name="HelpSupport" component={HelpSupportScreen} />
    <ProfileStack.Screen name="TermsConditions" component={TermsConditionsScreen} />
    <ProfileStack.Screen name="RateBillsAI" component={RateBillsAIScreen} />
    <ProfileStack.Screen name="ContactUs" component={ContactUsScreen} />
    <ProfileStack.Screen name="Membership" component={MembershipScreen} />
    <ProfileStack.Screen name="Waitlist" component={WaitlistScreen} />
  </ProfileStack.Navigator>
);

const Tab = createBottomTabNavigator();

// Function to render tab icons - defined outside component to avoid recreation on renders
const getTabBarIcon = (route, focused, color, size) => {
  let iconName;

  // Set different icons based on which tab is active
  if (route.name === 'HomeTab') {
    iconName = focused ? 'home' : 'home-outline';
  } else if (route.name === 'AllBillsTab') {
    iconName = focused ? 'document-text' : 'document-text-outline';
  } else if (route.name === 'CardTab') {
    iconName = focused ? 'card' : 'card-outline';
  } else if (route.name === 'SplitTab') {
    iconName = focused ? 'wallet' : 'wallet-outline';
  } else if (route.name === 'ProfileTab') {
    iconName = focused ? 'person' : 'person-outline';
  }

  // Return the icon component
  return <Icon name={iconName} size={size} color={color} />;
};

// Create the Tab Navigator component
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => getTabBarIcon(route, focused, color, size),
        tabBarActiveTintColor: route.name === 'CardTab' ? '#fff8dc' : theme.colors.black,
        tabBarInactiveTintColor: route.name === 'CardTab' ? theme.colors.white : theme.colors.gray,
        tabBarStyle: route.name === 'CardTab' ? {
          ...styles.tabBar,
          backgroundColor: theme.colors.black,
          borderTopWidth: 1,
          elevation: 2,
          position: 'absolute',
        } : styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="AllBillsTab"
        component={BillsStackScreen}
        options={{ tabBarLabel: 'Bills' }}
      />
      <Tab.Screen
        name="CardTab"
        component={CardStackScreen}
        options={{ tabBarLabel: 'Card' }}
      />
      <Tab.Screen
        name="SplitTab"
        component={SplitStackScreen}
        options={{ tabBarLabel: 'Split' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

// For the Card tab - we create a transparent tab bar that overlays the dark gradient background

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    paddingTop: 5,
    paddingBottom: 5,
    height: 85,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 5,
  },
});

export default TabNavigator;
