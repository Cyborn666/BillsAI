/**
 * SettleUpScreen.js
 * Screen for settling debts with contacts or in groups
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import theme from '../../styles/theme';
import * as splitService from '../../services/splitService';

const SettleUpScreen = ({ route, navigation }) => {
  // Get parameters - can be used for contact or group settlement
  const { 
    contactId, 
    contactName, 
    groupId, 
    groupName, 
    balance: initialBalance = 0,
    isGroupSettlement = false 
  } = route.params || {};

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [method, setMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settlementDetails, setSettlementDetails] = useState(null);

  // Fetch debt details
  const fetchDetails = useCallback(async () => {
    if (!contactId && !groupId) {
      navigation.goBack();
      return;
    }

    setDetailsLoading(true);
    setError(null);

    try {
      let details = null;
      
      if (isGroupSettlement && groupId) {
        details = await splitService.getGroupSettlementDetails(groupId);
      } else if (contactId) {
        details = await splitService.getContactSettlementDetails(contactId);
      }
      
      setSettlementDetails(details);
      
      if (details && details.balance) {
        setAmount(Math.abs(details.balance).toFixed(2));
      } else if (initialBalance) {
        setAmount(Math.abs(initialBalance).toFixed(2));
      }
    } catch (err) {
      console.error('Error fetching settlement details:', err);
      setError('Could not load settlement details. Please try again.');
    } finally {
      setDetailsLoading(false);
    }
  }, [contactId, groupId, isGroupSettlement, initialBalance, navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchDetails();
    }, [fetchDetails])
  );

  const handleSettleUp = async () => {
    // Validate inputs
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      const settlementData = {
        amount: parseFloat(amount),
        description: description.trim() || `Settlement${isGroupSettlement ? ' for group' : ''}`,
        method,
        contactId: isGroupSettlement ? null : contactId,
        groupId: isGroupSettlement ? groupId : null,
      };

      const result = await splitService.createSettlement(settlementData);
      
      setLoading(false);
      
      if (result) {
        Alert.alert(
          'Success',
          'Settlement recorded successfully',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      setLoading(false);
      console.error('Error creating settlement:', error);
      Alert.alert('Error', 'Failed to record settlement. Please try again.');
    }
  };

  const getTitle = () => {
    if (isGroupSettlement) {
      return `Settle up in ${groupName || 'Group'}`;
    } else {
      return `Settle up with ${contactName || 'Contact'}`;
    }
  };

  const getFormattedBalance = () => {
    const balance = settlementDetails?.balance || initialBalance || 0;
    const isNegative = balance < 0;
    
    return {
      amount: Math.abs(balance).toFixed(2),
      direction: isNegative ? 'you owe' : 'owes you'
    };
  };

  const balanceInfo = getFormattedBalance();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settle Up</Text>
          <View style={styles.placeholderButton} />
        </View>

        {detailsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading settlement details...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchDetails}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
              <Text style={styles.title}>{getTitle()}</Text>
              
              {/* Balance Information */}
              <View style={styles.balanceContainer}>
                <Text style={styles.balanceLabel}>
                  {isGroupSettlement ? 
                    `Group Balance` : 
                    `${contactName || 'Contact'} ${balanceInfo.direction}`}
                </Text>
                <Text style={[
                  styles.balanceAmount,
                  balanceInfo.direction === 'you owe' ? styles.negativeBalance : styles.positiveBalance
                ]}>
                  ${balanceInfo.amount}
                </Text>
              </View>

              {/* Settlement Form */}
              <View style={styles.formContainer}>
                {/* Amount Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Amount</Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="0.00"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                  </View>
                </View>
                
                {/* Description Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Enter a description"
                    placeholderTextColor="#9CA3AF"
                    multiline={false}
                    maxLength={100}
                  />
                </View>
                
                {/* Payment Method Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Payment Method</Text>
                  <View style={styles.methodsContainer}>
                    <TouchableOpacity 
                      style={[styles.methodButton, method === 'cash' && styles.methodSelected]}
                      onPress={() => setMethod('cash')}
                    >
                      <Ionicons 
                        name="cash-outline" 
                        size={20} 
                        color={method === 'cash' ? "#FFFFFF" : "#6B7280"} 
                      />
                      <Text style={[
                        styles.methodText,
                        method === 'cash' && styles.methodTextSelected
                      ]}>
                        Cash
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.methodButton, method === 'bank' && styles.methodSelected]}
                      onPress={() => setMethod('bank')}
                    >
                      <Ionicons 
                        name="card-outline" 
                        size={20} 
                        color={method === 'bank' ? "#FFFFFF" : "#6B7280"} 
                      />
                      <Text style={[
                        styles.methodText,
                        method === 'bank' && styles.methodTextSelected
                      ]}>
                        Bank Transfer
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.methodButton, method === 'other' && styles.methodSelected]}
                      onPress={() => setMethod('other')}
                    >
                      <Ionicons 
                        name="ellipsis-horizontal-circle-outline" 
                        size={20} 
                        color={method === 'other' ? "#FFFFFF" : "#6B7280"} 
                      />
                      <Text style={[
                        styles.methodText,
                        method === 'other' && styles.methodTextSelected
                      ]}>
                        Other
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <Text style={styles.noteText}>
                  This will record that the debt has been settled. No actual money will be transferred.
                </Text>
              </View>
            </ScrollView>

            {/* Settle Up Button */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[
                  styles.settleButton,
                  (parseFloat(amount) <= 0 || loading) && styles.disabledButton
                ]} 
                onPress={handleSettleUp}
                disabled={parseFloat(amount) <= 0 || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.settleButtonText}>Record Settlement</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholderButton: {
    width: 32,
    height: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  balanceContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  positiveBalance: {
    color: '#10B981',
  },
  negativeBalance: {
    color: '#EF4444',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '500',
    color: '#4B5563',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 20,
    fontWeight: '500',
    color: '#111827',
  },
  methodsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: '#F9FAFB',
  },
  methodSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  methodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 4,
  },
  methodTextSelected: {
    color: '#FFFFFF',
  },
  noteText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  buttonContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  settleButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  settleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default SettleUpScreen;
