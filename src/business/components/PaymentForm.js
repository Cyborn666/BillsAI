import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../styles/theme';
// Import subscription service and error utilities
import { createSubscription } from '../services/subscriptionService';
import { getUserFriendlyErrorMessage, classifyStripeError } from '../../utils/errorUtils';

const PaymentForm = ({ planId, onSuccess, onCancel }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState(null);
  const [paymentSheetReady, setPaymentSheetReady] = useState(false);

  const stripe = useStripe();

  // Initialize the Payment Sheet when component mounts
  useEffect(() => {
    initializePaymentSheet();
  }, [initializePaymentSheet]);
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initializePaymentSheet = async () => {
    try {
      setIsProcessing(true);
      setCardError(null);

      // Create a temporary payment intent to initialize the payment sheet
      const { clientSecret, ephemeralKey, customer } = await createSubscription({
        planId,
        setupIntent: true,
      });
      
      if (!clientSecret) {
        throw new Error('payment_method_error');
      }

      // Initialize the Payment Sheet
      const { error } = await stripe.initPaymentSheet({
        merchantDisplayName: 'Bills AI',
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        setupIntentClientSecret: clientSecret, // Use setupIntentClientSecret instead of paymentIntentClientSecret
        allowsDelayedPaymentMethods: false,
        style: 'automatic',
        // Add better error messaging for declined cards
        dangerouslyGetFullCardDetails: false, // Don't store full card details for security
      });
      
      if (error) {
        // Classify Stripe error to get user-friendly error code
        const errorCode = classifyStripeError(error);
        throw new Error(errorCode);
      }

      setPaymentSheetReady(true);
    } catch (error) {
      //console.error('Error initializing payment sheet:', error);
      // Convert to user-friendly message
      const friendlyMessage = getUserFriendlyErrorMessage(error);
      setCardError(friendlyMessage);
      
      // Handle network errors specially
      if (error.message?.includes('network') || error.code === 'network_error') {
        setCardError('We couldn\'t connect to our payment service. Please check your internet connection and try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (!paymentSheetReady) {
      // Try to initialize again if not ready
      await initializePaymentSheet();
      if (!paymentSheetReady) {
        setCardError('Our payment system is currently not responding. Please wait a moment and try again.');
        return;
      }
    }

    setIsProcessing(true);
    setCardError(null);

    try {
      // Present the Payment Sheet to the user
      const { error: presentError } = await stripe.presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          // User canceled the payment sheet
          if (onCancel) {
            setTimeout(() => onCancel(), 100); // Small delay to ensure UI is updated
            return;
          }
          setIsProcessing(false);
          return;
        }
        
        // Classify Stripe error to determine error type
        const errorCode = classifyStripeError(presentError);
        throw new Error(errorCode);
      }

      // If payment sheet was completed successfully, call the existing API to finalize the subscription
      const result = await createSubscription({
        planId,
        setupIntentCompleted: true,
      });
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Notify parent component of success
      onSuccess(result);
    } catch (err) {
      //console.error('Subscription payment error:', err);
      // Convert to user-friendly message
      const friendlyMessage = getUserFriendlyErrorMessage(err);
      
      // Display error with retry option
      Alert.alert(
        'Payment Issue',
        friendlyMessage,
        [
          { text: 'Try Again', onPress: () => handleSubmit() },
          { text: 'Cancel', style: 'cancel', onPress: () => onCancel && onCancel() },
        ]
      );
      setCardError(friendlyMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.outerContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <View style={styles.logoBox}>
                <Text style={styles.logoText}>Bills</Text>
                <Text style={styles.logoText}>AI</Text>
              </View>
            </View>
            <View style={styles.secureIndicator}>
              <Ionicons name="lock-closed" size={14} color={theme.colors.primary} />
              <Text style={styles.secureText}>Secure Payment</Text>
            </View>
          </View>

          <Text style={styles.title}>Payment Information</Text>
          
          <View style={styles.formContainer}>
            <Text style={styles.description}>
              Please enter your payment details below to complete your subscription.
            </Text>
            
            <Text style={styles.description}>
              Please tap the button below to enter your payment details securely. Your payment information will be processed by Stripe, our trusted payment provider.
            </Text>

            {cardError && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
                <Text style={styles.errorText}>{cardError}</Text>
              </View>
            )}
          </View>

          <View style={styles.cardIconsContainer}>
            <View style={styles.cardIconWrapper}>
              <Text style={styles.cardTypeLabel}>Accepted Cards</Text>
              <View style={styles.cardIconsRow}>
                <View style={styles.cardIcon}>
                  <View style={[styles.cardLogo, styles.visaCard]}>
                    <Text style={styles.visaText}>VISA</Text>
                  </View>
                  <Text style={styles.cardName}>Visa</Text>
                </View>
                <View style={styles.cardIcon}>
                  <View style={[styles.cardLogo, styles.mastercardCard]}>
                    <View style={styles.mastercardCircleLeft} />
                    <View style={styles.mastercardCircleRight} />
                  </View>
                  <Text style={styles.cardName}>Mastercard</Text>
                </View>
                <View style={styles.cardIcon}>
                  <View style={[styles.cardLogo, styles.amexCard]}>
                    <Text style={styles.amexText}>AMEX</Text>
                  </View>
                  <Text style={styles.cardName}>Amex</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={isProcessing}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={isProcessing || !paymentSheetReady}
            >
              {isProcessing ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <View style={styles.submitContent}>
                  <Text style={styles.submitButtonText}>Subscribe</Text>
                  <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{marginLeft: 8}} />
                </View>
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.securityNotice}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#757575" />
            <Text style={styles.securityText}>Your payment is encrypted and secure</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  formContainer: {
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  description: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  halfInputContainer: {
    width: '48%',
  },
  halfInputWrapper: {
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    height: 56,
  },
  halfInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  label: {
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F9F9F9',
    height: 56,
  },
  input: {
    height: 56,
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  inputIcon: {
    marginRight: 12,
  },
  headerContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  logoBox: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  logoText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  secureIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  secureText: {
    fontSize: 12,
    color: theme.colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  cardIconsContainer: {
    marginBottom: 20,
  },
  cardIconWrapper: {
    alignItems: 'center',
  },
  cardTypeLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 8,
  },
  cardIconsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cardName: {
    fontSize: 10,
    color: '#757575',
    marginTop: 4,
  },
  cardLogo: {
    width: 40,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visaCard: {
    backgroundColor: '#1A1F71',
  },
  visaText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  mastercardCard: {
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  mastercardCircleLeft: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EB001B',
    marginRight: -4,
  },
  mastercardCircleRight: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F79E1B',
    marginLeft: -4,
  },
  amexCard: {
    backgroundColor: '#006FCF',
  },
  amexText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  
  infoButton: {
    position: 'absolute',
    right: -20,
    top: 40,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  securityText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 6,
  },
  
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  
  
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    marginLeft: 8,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    backgroundColor: '#fff',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cancelButtonText: {
    color: theme.colors.businessPrimary,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    backgroundColor: theme.colors.businessPrimary,
    borderRadius: 10,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.businessPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});


export default PaymentForm;

 
