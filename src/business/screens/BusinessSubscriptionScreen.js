/**
 * Business Subscription Screen
 * Shows business subscription plans with simplified free and premium options
 * Redesigned with fixed hero section and scrollable pricing cards section
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {STRIPE_LIVE_PUBLISHABLE_KEY} from '@env';

import {
 View,
 Text,
 StyleSheet,
 TouchableOpacity,
 Alert,
 ScrollView,
 ActivityIndicator,
 StatusBar,
 Platform,
 Animated,
 Image,
 DeviceEventEmitter
} from 'react-native';
// Images for subscription plans
import FreeImage from '../../assets/images/free.png';
import MonthlyImage from '../../assets/images/monthly.png';
import YearlyImage from '../../assets/images/yearly.png';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../styles/theme';
import CustomHeader from '../components/CustomHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import FastImage from 'react-native-fast-image';

// Stripe React Native import
import { StripeProvider } from '@stripe/stripe-react-native';
import PaymentForm from '../components/PaymentForm';

// Publishable key for Stripe
const STRIPE_PUBLISHABLE_KEY = STRIPE_LIVE_PUBLISHABLE_KEY;

// Import subscription service
import {
 updateSubscription,
 toggleAutoRenewal,
 getSubscription,
 SUBSCRIPTION_STORAGE_KEY,
 SUBSCRIPTION_LAST_FETCH_KEY,
} from '../services/subscriptionService';
import * as platformPaymentService from '../services/platformPaymentService';
import { getUserFriendlyErrorMessage } from '../../utils/errorUtils';
import iapService from '../services/iapService';
import { getProductIdFromInternalPlan } from '../constants/subscriptionConstants';

// Subscription plan card component
const PlanCard = ({ title, price, features, isActive, onSelect, period = 'mo', savingsText }) => (
 <View style={[styles.planCard, isActive && styles.activePlanCard]}>
  <View style={styles.planHeader}>
   <Text style={styles.planTitle}>{title}</Text>
   <View style={styles.priceContainer}>
    <Text style={styles.currencySymbol}>$</Text>
    <Text style={styles.planPrice}>{price}</Text>
    <Text style={styles.pricePeriod}>/{period}</Text>
   </View>
   {savingsText && (
    <View style={styles.savingsBadge}>
     <Text style={styles.savingsText}>{savingsText}</Text>
    </View>
   )}
  </View>

  <View style={styles.featuresContainer}>
   {features.map((feature, index) => (
    <View key={index} style={styles.featureItem}>
     <Ionicons name="checkmark-circle" size={18} color={theme.colors.businessPrimary} />
     <Text style={styles.featureText}>{feature}</Text>
    </View>
   ))}
  </View>

  <TouchableOpacity
   style={[styles.selectButton, isActive && styles.activeSelectButton]}
   onPress={onSelect}
  >
   <Text style={[styles.selectButtonText, isActive && styles.activeSelectButtonText]}>
    {isActive ? 'Current Plan' : 'Select Plan'}
   </Text>
  </TouchableOpacity>
 </View>
);

const BusinessSubscriptionScreen = ({ navigation }) => {
 // Component state initialization
 const [currentPlan, setCurrentPlan] = useState('Free');
 const [isLoading, setIsLoading] = useState(false);
 const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
 const [isProcessing, setIsProcessing] = useState(false);
 const [isToggling, setIsToggling] = useState(false);
 const [subscriptionData, setSubscriptionData] = useState(null);
 const [planDescription, setPlanDescription] = useState('');
 const [showPaymentForm, setShowPaymentForm] = useState(false);
 const [selectedPlanId, setSelectedPlanId] = useState(null);
 const [paymentFailure, setPaymentFailure] = useState(false);
 const [paymentFailureDetails, setPaymentFailureDetails] = useState(null);
 const [optimisticAutoRenewal, setOptimisticAutoRenewal] = useState(null);
 const [isRestoringPurchases, setIsRestoringPurchases] = useState(false);
 const [showPremiumSuccess, setShowPremiumSuccess] = useState(false);
 const [isImageLoading, setIsImageLoading] = useState(true);
 const [subscriptionAccountMismatch, setSubscriptionAccountMismatch] = useState(false);
 const [linkedAccount, setLinkedAccount] = useState('');

  // Available plans data
  const availablePlans = [
   {
    id: 'free',
    title: 'Free',
    price: '0',
    features: [
     'Up to 5 bills',
     'Up to 5 invoices',
     'Up to 5 reports',
     'Up to 5 expenses',
     'Basic dashboard access',
    ],
   },
   {
    id: 'premium-monthly',
    title: 'Premium Monthly',
    price: '19.99',
    period: 'mo',
    internalPlanId: 'monthly',
    features: [
     'Unlimited bills',
     'Unlimited invoices',
     'Unlimited reports',
     'Unlimited expenses',
     'Advanced analytics',
     'Priority customer support',
     'Custom invoice templates',
    ],
   },
   {
    id: 'premium-yearly',
    title: 'Premium Yearly',
    price: '199.99',
    period: 'year',
    internalPlanId: 'yearly',
    savingsText: 'Save $40/year',
    features: [
     'Unlimited bills',
     'Unlimited invoices',
     'Unlimited reports',
     'Unlimited expenses',
     'Advanced analytics',
     'Priority customer support',
     'Custom invoice templates',
    ],
   },
  ];

 // Function to initialize IAP service
 const initializeIAP = async () => {
  if (Platform.OS !== 'ios') {
   return false;
  }

  try {
   // Set the flag to prevent automatic receipt validation
   iapService.disableAutoReceipts();
   const isInitialized = await iapService.initializeIAP();
   if (!isInitialized) {
    //console.warn('Failed to initialize IAP service');
   }
   return isInitialized;
  } catch (error) {
   //console.error('Error initializing IAP:', error);
   return false;
  }
 };

 // Initialize IAP service and purchase listeners when component mounts
 useEffect(() => {
  // Setup purchase listeners for iOS in-app purchases
  let purchaseListenersCleanup = () => {};
  
  // Initialize IAP on component mount
  initializeIAP();
  
  if (Platform.OS === 'ios') {
   purchaseListenersCleanup = iapService.setupPurchaseListeners();
   //console.log('IAP purchase listeners initialized');
   
  }
  
  // Set up listener for subscription account mismatches
  const subscriptionMismatchListener = DeviceEventEmitter.addListener(
   'SUBSCRIPTION_ACCOUNT_MISMATCH',
   (data) => {
     setSubscriptionAccountMismatch(true);
     setLinkedAccount(data.linkedAccount || 'another account');
     Alert.alert(
      'Subscription Linked to Different Account',
      `This Apple subscription is linked to ${data.linkedAccount || 'another account'}. Please sign in with that account to access premium features.`,
      [{ text: 'OK', style: 'default' }]
     );
    }
  );

  // Cleanup function to remove listeners when component unmounts
  return () => {
    purchaseListenersCleanup();
    subscriptionMismatchListener.remove();
    //console.log('IAP purchase listeners removed');
  };
 }, []);

 // Combined data loading for both initial mount and focus
 useFocusEffect(
  useCallback(() => {
   // Initial load when screen comes into focus
   fetchSubscriptionDetails(false);
  
   // CRITICAL: Do not set up any polling timers at all
   // The UI state will be updated when the user manually refreshes or navigates
   // This prevents excessive API calls that were occurring
  
   return () => {
    // No timers to clean up
   };
  }, [fetchSubscriptionDetails])
 );

 // Handle payment success with proper error handling
 const handlePaymentSuccess = async (result) => {
  setIsProcessing(false);
  setShowPaymentForm(false);

  try {
   // Refresh subscription data with forced refresh
   await fetchSubscriptionDetails(true);
   // Show premium success screen instead of alert
   setShowPremiumSuccess(true);

   // Automatically hide success screen after 5 seconds
   setTimeout(() => {
     setShowPremiumSuccess(false);
   }, 5000);
  } catch (error) {
   // Show alert if we can't refresh subscription data
   Alert.alert(
    'Subscription Activated',
    'Your premium subscription has been activated! You now have access to all premium features.'
   );
  }
 };

 // Handle payment cancel
 const handlePaymentCancel = () => {
  setIsProcessing(false);
  setShowPaymentForm(false);

  // Show informative message instead of error
  Alert.alert(
   'Payment Canceled',
   'Your payment process was canceled. You can try again anytime from the subscription page.'
  );
 };

 // Handle payment failure
 const handlePaymentFailure = (error) => {
  setIsProcessing(false);
  // Show helpful error message with user-friendly message
  Alert.alert(
   'Payment Issue',
   getUserFriendlyErrorMessage(error) || 'There was an issue processing your payment. Please try again.'
  );
 };

 // Fetch subscription details from server
 const fetchSubscriptionDetails = useCallback(async (forceRefresh = false) => {
  if (isLoadingSubscription && !forceRefresh) {
   return;
  }

  setIsLoadingSubscription(true);
  try {
   const subscription = await getSubscription({ forceRefresh });
 
   // Special handling for Apple sandbox environment where periods are very short
   if (Platform.OS === 'ios' && subscription?.status === 'active') {
    const currentPeriodEnd = new Date(subscription.currentPeriodEnd);
    const currentDate = new Date();
  
    // If period has ended but status still shows active, force a receipt validation
    if (currentPeriodEnd < currentDate) {
     //console.log('[Subscription] Period ended but status still active, forcing receipt validation');
    
     try {
      // First, clear any cached subscription data to ensure we get a fresh state
      // Clear both the subscription data and last fetch timestamp
      if (SUBSCRIPTION_STORAGE_KEY) {
        await AsyncStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
      }
      if (SUBSCRIPTION_LAST_FETCH_KEY) {
        await AsyncStorage.removeItem(SUBSCRIPTION_LAST_FETCH_KEY);
      }
     
      // Only on iOS, validate the receipt with Apple
      if (Platform.OS === 'ios' && iapService.validateCurrentReceipt) {
       // Call existing validateCurrentReceipt function to check with Apple
       await iapService.validateCurrentReceipt();
      
       // Small delay to ensure server has time to process receipt validation
       await new Promise(resolve => setTimeout(resolve, 1000));
      }
     
      // Force a refresh from server to get the latest status with cache busting
      const refreshedSubscription = await getSubscription({ forceRefresh: true });
     
      // Clear optimistic UI states to ensure we're using server data
      setOptimisticAutoRenewal(null);
     
      // Update UI with refreshed data
      if (refreshedSubscription) {
       setSubscriptionData(refreshedSubscription);
       updateUIFromSubscription(refreshedSubscription);
      } else {
       // If no subscription data returned, default to free plan
       setCurrentPlan('Free');
       setPlanDescription('');
       setSubscriptionData(null);
      }
     
      setIsLoadingSubscription(false);
      return;
     } catch (validateError) {
      //console.error('Error during receipt validation:', validateError);
      // Continue with normal flow if validation fails
     }
    }
   }
 
   // Standard flow - update subscription data and related UI
   setSubscriptionData(subscription || null);
   updateUIFromSubscription(subscription);
  } catch (error) {
   //console.error('Error fetching subscription details:', error);
   setPaymentFailure(true);
   setPaymentFailureDetails({
    message: 'Subscription data couldn\'t be loaded. Using cached data if available.',
    date: new Date().toLocaleDateString(),
   });
 
   // Clear subscription data if there was an error
   setSubscriptionData(null);
   setCurrentPlan('Free');
   setPlanDescription('');
  } finally {
   setIsLoading(false);
   setIsLoadingSubscription(false);
  }
 }, [isLoadingSubscription, setSubscriptionData, setPaymentFailure, setPaymentFailureDetails, setCurrentPlan, setPlanDescription, setIsLoading, setIsLoadingSubscription]);

  // Helper to update UI components based on subscription data
 const updateUIFromSubscription = (subscription) => {
  if (!subscription) {
   setCurrentPlan('Free');
   setPlanDescription('');
   setPaymentFailure(false);
   setPaymentFailureDetails(null);
   return;
  }

  // Check for payment failure status
  if (subscription.status === 'past_due') {
   setPaymentFailure(true);
   setPaymentFailureDetails({
    message: 'Your last payment was unsuccessful',
    date: new Date().toLocaleDateString(),
   });
  } else {
   setPaymentFailure(false);
   setPaymentFailureDetails(null);
  }

  // Check if subscription is expired or period has ended
  const currentDate = new Date();
  const expiryDate = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  const isExpired = subscription.status === 'expired' ||
    (expiryDate && currentDate > expiryDate);
  // If expired or planId is 'free', show Free plan
  if (isExpired || subscription.planId === 'free') {
   setCurrentPlan('Free');
   setPlanDescription('');
   return;
  }

  // Otherwise handle premium subscription
  if (subscription.planId === 'premium') {
   setCurrentPlan('Premium');
 
   // Add information about pending downgrades for the UI
   if (subscription.cancelAtPeriodEnd) {
    // They're on premium but scheduled to downgrade
    setPlanDescription(`Premium (downgrading to Free on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()})`);
   } else {
    setPlanDescription('');
   }
  } else {
   // Fallback for any other planId
   setCurrentPlan('Free');
   setPlanDescription('');
  }
 };

 // Handle toggling auto-renewal with robust error handling
 const handleToggleAutoRenewal = async () => {
  if (!subscriptionData) {
   Alert.alert('Subscription Info', 'Your subscription information is not available right now. Please try again later.');
   return;
  }

  // Get the subscription ID - could be stored as _id or id depending on API response
  const subscriptionId = subscriptionData._id || subscriptionData.id;
  if (!subscriptionId) {
   Alert.alert('Subscription Info', 'Your subscription information is incomplete. Please refresh the page and try again.');
   return;
  }

  const enableAutoRenewal = subscriptionData.cancelAtPeriodEnd; // Toggle from current state

  try {
   setIsToggling(true);
   // Optimistic UI update for better UX
   setOptimisticAutoRenewal(!enableAutoRenewal);
 
   // Disable auto-receipts to avoid StoreKit automatic validation
   iapService.disableAutoReceipts();
 
   // Error handler for toggle operation
   const handleToggleError = (error) => {
    // Reset to actual state on error
    setOptimisticAutoRenewal(null);
    const friendlyMessage = getUserFriendlyErrorMessage(error);
    Alert.alert('Auto-Renewal Update Failed', friendlyMessage);
   };
 
   // Call the toggle service with error handler and retry logic
   const result = await toggleAutoRenewal(
    subscriptionId,
    enableAutoRenewal,
    { onError: handleToggleError, retryCount: 1 },
   );
 
   if (result && !result.error) {
    // Success - update subscription data
    setSubscriptionData(result);
    setOptimisticAutoRenewal(null); // Clear optimistic update flag
  
    // Show success message with clear confirmation of what happened
    Alert.alert(
     'Auto-Renewal Updated',
     enableAutoRenewal
      ? 'Your subscription will now automatically renew at the end of your billing period.'
      : 'Your subscription will now expire at the end of your billing period.'
    );
  
    // Refresh data in background to ensure UI is in sync
    fetchSubscriptionDetails();
   } else if (result && result.error) {
    // Error already handled by the onError callback
    setOptimisticAutoRenewal(null); // Reset optimistic UI state
   }
  } catch (error) {
   // Handle unexpected errors not caught by the service
   ////console.error('Auto-renewal toggle error:', error);
   setOptimisticAutoRenewal(null); // Reset optimistic UI state
 
   // Show user-friendly error message
   Alert.alert(
    'Auto-Renewal Update Failed',
    getUserFriendlyErrorMessage(error) || 'An unexpected error occurred while updating your subscription. Please try again later.'
   );
  } finally {
   setIsToggling(false);
  }
 };

 // Handle iOS subscription through StoreKit (platform-specific)
 const handleAppleSubscription = async (planId) => {
  setIsProcessing(true);
  try {
   // Reset the account mismatch flag and check for subscription account mismatch
   // This ensures account mismatch alerts will show during purchase but not during initialization
   iapService.resetAccountMismatchAlert();
   await checkForAccountMismatch();
   
   // If there's an account mismatch, we'll still proceed but the user has been warned
   
   // Convert internal plan ID to the Apple StoreKit product ID
   const appleProductId = getProductIdFromInternalPlan(planId);
 
   if (!appleProductId) {
    throw new Error(`No valid Apple product ID found for plan: ${planId}`);
   }
 
   //console.log(`[IAP] Converting internal plan ID '${planId}' to Apple product ID '${appleProductId}'`);
 
   // First, fetch the available products to verify the product exists
   const availableProducts = await iapService.getAvailableSubscriptions();
   //console.log('[IAP] Available products:', availableProducts.map(p => p.productId));
 
   // Check if the product is available before attempting to purchase
   const productExists = availableProducts.some(product => product.productId === appleProductId);
 
   if (!productExists) {
    //console.error(`[IAP] Product ${appleProductId} not available in App Store. Check App Store Connect setup.`);
    throw new Error('The selected subscription plan is not available for purchase. Please contact support.');
   }
 
   // Use the iapService directly instead of platformPaymentService for iOS
   const result = await iapService.purchaseSubscription(appleProductId);
   if (result.success || result.pending) {
    // Success will be handled by the listener in the IAP service
    Alert.alert(
     'Processing Purchase',
     'Your purchase is being processed. It may take a moment to complete.'
    );
    // Refresh the subscription data after a short delay
    setTimeout(() => {
     fetchSubscriptionDetails(true);
     setIsProcessing(false);
    }, 2000);
   } else {
    throw new Error(result.error || 'Purchase failed');
   }
  } catch (error) {
   //console.log('IAP error:', error.message);
 
   // Special handling for E_IAP_NOT_AVAILABLE
   if (error.message && (error.message.includes('E_IAP_NOT_AVAILABLE') ||
     error.message.includes('IAP service could not be initialized') ||
     error.message.includes('IAP only available on iOS'))) {
  
    Alert.alert(
     'In-App Purchase Unavailable',
     'Would you like to use our web payment system instead?',
     [
      {
       text: 'Cancel',
       style: 'cancel',
       onPress: () => setIsProcessing(false)
      },
      {
       text: 'Continue with Web Payment',
       onPress: () => {
        // Show payment form for Stripe instead
        setSelectedPlanId(planId);
        setShowPaymentForm(true);
       }
      }
     ]
    );
   } else {
    handlePaymentFailure(error);
   }
  } finally {
   setIsProcessing(false);
  }
 };

 // Handle restore purchases for iOS
 const handleRestorePurchases = async () => {
  if (Platform.OS !== 'ios') return;
  setIsRestoringPurchases(true);
  try {
   // Initialize IAP if not already done
   const initialized = await initializeIAP();
   if (!initialized) {
    Alert.alert('Error', 'Failed to initialize in-app purchases. Please try again later.');
    setIsRestoringPurchases(false);
    return;
   }
 
   // Enable auto receipt validation when restoring purchases
   // This ensures the restored purchase will be properly validated for the current business
   iapService.disableAutoReceipts(); // We use disableAutoReceipts because the function has same effect

   const result = await iapService.restorePurchases();
   if (result.success) {
    Alert.alert('Success', 'Your purchases have been restored!');
    await fetchSubscriptionDetails(true); // Refresh subscription data
   } else {
    Alert.alert('Restore Failed', result.message || 'No previous purchases were found to restore.');
   }
  } catch (error) {
   //console.error('Error during restore:', error);
   Alert.alert('Error', 'An unexpected error occurred. Please try again later.');
  } finally {
   setIsRestoringPurchases(false);
   // Disable auto receipt validation after restore completes
   iapService.disableAutoReceipts();
  }
 };

 // Handle subscription management based on platform
 const handleManageSubscription = async () => {
  if (Platform.OS === 'ios') {
    await platformPaymentService.openSubscriptionManagement();
  } else {
    handleToggleAutoRenewal();
  }
 };

  // Function to select or unselect a plan (no transaction)
  const handleSelectPlan = (planId) => {
    // Toggle selection - if already selected, unselect it
    if (selectedPlanId === planId) {
      setSelectedPlanId(null);
    } else {
      setSelectedPlanId(planId);
    }
  };

  // Function to handle subscription purchase
  const handleSubscribe = async () => {
    // Only proceed if there's a selected plan
    if (!selectedPlanId) {
      return;
    }
   
    const planId = selectedPlanId;
    // Prevent multiple actions while processing
    if (isProcessing) {
      return;
    }
    
    // For debugging
    //console.log('Attempting to subscribe to plan:', planId);

  // For premium plans, handle payment
  if ((planId === 'premium-monthly' || planId === 'premium-yearly') && currentPlan !== 'Premium') {
   // Find the selected plan to get the internal plan ID
   const selectedPlan = availablePlans.find(plan => plan.id === planId);
   if (!selectedPlan) {
    //console.error('Invalid plan selected');
    return;
   }
 
   setSelectedPlanId(planId);
 
   // For iOS, use Apple in-app purchases
   if (Platform.OS === 'ios') {
    handleAppleSubscription(selectedPlan.internalPlanId);
   } else {
    // For non-iOS platforms, use the web payment form with Stripe
    setShowPaymentForm(true);
   }
   return;
  }

  // For free plan (downgrade), confirm and process
  if (planId === 'free' && currentPlan !== 'Free') {
   // Show confirmation alert
   Alert.alert(
    'Downgrade to Free',
    'Are you sure you want to downgrade to the Free plan? Your premium features will remain active until the end of your current billing period.',
    [
     { text: 'Cancel', style: 'cancel' },
     {
      text: 'Downgrade',
      onPress: async () => {
       try {
        setIsProcessing(true);
        // If current subscription exists, update it
        if (subscriptionData?.id || subscriptionData?._id) {
         const subscriptionId = subscriptionData._id || subscriptionData.id;
         await updateSubscription(subscriptionId, { planId: 'free' });
         Alert.alert('Success', 'Your plan has been updated to free. Your premium features will remain active until the end of your current billing period.');
        }
        // Refetch subscription details
        await fetchSubscriptionDetails(true);
       } catch (error) {
        Alert.alert('Error', getUserFriendlyErrorMessage(error) || 'Failed to process subscription change');
       } finally {
        setIsProcessing(false);
       }
      }
     }
    ]
  );
  };

};

// Initialize IAP service and purchase listeners when component mounts
useEffect(() => {
  // Setup purchase listeners for iOS in-app purchases
  let purchaseListenersCleanup = () => {};
  
  // Initialize IAP on component mount
  initializeIAP();
  
  if (Platform.OS === 'ios') {
   purchaseListenersCleanup = iapService.setupPurchaseListeners();
   //console.log('IAP purchase listeners initialized');
   
   // No longer checking for account mismatch on screen load
   // Will check during purchase attempt instead
  }
  
  // Set up listener for subscription account mismatches
  const subscriptionMismatchListener = DeviceEventEmitter.addListener(
   'SUBSCRIPTION_ACCOUNT_MISMATCH',
   (data) => {
     setSubscriptionAccountMismatch(true);
     setLinkedAccount(data.linkedAccount || 'another account');
     Alert.alert(
      'Subscription Linked to Different Account',
      `This Apple subscription is linked to ${data.linkedAccount || 'another account'}. Please sign in with that account to access premium features.`,
      [{ text: 'OK', style: 'default' }]
     );
    }
  );

  // Cleanup function to remove listeners when component unmounts
  return () => {
    purchaseListenersCleanup();
    subscriptionMismatchListener.remove();
    //console.log('IAP purchase listeners removed');
  };
}, []);

// Check if the current device has a subscription linked to a different account
const checkForAccountMismatch = async () => {
  try {
    if (Platform.OS !== 'ios') return;
    
    //console.log('[Subscription] Checking for account mismatches...');
    const result = await iapService.checkReceiptAccountMismatch();
    if (result && result.accountMismatch) {
      setSubscriptionAccountMismatch(true);
      setLinkedAccount(result.linkedAccount || 'another account');
      Alert.alert(
        'Subscription Linked to Different Account',
        `This Apple subscription is linked to ${result.linkedAccount || 'another account'}. Please sign in with that account to access premium features.`,
        [{ text: 'OK', style: 'default' }]
      );
    }
  } catch (error) {
    //console.error('Error checking for account mismatch:', error);
  }
};

// Main return statement for UI
return (
  <View style={styles.container}>
    <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

    {/* Premium Success Screen */}
    {showPremiumSuccess && (
      <View style={styles.premiumSuccessOverlay}>
        <View style={styles.premiumSuccessCard}>
          <Ionicons name="checkmark-circle" size={60} color="#0062FF" />
          <Text style={styles.premiumSuccessTitle}>Welcome to Premium!</Text>
          <Text style={styles.premiumSuccessText}>Your subscription is now active.</Text>
          <Text style={styles.premiumSuccessText}>Enjoy all premium features!</Text>
          <TouchableOpacity 
            style={styles.premiumSuccessDismiss}
            onPress={() => setShowPremiumSuccess(false)}
          >
            <Text style={styles.premiumSuccessDismissText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}

    {/* Hero Section with Image */}
    <View style={styles.hero}>
      {/* Only show loading indicator if we have subscription data but image is still loading */}
      {isImageLoading && subscriptionData && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0062FF" />
        </View>
      )}
      <Image
        source={
          !subscriptionData || subscriptionData?.planId === 'free' ? FreeImage :
          subscriptionData?.planId === 'premium' ? 
            (subscriptionData?.interval === 'year' || subscriptionData?.billingPeriod === 'yearly') ? YearlyImage : MonthlyImage
          : MonthlyImage
        }
        style={[styles.heroBackgroundImage, isImageLoading && subscriptionData && { opacity: 0 }]}
        resizeMode="cover"
        onLoadStart={() => subscriptionData && setIsImageLoading(true)}
        onLoadEnd={() => setIsImageLoading(false)}
      />
    </View>

    {/* Scrollable Content */}
    <ScrollView style={styles.scrollContent}>
      {/* Premium Subscription Details Section */}
      {subscriptionData?.planId === 'premium' && (
        <View style={styles.subscriptionDetailsContainer}>
          <Text style={styles.subscriptionDetailsTitle}>Subscription Details</Text>
          <View style={styles.subscriptionDetailsRow}>
            <Text style={styles.subscriptionDetailsLabel}>Status:</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {subscriptionData?.status === 'active' ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          
          <View style={styles.subscriptionDetailsRow}>
            <Text style={styles.subscriptionDetailsLabel}>Plan:</Text>
            <Text style={styles.subscriptionDetailsValue}>
              {subscriptionData?.currentPeriodStart && subscriptionData?.currentPeriodEnd ? (() => {
                // Calculate subscription period in days
                const startDate = new Date(subscriptionData.currentPeriodStart);
                const endDate = new Date(subscriptionData.currentPeriodEnd);
                const diffTime = Math.abs(endDate - startDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                // If period is roughly a year or more, consider it yearly
                return diffDays > 180 ? 'Yearly Premium' : 'Monthly Premium';
              })() : 'Premium'}
            </Text>
          </View>
          
          <View style={styles.subscriptionDetailsRow}>
            <Text style={styles.subscriptionDetailsLabel}>Expires At:</Text>
            <Text style={styles.subscriptionDetailsValue}>
              {subscriptionData?.currentPeriodEnd ? 
                `${new Date(subscriptionData.currentPeriodEnd).toLocaleDateString()}` : 
                'Not available'}
            </Text>
          </View>
          
          <View style={styles.subscriptionDetailsRow}>
            <Text style={styles.subscriptionDetailsLabel}>Auto-renewal:</Text>
            <Text style={styles.subscriptionDetailsValue}>
              {subscriptionData?.cancelAtPeriodEnd === false ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.manageSubscriptionButton}
            onPress={handleManageSubscription}
          >
            <Text style={styles.manageSubscriptionButtonText}>
              {subscriptionData?.cancelAtPeriodEnd ? 'Enable Auto-renewal' : 'Disable Auto-renewal'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Plans Section */}
      <View style={styles.plansContainer}>
        {availablePlans.map((plan) => {
          const isSelected = selectedPlanId === plan.id;
          return (
            <Animated.View
              key={plan.id}
              style={[
                styles.planCard,
                isSelected && styles.selectedPlanCard,
                plan.id === 'premium-yearly' && styles.bestValueCard,
                false && styles.currentPlanCard
              ]}
            >
              <TouchableOpacity
                onPress={() => handleSelectPlan(plan.id)}
                style={styles.planCardHeader}
              >
                {/* Show CURRENT PLAN badge for premium subscription */}
                {subscriptionData?.planId === 'premium' && subscriptionData?.currentPeriodStart && subscriptionData?.currentPeriodEnd && (
                  (() => {
                    // Calculate subscription period in days
                    const startDate = new Date(subscriptionData.currentPeriodStart);
                    const endDate = new Date(subscriptionData.currentPeriodEnd);
                    const diffTime = Math.abs(endDate - startDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    // Check if this is the current plan
                    const isYearly = diffDays > 180;
                    const isPlanCurrent = (isYearly && plan.id === 'premium-yearly') ||
                                         (!isYearly && plan.id === 'premium-monthly');
                    
                    return isPlanCurrent ? (
                      <View style={styles.currentPlanBadge}>
                        <Text style={styles.currentPlanText}>CURRENT PLAN</Text>
                      </View>
                    ) : null;
                  })()
                )}
                
                {/* Show CURRENT PLAN badge for free subscription */}
                {subscriptionData?.planId === 'free' && plan.id === 'free' && (
                  <View style={styles.currentPlanBadge}>
                    <Text style={styles.currentPlanText}>CURRENT PLAN</Text>
                  </View>
                )}
                {plan.id === 'premium-yearly' && (
                  <View style={styles.bestValueBadge}>
                    <Text style={styles.bestValueText}>BEST VALUE</Text>
                  </View>
                )}

                <View style={styles.planTitleSection}>
                  <Text style={styles.planName}>
                    {plan.id === 'premium-monthly' ? 'Monthly' :
                      plan.id === 'premium-yearly' ? 'Yearly' : 'Free'}
                  </Text>

                  {plan.id === 'free' ? (
                    <View style={styles.priceContainerFree}>
                      <Text style={styles.planPrice}>$0</Text>
                      <Text style={styles.planDescription}>Limited features</Text>
                    </View>
                  ) : (
                    <View>
                      <View style={styles.priceContainer}>
                        <Text style={styles.planPrice}>${plan.price}</Text>
                        <Text style={styles.planPeriod}>/{plan.period === 'mo' ? 'month' : 'year'}</Text>
                      </View>
                      <Text style={styles.planDescription}>
                        {plan.id === 'premium-monthly' ? 'All premium features with monthly billing' : 'Best value with annual billing'}
                      </Text>
                    </View>
                  )}

                  {plan.id === 'premium-yearly' && (
                    <View style={styles.monthlyCostContainer}>
                    <Text style={styles.monthlyCost}>save $40</Text>
                    </View>
                  )}
                </View>

                <View style={styles.selectIndicator}>
                  {isSelected || 
                    // Check for premium plan
                    (subscriptionData?.planId === 'premium' && subscriptionData?.currentPeriodStart && subscriptionData?.currentPeriodEnd && (() => {
                      // Calculate subscription period in days
                      const startDate = new Date(subscriptionData.currentPeriodStart);
                      const endDate = new Date(subscriptionData.currentPeriodEnd);
                      const diffTime = Math.abs(endDate - startDate);
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      // Check if this is the current plan
                      const isYearly = diffDays > 180;
                      return (isYearly && plan.id === 'premium-yearly') || (!isYearly && plan.id === 'premium-monthly');
                    })()) ||
                    // Check for free plan
                    (subscriptionData?.planId === 'free' && plan.id === 'free') ? (
                    <Ionicons name="checkmark-circle" size={26} color="#0062FF" />
                  ) : (
                    <View style={styles.unselectedCircle} />
                  )}
                </View>
              </TouchableOpacity>

              {/* Expandable Features Section */}
              {isSelected && (
                <Animated.View style={styles.expandedContent}>
                  <View style={styles.featuresContainer}>
                    {plan.features.map((feature, idx) => (
                      <View key={idx} style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#0062FF" style={styles.featureIcon} />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  {plan.id !== 'free' && plan.id !== currentPlan && (
                    <View style={styles.trialInfo}>
                      <Ionicons name="time-outline" size={18} color="#0062FF" />
                      <Text style={styles.trialText}>7-day free trial included</Text>
                    </View>
                  )}
                </Animated.View>
              )}
            </Animated.View>
          );
        })}
      </View>

      {/* Upgrade Button */}
      <TouchableOpacity
        style={[
          styles.upgradeButton,
          (!selectedPlanId || 
           selectedPlanId === currentPlan || 
           selectedPlanId === subscriptionData?.planId || 
           (subscriptionData?.planId === 'premium' && 
            selectedPlanId === 'premium-monthly' && 
            (!subscriptionData.billingPeriod || subscriptionData.billingPeriod === 'monthly'))) && 
           styles.disabledButton
        ]}
        onPress={handleSubscribe}
        disabled={!selectedPlanId || 
                selectedPlanId === currentPlan || 
                selectedPlanId === subscriptionData?.planId || 
                isProcessing || 
                (subscriptionData?.planId === 'premium' && 
                 selectedPlanId === 'premium-monthly' && 
                 (!subscriptionData.billingPeriod || subscriptionData.billingPeriod === 'monthly'))}
      >
        <Text style={styles.upgradeButtonText}>
          {isProcessing ? 'Processing...' :
            !selectedPlanId ? 'Select a Plan' :
            selectedPlanId === currentPlan ? 'Current Plan' : 
            (subscriptionData?.planId === 'premium' && 
             selectedPlanId === 'premium-monthly' && 
             (!subscriptionData.billingPeriod || subscriptionData.billingPeriod === 'monthly')) ? 
              'Current Plan' : 
            (subscriptionData?.planId === 'premium' && selectedPlanId === 'free') ?
              'Downgrade' : 'Upgrade Now'}
        </Text>
      </TouchableOpacity>
      
      {/* Restore Purchases Button */}
      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
          disabled={isProcessing}
        >
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  </View>
);

};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  hero: {
    height:350,
    width: '100%',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  heroBackgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  heroOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,98,255,0.7)',
    padding: 24,
    justifyContent: 'center',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
  },
  heroImagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    paddingHorizontal: 10,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
  },
  scrollContent: {
    flex: 1,
    paddingTop: 24,
  },
  plansContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EDF2F7',
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  selectedPlanCard: {
    borderColor: '#0062FF',
    borderWidth: 2,
    shadowColor: '#0062FF',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  currentPlanCard: {
    borderColor: '#0062FF',
    backgroundColor: '#F0F7FF',
    shadowColor: '#0062FF',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 6,
  },
  currentPlanBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#0062FF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomLeftRadius: 8,
  },
  currentPlanText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bestValueCard: {
    backgroundColor: '#F0F7FF',
  },


  planCardHeader: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    position: 'relative',
  },
  bestValueBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#0062FF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomLeftRadius: 8,
  },
  bestValueText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planTitleSection: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 4,
  },
  priceContainer: {
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceContainerFree: {
    paddingTop: 12,
    flexDirection: 'column',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0062FF',
  },
  planPeriod: {
    fontSize: 16,
    color: '#718096',
    marginLeft: 2,
  },
  monthlyCostContainer: {
    backgroundColor: '#E6F5ED',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  monthlyCost: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  planDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    maxWidth: '90%',
    fontWeight: '500',
  },
  selectIndicator: {
    width: 26,
    height: 26,
    marginLeft: 12,
    alignSelf: 'flex-start',
  },
  unselectedCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#CBD5E0',
  },
  expandedContent: {
    backgroundColor: '#FAFBFC',
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#EDF2F7',
  },
  featuresContainer: {
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#4A5568',
    flex: 1,
  },
  trialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,98,255,0.08)',
    padding: 12,
    borderRadius: 8,
  },
  trialText: {
    marginLeft: 8,
    color: '#0062FF',
    fontWeight: '500',
  },
  upgradeButton: {
    backgroundColor: '#0062FF',
    paddingVertical: 18,
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#0062FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#A0AEC0',
    shadowOpacity: 0.1,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  restoreButton: {
    marginTop: 12,
    marginBottom: 32,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  restoreButtonText: {
    color: '#0062FF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  premiumSuccessOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  premiumSuccessCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  premiumSuccessTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A202C',
    marginTop: 20,
    marginBottom: 16,
  },
  premiumSuccessText: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 8,
  },
  premiumSuccessDismiss: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#0062FF',
    borderRadius: 8,
  },
  premiumSuccessDismissText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  subscriptionDetailsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subscriptionDetailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 16,
  },
  subscriptionDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  subscriptionDetailsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  subscriptionDetailsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
    textAlign: 'right',
    maxWidth: '60%',
  },
  statusBadge: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  manageSubscriptionButton: {
    backgroundColor: '#EBF8FF',
    borderWidth: 1,
    borderColor: '#0062FF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  manageSubscriptionButtonText: {
    color: '#0062FF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default BusinessSubscriptionScreen;