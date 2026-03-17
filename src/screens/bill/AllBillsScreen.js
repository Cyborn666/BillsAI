/**
 * All Bills Screen for BillsAI app
 * Displays all bills with filtering and sorting options
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import theme from '../../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import * as billService from '../../services/billService';
import userService from '../../services/userService';
import BillIcon from '../../components/bill/BillIcon';

const AllBillsScreen = ({ navigation, route }) => {

  // Mock data for bills
  const [bills, setBills] = useState([]);
  const [currencyPreference, setCurrencyPreference] = useState('USD ($)');


  // Helper function to format date from ISO string to MM/DD/YYYY
  const formatDate = (isoDateString) => {
    const date = new Date(isoDateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  // Helper function to format currency - defined outside fetch to have access to current state
  // Extract currency symbol from preference string
  const getCurrencySymbol = (preference) => {
    const symbolMatch = preference.match(/\(([^)]+)\)/);
    return symbolMatch ? symbolMatch[1] : '$';
  };

  // Format amount with currency symbol - using useCallback to maintain reference
  const formatCurrency = useCallback((amount) => {
    const symbol = getCurrencySymbol(currencyPreference);
    return `${symbol}${parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }, [currencyPreference]);

  // Function to fetch bills data - wrapped in useCallback to maintain reference stability
  const fetchBills = useCallback(async () => {
    try {
      const response = await billService.getBills();
      ////console.log('response', response);

      // Check if the data has the bills array and pagination structure
      if (response.bills && Array.isArray(response.bills)) {
        const fetchedBills = response.bills;
        ////console.log('Fetched bills:', fetchedBills);

        // Helper function to determine bill status based on due date
        const calculateStatus = (dueDate, originalStatus) => {
          // If already paid, keep it paid
          if (originalStatus && originalStatus.toUpperCase() === 'PAID') {
            return 'PAID';
          }

          const today = new Date();
          const billDueDate = new Date(dueDate);

          // If due date is in the past, it's overdue
          if (billDueDate < today) {
            return 'OVERDUE';
          }

          // If due date is within the next 30 days, it's upcoming
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(today.getDate() + 30);
          if (billDueDate <= thirtyDaysFromNow) {
            return 'UPCOMING';
          }

          // Otherwise, it's just unpaid
          return 'UNPAID';
        };

        // Map the API response data to the expected format for the UI
        const formattedBills = fetchedBills.map(bill => {
          // Calculate status based on due date
          const calculatedStatus = calculateStatus(bill.dueDate, bill.status);
          ////console.log('Processing bill:', bill.title, 'original status:', bill.status, 'calculated status:', calculatedStatus);

          return {
            id: bill._id,
            name: bill.title, // API returns 'title' instead of 'name'
            dueDate: formatDate(bill.dueDate),
            amount: formatCurrency(bill.amount),
            status: calculatedStatus, // Use the calculated status
            category: bill.category,
            isRecurring: bill.isRecurring,
            recurringPeriod: bill.recurringPeriod,
            description: bill.description || '',
            isShared: bill.isShared,
          };
        });

        setBills(formattedBills);
      } else {
        ////console.error('Unexpected API response format:', response);
        setBills([]);
      }
    } catch (error) {
      ////console.error('Error fetching bills:', error);
    }
  }, [formatCurrency]);

  // Set up data loading and listeners
  useEffect(() => {
    // Initial data load
    fetchBills();

    // Add listener for when the screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      ////console.log('AllBillsScreen is focused, reloading data...');
      fetchBills();
    });

    // Subscribe to data updates from billService
    const dataUpdateUnsubscribe = billService.subscribeToDataUpdates(() => {
      ////console.log('Data update received, reloading bills data...');
      fetchBills();
    });

    // Clean up the listeners when component unmounts
    return () => {
      unsubscribe();
      dataUpdateUnsubscribe();
    };
  }, [navigation, fetchBills]);

  // State for filter and sort options
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('DUE_DATE');

  // Calculate bill counts for each status (case-insensitive)
  const getBillCounts = () => {
    const counts = {
      total: bills.length,
      upcoming: bills.filter(bill => bill.status && bill.status.toUpperCase() === 'UPCOMING').length,
      overdue: bills.filter(bill => bill.status && bill.status.toUpperCase() === 'OVERDUE').length,
      paid: bills.filter(bill => bill.status && bill.status.toUpperCase() === 'PAID').length,
    };
    return counts;
  };

  // Filter options with dynamic counts
  const filters = [
    { id: 'ALL', label: 'All', count: getBillCounts().total },
    { id: 'UPCOMING', label: 'Upcoming', count: getBillCounts().upcoming },
    { id: 'OVERDUE', label: 'Overdue', count: getBillCounts().overdue },
    { id: 'PAID', label: 'Paid', count: getBillCounts().paid },

  ];

  // Handle back button press
  const handleBack = () => {
    navigation.goBack();
  };

  // Handle bill item press
  const handleBillPress = (bill) => {
    // Navigate to bill details screen
    navigation.navigate('BillDetails', { billId: bill.id });
  };

  // Handle add new bill button press
  const handleAddNewBill = () => {
    navigation.navigate('AddBill');
  };

  // In each screen's useEffect
useEffect(() => {
  const loadUserPreferences = async () => {
    try {
      const prefs = await userService.getUserPreferences();
      setCurrencyPreference(prefs.currency || 'USD ($)');
    } catch (error) {
      ////console.error('Error loading preferences:', error);
      setCurrencyPreference('USD ($)'); // Default fallback
    }
  };
  loadUserPreferences();
}, []);

// Refresh bills when currency preference changes
useEffect(() => {
  fetchBills();
}, [fetchBills, currencyPreference]);




  // Apply filters to bills (case-insensitive)
  const getFilteredBills = () => {
    if (activeFilter === 'ALL') {return bills;}

    // More detailed logging for debugging
    ////console.log('Filter criteria:', activeFilter);
    ////console.log('All bills with status details:');
    bills.forEach(bill => {
      ////console.log(`Bill: ${bill.name}, Status: '${bill.status}', Uppercase status: '${bill.status ? bill.status.toUpperCase() : 'undefined'}', Matches filter: ${bill.status && bill.status.toUpperCase() === activeFilter.toUpperCase()}`);
    });

    return bills.filter(bill => bill.status && bill.status.toUpperCase() === activeFilter.toUpperCase());
  };

  // Debug function - log filtered bills when filter changes
 /* useEffect(() => {
    ////console.log('Active filter:', activeFilter);
    ////console.log('Filtered bills:', getFilteredBills());
  }, [activeFilter, bills]);*/

  // Apply sorting to bills
  const getSortedBills = (filteredBills) => {
    switch (sortBy) {
      case 'DUE_DATE':
        return [...filteredBills].sort((a, b) => {
          const dateA = new Date(a.dueDate);
          const dateB = new Date(b.dueDate);
          return dateA - dateB;
        });
      case 'AMOUNT':
        return [...filteredBills].sort((a, b) => {
          const amountA = parseFloat(a.amount.replace('$', '').replace(',', ''));
          const amountB = parseFloat(b.amount.replace('$', '').replace(',', ''));
          return amountB - amountA;
        });
      case 'NAME':
        return [...filteredBills].sort((a, b) => a.name.localeCompare(b.name));
      default:
        return filteredBills;
    }
  };

  // Get status color based on bill status
  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID':
        return theme.colors.success;
      case 'OVERDUE':
        return theme.colors.error;
      case 'UPCOMING':
        return theme.colors.info;
      case 'PARTIALLY_PAID':
        return theme.colors.warning;
      default:
        return theme.colors.gray600;
    }
  };

  // Render bill item
  const renderBillItem = ({ item }) => (
    <TouchableOpacity
      style={styles.billItem}
      onPress={() => handleBillPress(item)}
    >
      <View style={styles.billItemMain}>
        <View style={styles.billNameContainer}>
          <BillIcon
            billName={item.name}
            category={item.category}
            size={32}
            showBrandLogo={true}
            style={styles.billIcon}
          />
          <Text style={styles.billName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
          {item.isShared && (
            <Icon name="people" size={16} color={theme.colors.black} style={styles.shareIcon} />
          )}
        </View>
      </View>
      <View style={styles.amountContainer}>
        <Text style={styles.amountLabel}>Amount:</Text>
        <Text style={styles.billAmount}>{item.amount}</Text>
      </View>
      <View style={styles.billItemDetails}>
        <Text style={styles.billDueDate}>Due: {item.dueDate}</Text>
        <View style={styles.billStatusContainer}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          />
          <Text style={styles.billStatus}>{item.status.charAt(0) + item.status.slice(1).toLowerCase()}</Text>
        </View>
      </View>
      <View style={styles.categoryTag}>
        <Text style={styles.categoryText}>
          {item.category.charAt(0) + item.category.slice(1).toLowerCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Render filter buttons with counts
  const renderFilterButtons = () => {
    // Get fresh counts each time filters are rendered
    const counts = getBillCounts();

    return (
      <View style={styles.filterContainer}>
        {filters.map(filter => {
          // Get the appropriate count based on filter ID
          let count = 0;
          switch (filter.id) {
            case 'ALL': count = counts.total; break;
            case 'UPCOMING': count = counts.upcoming; break;
            case 'OVERDUE': count = counts.overdue; break;
            case 'PAID': count = counts.paid; break;
            default: count = 0;
          }

          return (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterButton,
                activeFilter === filter.id && styles.activeFilterButton,
              ]}
              onPress={() => setActiveFilter(filter.id)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  activeFilter === filter.id && styles.activeFilterButtonText,
                ]}
              >
                {filter.label}
                <Text style={styles.countText}> ({count})</Text>
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Render sort dropdown
  const renderSortOptions = () => (
    <View style={styles.sortContainer}>
      <Text style={styles.sortLabel}>Sort by:</Text>
      <TouchableOpacity
        style={styles.sortButton}
        onPress={() => {
          // Toggle through sort options
          const options = ['DUE_DATE', 'AMOUNT', 'NAME'];
          const currentIndex = options.indexOf(sortBy);
          const nextIndex = (currentIndex + 1) % options.length;
          setSortBy(options[nextIndex]);
        }}
      >
        <Text style={styles.sortButtonText}>
          {sortBy === 'DUE_DATE' ? 'Due Date' : sortBy === 'AMOUNT' ? 'Amount' : 'Name'}
        </Text>
        <Icon name="chevron-down" size={16} color={theme.colors.black} />
      </TouchableOpacity>
    </View>
  );

  // Get filtered and sorted bills
  const filteredBills = getFilteredBills();
  const sortedBills = getSortedBills(filteredBills);

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'android' && styles.androidSafeArea]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Empty view for spacing */}
        </View>
        <Text style={styles.headerTitle}>All Bills</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleAddNewBill} style={styles.addButton}>
            <Icon name="add" size={24} color={theme.colors.black} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters and Sort */}
      <View style={styles.controlsContainer}>
        {renderFilterButtons()}
        {renderSortOptions()}
      </View>

      {/* Bills List */}
      <FlatList
        data={sortedBills}
        renderItem={renderBillItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No bills found</Text>
            <TouchableOpacity
              style={styles.addNewBillButton}
              onPress={handleAddNewBill}
            >
              <Text style={styles.addNewBillButtonText}>Add New Bill</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  androidSafeArea: {
    paddingTop: StatusBar.currentHeight || 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
  },
  headerTitle: {
    fontSize: theme.typography.fontSizes.large,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.black,
    letterSpacing: 0.3,
    textAlign: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  addButton: {
    padding: theme.spacing.xs,
  },
  headerLeft: {
    width: 40,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.small,
    backgroundColor: theme.colors.gray100,
  },
  activeFilterButton: {
    backgroundColor: theme.colors.black,
  },
  filterButtonText: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.gray800,
  },
  activeFilterButtonText: {
    color: theme.colors.white,
  },
  countText: {
    fontSize: theme.typography.fontSizes.small,
    fontWeight: theme.typography.fontWeights.normal,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortLabel: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.gray700,
    marginRight: theme.spacing.xs,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.small,
    backgroundColor: theme.colors.gray100,
  },
  sortButtonText: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.black,
    marginRight: theme.spacing.xs,
  },
  listContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  billItem: {
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    position: 'relative',

  },
  billItemMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  billItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billName: {
    fontSize: theme.typography.fontSizes.medium,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.black,
    flexDirection: 'column',
    paddingLeft: theme.spacing.sm,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  amountLabel: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.gray700,
    marginRight: theme.spacing.xs,
  },
  billAmount: {
    fontSize: theme.typography.fontSizes.medium,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.primary,
  },
  billDueDate: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.gray700,
  },
  billStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.xs,
  },
  billStatus: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.gray700,
  },
  categoryTag: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: theme.colors.black,
    paddingVertical: 2,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 10,
    color: theme.colors.white,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.fontSizes.medium,
    color: theme.colors.gray600,
    marginBottom: theme.spacing.md,
  },
  addNewBillButton: {
    backgroundColor: theme.colors.black,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
  },
  addNewBillButtonText: {
    fontSize: theme.typography.fontSizes.medium,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.white,
  },
  shareIcon: {
    marginLeft: 6,
  },
  billNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billIcon: {
    marginRight: theme.spacing.xs,
  },
});

export default AllBillsScreen;
