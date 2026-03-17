/**
 * InvoiceList Component
 * Displays a list of business invoices with filtering capabilities
 * Includes swipeable actions to update invoice status
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getBusinessInvoices, updateInvoiceStatus, deleteBusinessInvoice } from '../services/businessApiService';
import { INVOICE_STATUS } from '../utils/businessConstants';
import theme from '../../styles/theme';
import { format } from 'date-fns';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Swipeable } from 'react-native-gesture-handler';

const InvoiceList = ({ navigation, initialFilters = {}, style = {} }) => {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(initialFilters);
  const [refreshing, setRefreshing] = useState(false);
  
  // Create a map to store refs for all swipeable rows
  const swipeableRowMap = useRef({});

  const fetchInvoices = useCallback(async () => {
    try {
      // Only pass status filter to backend, all other filtering is done frontend
      const backendFilters = {};
      if (filters.status) {
        backendFilters.status = filters.status;
      }
      const invoiceData = await getBusinessInvoices(backendFilters);
      setInvoices(invoiceData || []);
    } catch (error) {
      //console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters.status]); // Only depend on status filter

  // Use only useFocusEffect to fetch data when the screen is focused
  // This prevents redundant API calls that would happen with separate useEffect
  useFocusEffect(
    useCallback(() => {
      fetchInvoices();
      return () => {};
    }, [fetchInvoices])
  );

  // Apply frontend search filtering
  useEffect(() => {
    if (!invoices || invoices.length === 0) {
      setFilteredInvoices([]);
      return;
    }
    
    let results = [...invoices];
    
    // Apply search filter if present
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      results = results.filter(invoice => {
        // Search across multiple fields
        return (
          (invoice.invoiceNumber && invoice.invoiceNumber.toLowerCase().includes(searchTerm)) ||
          (invoice.client?.name && invoice.client.name.toLowerCase().includes(searchTerm)) ||
          (invoice.client?.email && invoice.client.email.toLowerCase().includes(searchTerm)) ||
          (invoice.notes && invoice.notes.toLowerCase().includes(searchTerm)) ||
          // Search in items
          (invoice.items && invoice.items.some(item => 
            item.description && item.description.toLowerCase().includes(searchTerm)
          ))
        );
      });
    }
    
    setFilteredInvoices(results);
  }, [invoices, filters.search]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case INVOICE_STATUS.PAID:
        return theme.colors.success;
      case INVOICE_STATUS.PARTIAL:
        return theme.colors.warning;
      case INVOICE_STATUS.OVERDUE:
        return theme.colors.error;
      case INVOICE_STATUS.SENT:
        return theme.colors.primary;
      case INVOICE_STATUS.DRAFT:
        return theme.colors.textSecondary;
      case INVOICE_STATUS.CANCELLED:
        return theme.colors.textDisabled;
      default:
        return theme.colors.text;
    }
  };

  const getCategoryColorLight = (status) => {
    // Return explicit light background colors for each status
    switch (status) {
      case INVOICE_STATUS.PAID:
        return '#e6f7ed'; // Light green
      case INVOICE_STATUS.PARTIAL:
        return '#fef4e6'; // Light orange/yellow
      case INVOICE_STATUS.OVERDUE:
        return '#fce8e8'; // Light red 
      case INVOICE_STATUS.SENT:
        return '#e6f0f9'; // Light blue
      case INVOICE_STATUS.DRAFT:
        return '#f0f0f0'; // Light gray
      case INVOICE_STATUS.CANCELLED:
        return '#ebebeb'; // Very light gray
      default:
        return '#f5f5f5'; // Default light gray
    }
  };


  // Update invoice status 
  const handleUpdateStatus = async (invoice, newStatus) => {
    try {
      // Close the swipeable after action is taken
      if (swipeableRowMap.current[invoice.id]) {
        swipeableRowMap.current[invoice.id].close();
      }
      if (invoice.status === newStatus) {
        return; // No change needed
      }

      // First update local state for immediate UI response
      const updatedInvoices = invoices.map(inv => {
        if (inv.id === invoice.id) {
          return { ...inv, status: newStatus };
        }
        return inv;
      });
      
      setInvoices(updatedInvoices);
      
      // Then try to update in backend
      try {
        // Use the new specialized status update function (uses PATCH)
        await updateInvoiceStatus(invoice.id, newStatus);
        
        // Show success message
        Alert.alert(
          'Status Updated',
          `Invoice #${invoice.invoiceNumber} status updated to ${newStatus}`,
          [{ text: 'OK' }],
          { cancelable: true }
        );
      } catch (apiError) {
        //console.error('Error updating invoice status in API:', apiError);
        // Don't show error to user, as the UI already updated
        // Just log it for debugging
      }
    } catch (error) {
      //console.error('Error handling status update:', error);
      Alert.alert(
        'Update Failed',
        'Could not update invoice status. Please try again later.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle invoice deletion
  const handleDeleteInvoice = async (invoice) => {
    try {
      // Close the swipeable after action is taken
      if (swipeableRowMap.current[invoice.id]) {
        swipeableRowMap.current[invoice.id].close();
      }
      
      // Show confirmation alert before deleting
      Alert.alert(
        'Delete Invoice',
        `Are you sure you want to delete invoice #${invoice.invoiceNumber}? This action cannot be undone.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                // Delete from backend
                await deleteBusinessInvoice(invoice.id);
                
                // Update local state by removing the deleted invoice
                const updatedInvoices = invoices.filter(inv => inv.id !== invoice.id);
                setInvoices(updatedInvoices);
                
                // Show success message
                Alert.alert(
                  'Success',
                  `Invoice #${invoice.invoiceNumber} has been deleted`,
                  [{ text: 'OK' }],
                  { cancelable: true }
                );
              } catch (error) {
                //console.error('Error deleting invoice:', error);
                Alert.alert(
                  'Error',
                  'Failed to delete the invoice. Please try again.',
                  [{ text: 'OK' }]
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      //console.error('Error handling invoice deletion:', error);
    }
  };
  
  // Render left swipe actions (delete)
  const renderLeftActions = (invoice) => {
    return (
      <TouchableOpacity
        style={[styles.swipeAction, { backgroundColor: '#FF3B30', width: 90 }]}
        onPress={() => handleDeleteInvoice(invoice)}
        activeOpacity={0.8}
      >
        <MaterialIcons name="delete" size={26} color="#fff" />
        <Text style={styles.swipeActionText}>DELETE</Text>
      </TouchableOpacity>
    );
  };
  
  // Render right swipe actions (status update options)
  const renderRightActions = (invoice) => {
    // Create an array of status options to show (max 2 for better UI)
    const statusOptions = [];
    
    // Prioritize the most relevant actions based on current status
    if (invoice.status !== INVOICE_STATUS.PAID) {
      statusOptions.push({
        status: INVOICE_STATUS.PAID,
        icon: 'check-circle',
        backgroundColor: '#34c759', // iOS green color for better visibility
        label: 'PAID',
      });
    }
    if (invoice.status !== INVOICE_STATUS.SENT && statusOptions.length < 2) {
      statusOptions.push({
        status: INVOICE_STATUS.SENT,
        icon: 'send',
        backgroundColor: '#007bff', // Bright blue for better visibility
        label: 'SENT',
      });
    }
    if (invoice.status !== INVOICE_STATUS.DRAFT && statusOptions.length < 2) {
      statusOptions.push({
        status: INVOICE_STATUS.DRAFT,
        icon: 'drafts',
        backgroundColor: '#8e8e93', // iOS gray for draft
        label: 'DRAFT',
      });
    }

    return (
      <View style={styles.swipeActionsContainer}>
        {statusOptions.map(option => (
          <TouchableOpacity
            key={option.status}
            style={[styles.swipeAction, { backgroundColor: option.backgroundColor }]}
            onPress={() => handleUpdateStatus(invoice, option.status)}
            activeOpacity={0.8}
          >
            <MaterialIcons name={option.icon} size={26} color="#fff" />
            <Text style={styles.swipeActionText}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderInvoiceItem = ({ item }) => {
    // Handle both the old and new schema field names for dates
    const issuedDate = new Date(item.issueDate || item.issuedDate || Date.now());
    const dueDate = new Date(item.dueDate || Date.now());
    const statusColor = getStatusColor(item.status);
    const statusColorWithOpacity = getCategoryColorLight(item.status);

    
    return (
      <Swipeable
        ref={(ref) => {
          if (ref) {
            swipeableRowMap.current[item.id] = ref;
          }
        }}
        renderRightActions={() => renderRightActions(item)}
        renderLeftActions={() => renderLeftActions(item)}
        overshootRight={false}
        overshootLeft={false}
      >
        <TouchableOpacity 
          style={styles.invoiceItem}
          onPress={() => navigation.navigate('BusinessInvoiceDetails', { invoiceId: item.id })}
        >
        <View style={styles.invoiceHeader}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <MaterialIcons name="description" size={24} color={theme.colors.primary} style={{marginRight: 8}} />
            <Text style={styles.clientName}>{item.client?.name || 'No Client'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getCategoryColorLight(item.status) }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <Text style={styles.invoiceNumber}>Invoice {item.invoiceNumber}</Text>
        
        <View style={styles.invoiceDetails}>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.amountText}>${(item.total || item.totalAmount || 0).toFixed(2)}</Text>
          </View>
          
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Issued</Text>
            <Text style={styles.detailValue}>{format(issuedDate, 'MMM d, yyyy')}</Text>
          </View>
          
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Due</Text>
            <Text 
              style={[
                styles.detailValue, 
                item.status === INVOICE_STATUS.OVERDUE && styles.overdueText
              ]}
            >
              {format(dueDate, 'MMM d, yyyy')}
            </Text>
          </View>
        </View>
        
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('BusinessInvoiceEdit', { invoiceId: item.id })}
          >
            <MaterialIcons name="edit" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          
       {/*  <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('BusinessInvoiceShare', { invoiceId: item.id })}
          >
            <MaterialIcons name="share" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
          
         {item.status !== INVOICE_STATUS.PAID && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('BusinessInvoicePayment', { invoiceId: item.id })}
            >
              <MaterialIcons name="payment" size={16} color={theme.colors.primary} />
              <Text style={styles.actionText}>Record Payment</Text>
            </TouchableOpacity>
          )} */}
        </View>
        </TouchableOpacity>
      </Swipeable>
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
  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, style]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading invoices...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {renderFilterTags()}
      
      <FlatList
        data={filteredInvoices}
        renderItem={renderInvoiceItem}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="description" size={48} color={theme.colors.textDisabled} />
            <Text style={styles.emptyText}>
              {filters.search ? 'No invoices match your search' : 'No invoices found'}
            </Text>
            <Text style={styles.emptySubtext}>
              {Object.keys(filters).length > 0 
                ? 'Try clearing some filters' 
                : 'Create your first invoice to get started'}
            </Text>
          </View>
        }
        contentContainerStyle={filteredInvoices.length === 0 && styles.emptyListContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  swipeActionsContainer: {
    flexDirection: 'row',
    width: 180, // Width for 2 status options (90px each)
    height: '100%',
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 6,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
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
  invoiceItem: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  invoiceNumber: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  invoiceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailColumn: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.text,
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  overdueText: {
    color: theme.colors.error,
  },
  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray200,
    paddingTop: 18,
    paddingBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    fontSize: 12,
    color: theme.colors.primary,
    marginLeft: 4,
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

export default InvoiceList;
