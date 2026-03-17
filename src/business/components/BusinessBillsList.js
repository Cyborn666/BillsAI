/**
 * Business Bills List Component
 * Displays business bills using the business bills API
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getBusinessBills, updateBusinessBill } from '../services/businessApiService';
import BillIcon from '../../components/bill/BillIcon';
import theme from '../../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { Swipeable } from 'react-native-gesture-handler';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';


const CACHE_KEY = 'cached_business_bills';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

const BusinessBillsList = ({ filter = {}, searchQuery = '', onBillPress }) => {
  // Maintain compatibility with both filter and filters prop naming
  const filters = React.useMemo(() => filter || {}, [filter]);
  const navigation = useNavigation();
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const lastFetchRef = useRef(0);
  const isMountedRef = useRef(true);
  const filtersRef = useRef(filters);
  // Store refs to all swipeable rows to close them when needed
  const swipeableRowMap = useRef({});

  // Check and load from cache
  const loadFromCache = useCallback(async () => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const now = Date.now();
        // If cache is valid and we have data
        if (now - timestamp < CACHE_EXPIRY && data && data.length > 0) {
          setBills(data);
          setLoading(false);
          return true;
        }
      }
      return false;
    } catch (error) {
      //console.error('Error loading from cache:', error);
      return false;
    }
  }, []);

  // Background refresh without affecting loading state
  const backgroundRefresh = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchRef.current < 10000) { // Throttle to once per 10 seconds
      return;
    }
    try {
      lastFetchRef.current = now;
      const billsData = await getBusinessBills(filtersRef.current);
      if (isMountedRef.current && billsData) {
        setBills(billsData);
        
        // Update cache
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
          data: billsData,
          timestamp: now,
        }));
      }
    } catch (error) {
      //console.error('Background refresh error:', error);
    }
  }, []);

  // Update filtered bills when bills change
  useEffect(() => {
    filterBills();
  }, [bills, filterBills]);

  // Primary fetch function
  const fetchBills = useCallback(async (forceRefresh = false) => {
    try {
      if (!refreshing && !forceRefresh) {
        setLoading(true);
      }
      
      // Try to load from cache first unless force refreshing
      if (!forceRefresh && await loadFromCache()) {
        // Check if cache is getting stale and refresh in background if needed
        const cachedData = await AsyncStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const { timestamp } = JSON.parse(cachedData);
          const now = Date.now();
          if (now - timestamp > (CACHE_EXPIRY * 0.8)) {
            // Refresh in background without waiting
            setTimeout(() => backgroundRefresh(), 100);
          }
        }
        return;
      }
      
      // Cache miss or force refresh - fetch from API
      const now = Date.now();
      if (forceRefresh || now - lastFetchRef.current > 2000) {
        lastFetchRef.current = now;
        // Extract search parameter to handle locally, send the rest to API
        const { search, ...apiFilters } = filtersRef.current;
        const billsData = await getBusinessBills(apiFilters);
        
        if (isMountedRef.current) {
          setBills(billsData || []);
          
          // Update cache
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
            data: billsData,
            timestamp: now,
          }));
        }
      }
    } catch (error) {
      //console.error('Error fetching business bills:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [loadFromCache, refreshing, backgroundRefresh]);

  // Update filters ref when filters change or when searchQuery changes
  useEffect(() => {
    filtersRef.current = filters;
    // Trigger bill filtering when filters or searchQuery change
    filterBills();
  }, [filters, filterBills, searchQuery]);

  // Initial fetch and cleanup
  useEffect(() => {
    isMountedRef.current = true;
    fetchBills();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchBills, filterBills]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isMountedRef.current) {
        fetchBills(true); // Force refresh when screen comes into focus
      }
      return () => {};
    }, [fetchBills])
  );

  // Filter bills based on searchQuery prop or search in filters
  const filterBills = useCallback(() => {
    // Use searchQuery prop if provided, otherwise check filters
    const searchTerm = searchQuery || filtersRef.current.search || '';

    if (!searchTerm || searchTerm.trim() === '') {
      setFilteredBills(bills);
      return;
    }
    
    const query = searchTerm.toLowerCase().trim();
    const filtered = bills.filter(bill => {
      // Search through multiple fields
      return (
        (bill.title && bill.title.toLowerCase().includes(query)) ||
        (bill.name && bill.name.toLowerCase().includes(query)) ||
        (bill.description && bill.description.toLowerCase().includes(query)) ||
        (bill.vendor && bill.vendor.toLowerCase().includes(query)) ||
        (bill.category && bill.category.toLowerCase().includes(query)) ||
        (bill.amount && bill.amount.toString().includes(query))
      );
    });

    setFilteredBills(filtered);
  }, [bills, searchQuery]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBills(true); // Force refresh from API
  };

  const handleBillPress = useCallback((bill) => {
    if (onBillPress) {
      onBillPress(bill);
      return;
    }

    navigation.navigate('BusinessBillDetails', { billId: bill.id });
  }, [navigation, onBillPress]);

  // Mark bill as paid
  const markAsPaid = useCallback(async (bill) => {
    try {
      // Close swipeable if open
      if (swipeableRowMap.current[bill.id]) {
        swipeableRowMap.current[bill.id].close();
      }

      // Update bill status
      await updateBusinessBill(bill.id, {
        ...bill,
        status: 'PAID',
        lastPaidDate: new Date().toISOString(),
      });
      
      // Update bills list
      setBills(prevBills => 
        prevBills.map(b => b.id === bill.id ? {...b, status: 'PAID', lastPaidDate: new Date().toISOString()} : b)
      );

      Alert.alert('Success', 'Bill marked as paid');
    } catch (error) {
      //console.error('Error marking bill as paid:', error);
      Alert.alert('Error', 'Failed to mark bill as paid');
    }
  }, []);

  // Handle reminding about bill
  const remindAboutBill = useCallback((bill) => {
    // This is a placeholder for actual reminder functionality
    if (swipeableRowMap.current[bill.id]) {
      swipeableRowMap.current[bill.id].close();
    }
    Alert.alert('Reminder Set', `You will be reminded about ${bill.title || bill.name || 'this bill'} when it's due`);
  }, []);

  const renderRightActions = useCallback((bill) => {
    // Don't show mark as paid option for already paid bills
    if (bill.status === 'PAID') {
      return (
        <View style={styles.swipeActionsContainer}>
          <TouchableOpacity 
            style={[styles.swipeAction, styles.remindAction]}
            onPress={() => remindAboutBill(bill)}
          >
            <MaterialIcons name="notifications" size={24} color="#FFFFFF" />
            <Text style={styles.swipeActionText}>Remind</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.swipeActionsContainer}>
        <TouchableOpacity 
          style={[styles.swipeAction, styles.paidAction]}
          onPress={() => markAsPaid(bill)}
        >
          <View style={styles.actionIconContainer}>
            <MaterialIcons name="payment" size={26} color="#FFFFFF" />
          </View>
          <Text style={styles.swipeActionText}>Mark Paid</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.swipeAction, styles.remindAction]}
          onPress={() => remindAboutBill(bill)}
        >
          <View style={styles.actionIconContainer}>
            <MaterialIcons name="notifications" size={26} color="#FFFFFF" />
          </View>
          <Text style={styles.swipeActionText}>Remind</Text>
        </TouchableOpacity>
      </View>
    );
  }, [markAsPaid, remindAboutBill]);

  // Render bill item with modern card design
  const renderBillItem = ({ item }) => {
    const dueDate = item.dueDate ? format(new Date(item.dueDate), 'MMM d, yyyy') : 'No due date';
    // Get status color
    const getStatusColor = (status) => {
      switch (status) {
        case 'PAID': return theme.colors.success;
        case 'PARTIALLY_PAID': return theme.colors.warning;
        case 'OVERDUE': return theme.colors.error;
        case 'UNPAID': return theme.colors.error;
        case 'UPCOMING': return theme.colors.businessPrimary;
        default: return theme.colors.gray700;
      }
    };

    // Define color mapping functions for better visual distinction
    const getCategoryColor = (category) => {
      if (!category) { return theme.colors.primary; }
      
      // Convert category string to match expense categories format
      const formattedCategory = category.toUpperCase().replace(/\s/g, '_');
      const colorMap = {
        'Rent': theme.colors.rent || '#4A6FA5',
        'Utilities': theme.colors.utilities || '#6A75CA',
        'Food': theme.colors.food || '#FF8C42',
        'Transport': theme.colors.transport || '#5C946E',
        'Marketing': theme.colors.marketing || '#E16262',
        'Taxes': theme.colors.taxes || '#867AE9',
        'Office': theme.colors.office || '#5E93B5',
        'Professional': theme.colors.professiona || '#35A7FF',
        'Equipment': theme.colors.equipment || '#6E60F9',
        'Insurance': theme.colors.insurance || '#50A2A7',
        'Salary': theme.colors.salary || '#5E7CE2',
      };

      return colorMap[formattedCategory] || theme.colors.businessPrimary;
    };

    // Get badge text based on status
    const getBadgeText = (status) => {
      switch (status) {
        case 'PAID': return 'Paid';
        case 'PARTIALLY_PAID': return 'Partially Paid';
        case 'OVERDUE': return 'Overdue';
        case 'UNPAID': return 'Unpaid';
        case 'UPCOMING': return 'Upcoming';
        default: return status;
      }
    };
    
    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        ref={(ref) => {
          if (ref) { swipeableRowMap.current[item.id] = ref; }
        }}
      >
        <TouchableOpacity
          style={styles.billCard}
          onPress={() => handleBillPress(item)}
          activeOpacity={0.7}
        >
          {/* Top section - title, amount, category */}
          <View style={styles.cardHeader}>
            <View style={styles.leftSection}>
              <View style={styles.iconContainer}>
                <BillIcon
                  billName={item.title || item.name}
                  category={item.category}
                  size={28}
                  showBrandLogo={true}
                />
              </View>
              <View style={styles.billInfo}>
                <Text style={styles.billTitle}>{item.title || item.name || 'Unnamed Bill'}</Text>
                <Text style={styles.dateText}>{dueDate}</Text>
              </View>
            </View>
            <View style={styles.rightSection}>
              <View style={[styles.categoryChip, { backgroundColor: getCategoryColor(item.category) + '15' }]}>
                <Text style={[styles.categoryChipText, { color: getCategoryColor(item.category) }]}>{item.category || 'Uncategorized'}</Text>
              </View>
              <Text style={styles.amountText}>${parseFloat(item.amount).toFixed(2)}</Text>
            </View>
          </View>
          
          {/* Bottom section - vendor and status */}
          <View style={styles.cardFooter}>
            <View style={styles.vendorContainer}>
              <Text style={styles.vendorLabel}>Vendor</Text>
              <Text style={styles.vendorName}>{item.vendor || 'Unknown Vendor'}</Text>
            </View>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
              <Text style={styles.statusLabel}>{getBadgeText(item.status)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.businessPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {bills.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No business bills found</Text>
          <Text style={styles.emptySubText}>Add a new business bill to get started</Text>
        </View>
      ) : filteredBills.length === 0 && filtersRef.current.search ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No matching bills found</Text>
          <Text style={styles.emptySubText}>Try a different search term</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBills}
          renderItem={renderBillItem}
          keyExtractor={(item) => item._id || String(Math.random())}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.businessPrimary]}
              tintColor={theme.colors.businessPrimary}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  listContainer: {
    padding: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.gray100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.gray700,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: theme.colors.gray500,
    textAlign: 'center',
  },
  billCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 12,
    marginBottom: 16,
    shadowColor: '#3867d6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4FD',
  },
  leftSection: {
    flexDirection: 'row',
    flex: 2,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F0F4FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  billInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  billTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },

  dateText: {
    fontSize: 13,
    color: '#757575',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3867d6',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusLabel: {
    fontSize: 13,
    color: '#555555',
    fontWeight: '500',
  },
  cardFooter: {
    padding: 16,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vendorContainer: {
    flex: 1,
  },
  vendorLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    marginBottom: 4,
  },
  vendorName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#424242',
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 15,
    alignSelf: 'flex-end',
  },
  swipeActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  swipeAction: {
    width: 100,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  paidAction: {
    backgroundColor: '#4CAF50',
  },
  remindAction: {
    backgroundColor: '#3867d6',
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: '500',
  },
});


export default BusinessBillsList;