/**
 * Business Invoice Details Screen
 * Displays detailed information about a business invoice with modern UI
 */
import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { getBusinessInvoiceById, getBusinessInvoices } from '../services/businessApiService';
import { INVOICE_STATUS } from '../utils/businessConstants';
import theme from '../../styles/theme';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { format, parseISO } from 'date-fns';

const BusinessInvoiceDetailsScreen = ({ route, navigation }) => {
  const { invoiceId } = route.params;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to normalize invoice data regardless of structure
  const normalizeInvoiceData = useCallback((rawInvoice) => {
    if (!rawInvoice) return null;
    
    // Handle client data (both nested and flat structures)
    const clientName = rawInvoice.client?.name || rawInvoice.clientName || 'Unknown Client';
    const clientEmail = rawInvoice.client?.email || rawInvoice.clientEmail || '';
    
    // Handle client address - ensure it's a string
    let clientAddress = '';
    const rawAddress = rawInvoice.client?.address || rawInvoice.clientAddress;
    if (typeof rawAddress === 'string') {
      clientAddress = rawAddress;
    } else if (rawAddress && typeof rawAddress === 'object') {
      // If address is an object with properties like street, city, etc.
      const addressParts = [];
      if (rawAddress.street) { addressParts.push(rawAddress.street); }
      if (rawAddress.city) { addressParts.push(rawAddress.city); }
      if (rawAddress.state) { addressParts.push(rawAddress.state); }
      if (rawAddress.zipCode || rawAddress.zip) { addressParts.push(rawAddress.zipCode || rawAddress.zip); }
      if (rawAddress.country) { addressParts.push(rawAddress.country); }
      clientAddress = addressParts.join(', ');
    }

    // Handle invoice details
    const invoiceNumber = rawInvoice.invoiceNumber || rawInvoice.invoice_number || 'N/A';
    const status = rawInvoice.status || INVOICE_STATUS.DRAFT;
    
    // Handle dates safely
    let issuedDate = new Date();
    try {
      const rawDate = rawInvoice.issueDate || rawInvoice.issuedDate;
      issuedDate = typeof rawDate === 'string' ? parseISO(rawDate) : (rawDate || new Date());
    } catch (err) {
      //console.warn('Error parsing issue date:', err);
    }
    
    let dueDate = new Date();
    try {
      const rawDueDate = rawInvoice.dueDate;
      dueDate = typeof rawDueDate === 'string' ? parseISO(rawDueDate) : (rawDueDate || new Date());
    } catch (err) {
      //console.warn('Error parsing due date:', err);
    }
    
    // Handle financial values safely
    const total = parseFloat(rawInvoice.total || rawInvoice.totalAmount || 0);
    const subtotal = parseFloat(rawInvoice.subtotal || total || 0);
    const discount = parseFloat(rawInvoice.discount || 0);
    const taxRate = parseFloat(rawInvoice.taxRate || 0);
    
    // Ensure items is always an array with valid properties
    const items = Array.isArray(rawInvoice.items) ? rawInvoice.items.map(item => ({
      description: item?.description || 'No description',
      quantity: parseFloat(item?.quantity || 1),
      unitPrice: parseFloat(item?.unitPrice || 0),
      amount: parseFloat(item?.amount || 0),
    })) : [];
    
    // Other fields
    const notes = rawInvoice.notes || '';
    
    return {
      ...rawInvoice, // Keep original data for reference
      clientName,
      clientEmail,
      clientAddress,
      invoiceNumber,
      status,
      issuedDate,
      dueDate,
      total,
      subtotal,
      discount,
      taxRate,
      items,
      notes,
    };
  }, []);
  
  // Define fetch invoice details function
  const fetchInvoiceDetails = useCallback(async () => {
    try {
      setLoading(true);
      // First try to get invoice directly by ID
      try {
        const invoiceData = await getBusinessInvoiceById(invoiceId);
        if (invoiceData) {
          const normalizedInvoice = normalizeInvoiceData(invoiceData);
          setInvoice(normalizedInvoice);
          return;
        }
      } catch (directError) {
        //console.warn('Error fetching invoice directly, falling back to list:', directError);
      }
      
      // Fallback: get all invoices and filter
      const invoices = await getBusinessInvoices();
      const foundInvoice = invoices.find(inv => inv.id === invoiceId);
      
      if (foundInvoice) {
        // Normalize the invoice data to handle different structures
        const normalizedInvoice = normalizeInvoiceData(foundInvoice);
        setInvoice(normalizedInvoice);
      } else {
        setError('Invoice not found');
      }
    } catch (err) {
      //console.error('Error fetching invoice details:', err);
      setError('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  }, [invoiceId, normalizeInvoiceData]);
  
  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchInvoiceDetails();
      return () => {
        // Optional cleanup
      };
    }, [fetchInvoiceDetails])
  );

  // Get status color and background color
  const getStatusStyles = (status) => {
    switch (status) {
      case INVOICE_STATUS.PAID:
        return {
          color: theme.colors.success,
          backgroundColor: 'rgba(39, 174, 96, 0.12)', // Light green
        };
      case INVOICE_STATUS.PARTIAL:
        return {
          color: theme.colors.warning,
          backgroundColor: 'rgba(241, 196, 15, 0.12)', // Light yellow
        };
      case INVOICE_STATUS.OVERDUE:
        return {
          color: theme.colors.error,
          backgroundColor: 'rgba(231, 76, 60, 0.12)', // Light red
        };
      case INVOICE_STATUS.SENT:
        return {
          color: theme.colors.primary,
          backgroundColor: 'rgba(52, 152, 219, 0.12)', // Light blue
        };
      case INVOICE_STATUS.DRAFT:
        return {
          color: theme.colors.textSecondary,
          backgroundColor: 'rgba(149, 165, 166, 0.12)', // Light gray
        };
      case INVOICE_STATUS.CANCELLED:
        return {
          color: theme.colors.textDisabled,
          backgroundColor: 'rgba(189, 195, 199, 0.12)', // Very light gray
        };
      default:
        return {
          color: theme.colors.text,
          backgroundColor: 'rgba(52, 73, 94, 0.12)', // Light dark blue
        };
    }
  };

  // No longer handling status updates or deletion in details screen - moved to edit screen

  // Share invoice
  const shareInvoice = async () => {
    try {
      // In a real implementation, generate PDF and share
      // For demo, just show a message
      Alert.alert(
        'Share Invoice',
        'This would generate a PDF invoice and share it. Feature coming soon!'
      );
    } catch (error) {
      //console.error('Error sharing invoice:', error);
    }
  };

  // Record payment using normalized data
  const recordPayment = () => {
    navigation.navigate('BusinessInvoicePayment', { 
      invoiceId: invoice.id,
      currentAmount: invoice.total,
      onPaymentRecorded: (paymentAmount) => {
        // Update the invoice status based on payment
        if (paymentAmount >= invoice.total) {
          setInvoice({
            ...invoice,
            status: INVOICE_STATUS.PAID,
          });
        } else if (paymentAmount > 0) {
          setInvoice({
            ...invoice,
            status: INVOICE_STATUS.PARTIAL,
          });
        }
      },
    });
  };

  // Simple helper function to format currency
  const formatCurrency = (value) => {
    const num = parseFloat(value) || 0;
    return `$${num.toFixed(2)}`;
  };

  // Render invoice item with safer data handling
  const renderInvoiceItem = ({ item, index }) => {
    // Ensure amount is a valid number
    const amount = parseFloat(item.amount) || 0;
    const quantity = parseFloat(item.quantity) || 1;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    
    return (
      <View style={styles.invoiceItem}>
        <View style={styles.invoiceItemRow}>
          <Text style={styles.invoiceItemDescription} numberOfLines={2}>
            {item.description || 'No description'}
          </Text>
          <Text style={styles.invoiceItemAmount}>{formatCurrency(quantity * unitPrice)}</Text>
        </View>
        <View style={styles.invoiceItemDetails}>
          <Text style={styles.invoiceItemDetailText}>
            {quantity} x {formatCurrency(unitPrice)}
          </Text>
        </View>
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading invoice details...</Text>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !invoice) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <MaterialIcons name="error-outline" size={56} color={theme.colors.error} />
        <Text style={styles.errorText}>{error || 'Invoice not found'}</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusStyles = getStatusStyles(invoice.status);

  // Main content
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice Details</Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('BusinessInvoiceEdit', { invoiceId: invoice.id })}
        >
          <MaterialIcons name="edit" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Invoice Header Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.invoiceNumber}>Invoice #{invoice.invoiceNumber}</Text>
              <Text style={styles.dateText}>
                Issued: {format(invoice.issuedDate, 'MMMM d, yyyy')}
              </Text>
              <Text style={styles.dateText}>
                Due: {format(invoice.dueDate, 'MMMM d, yyyy')}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusStyles.backgroundColor }]}>
              <Text style={[styles.statusText, { color: statusStyles.color }]}>
                {invoice.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Client Information Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Client Information</Text>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{invoice.clientName}</Text>
            {invoice.clientEmail && (
              <View style={styles.clientDetailRow}>
                <MaterialIcons name="email" size={18} color={theme.colors.textSecondary} />
                <Text style={styles.clientDetail}>{invoice.clientEmail}</Text>
              </View>
            )}
            {invoice.clientAddress && (
              <View style={styles.clientDetailRow}>
                <MaterialIcons name="location-on" size={18} color={theme.colors.textSecondary} />
                <Text style={styles.clientDetail}>{invoice.clientAddress}</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Invoice Items Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invoice Items</Text>
          {invoice.items && invoice.items.length > 0 ? (
            <FlatList
              data={invoice.items}
              renderItem={renderInvoiceItem}
              keyExtractor={(item, index) => item.id ? item.id.toString() : 'item_' + index.toString()}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
            />
          ) : (
            <Text style={styles.emptyItems}>No invoice items found</Text>
          )}
          
          {/* Invoice Summary */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatCurrency(invoice.subtotal)}</Text>
            </View>
            
            {invoice.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount ({parseFloat(invoice.discount).toFixed(0)}%)</Text>
                <Text style={styles.summaryValue}>
                  -{formatCurrency((invoice.discount / 100) * invoice.subtotal)}
                </Text>
              </View>
            )}
            
            {invoice.taxRate > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax ({parseFloat(invoice.taxRate).toFixed(0)}%)</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency((invoice.taxRate / 100) * (invoice.subtotal - ((invoice.discount / 100) * invoice.subtotal)))}
                </Text>
              </View>
            )}
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.total)}</Text>
            </View>
          </View>
        </View>
        
        {/* Notes Card */}
        {invoice.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}
        
        {/* Actions Card 
        <View style={styles.actionsCard}>
          <Text style={styles.cardTitle}>Actions</Text>
          
       <View style={styles.actionButtonsRow}>
            {invoice.status !== INVOICE_STATUS.PAID && invoice.status !== INVOICE_STATUS.CANCELLED && (
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryActionButton]}
                onPress={recordPayment}
              >
                <MaterialIcons name="payments" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Record Payment</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryActionButton]}
              onPress={shareInvoice}
            >
              <MaterialIcons name="share" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.editActionButton]}
              onPress={() => navigation.navigate('BusinessInvoiceEdit', { invoiceId: invoice.id })}
            >
              <MaterialIcons name="edit" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Edit Invoice</Text>
            </TouchableOpacity>
          </View>
        </View>*/}
        
        {/* Add some bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',

  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  invoiceNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 6,
  },
  dateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  clientInfo: {
    marginTop: 4,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  clientDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  clientDetail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  invoiceItem: {
    paddingVertical: 10,
  },
  invoiceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  invoiceItemDescription: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    marginRight: 8,
  },
  invoiceItemAmount: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  invoiceItemDetails: {
    marginTop: 4,
  },
  invoiceItemDetailText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  itemSeparator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 8,
  },
  emptyItems: {
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  summaryContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray200,
    paddingTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    color: theme.colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray200,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  notesText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  actionsCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  primaryActionButton: {
    backgroundColor: theme.colors.success,
  },
  secondaryActionButton: {
    backgroundColor: theme.colors.primary,
  },
  editActionButton: {
    backgroundColor: theme.colors.accent || '#FF9800',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },


  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorText: {
    marginTop: 12,
    marginBottom: 24,
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bottomSpacer: {
    height: 32,
  },
});

export default BusinessInvoiceDetailsScreen;