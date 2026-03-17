/**
 * ContactDetailScreen.js
 * Displays detailed information about a contact including transaction history
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Image,
  FlatList,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import theme from '../../styles/theme';
import * as splitService from '../../services/splitService';

const ContactDetailScreen = ({ route, navigation }) => {
  console.log('ContactDetailScreen route.params:', route.params);
  const { contact, userId, name, contactId: paramContactId } = route.params || {};
  
  // Prioritize userId from route.params since that's what SplitExpensesScreen sends
  const contactId = userId || paramContactId || contact?.id;
  const contactName = name || contact?.name;
  
  console.log('ContactDetailScreen parsed values:', {
    contactId,
    contactName,
    routeParams: route.params,
  });
  
  const [loading, setLoading] = useState(true);
  const [contactDetails, setContactDetails] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);

  // Fetch contact details and transaction history
  const fetchContactData = useCallback(async () => {
    if (!contactId) {
      setError('Contact information missing');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch balance with this user to get their details
      const balanceData = await splitService.getBalanceWithUser(contactId);
      console.log('Balance data for contact:', balanceData);
      
      const contactInfo = balanceData?.otherUser || {};
      setContactDetails({
        id: contactId,
        name: contactInfo.displayName || contactName || 'User',
        email: contactInfo.email || '',
        balance: balanceData?.balance || 0,
      });

      // Fetch all expenses with this user
      const expenses = await splitService.getExpensesWithFriend(contactId);
      console.log('Expenses with contact:', expenses);
      setTransactions(expenses || []);
    } catch (err) {
      console.error('Error fetching contact data:', err);
      setError('Could not load contact information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [contactId, contactName]);

  useFocusEffect(
    useCallback(() => {
      fetchContactData();
    }, [fetchContactData])
  );

  const handleSettleUp = () => {
    navigation.navigate('SettleUp', { 
      contactId: contactId,
      contactName: contactDetails?.name || 'Contact',
      balance: contactDetails?.balance || 0
    });
  };

  const handleAddExpense = () => {
    navigation.navigate('AddExpense', { 
      selectedContacts: [contactDetails] 
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading contact details...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!contactDetails) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="person-outline" size={48} color="#9CA3AF" />
        <Text style={styles.errorText}>Contact not found</Text>
        <TouchableOpacity 
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const balance = contactDetails?.balance || 0;
  const isNegative = balance < 0;
  const formattedBalance = Math.abs(balance).toFixed(2);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Details</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Contact Profile */}
        <View style={styles.profileContainer}>
          <View style={styles.avatarContainer}>
            {contactDetails.avatar ? (
              <Image source={{ uri: contactDetails.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>
                  {contactDetails.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.contactName}>{contactDetails.name || 'Unknown'}</Text>
          <Text style={styles.contactEmail}>{contactDetails.email || 'No email provided'}</Text>
          
          {/* Balance */}
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>{isNegative ? 'YOU OWE' : 'OWES YOU'}</Text>
            <Text style={[
              styles.balanceAmount,
              isNegative ? styles.negativeBalance : styles.positiveBalance
            ]}>
              ${formattedBalance}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.settleButton]} 
            onPress={handleSettleUp}
          >
            <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
            <Text style={styles.settleButtonText}>Settle Up</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.expenseButton]} 
            onPress={handleAddExpense}
          >
            <Ionicons name="add-outline" size={20} color="#FFFFFF" />
            <Text style={styles.expenseButtonText}>Add Expense</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction History */}
        <View style={styles.transactionsContainer}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={40} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No transactions yet</Text>
            </View>
          ) : (
            <FlatList
              data={transactions}
              keyExtractor={(item, index) => `transaction-${item.id || index}`}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.transactionItem}
                  onPress={() => {
                    if (item.type === 'expense') {
                      navigation.navigate('ExpenseDetail', { id: item.id });
                    } else if (item.type === 'settlement') {
                      navigation.navigate('SettlementDetail', { id: item.id });
                    }
                  }}
                >
                  <View style={[
                    styles.transactionIcon,
                    item.type === 'settlement' ? styles.settlementIcon : styles.expenseIcon
                  ]}>
                    <Ionicons 
                      name={item.type === 'settlement' ? 'wallet-outline' : 'receipt-outline'} 
                      size={16} 
                      color="#FFFFFF" 
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionTitle}>
                      {item.description || (item.type === 'settlement' ? 'Settlement' : 'Expense')}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {item.date ? new Date(item.date).toLocaleDateString() : 'Unknown date'}
                    </Text>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    item.type === 'settlement' ? styles.settlementAmount :
                    (item.amount < 0 ? styles.negativeAmount : styles.positiveAmount)
                  ]}>
                    ${Math.abs(item.amount || 0).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              )}
              scrollEnabled={false}
              nestedScrollEnabled={true}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
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
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  moreButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  profileContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 16,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  contactName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  contactEmail: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  balanceContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  positiveBalance: {
    color: '#10B981',
  },
  negativeBalance: {
    color: '#EF4444',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  settleButton: {
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  expenseButton: {
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  settleButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  expenseButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  transactionsContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseIcon: {
    backgroundColor: '#3B82F6',
  },
  settlementIcon: {
    backgroundColor: '#10B981',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  positiveAmount: {
    color: '#10B981',
  },
  negativeAmount: {
    color: '#EF4444',
  },
  settlementAmount: {
    color: '#3B82F6',
  },
});

export default ContactDetailScreen;
