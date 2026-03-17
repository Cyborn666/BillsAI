/**
 * Business Invoice Management Screen
 * Manages all customer invoices for the business
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput
} from 'react-native';
import InvoiceList from '../components/InvoiceList';
import { INVOICE_STATUS } from '../utils/businessConstants';
import theme from '../../styles/theme';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { format } from 'date-fns';


const BusinessInvoiceManagementScreen = ({ navigation }) => {
  const [activeFilters, setActiveFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [forceUpdate, setForceUpdate] = useState(0);

  // Handle adding a new invoice
  const handleAddInvoice = () => {
    navigation.navigate('BusinessImportInvoice');
  };

  // Status tabs data
  const statusTabs = [
    { key: 'all', label: 'All', icon: 'list' },
    { key: 'draft', label: 'Drafts', icon: 'drafts', status: INVOICE_STATUS.DRAFT },
    { key: 'sent', label: 'Sent', icon: 'send', status: INVOICE_STATUS.SENT },
    { key: 'paid', label: 'Paid', icon: 'check-circle', status: INVOICE_STATUS.PAID },
    { key: 'overdue', label: 'Overdue', icon: 'warning', status: INVOICE_STATUS.OVERDUE },
  ];

  // Handle tab selection
  const [selectedTab, setSelectedTab] = useState('all');

  // Debounce search query to avoid excessive API calls
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timerId);
  }, [searchQuery]);

  const selectTab = (tab) => {
    setSelectedTab(tab.key);

    // Update filters based on selected tab
    const newFilters = { ...activeFilters };

    // Remove status filter if exists
    if (newFilters.status) {
      delete newFilters.status;
    }

    // Add status filter if not "all" tab
    if (tab.key !== 'all' && tab.status) {
      newFilters.status = tab.status;
    }

    setActiveFilters(newFilters);
    // Trigger component re-render to refresh list
    setForceUpdate(prev => prev + 1);
  };
  
  // Update filters when search query changes
  useEffect(() => {
    setActiveFilters(prevFilters => {
      const newFilters = { ...prevFilters };

      if (debouncedQuery) {
        newFilters.search = debouncedQuery;
      } else if (newFilters.search) {
        delete newFilters.search;
      }

      return newFilters;
    });
    // Trigger component re-render to refresh list
    setForceUpdate(prev => prev + 1);
  }, [debouncedQuery]);
  
  // Function to refresh data
  const refreshData = useCallback(() => {
    //console.log('Refreshing invoice management data');
    // Trigger component re-render to refresh list
    setForceUpdate(prev => prev + 1);
  }, []);
  
  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshData();
      return () => {
        // Optional cleanup
      };
    }, [refreshData])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Invoices</Text>
        <View style={styles.headerActions}>
          {/* Filter button removed - only search and status tabs are used */}
        </View>
      </View>
      
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#757575" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search invoices..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <MaterialIcons name="cancel" size={16} color="#757575" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Status tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
        >
          {statusTabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                selectedTab === tab.key && styles.selectedTab
              ]}
              onPress={() => selectTab(tab)}
            >
              <MaterialIcons 
                name={tab.icon} 
                size={18} 
                color={selectedTab === tab.key 
                  ? theme.colors.primary 
                  : theme.colors.textSecondary
                } 
              />
              <Text 
                style={[
                  styles.tabLabel,
                  selectedTab === tab.key && styles.selectedTabLabel
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Invoice list */}
      <InvoiceList 
        navigation={navigation}
        initialFilters={activeFilters}
        style={styles.listContainer}
        key={`invoice-list-${forceUpdate}`} // Force re-render when filters change     
      />

      {/* Floating action button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddInvoice}
      >
        <MaterialIcons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 50 : 0,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#212121',
  },
  clearButton: {
    padding: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212121',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: theme.colors.businessPrimary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingHorizontal: 16,
  },
  tabsScrollContent: {
    paddingRight: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 25,
    backgroundColor: '#F5F5F5',
  },
  selectedTab: {
    backgroundColor: '#E3F2FD',
  },
  tabLabel: {
    fontSize: 15,
    color: '#757575',
    marginLeft: 8,
    fontWeight: '500',
  },
  selectedTabLabel: {
    color: '#3867d6',
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3867d6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#3867d6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 999,
  },
});

export default BusinessInvoiceManagementScreen;
