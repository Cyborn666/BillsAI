/**
 * GroupDetailScreen.js
 * Displays detailed information about a group and its members
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
  FlatList,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import theme from '../../styles/theme';
import * as splitService from '../../services/splitService';

const GroupDetailScreen = ({ route, navigation }) => {
  const { group } = route.params || {};
  const groupId = group?.id || route.params?.groupId;
  
  const [loading, setLoading] = useState(true);
  const [groupDetails, setGroupDetails] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);

  // Fetch group details and transaction history
  const fetchGroupData = useCallback(async () => {
    if (!groupId) {
      setError('Group information missing');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch group details
      const details = await splitService.getGroupById(groupId);
      setGroupDetails(details);

      // Fetch transaction history
      const history = await splitService.getGroupTransactions(groupId);
      setTransactions(history || []);
    } catch (err) {
      console.error('Error fetching group data:', err);
      setError('Could not load group information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      fetchGroupData();
    }, [fetchGroupData])
  );

  const handleAddExpense = () => {
    navigation.navigate('AddExpense', { 
      selectedGroup: groupDetails,
      isGroupExpense: true
    });
  };

  const handleSettleUp = () => {
    navigation.navigate('SettleUp', { 
      groupId: groupId,
      groupName: groupDetails?.name || 'Group',
      isGroupSettlement: true
    });
  };

  const renderMemberItem = ({ item }) => {
    const balance = item.balance || 0;
    const isNegative = balance < 0;
    const formattedBalance = Math.abs(balance).toFixed(2);
    
    return (
      <TouchableOpacity 
        style={styles.memberItem}
        onPress={() => navigation.navigate('ContactDetail', { contactId: item.id })}
      >
        <View style={styles.memberAvatar}>
          <Text style={styles.memberInitial}>
            {item.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.name || 'Unknown'}</Text>
          <Text style={styles.memberEmail}>{item.email || 'No email'}</Text>
        </View>
        <Text style={[
          styles.memberBalance,
          isNegative ? styles.negativeBalance : styles.positiveBalance
        ]}>
          {isNegative ? '-' : ''}${formattedBalance}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading group details...</Text>
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

  if (!groupDetails) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="people-outline" size={48} color="#9CA3AF" />
        <Text style={styles.errorText}>Group not found</Text>
        <TouchableOpacity 
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const totalBalance = groupDetails.balance || 0;
  const isNegative = totalBalance < 0;
  const formattedTotalBalance = Math.abs(totalBalance).toFixed(2);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{groupDetails.name || 'Group Details'}</Text>
        <TouchableOpacity style={styles.moreButton} onPress={() => {
          Alert.alert(
            'Group Options',
            'What would you like to do?',
            [
              {
                text: 'Edit Group',
                onPress: () => navigation.navigate('EditGroup', { group: groupDetails }),
              },
              {
                text: 'Leave Group',
                onPress: () => {
                  Alert.alert(
                    'Leave Group',
                    'Are you sure you want to leave this group? You must settle all debts first.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Leave', 
                        style: 'destructive',
                        onPress: async () => {
                          // Implementation would depend on the backend API
                          if (totalBalance !== 0) {
                            Alert.alert('Cannot Leave', 'You must settle all debts before leaving the group.');
                            return;
                          }
                          
                          try {
                            await splitService.leaveGroup(groupId);
                            navigation.goBack();
                          } catch (err) {
                            Alert.alert('Error', 'Failed to leave group. Please try again.');
                          }
                        }
                      },
                    ]
                  );
                },
                style: 'destructive',
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        }}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Group Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.groupIconLarge}>
            <Ionicons name="people" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.groupName}>{groupDetails.name || 'Unnamed Group'}</Text>
          <Text style={styles.memberCount}>
            {groupDetails.members?.length || 0} members
          </Text>
          
          {/* Group Balance */}
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>
              {isNegative ? 'YOU OWE' : 'YOU\'RE OWED'}
            </Text>
            <Text style={[
              styles.balanceAmount,
              isNegative ? styles.negativeBalance : styles.positiveBalance
            ]}>
              ${formattedTotalBalance}
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

        {/* Members Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Members</Text>
          
          <FlatList
            data={groupDetails.members || []}
            renderItem={renderMemberItem}
            keyExtractor={(item) => `member-${item.id || Math.random()}`}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No members found</Text>
              </View>
            }
          />
          
          <TouchableOpacity 
            style={styles.addMemberButton}
            onPress={() => navigation.navigate('AddGroupMembers', { groupId: groupId })}
          >
            <Ionicons name="person-add-outline" size={18} color="#3B82F6" />
            <Text style={styles.addMemberText}>Add Members</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction History */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transaction History</Text>
            {transactions.length > 0 && (
              <TouchableOpacity 
                onPress={() => navigation.navigate('ActivityHistory', { 
                  sourceType: 'group',
                  sourceId: groupId
                })}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={40} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No transactions yet</Text>
            </View>
          ) : (
            <FlatList
              data={transactions.slice(0, 5)} // Show only the latest 5
              keyExtractor={(item) => `transaction-${item.id || Math.random()}`}
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
                  <View style={styles.transactionAmountContainer}>
                    <Text style={[
                      styles.transactionAmount,
                      item.type === 'settlement' ? styles.settlementAmount :
                      (item.amount < 0 ? styles.negativeAmount : styles.positiveAmount)
                    ]}>
                      ${Math.abs(item.amount || 0).toFixed(2)}
                    </Text>
                    <Text style={styles.transactionPaidBy}>
                      {item.paidBy === 'you' ? 'You paid' : `${item.paidBy || 'Someone'} paid`}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  summaryContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
  },
  groupIconLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  memberCount: {
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
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  memberBalance: {
    fontSize: 16,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  addMemberText: {
    marginLeft: 8,
    color: '#3B82F6',
    fontWeight: '500',
    fontSize: 14,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionPaidBy: {
    fontSize: 12,
    color: '#6B7280',
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

export default GroupDetailScreen;
