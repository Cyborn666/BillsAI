/**
 * Subscription Manager Component
 * Handles subscription actions with platform-specific logic
 */
import React from 'react';
import { View, Platform, Alert } from 'react-native';
import { useIAP } from '../hooks/useIAP';
import RestorePurchasesButton from './RestorePurchasesButton';
import platformPaymentService from '../services/platformPaymentService';
import { getUserFriendlyErrorMessage } from '../../utils/errorUtils';

// Component to render platform-specific subscription actions
const SubscriptionManager = ({ onManagementRequested }) => {
  const { restoring, restorePurchases } = useIAP();
  
  // Handle restore purchases action (iOS only)
  const handleRestorePurchases = async () => {
    try {
      const result = await restorePurchases();
      
      if (result.success) {
        Alert.alert(
          'Purchases Restored',
          'Your previous purchases have been restored successfully.'
        );
      } else if (result.message === 'No purchases to restore') {
        Alert.alert(
          'No Purchases Found',
          'No previous purchases were found to restore.'
        );
      } else {
        throw new Error(result.error || 'Restore failed');
      }
    } catch (error) {
      Alert.alert(
        'Restore Failed',
        getUserFriendlyErrorMessage(error)
      );
    }
  };

  // Only render on iOS
  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <View style={{ marginVertical: 10 }}>
      <RestorePurchasesButton 
        onPress={handleRestorePurchases}
        isRestoring={restoring}
      />
    </View>
  );
};

export default SubscriptionManager;
