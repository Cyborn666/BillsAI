/**
 * ActivityHistoryScreen.js
 * Displays transaction history for all split expenses, or filtered by contact/group
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../styles/theme';
import * as splitService from '../../services/splitService';

const ActivityHistoryScreen = ({ route, navigation }) => {
  // sourceType can be 'all', 'contact', or 'group'
  const { sourceType = 'all', sourceId = null, sourceName = null } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'expenses', 'settlements'

  // Fetch transactions based on source type and ID
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let data = [];
      
      if (sourceType === 'contact' && sourceId) {
        data = await splitService.getContactTransactions(sourceId);
      } else if (sourceType === 'group' && sourceId) {
        data = await splitService.getGroupTransactions(sourceId);
      } else {
        data = await splitService.getAllTransactions();
      }
      
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Could not load transaction history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [sourceType, sourceId]);

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [fetchTransactions])
  );

  const getFilteredTransactions = () => {
    if (filter === 'all') return transactions;
    return transactions.filter(item => 
      filter === 'expenses' ? item.type === 'expense' : item.type === 'settlement'
    );
  };

  const getTitle = () => {
    if (sourceType === 'contact' && sourceName) {
      return `${sourceName}'s Activity`;
    } else if (sourceType === 'group' && sourceName) {
      return `${sourceName} Activity`;
    } else {
      return 'Activity History';
    }
  };

  const renderTransactionItem = ({ item }) => {
    const isExpense = item.type === 'expense';
    const isSettlement = item.type === 'settlement';
    
    // Determine the appropriate icon based on transaction type
    let iconName = 'receipt-outline';
    let iconBgColor = '#3B82F6';
    
    if (isSettlement) {
      iconName = 'wallet-outline';
      iconBgColor = '#10B981';
    }
    
    return (
      <TouchableOpacity 
        style={styles.transactionItem}
        onPress={() => {
          if (isExpense) {
            navigation.navigate('ExpenseDetail', { id: item.id });
          } else if (isSettlement) {
            navigation.navigate('SettlementDetail', { id: item.id });
          }
        }}
      >
        <View style={[styles.transactionIcon, { backgroundColor: iconBgColor }]}>
          <Ionicons name={iconName} size={18} color="#FFFFFF" />
        </View>
        
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionTitle}>
            {item.description || (isSettlement ? 'Settlement' : 'Expense')}
          </Text>
          
          <View style={styles.transactionMeta}>
            <Text style={styles.transactionDate}>
              {item.date ? new Date(item.date).toLocaleDateString() : 'Unknown date'}
            </Text>
            
            {item.groupName && (
              <View style={styles.groupTag}>
                <Ionicons name="people-outline" size={12} color="#6B7280" />
                <Text style={styles.groupName}>{item.groupName}</Text>
              </View>
            )}
            
            {!item.groupName && item.withWho && (
              <View style={styles.withWhoTag}>
                <Ionicons name="person-outline" size={12} color="#6B7280" />
                <Text style={styles.withWhoName}>{item.withWho}</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.amountContainer}>
          <Text style={[
            styles.amount,
            isSettlement ? styles.settlementAmount : 
            (item.amount < 0 ? styles.negativeAmount : styles.positiveAmount)
          ]}>
            {item.amount < 0 ? '-' : ''}${Math.abs(item.amount || 0).toFixed(2)}
          </Text>
          <Text style={styles.paymentDetails}>
            {isSettlement ? 'Settlement' : (
              item.paidBy === 'you' ? 'You paid' : `${item.paidBy || 'Someone'} paid`
            )}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getTitle()}</Text>
        <View style={styles.placeholderButton} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'expenses' && styles.activeFilterTab]}
          onPress={() => setFilter('expenses')}
        >
          <Text style={[styles.filterText, filter === 'expenses' && styles.activeFilterText]}>
            Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'settlements' && styles.activeFilterTab]}
          onPress={() => setFilter('settlements')}
        >
          <Text style={[styles.filterText, filter === 'settlements' && styles.activeFilterText]}>
            Settlements
          </Text>
        </TouchableOpacity>
      </View>

      {/* Transaction List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading activity...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchTransactions}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : getFilteredTransactions().length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Activity Yet</Text>
          <Text style={styles.emptyText}>
            {filter === 'all' ? 
              'When you add expenses or settle up, they will appear here' : 
              filter === 'expenses' ? 
                'No expenses have been added yet' : 
                'No settlements have been made yet'
            }
          </Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => {
              if (filter === 'settlements') {
                navigation.navigate('SettleUp');
              } else {
                navigation.navigate('AddExpense');
              }
            }}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>
              {filter === 'settlements' ? 'Settle Up' : 'Add Expense'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={getFilteredTransactions()}
          renderItem={renderTransactionItem}
          keyExtractor={item => `transaction-${item.id || Math.random()}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeFilterTab: {
    borderBottomColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterText: {
    color: '#3B82F6',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 300,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  listContent: {
    paddingVertical: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionDate: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 8,
  },
  groupTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  groupName: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  withWhoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  withWhoName: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
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
  paymentDetails: {
    fontSize: 12,
    color: '#6B7280',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
});

export default ActivityHistoryScreen;
