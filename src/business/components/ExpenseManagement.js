/**
 * ExpenseManagement Component
 * Handles displaying and managing business expenses
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { getBusinessExpenses } from '../services/businessApiService';
import { EXPENSE_CATEGORIES } from '../utils/businessConstants';
import theme from '../../styles/theme';
import { format } from 'date-fns';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// Leveraging existing BillIcon component for expense categories
import BillIcon from '../../components/bill/BillIcon';

const ExpenseManagement = ({ navigation, initialFilters = {}, style = {} }) => {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(initialFilters);
  const [refreshing, setRefreshing] = useState(false);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      // Extract search query from filters to handle it locally
      const { search, ...apiFilters } = filters;
      const expenseData = await getBusinessExpenses(apiFilters);
      setExpenses(expenseData || []);
    } catch (error) {
      //console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  // Filter expenses when search query or expenses change
  const filterExpenses = useCallback(() => {
    // Extract search query from filters
    const { search } = filters;
    
    if (!search || search.trim() === '') {
      setFilteredExpenses(expenses);
      return;
    }
    
    const query = search.toLowerCase().trim();
    const filtered = expenses.filter(expense => {
      // Search through multiple fields
      return (
        (expense.title && expense.title.toLowerCase().includes(query)) ||
        (expense.description && expense.description.toLowerCase().includes(query)) ||
        (expense.merchant && expense.merchant.toLowerCase().includes(query)) ||
        (expense.category && expense.category.toLowerCase().includes(query)) ||
        (expense.notes && expense.notes.toLowerCase().includes(query)) ||
        (expense.amount && expense.amount.toString().includes(query))
      );
    });
    
    setFilteredExpenses(filtered);
  }, [expenses, filters]);

  // Use useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      
      const loadData = async () => {
        if (isActive) {
          await fetchExpenses();
        }
      };
      
      loadData();
      
      return () => {
        isActive = false;
      };
    }, [fetchExpenses])
  );
  
  
  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  useEffect(() => {
    filterExpenses();
  }, [filterExpenses, expenses, filters]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
  };

  // Convert expense category to bill category for icon display
  const mapToBillCategory = (expenseCategory) => {
    const categoryMap = {
      [EXPENSE_CATEGORIES.RENT]: 'RENT',
      [EXPENSE_CATEGORIES.UTILITIES]: 'UTILITIES',
      [EXPENSE_CATEGORIES.INSURANCE]: 'INSURANCE',
      // Default to OTHER for remaining categories
    };
    return categoryMap[expenseCategory] || 'OTHER';
  };

  // Define color mapping functions for better visual distinction
  const getCategoryColor = (category) => {
    const colorMap = {
      [EXPENSE_CATEGORIES.RENT]: theme.colors.rent || '#4A6FA5',
      [EXPENSE_CATEGORIES.UTILITIES]: theme.colors.utilities || '#6A75CA',
      [EXPENSE_CATEGORIES.FOOD]: theme.colors.food || '#FF8C42',
      [EXPENSE_CATEGORIES.TRANSPORT]: theme.colors.transport || '#5C946E',
      [EXPENSE_CATEGORIES.MARKETING]: theme.colors.marketing || '#E16262',
      [EXPENSE_CATEGORIES.TAXES]: theme.colors.taxes || '#867AE9',
      [EXPENSE_CATEGORIES.OFFICE_SUPPLIES]: theme.colors.office || '#5E93B5',
      [EXPENSE_CATEGORIES.PROFESSIONAL_SERVICES]: theme.colors.professional || '#35A7FF',
      [EXPENSE_CATEGORIES.EQUIPMENT]: theme.colors.equipment || '#6E60F9',
      [EXPENSE_CATEGORIES.INSURANCE]: theme.colors.insurance || '#50A2A7',
      [EXPENSE_CATEGORIES.SALARY]: theme.colors.salary || '#5E7CE2',
    };

    return colorMap[category] || '#3867d6';
  };
  
  // Get lighter version of the category color for backgrounds
  const getCategoryColorLight = (category) => {
    return getCategoryColor(category) + '15'; // 15 is hex for 10% opacity
  };

  const renderExpenseItem = ({ item }) => {
    const expenseDate = new Date(item.date);
    const billCategory = mapToBillCategory(item.category);
    const categoryColor = getCategoryColor(billCategory);
    const categoryLightColor = getCategoryColorLight(billCategory);
    
    return (
      <TouchableOpacity 
        style={styles.cardContainer}
        onPress={() => navigation.navigate('BusinessExpenseDetails', { expenseId: item.id })}
        activeOpacity={0.6}
      >
        {/* Header row with title and date */}
        <View style={styles.headerRow}>
          {/* Left: Icon and title inline */}
          <View style={styles.titleContainer}>
            <View style={[styles.iconContainer, { backgroundColor: categoryLightColor }]}>
              <BillIcon
                billName={item.category}
                category={billCategory}
                size={26}
                color={categoryColor}
              />
            </View>
            <View style={styles.titleDateContainer}>
              <Text style={styles.expenseTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.dateText}>{format(expenseDate, 'MMM d, yyyy')}</Text>
              {item.vendor && (
                <Text style={styles.vendorText}>{item.vendor}</Text>
              )}
            </View>
          </View>
          
          {/* Right: Category and amount */}
          <View style={styles.rightContainer}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{item.category.replace(/_/g, ' ')}</Text>
            </View>
            <Text style={styles.amountText}>${item.amount.toFixed(2)}</Text>
            {item.recurring && (
              <View style={styles.recurringBadge}>
                <MaterialIcons name="repeat" size={12} color="#3867d6" />
                <Text style={styles.recurringText}>Recurring</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Notes section in footer if present */}
        {item.notes && (
          <View style={styles.notesRow}>
            <MaterialIcons name="comment" size={12} color="#757575" style={styles.notesIcon} />
            <Text style={styles.notesPreview} numberOfLines={2}>{item.notes}</Text>
          </View>
        )}


        {/* Action buttons */}
        <View style={styles.actionRow}>

          {item.receiptImage && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                navigation.navigate('BusinessViewReceipt', { expenseId: item.id });
              }}
            >
              <MaterialIcons name="receipt" size={16} color="#3867d6" />
              <Text style={styles.buttonText}>Receipt</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  


  const renderFilterTags = () => {
    if (Object.keys(filters).length === 0) return null;
    
    return (
      <View style={styles.filtersContainer}>
        <Text style={styles.filtersLabel}>Filters:</Text>
        <View style={styles.filterTags}>
          {Object.entries(filters).map(([key, value]) => (
            <View key={key} style={styles.filterTag}>
              <Text style={styles.filterTagText}>{key}: {value}</Text>
              <TouchableOpacity
                onPress={() => {
                  const newFilters = { ...filters };
                  delete newFilters[key];
                  setFilters(newFilters);
                }}
              >
                <MaterialIcons name="close" size={14} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
        
        <TouchableOpacity
          style={styles.clearFiltersButton}
          onPress={() => setFilters({})}
        >
          <Text style={styles.clearFiltersText}>Clear All</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Don't need this duplicate check since we're using ListEmptyComponent

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, style]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading expenses...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {renderFilterTags()}
      
      <FlatList
        data={filteredExpenses}
        renderItem={renderExpenseItem}
        keyExtractor={item => item.id || item._id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="receipt-long" size={48} color={theme.colors.textDisabled} />
            <Text style={styles.emptyText}>
              {filters.search 
                ? 'No expenses match your search' 
                : Object.keys(filters).length > 0 
                  ? 'Try clearing some filters' 
                  : 'Add your first business expense to get started'}
            </Text>
          </View>
        }
        contentContainerStyle={filteredExpenses.length === 0 ? styles.emptyListContent : styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 8,
    color: theme.colors.textSecondary,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginVertical: 8,
    marginHorizontal: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F5F5F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  rightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },


  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  categoryChip: {
    backgroundColor: '#EDF1FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  categoryText: {
    fontSize: 10,
    color: '#3867d6',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },

  dateText: {
    fontSize: 13,
    color: '#757575',
    marginTop: 2,
    marginBottom: 2,
  },
  vendorText: {
    fontSize: 13,
    color: '#757575',
    marginTop: 1,
  },

  amountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3867d6',
    letterSpacing: -0.3,
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6EDFF',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 6,
  },
  recurringText: {
    fontSize: 11,
    color: '#3867d6',
    marginLeft: 2,
    fontWeight: '500',
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    paddingHorizontal: 2,
  },
  notesIcon: {
    marginRight: 4,
  },
  notesPreview: {
    fontSize: 13,
    color: '#757575',
    flex: 1,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
   
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#F0F4FD',
    marginRight: 8,
  },
  buttonText: {
    fontSize: 13,
    marginLeft: 4,
    color: '#3867d6',
    fontWeight: '500',
  },
  disabledText: {
    color: theme.colors.textDisabled,
  },
  filtersContainer: {
    backgroundColor: theme.colors.cardBackground,
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
  },
  filtersLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  filterTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  filterTagText: {
    fontSize: 12,
    color: theme.colors.text,
    marginRight: 4,
  },
  clearFiltersButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  clearFiltersText: {
    fontSize: 12,
    color: theme.colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default ExpenseManagement;
