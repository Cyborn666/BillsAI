/**
 * Business Expense Management Screen
 * Manages all business expenses and bills
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  TextInput,
} from 'react-native';
import ExpenseManagement from '../components/ExpenseManagement';
// Use direct color values instead of theme for consistency with dashboard
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';


// Leverage existing bill components from the app
import BusinessBillsList from '../components/BusinessBillsList';

const BusinessExpenseManagementScreen = ({ navigation }) => {
  // State for filters, active tab, and search
  const [activeFilters, setActiveFilters] = useState({});
  const [activeTab, setActiveTab] = useState('expenses');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter handling - only using clearFilters for now
  // eslint-disable-next-line no-unused-vars
  const handleApplyFilter = (key, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setActiveFilters({});
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.headerPadding} />
      {/* Custom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'expenses' && styles.activeTabButton]}
          onPress={() => setActiveTab('expenses')}
        >
          <MaterialIcons
            name="receipt"
            size={20}
            color={activeTab === 'expenses' ? '#3867d6' : '#757575'}
          />
          <Text style={[styles.tabText, activeTab === 'expenses' && styles.activeTabText]}>
            Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'bills' && styles.activeTabButton]}
          onPress={() => setActiveTab('bills')}
        >
          <MaterialIcons
            name="description"
            size={20}
            color={activeTab === 'bills' ? '#3867d6' : '#757575'}
          />
          <Text style={[styles.tabText, activeTab === 'bills' && styles.activeTabText]}>
            Bills
          </Text>
        </TouchableOpacity>
      </View>
      {/* Search and filter bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#9E9E9E" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'expenses' ? 'Search expenses...' : 'Search bills...'}
            placeholderTextColor="#9E9E9E"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <MaterialIcons name="close" size={18} color="#9E9E9E" />
            </TouchableOpacity>
          ) : null}
        </View>
        
      {/* <TouchableOpacity
          style={styles.filterButton}
          onPress={() => navigation.navigate('BusinessFilterExpenses', {
            currentFilters: activeFilters,
            onApplyFilters: (filters) => setActiveFilters(filters),
          })}
        >
          <MaterialIcons
            name="filter-list"
            size={22}
            color={Object.keys(activeFilters).length > 0
              ? '#3867d6'
              : '#757575'
            }
          />
        </TouchableOpacity> */}
      </View>

      {/* Active filters display */}
      {Object.keys(activeFilters).length > 0 && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.filtersLabel}>Active Filters:</Text>
          <View style={styles.filterTags}>
            {Object.entries(activeFilters).map(([key, value]) => (
              <View key={key} style={styles.filterTag}>
                <Text style={styles.filterTagText}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}: {value}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const newFilters = { ...activeFilters };
                    delete newFilters[key];
                    setActiveFilters(newFilters);
                  }}
                  style={styles.removeFilterButton}
                >
                  <MaterialIcons name="close" size={16} color="#757575" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={clearFilters}
            >
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'expenses' ? (
          <ExpenseManagement
            navigation={navigation}
            initialFilters={{
              ...activeFilters,
              ...(searchQuery ? { search: searchQuery } : {})
            }}
          />
        ) : (
          <BusinessBillsList
            filter={{ isBusiness: true }}
            searchQuery={searchQuery}
            onBillPress={(bill) => navigation.navigate('BusinessBillDetails', { billId: bill.id })}
          />
        )}
      </View>

      {/* Floating action button to add expense/bill */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate(activeTab === 'expenses' ? 'BusinessAddExpense' : 'BusinessAddBill')}
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
  },
  headerPadding: {
    height: Platform.OS === 'ios' ? 50 : 20,
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3867d6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeFiltersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  filtersLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#757575',
    marginBottom: 8,
  },
  filterTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  filterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  filterTagText: {
    fontSize: 12,
    color: '#333333',
    marginRight: 4,
  },
  removeFilterButton: {
    padding: 2,
  },
  clearFiltersButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#3867d6',
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 32,
    justifyContent: 'center',
    elevation: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTabButton: {
    borderBottomColor: '#3867d6',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '500',
    color: '#757575',
  },
  activeTabText: {
    color: '#3867d6',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3867d6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    zIndex: 100,
  },


  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    marginBottom: 6,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: '#212121',
  },
  clearButton: {
    padding: 4,
  },
});

export default BusinessExpenseManagementScreen;
