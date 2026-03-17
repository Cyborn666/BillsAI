/**
 * Business Navigator
 * Navigation setup for the business financial management module
 */
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import theme from '../../styles/theme';

// Import business tab navigator
import BusinessTabNavigator from './BusinessTabNavigator';

// Import business module screens for top-level navigation
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

import BusinessPDFViewerScreen from '../screens/BusinessPDFViewerScreen';
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
import BusinessSubscriptionSupportScreen from '../screens/BusinessSubscriptionSupportScreen';
import BusinessUserGuideScreen from '../screens/BusinessUserGuideScreen';
import BusinessAiInsightsScreen from '../screens/BusinessAiInsightsScreen';


// Create the stack navigator
const Stack = createStackNavigator();

const BusinessNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.colors.background },
      }}
    >
      {/* Use BusinessTabNavigator as the main entry point */}
      <Stack.Screen 
        name="BusinessTabs" 
        component={BusinessTabNavigator} 
      />
      
      {/* These screens are available for direct navigation if needed */}
      <Stack.Screen 
        name="BusinessDashboard" 
        component={BusinessDashboardScreen} 
      />
      <Stack.Screen 
        name="BusinessExpenseManagement" 
        component={BusinessExpenseManagementScreen} 
      />
      <Stack.Screen 
        name="BusinessInvoiceManagement" 
        component={BusinessInvoiceManagementScreen} 
      />
      <Stack.Screen 
        name="BusinessFinancialAnalytics" 
        component={BusinessFinancialAnalyticsScreen} 
      />
      <Stack.Screen 
        name="BusinessImportInvoice" 
        component={BusinessImportInvoiceScreen} 
      />
      <Stack.Screen 
        name="BusinessProfileEdit" 
        component={BusinessProfileEditScreen} 
      />
      
      {/* Core screens */}
      <Stack.Screen name="BusinessAddExpense" component={BusinessAddExpenseScreen} />
      <Stack.Screen name="BusinessAddInvoice" component={BusinessAddInvoiceScreen} />
      <Stack.Screen name="BusinessAddBill" component={BusinessAddBillScreen} />
      <Stack.Screen name="BusinessDailyReport" component={BusinessDailyReportScreen} />
      <Stack.Screen name="BusinessMiscellaneous" component={BusinessMiscellaneousScreen} />
      <Stack.Screen name="BusinessExpenseDetails" component={BusinessExpenseDetailsScreen} />
      <Stack.Screen name="BusinessInvoiceDetails" component={BusinessInvoiceDetailsScreen} />
      <Stack.Screen name="BusinessBillDetails" component={BusinessBillDetailsScreen} />
      <Stack.Screen name="BusinessSettings" component={BusinessSettingsScreen} />

      <Stack.Screen name="BusinessTaxCalculator" component={BusinessTaxCalculatorScreen} />
      

      
      {/* Additional utility screens */}

      <Stack.Screen name="BusinessInvoiceEdit" component={BusinessInvoiceEditScreen} />

      <Stack.Screen name="BusinessViewReceipt" component={BusinessViewReceiptScreen} />

      <Stack.Screen name="Clients" component={ClientsScreen} />
      <Stack.Screen name="BusinessSubscription" component={BusinessSubscriptionScreen} />
      <Stack.Screen name="BusinessNotifications" component={BusinessNotificationsScreen} />
      <Stack.Screen name="BusinessSupport" component={BusinessSupportScreen} />
      <Stack.Screen name="BusinessProfile" component={BusinessProfileScreen} />
      <Stack.Screen name="BusinessPasswordReset" component={BusinessPasswordResetScreen} />
      <Stack.Screen name="BusinessDeleteAccount" component={BusinessDeleteAccountScreen} />
      <Stack.Screen name="BusinessPDFViewer" component={BusinessPDFViewerScreen} />
      <Stack.Screen name="BusinessSubscriptionSupport" component={BusinessSubscriptionSupportScreen} />
      <Stack.Screen name="BusinessUserGuide" component={BusinessUserGuideScreen} />
      <Stack.Screen name="BusinessAiInsights" component={BusinessAiInsightsScreen} />
      

    </Stack.Navigator>
  );
};

export default BusinessNavigator;
