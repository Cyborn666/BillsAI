/**
 * SplitExpensesScreen.js
 * Split expense functionality with modern UI
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Image,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../styles/theme';
import { useAuth } from '../../contexts/AuthContext';
import * as splitService from '../../services/splitService';

const SplitExpensesScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState({
    totalOwed: 0,
    totalOwing: 0,
    netBalance: 0,
  });
  const [recentContacts, setRecentContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState(null);

  // Fetch all necessary data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch overall balances (total owed and owing)
      const balanceData = await splitService.getUserBalances();
      console.log('Overall balances:', balanceData);
      setBalances(balanceData || {
        totalOwed: 0,
        totalOwing: 0,
        netBalance: 0,
      });
      
      // Fetch individual friend balances
      const balancesWithFriends = await splitService.getUserBalances();
      console.log('Friend balances:', balancesWithFriends);
      
      // Process friend balances data
      let friendBalances = [];
      if (balancesWithFriends && Array.isArray(balancesWithFriends.balances)) {
        // Access balances array directly from the API response
        console.log('Processing balances array:', balancesWithFriends.balances);
        friendBalances = balancesWithFriends.balances.map(balance => ({
          userId: balance.otherSplitUser?._id || balance.userId,
          name: balance.otherSplitUser?.displayName || balance.displayName || 'User',
          amount: balance.amount || 0,
          email: balance.otherSplitUser?.email || balance.email || '',
        }));
      }
      console.log('Processed friend balances:', friendBalances);
      setRecentContacts(friendBalances);
      
      // Fetch groups with balance info
      const groupsData = await splitService.getSplitGroups();
      console.log('Groups data:', groupsData);
      setGroups(groupsData || []);
      
      // Fetch recent activities
      const activitiesData = await splitService.getRecentActivity(5); // Limit to 5 most recent
      console.log('Activities data:', activitiesData);
      setActivities(activitiesData || []);
    } catch (err) {
      console.error('Error fetching split data:', err);
      setError('Could not load your split expense data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('SplitExpensesScreen focused - refreshing data');
      fetchData();
      
      return () => {
        // This runs when the screen is unfocused
        console.log('SplitExpensesScreen unfocused');
      };
    }, [fetchData])
  );

  // Calculate total balance with zero defaults
  const totalBalance = balances?.netBalance || 0;
  const isNegative = totalBalance < 0;
  const formattedTotal = Math.abs(totalBalance).toFixed(2);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} colors={[theme.colors.primary]} />
        }
      >
        {/* User Greeting */}
        <View style={styles.greetingContainer}>
          <View>
            <Text style={styles.greetingText}>Hello,</Text>
            <Text style={styles.userName}>{user?.displayName || 'Alex Johnson'}</Text>
          </View>
          <View style={styles.profileImageContainer}>
            {user?.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={styles.profileImage} />
            ) : (
              <View style={styles.fallbackAvatar}>
                <Text style={styles.fallbackAvatarText}>
                  {(user?.displayName || 'A')[0].toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
          <Text style={[
            styles.balanceAmount, 
            isNegative ? styles.negativeBalance : styles.positiveBalance
          ]}>
            {isNegative ? '-' : ''}${formattedTotal}
          </Text>

          <View style={styles.balanceDetails}>
            <View style={styles.balanceColumn}>
              <View style={styles.balanceIndicatorGreen} />
              <Text style={styles.balanceDetailLabel}>You are owed</Text>
              <Text style={styles.balanceDetailAmount}>
                ${(balances?.totalOwed || 0).toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.balanceColumn}>
              <View style={styles.balanceIndicatorRed} />
              <Text style={styles.balanceDetailLabel}>You owe</Text>
              <Text style={styles.balanceDetailAmount}>
                ${(balances?.totalOwing || 0).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Add Expense Button */}
        <TouchableOpacity 
          style={styles.addExpenseButton}
          onPress={() => navigation.navigate('AddExpense')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.addExpenseButtonText}>Add Expense</Text>
        </TouchableOpacity>

        {/* Friend Balances Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="cash-outline" size={20} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Friend Balances</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('AllBalances')}>
              <View style={styles.seeAllContainer}>
                <Text style={styles.seeAllText}>See All</Text>
                <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
              </View>
            </TouchableOpacity>
          </View>
          
          {recentContacts && recentContacts.length > 0 ? (
            <View style={styles.balanceListContainer}>
              {recentContacts.map((balance, index) => {
                // Determine if the balance is positive (they owe you) or negative (you owe them)
                const isUserOwing = balance.amount < 0;
                const firstNameOrFull = balance.name.split(' ')[0] || balance.name;
                
                return (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.balanceItem}
                    onPress={() => {
                      console.log('Navigating to ContactDetail with:', {
                        userId: balance.userId,
                        name: balance.name,
                        balance: balance
                      });
                      navigation.navigate('ContactDetail', { userId: balance.userId, name: balance.name });
                    }}
                  >
                    <View style={styles.balanceItemLeft}>
                      <View style={[styles.contactAvatar, isUserOwing ? styles.redBorder : styles.greenBorder]}>
                        <Text style={styles.contactInitial}>
                          {balance.name ? balance.name[0].toUpperCase() : 'U'}
                        </Text>
                      </View>
                      <View style={styles.balanceNameContainer}>
                        <Text style={styles.balanceName} numberOfLines={1}>
                          {balance.name || 'User'}
                        </Text>
                        <Text style={styles.balanceDescription}>
                          {isUserOwing 
                            ? `You owe ${firstNameOrFull}` 
                            : `${firstNameOrFull} owes you`}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.balanceItemAmount, 
                      isUserOwing ? styles.negativeAmount : styles.positiveAmount]}>
                      ${Math.abs(balance.amount).toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity 
                style={styles.addBalanceButton}
                onPress={() => navigation.navigate('AddExpense')}
              >
                <View style={styles.addBalanceIcon}>
                  <Ionicons name="add" size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.addBalanceText}>Add Expense</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No balances with friends</Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('AddExpense')}
              >
                <Text style={styles.emptyStateButtonText}>Add Expense</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Groups Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="people-circle" size={20} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Your Groups</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Groups')}>
              <View style={styles.seeAllContainer}>
                <Text style={styles.seeAllText}>See All</Text>
                <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
              </View>
            </TouchableOpacity>
          </View>
          
          {groups && groups.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.groupsContainer}
            >
              {groups.map((group, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.groupItem}
                  onPress={() => navigation.navigate('GroupDetail', { group })}
                >
                  <View style={styles.groupAvatar}>
                    <Ionicons name="people" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.groupName} numberOfLines={1}>
                    {group.name || 'Group'}
                  </Text>
                  <Text style={styles.groupMembersCount}>
                    {group.members?.length || 0} members
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No groups yet</Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('CreateGroup')}
              >
                <Text style={styles.emptyStateButtonText}>Create Group</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recent Activity Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="time-outline" size={20} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('ActivityHistory')}>
              <View style={styles.seeAllContainer}>
                <Text style={styles.seeAllText}>See All</Text>
                <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
              </View>
            </TouchableOpacity>
          </View>
          
          {!activities || activities.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={32} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No recent activity</Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('AddExpense')}
              >
                <Text style={styles.emptyStateButtonText}>Add an Expense</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.activityListContainer}>
              {activities.slice(0, 3).map((activity, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.activityItem}
                  onPress={() => {
                    if (activity.type === 'expense') {
                      navigation.navigate('ExpenseDetail', { id: activity.id });
                    } else if (activity.type === 'settlement') {
                      navigation.navigate('SettlementDetail', { id: activity.id });
                    }
                  }}
                >
                  <View style={[styles.activityIcon, 
                    activity.type === 'settlement' ? styles.settlementIcon : styles.expenseIcon
                  ]}>
                    <Ionicons 
                      name={activity.type === 'settlement' ? "wallet-outline" : "receipt-outline"} 
                      size={16} 
                      color="#FFFFFF" 
                    />
                  </View>
                  <View style={styles.activityDetails}>
                    <Text style={styles.activityTitle} numberOfLines={1}>
                      {activity?.description || (activity.type === 'settlement' ? 'Settlement' : 'Expense')}
                    </Text>
                    <Text style={styles.activityDate}>
                      {activity?.date ? new Date(activity.date).toLocaleDateString() : 'Unknown date'}
                    </Text>
                  </View>
                  <Text style={[styles.activityAmount, 
                    activity.type === 'settlement' ? styles.settlementAmount : 
                    (activity.amount < 0 ? styles.negativeAmount : styles.positiveAmount)
                  ]}>
                    ${Math.abs(activity?.amount || 0).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={18} color="#FFFFFF" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  greetingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  profileImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  fallbackAvatar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackAvatarText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
   
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  positiveBalance: {
    color: '#22C55E',
  },
  negativeBalance: {
    color: '#EF4444',
  },
  balanceDetails: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  balanceColumn: {
    flex: 1,
    alignItems: 'flex-start',
    position: 'relative',
    paddingLeft: 10,
  },
  balanceIndicatorGreen: {
    position: 'absolute',
    left: 0,
    top: 8,
    width: 4,
    height: 16,
    backgroundColor: '#22C55E',
    borderRadius: 2,
  },
  balanceIndicatorRed: {
    position: 'absolute',
    left: 0,
    top: 8,
    width: 4,
    height: 16,
    backgroundColor: '#EF4444',
    borderRadius: 2,
  },
  balanceDetailLabel: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 6,
  },
  balanceDetailAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  addExpenseButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  addExpenseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  seeAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: '#3B82F6',
    marginRight: 4,
  },
  contactsContainer: {
    paddingBottom: 8,
  },
  balanceListContainer: {
    paddingVertical: 8,
  },
  balanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  balanceItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redBorder: {
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  greenBorder: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  balanceNameContainer: {
    justifyContent: 'center',
  },
  balanceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  balanceDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  balanceItemAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  addBalanceButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  addBalanceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  addBalanceText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  contactItem: {
    alignItems: 'center',
    marginRight: 20,
    width: 70,
  },
  contactAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  contactName: {
    fontSize: 14,
    color: '#111827',
    textAlign: 'center',
  },
  addContactButton: {
    alignItems: 'center',
    marginRight: 20,
    width: 70,
  },
  addContactIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  addContactText: {
    fontSize: 14,
    color: '#3B82F6',
    textAlign: 'center',
  },
  groupsContainer: {
    paddingBottom: 8,
  },
  groupItem: {
    alignItems: 'center',
    marginRight: 20,
    width: 100,
  },
  groupAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  groupMembersCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  activityListContainer: {
    marginTop: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityIcon: {
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
  activityDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '600',
  },

  settlementAmount: {
    color: '#3B82F6',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  emptyStateButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    marginHorizontal: 10,
  },
});

export default SplitExpensesScreen;
