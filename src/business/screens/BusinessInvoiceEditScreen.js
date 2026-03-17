/**
 * Business Invoice Edit Screen
 * Allows editing existing business invoices
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import theme from '../../styles/theme';
import { getBusinessInvoiceById, updateBusinessInvoice, deleteBusinessInvoice } from '../services/businessApiService';
import { INVOICE_STATUS } from '../utils/businessConstants';

const BusinessInvoiceEditScreen = ({ route, navigation }) => {
  const { invoiceId } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Invoice data state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [issueDate, setIssueDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(new Date(new Date().setDate(new Date().getDate() + 30)));
  const [status, setStatus] = useState(INVOICE_STATUS.DRAFT);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  
  // Date picker states
  const [showIssueDatePicker, setShowIssueDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  
  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceDetails();
    } else {
      setLoading(false);
      navigation.goBack();
    }
  }, [invoiceId]);
  
  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getBusinessInvoiceById(invoiceId);
      //console.log('Invoice details:', JSON.stringify(response));
      
      if (response) {
        setInvoiceNumber(response.invoiceNumber || '');
        setClientName(response.client.name || '');
        setClientEmail(response.client.email || '');
        setIssueDate(new Date(response.issueDate));
        setDueDate(new Date(response.dueDate));
        setStatus(response.status || INVOICE_STATUS.DRAFT);
        
        // Ensure all items have a unique id
        const itemsWithIds = (response.items || []).map((item, index) => ({
          ...item,
          id: item.id || `item_${invoiceId}_${index}_${Date.now()}`
        }));
        
        setItems(itemsWithIds);
        setNotes(response.notes || '');
        setTerms(response.terms || '');
        // Set tax and discount info if available in response
        setSubtotal(response.subtotal || 0);
        setTaxRate(response.taxRate || 0);
        setTaxAmount(response.taxAmount || 0);
        setDiscount(response.discount || 0);
      }
    } catch (err) {
      //console.error('Error fetching invoice details:', err);
      setError('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };
  
  const handleIssueDateChange = (event, selectedDate) => {
    setShowIssueDatePicker(false);
    if (selectedDate) {
      setIssueDate(selectedDate);
      
      // If due date is before the new issue date, update it
      if (dueDate < selectedDate) {
        const newDueDate = new Date(selectedDate);
        newDueDate.setDate(selectedDate.getDate() + 30);
        setDueDate(newDueDate);
      }
    }
  };
  
  const handleDueDateChange = (event, selectedDate) => {
    setShowDueDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };
  
  const addItem = () => {
    // Create a truly unique ID with a prefix and a timestamp
    const newItem = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    
    setItems([...items, newItem]);
  };
  
  const updateItem = (id, field, value) => {
    const updatedItems = items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate total if quantity or unitPrice changes
        if (field === 'quantity' || field === 'unitPrice') {
          const quantity = field === 'quantity' ? parseFloat(value) || 0 : parseFloat(item.quantity) || 0;
          const unitPrice = field === 'unitPrice' ? parseFloat(value) || 0 : parseFloat(item.unitPrice) || 0;
          updatedItem.total = quantity * unitPrice;
        }
        
        return updatedItem;
      }
      return item;
    });
    
    setItems(updatedItems);
  };
  
  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };
  
  const calculateSubtotal = useCallback(() => {
    return items.reduce((total, item) => {
      // Use total property (edit screen) or amount property (import screen)
      return total + (parseFloat(item.total) || parseFloat(item.amount) || 0);
    }, 0);
  }, [items]);

  const calculateTaxAmount = useCallback((subtotalValue) => {
    return (parseFloat(taxRate) / 100) * subtotalValue;
  }, [taxRate]);

  const calculateTotal = useCallback(() => {
    const currentSubtotal = calculateSubtotal();
    const discountAmount = (parseFloat(discount) / 100) * currentSubtotal;
    const afterDiscount = currentSubtotal - discountAmount;
    const calculatedTaxAmount = calculateTaxAmount(afterDiscount);
    return afterDiscount + calculatedTaxAmount;
  }, [calculateSubtotal, calculateTaxAmount, discount]);

  useEffect(() => {
    const newTaxAmount = calculateTaxAmount(calculateSubtotal());
    setTaxAmount(newTaxAmount);
  }, [items, taxRate, calculateTaxAmount, calculateSubtotal]);

  // We won't implement payment processing as per user requirements
  // Update status in local state directly on selection
  const updateStatus = (newStatus) => {
    // Directly update status without confirmation
    setStatus(newStatus);
  };

  // Delete invoice
  const handleDeleteInvoice = () => {
    Alert.alert(
      'Delete Invoice',
      'Are you sure you want to delete this invoice? This action cannot be undone.',
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
              setSaving(true);
              await deleteBusinessInvoice(invoiceId);
              Alert.alert(
                'Success', 
                'Invoice deleted successfully', 
                [{ text: 'OK', onPress: () => navigation.navigate('BusinessInvoiceManagement') }]
              );
            } catch (err) {
              //console.error('Error deleting invoice:', err);
              Alert.alert('Error', 'Failed to delete invoice');
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const saveInvoice = async () => {
    // Basic validation
    if (!invoiceNumber.trim()) {
      Alert.alert('Validation Error', 'Invoice number is required');
      return;
    }
    
    if (!clientName.trim()) {
      Alert.alert('Validation Error', 'Client name is required');
      return;
    }
    
    if (items.length === 0) {
      Alert.alert('Validation Error', 'At least one item is required');
      return;
    }
    
    if (items.some(item => !item.description.trim())) {
      Alert.alert('Validation Error', 'Item descriptions cannot be empty');
      return;
    }
    
    try {
      setSaving(true);
      
      // Format data properly with client as an object to match schema
      // Make sure all numeric values are properly converted to numbers
      const formattedItems = items.map(item => ({
        id: item.id,
        description: item.description || '',
        quantity: parseFloat(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
        total: parseFloat(item.total) || 0
      }));
      
      const invoiceData = {
        id: invoiceId,
        invoiceNumber,
        client: {
          name: clientName,
          email: clientEmail
        },
        issueDate: format(issueDate, 'yyyy-MM-dd'),
        dueDate: format(dueDate, 'yyyy-MM-dd'),
        status,
        items: formattedItems,
        notes,
        terms,
        subtotal: calculateSubtotal(),
        taxRate: parseFloat(taxRate) || 0,
        taxAmount: parseFloat(taxAmount) || 0,
        discount: parseFloat(discount) || 0,
        total: calculateTotal() // Properly calculated total with tax
      };
      
      //console.log('Sending invoice update with data:', JSON.stringify(invoiceData));
      
      const updatedInvoice = await updateBusinessInvoice(invoiceId, invoiceData);
      //console.log('Response from server:', JSON.stringify(updatedInvoice));
      
      // Simply check if we received a valid response
      if (updatedInvoice && updatedInvoice._id) {
        // Successfully updated
        Alert.alert(
          'Success',
          'Invoice updated successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        // Show a more generic error message
        //console.error('Update response issue:', JSON.stringify(updatedInvoice));
        Alert.alert(
          'Error',
          'Failed to update invoice. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      //console.error('Error updating invoice:', err);
      Alert.alert('Error', 'Failed to update invoice. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  const renderStatusOptions = () => {
    return (
      <View style={styles.statusContainer}>
        <Text style={styles.sectionTitle}>Status</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusOptionsContainer}
        >
          {Object.values(INVOICE_STATUS).map(statusValue => (
            <TouchableOpacity
              key={statusValue}
              style={[
                styles.statusOption,
                { borderColor: getStatusColor(statusValue) },
                status === statusValue && { 
                  backgroundColor: getStatusColor(statusValue).backgroundColor,
                  borderWidth: 2,
                }
              ]}
              onPress={() => updateStatus(statusValue)}
            >
              <Text 
                style={[
                  styles.statusOptionText, 
                  { color: getStatusColor(statusValue) },
                  status === statusValue && { fontWeight: 'bold' },
                ]}
              >
                {statusValue.charAt(0).toUpperCase() + statusValue.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };
  
  const renderItems = () => {
    return (
      <View style={styles.itemsContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Invoice Items</Text>
          <TouchableOpacity 
            style={styles.addItemButton}
            onPress={addItem}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.addItemButtonText}>Add Item</Text>
          </TouchableOpacity>
        </View>
        
        {items.length > 0 ? (
          <View style={styles.itemsContent}>
            {/* Items list */}
            {items.map((item, index) => (
              <View key={`invoice-item-${item.id}`} style={styles.itemCard}>
                <View style={styles.itemCardHeader}>
                  <Text style={styles.itemNumber}>Item #{index + 1}</Text>
                  <TouchableOpacity
                    style={styles.itemDeleteButton}
                    onPress={() => removeItem(item.id)}
                  >
                    <MaterialIcons name="delete-outline" size={22} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.itemCardRow}>
                  <Text style={styles.itemLabel}>Description</Text>
                  <TextInput
                    style={styles.itemDescriptionInput}
                    value={item.description}
                    onChangeText={(text) => updateItem(item.id, 'description', text)}
                    placeholder="Item description"
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>
                
                <View style={styles.itemCardRowGroup}>
                  <View style={styles.itemCardHalfRow} key={`qty-row-${item.id}`}>
                    <Text style={styles.itemLabel}>Quantity</Text>
                    <TextInput
                      style={styles.itemHalfInput}
                      value={item.quantity?.toString()}
                      onChangeText={(text) => updateItem(item.id, 'quantity', text)}
                      keyboardType="numeric"
                      placeholder="1"
                      placeholderTextColor={theme.colors.textTertiary}
                    />
                  </View>
                  
                  <View style={styles.itemCardHalfRow} key={`price-row-${item.id}`}>
                    <Text style={styles.itemLabel}>Unit Price</Text>
                    <View style={styles.currencyInputContainer}>
                      <Text style={styles.currencySymbol}>$</Text>
                      <TextInput
                        style={styles.itemHalfInput}
                        value={item.unitPrice?.toString()}
                        onChangeText={(text) => updateItem(item.id, 'unitPrice', text)}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor={theme.colors.textTertiary}
                      />
                    </View>
                  </View>
                </View>
                
                <View style={styles.itemCardRow}>
                  <Text style={styles.itemLabel}>Total</Text>
                  <Text style={styles.itemTotalText}>
                    ${(parseFloat(item.total) || 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
            
            <View style={styles.totalContainer} key="invoice-subtotal">
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>${calculateSubtotal().toFixed(2)}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.noItemsContainer}>
            <MaterialIcons name="receipt" size={48} color={theme.colors.textDisabled} />
            <Text style={styles.noItemsText}>No items added</Text>
            <Text style={styles.noItemsSubtext}>Tap the "Add Item" button to add invoice items</Text>
          </View>
        )}
      </View>
    );
  };



  // Get status color
  const getStatusColor = (statusValue) => {
    switch (statusValue) {
      case INVOICE_STATUS.PAID:
        return {color: theme.colors.success, backgroundColor: 'rgba(39, 174, 96, 0.5)'};
      case INVOICE_STATUS.OVERDUE:
        return {color: theme.colors.error, backgroundColor: 'rgba(231, 76, 60, 0.5)'};
      case INVOICE_STATUS.SENT:
        return{ color: theme.colors.primary, backgroundColor: 'rgba(52, 152, 219, 0.5)'};
      case INVOICE_STATUS.DRAFT:
        return {color:theme.colors.textSecondary, backgroundColor: 'rgba(149, 165, 166, 0.5)'};
      case INVOICE_STATUS.CANCELLED:
        return { color:theme.colors.textTertiary,backgroundColor: 'rgba(189, 195, 199, 0.5)'};
      default:
        return {color: theme.colors.text, backgroundColor: 'rgba(52, 73, 94, 0.5)'};
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading invoice details...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchInvoiceDetails}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Invoice</Text>

      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Invoice Number</Text>
            <TextInput
              style={styles.input}
              value={invoiceNumber}
              onChangeText={setInvoiceNumber}
              placeholder="Enter invoice number"
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Client Name *</Text>
            <TextInput
              style={styles.input}
              value={clientName}
              onChangeText={setClientName}
              placeholder="Enter client name"
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Client Email</Text>
            <TextInput
              style={styles.input}
              value={clientEmail}
              onChangeText={setClientEmail}
              placeholder="Enter client email"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Issue Date</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowIssueDatePicker(true)}
            >
              <Text style={styles.dateText}>{format(issueDate, 'MMM d, yyyy')}</Text>
              <MaterialIcons name="calendar-today" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
            
            {showIssueDatePicker && (
              <DateTimePicker
                value={issueDate}
                mode="date"
                display="default"
                onChange={handleIssueDateChange}
              />
            )}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Due Date</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDueDatePicker(true)}
            >
              <Text style={styles.dateText}>{format(dueDate, 'MMM d, yyyy')}</Text>
              <MaterialIcons name="calendar-today" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
            
            {showDueDatePicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                display="default"
                onChange={handleDueDateChange}
                minimumDate={issueDate}
              />
            )}
          </View>
        </View>
        
        {renderStatusOptions()}
        
        {renderItems()}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tax Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tax Rate (%)</Text>
            <View style={styles.taxRow}>
              <TextInput
                style={styles.taxInput}
                value={taxRate.toString()}
                onChangeText={(value) => {
                  const parsedValue = parseFloat(value) || 0;
                  setTaxRate(parsedValue);
                }}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={theme.colors.textTertiary}
              />
              <Text style={styles.taxPercentage}>%</Text>
            </View>
          </View>
          
          <View style={styles.taxSummaryContainer}>
            <View style={styles.taxSummaryRow}>
              <Text style={styles.taxSummaryLabel}>Subtotal:</Text>
              <Text style={styles.taxSummaryValue}>${calculateSubtotal().toFixed(2)}</Text>
            </View>
            
            <View style={styles.taxSummaryRow}>
              <Text style={styles.taxSummaryLabel}>Tax ({taxRate}%):</Text>
              <Text style={styles.taxSummaryValue}>${taxAmount.toFixed(2)}</Text>
            </View>
            
            <View style={[styles.taxSummaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>${calculateTotal().toFixed(2)}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={styles.textArea}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes visible to client"
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Terms and Conditions</Text>
            <TextInput
              style={styles.textArea}
              value={terms}
              onChangeText={setTerms}
              placeholder="Add terms and conditions"
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          
        </View>

        <View style={styles.actionButtons}>
        <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={saveInvoice}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Update</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDeleteInvoice}
          >
            <MaterialIcons name="delete" size={20} color={theme.colors.error} />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
          
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 52,
    position: 'relative',
  },
  headerBackButton: {
    padding: 8,
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
    marginRight: 16,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: theme.colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  deleteButtonText: {
    color: theme.colors.error,
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#5A80FF',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'center',
    marginBottom: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#3867d610',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,

  },
  backButtonText: {
    color: theme.colors.text,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.colors.text,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  textArea: {
    borderWidth: 1,
    borderColor: theme.colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 100,
  },

  taxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taxInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  taxPercentage: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.text,
  },
  taxSummaryContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 16,
  },
  taxSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  taxSummaryLabel: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  taxSummaryValue: {
    fontSize: 16,
    color: theme.colors.text,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statusContainer: {
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  statusOptionsContainer: {
    paddingVertical: 8,
    display: 'flex',
    justifyContent: 'center',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    minWidth: 80,
  },
  statusOptionActive: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  statusDot: {
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemsContent: {
    marginTop: 8,
  },
  itemCard: {
    backgroundColor: theme.colors.cardBackground || '#fff',
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    
  },
  itemNumber: {
    fontWeight: 'bold',
    fontSize: 15,
    color: theme.colors.primary,
  },
  itemCardRow: {
    marginBottom: 12,
  },
  itemCardRowGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemCardHalfRow: {
    width: '48%',
  },
  itemLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  itemDescriptionInput: {
   
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
  },
  itemHalfInput: {
   
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
   
    borderRadius: 4,
    paddingLeft: 8,
  },
  currencySymbol: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  itemTotalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  itemDeleteButton: {
    padding: 4,
  },
  noItemsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: theme.colors.backgroundLight || '#f8f9fa',
    borderRadius: 8,
    marginTop: 8,
   
    borderStyle: 'dashed',
  },
  noItemsText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    color: theme.colors.textSecondary,
  },
  noItemsSubtext: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    marginTop: 4,
    textAlign: 'center',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginTop: 8,
    backgroundColor: theme.colors.cardBackground || '#fff',
    borderRadius: 8,
   
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addItemButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 4,
  },
});

export default BusinessInvoiceEditScreen;
