// src/hooks/useIAP.js
import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import iapService from '../services/iapService';

export const useIAP = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Initialize IAP on component mount
  useEffect(() => {
    if (Platform.OS === 'ios') {
      const initialize = async () => {
        setLoading(true);
        try {
          // Initialize connection
          await iapService.initializeIAP();
          
          // Setup listeners
          const removeListeners = iapService.setupPurchaseListeners();
          
          // Load available products
          const availableProducts = await iapService.getAvailableSubscriptions();
          setProducts(availableProducts);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }

        // Return cleanup function
        return () => {
          if (typeof removeListeners === 'function') {
            removeListeners();
          }
        };
      };

      initialize();
    }
  }, []);

  // Purchase a subscription
  const purchaseSubscription = async (productId) => {
    if (Platform.OS !== 'ios') return { success: false, error: 'Not supported on this platform' };
    
    setPurchasing(true);
    setError(null);
    
    try {
      const result = await iapService.purchaseSubscription(productId);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setPurchasing(false);
    }
  };

  // Restore purchases
  const restorePurchases = async () => {
    if (Platform.OS !== 'ios') return { success: false, error: 'Not supported on this platform' };
    
    setRestoring(true);
    setError(null);
    
    try {
      const result = await iapService.restorePurchases();
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setRestoring(false);
    }
  };

  return {
    products,
    loading,
    error,
    purchasing,
    restoring,
    purchaseSubscription,
    restorePurchases
  };
};