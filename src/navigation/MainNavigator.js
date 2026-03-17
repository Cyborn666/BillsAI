/**
 * Main App Navigator for BillsAI app
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import { HomeScreen, AIAssistantScreen } from '../screens/home';
import { AddBillScreen, AllBillsScreen, BillDetailScreen, BillEditScreen } from '../screens/bill';
import { ProfileScreen, EditProfileScreen, SettingsScreen, HelpSupportScreen, TermsConditionsScreen, RateBillsAIScreen, ContactUsScreen, MembershipScreen, WaitlistScreen, PrivacyPolicy } from '../screens/profile';
import { SplitExpensesScreen, AddExpenseScreen, AddContactScreen, CreateGroupScreen, GroupDetailScreen, SettleUpScreen, ActivityHistoryScreen, ContactDetailScreen ,GroupsScreen} from '../screens/assistant';
import TabNavigator from './TabNavigator';

const Stack = createStackNavigator();

const MainNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Main Tab Navigator as the root */}
      <Stack.Screen name="MainTabs" component={TabNavigator} />

      {/* All other screens that can be navigated to from tabs */}
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="AddBill" component={AddBillScreen} />
      <Stack.Screen name="AllBills" component={AllBillsScreen} />
      <Stack.Screen name="BillDetails" component={BillDetailScreen} />
      <Stack.Screen name="BillEdit" component={BillEditScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />

      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="TermsConditions" component={TermsConditionsScreen} />
      <Stack.Screen name="RateBillsAI" component={RateBillsAIScreen} />
      <Stack.Screen name="ContactUs" component={ContactUsScreen} />
      <Stack.Screen name="Membership" component={MembershipScreen} />
      <Stack.Screen name="Waitlist" component={WaitlistScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
      <Stack.Screen name="AddContact" component={AddContactScreen} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen name="SettleUp" component={SettleUpScreen} />
      <Stack.Screen name="ActivityHistory" component={ActivityHistoryScreen} />
      <Stack.Screen name="Groups" component={GroupsScreen} />
      <Stack.Screen name="ContactDetail" component={ContactDetailScreen} />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
      <Stack.Screen name="SplitExpenses" component={SplitExpensesScreen} />

    </Stack.Navigator>
  );
};

export default MainNavigator;
