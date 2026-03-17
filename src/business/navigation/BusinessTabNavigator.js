/**
 * Business Tab Navigator for BillsAI app
 * Provides business-specific bottom tab navigation
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StyleSheet } from 'react-native';
import { LayoutDashboard, FileText, PieChart, User, Receipt } from 'lucide-react-native';
import BusinessAiInsightsScreen from '../screens/BusinessAiInsightsScreen';

// Import business screens
import BusinessDashboardScreen from '../screens/BusinessDashboardScreen';
import BusinessExpenseManagementScreen from '../screens/BusinessExpenseManagementScreen';
import BusinessInvoiceManagementScreen from '../screens/BusinessInvoiceManagementScreen';
import BusinessFinancialAnalyticsScreen from '../screens/BusinessFinancialAnalyticsScreen';
import BusinessAddExpenseScreen from '../screens/BusinessAddExpenseScreen';
import BusinessAddInvoiceScreen from '../screens/BusinessAddInvoiceScreen';
import BusinessAddBillScreen from '../screens/BusinessAddBillScreen';
import BusinessExpenseDetailsScreen from '../screens/BusinessExpenseDetailsScreen';
import BusinessInvoiceDetailsScreen from '../screens/BusinessInvoiceDetailsScreen';
import BusinessBillDetailsScreen from '../screens/BusinessBillDetailsScreen';
import BusinessSettingsScreen from '../screens/BusinessSettingsScreen';


import BusinessInvoiceEditScreen from '../screens/BusinessInvoiceEditScreen';

import BusinessViewReceiptScreen from '../screens/BusinessViewReceiptScreen';

import BusinessImportInvoiceScreen from '../screens/BusinessImportInvoiceScreen';
import BusinessProfileEditScreen from '../screens/BusinessProfileEditScreen';
import BusinessDailyReportScreen from '../screens/BusinessDailyReportScreen';
import BusinessMiscellaneousScreen from '../screens/BusinessMiscellaneousScreen';
import BusinessTaxCalculatorScreen from '../screens/BusinessTaxCalculatorScreen';
import ClientsScreen from '../screens/ClientsScreen';
import BusinessSubscriptionScreen from '../screens/BusinessSubscriptionScreen';
import BusinessNotificationsScreen from '../screens/BusinessNotificationsScreen';
import BusinessSupportScreen from '../screens/BusinessSupportScreen';
import BusinessProfileScreen from '../screens/BusinessProfileScreen';
import BusinessPasswordResetScreen from '../screens/BusinessPasswordResetScreen';
import BusinessDeleteAccountScreen from '../screens/BusinessDeleteAccountScreen';
import BusinessPDFViewerScreen from '../screens/BusinessPDFViewerScreen';
import BusinessSubscriptionSupportScreen from '../screens/BusinessSubscriptionSupportScreen';
import BusinessUserGuideScreen from '../screens/BusinessUserGuideScreen';







// Create stack navigators for each business tab
const DashboardStack = createStackNavigator();
const ExpensesStack = createStackNavigator();
const InvoicesStack = createStackNavigator();
const AnalyticsStack = createStackNavigator();
const SettingsStack = createStackNavigator();

// Dashboard Stack Navigator
const DashboardStackScreen = () => (
  <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
    <DashboardStack.Screen name="BusinessDashboardScreen" component={BusinessDashboardScreen} />

    <DashboardStack.Screen name="BusinessDailyReport" component={BusinessDailyReportScreen} />
    <DashboardStack.Screen name="BusinessMiscellaneous" component={BusinessMiscellaneousScreen} />
    <DashboardStack.Screen name="BusinessTaxCalculator" component={BusinessTaxCalculatorScreen} />
    <AnalyticsStack.Screen name="BusinessAiInsights" component={BusinessAiInsightsScreen} />
  </DashboardStack.Navigator>
);

// Expenses Stack Navigator
const ExpensesStackScreen = () => (
  <ExpensesStack.Navigator screenOptions={{ headerShown: false }}>
    <ExpensesStack.Screen name="BusinessExpenseManagementScreen" component={BusinessExpenseManagementScreen} />
    <ExpensesStack.Screen name="BusinessAddExpense" component={BusinessAddExpenseScreen} />
    <ExpensesStack.Screen name="BusinessAddBill" component={BusinessAddBillScreen} />
    <ExpensesStack.Screen name="BusinessExpenseDetails" component={BusinessExpenseDetailsScreen} />
    <ExpensesStack.Screen name="BusinessBillDetails" component={BusinessBillDetailsScreen} />

    <ExpensesStack.Screen name="BusinessViewReceipt" component={BusinessViewReceiptScreen} />
  </ExpensesStack.Navigator>
);

// Invoices Stack Navigator
const InvoicesStackScreen = () => (
  <InvoicesStack.Navigator screenOptions={{ headerShown: false }}>
    <InvoicesStack.Screen name="BusinessInvoiceManagementScreen" component={BusinessInvoiceManagementScreen} />
    <InvoicesStack.Screen name="BusinessInvoiceDetails" component={BusinessInvoiceDetailsScreen} />
    <InvoicesStack.Screen name="BusinessInvoiceEdit" component={BusinessInvoiceEditScreen} />


    <InvoicesStack.Screen name="BusinessImportInvoice" component={BusinessImportInvoiceScreen} />
  </InvoicesStack.Navigator>
);

// Analytics Stack Navigator
const AnalyticsStackScreen = () => (
  <AnalyticsStack.Navigator screenOptions={{ headerShown: false }}>
    <AnalyticsStack.Screen name="BusinessFinancialAnalyticsScreen" component={BusinessFinancialAnalyticsScreen} />
  </AnalyticsStack.Navigator>
);

// Settings Stack Navigator
const SettingsStackScreen = () => (
  <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
    <SettingsStack.Screen name="BusinessSettingsScreen" component={BusinessSettingsScreen} />
    <SettingsStack.Screen name="BusinessProfileEdit" component={BusinessProfileEditScreen} />
    <SettingsStack.Screen name="BusinessCreateInvoice" component={BusinessAddInvoiceScreen} />
    <SettingsStack.Screen name="Clients" component={ClientsScreen} />
    <SettingsStack.Screen name="BusinessSubscription" component={BusinessSubscriptionScreen} />
    <SettingsStack.Screen name="BusinessNotifications" component={BusinessNotificationsScreen} />
    <SettingsStack.Screen name="BusinessSupport" component={BusinessSupportScreen} />
    <SettingsStack.Screen name="BusinessProfile" component={BusinessProfileScreen} />
    <SettingsStack.Screen name="BusinessPasswordReset" component={BusinessPasswordResetScreen} />
    <SettingsStack.Screen name="BusinessDeleteAccount" component={BusinessDeleteAccountScreen} />
    <SettingsStack.Screen name="BusinessPDFViewer" component={BusinessPDFViewerScreen} />
    <SettingsStack.Screen name="BusinessSubscriptionSupport" component={BusinessSubscriptionSupportScreen} />
    <SettingsStack.Screen name="BusinessUserGuide" component={BusinessUserGuideScreen} />
  </SettingsStack.Navigator>
);

const Tab = createBottomTabNavigator();

// Function to render tab icons
const getTabBarIcon = (route, focused, color, size) => {
  // Set different icons based on which tab is active
  if (route.name === 'Home') {
    return <LayoutDashboard size={size} color={color} strokeWidth={focused ? 2 : 1.5} />;
  } else if (route.name === 'Expenses') {
    return <Receipt size={size} color={color} strokeWidth={focused ? 2 : 1.5} />;
  } else if (route.name === 'Invoices') {
    return <FileText size={size} color={color} strokeWidth={focused ? 2 : 1.5} />;
  } else if (route.name === 'Analytics') {
    return <PieChart size={size} color={color} strokeWidth={focused ? 2 : 1.5} />;
  } else if (route.name === 'Profile') {
    return <User size={size} color={color} strokeWidth={focused ? 2 : 1.5} />;
  }
  return null;
};

// Business Tab Navigator component
const BusinessTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => getTabBarIcon(route, focused, color, size),
        tabBarActiveTintColor: '#3867d6',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerShown: false,
        tabBarShowLabel: true,
        unmountOnBlur: true,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={DashboardStackScreen}
        options={{
          title: 'Home',
        }}
      />
      <Tab.Screen 
        name="Expenses"
        component={ExpensesStackScreen}
        options={{
          title: 'Expenses',
        }}
      />
      <Tab.Screen 
        name="Invoices" 
        component={InvoicesStackScreen}
        options={{
          title: 'Invoices',
        }}
      />
      <Tab.Screen 
        name="Analytics" 
        component={AnalyticsStackScreen}
        options={{
          title: 'Analytics',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={SettingsStackScreen}
        options={{
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    height: 90,
    
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
});

export default BusinessTabNavigator;
