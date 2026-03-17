/**
 * Business Add Invoice Screen
 * Form for creating new business invoices
 */
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import RNFS from 'react-native-fs';
import { createBusinessInvoice , getBusinessProfile} from '../services/businessApiService';
import { hasPremiumSubscription } from '../services/subscriptionService';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { INVOICE_STATUS } from '../utils/businessConstants';
import theme from '../../styles/theme';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, addDays } from 'date-fns';
// Import UUID fix before using uuidv4
import '../../../src/utils/uuidFix';
import { v4 as uuidv4 } from 'uuid';
import { Share } from 'react-native';

const BusinessAddInvoiceScreen = ({ navigation, route }) => {
  // Client information
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  
  // Invoice details
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [issuedDate, setIssuedDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(addDays(new Date(), 30)); // Default due in 30 days
  const [notes, setNotes] = useState('');
  const [businessProfile, setBusinessProfile] = useState(null);
  
  // Invoice items
  const [items, setItems] = useState([
    { id: uuidv4(), description: '', quantity: '1', unitPrice: '', amount: '0.00' }
  ]);
  
  // Tax and discount
  const [taxRate, setTaxRate] = useState('0');
  const [discount, setDiscount] = useState('0');
  
  // UI state
  const [showIssuedDatePicker, setShowIssuedDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Calculate subtotal
  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const itemAmount = parseFloat(item.amount || 0);
      return sum + (isNaN(itemAmount) ? 0 : itemAmount);
    }, 0);
  };

  // Calculate total with tax and discount
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = (parseFloat(discount) / 100) * subtotal;
    const taxAmount = (parseFloat(taxRate) / 100) * (subtotal - discountAmount);
    
    return subtotal - discountAmount + taxAmount;
  };

  // Handle date changes
  const onIssuedDateChange = (event, selectedDate) => {
    setShowIssuedDatePicker(false);
    if (selectedDate) {
      setIssuedDate(selectedDate);
    }
  };

  const onDueDateChange = (event, selectedDate) => {
    setShowDueDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  // Add new invoice item
  const addInvoiceItem = () => {
    setItems([
      ...items,
      { id: uuidv4(), description: '', quantity: '1', unitPrice: '', amount: '0.00' }
    ]);
  };

  // Remove invoice item
  const removeInvoiceItem = (id) => {
    if (items.length === 1) {
      Alert.alert('Cannot Remove', 'Invoice must have at least one item');
      return;
    }
    
    setItems(items.filter(item => item.id !== id));
  };

  // Update invoice item
  const updateInvoiceItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate amount if quantity or unitPrice changes
        if (field === 'quantity' || field === 'unitPrice') {
          const quantity = parseFloat(field === 'quantity' ? value : item.quantity) || 0;
          const unitPrice = parseFloat(field === 'unitPrice' ? value : item.unitPrice) || 0;
          updatedItem.amount = (quantity * unitPrice).toFixed(2);
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  // Render invoice item
  const renderInvoiceItem = ({ item, index }) => (
    <View style={styles.invoiceItem}>
      <View style={styles.invoiceItemHeader}>
        <Text style={styles.invoiceItemTitle}>Item {index + 1}</Text>
        <TouchableOpacity
          style={styles.removeItemButton}
          onPress={() => removeInvoiceItem(item.id)}
        >
          <MaterialIcons name="delete-outline" size={20} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          style={styles.textInput}
          value={item.description}
          onChangeText={(value) => updateInvoiceItem(item.id, 'description', value)}
          placeholder="Item description"
          placeholderTextColor={theme.colors.textTertiary}
        />
      </View>
      
      <View style={styles.itemDetails}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.inputLabel}>Quantity</Text>
          <TextInput
            style={styles.textInput}
            value={item.quantity}
            onChangeText={(value) => updateInvoiceItem(item.id, 'quantity', value)}
            placeholder="1"
            keyboardType="numeric"
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>
        
        <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
          <Text style={styles.inputLabel}>Unit Price</Text>
          <TextInput
            style={styles.textInput}
            value={item.unitPrice}
            onChangeText={(value) => updateInvoiceItem(item.id, 'unitPrice', value)}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>
        
        <View style={[styles.inputGroup, { flex: 2 }]}>
          <Text style={styles.inputLabel}>Amount</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>$</Text>
            <Text style={styles.amountText}>{item.amount}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  // Save invoice as draft or generate invoice
  const handleCreateInvoice = async (status = INVOICE_STATUS.DRAFT) => {
    setLoading(true);
    const result = await saveInvoice(status);
    setLoading(false);
    return result;
  };

  // Save invoice
  const saveInvoice = async (invoiceStatus = INVOICE_STATUS.DRAFT) => {
    // Validate required fields
    if (!clientName.trim()) {
      Alert.alert('Error', 'Please enter client name');
      return;
    }

    try {
      if (!clientName.trim()) {
        Alert.alert('Error', 'Client name is required');
        return false;
      }
      
      if (!invoiceNumber.trim()) {
        Alert.alert('Error', 'Invoice number is required');
        return false;
      }
      
      // Check if at least one item has description and amount
      const validItems = items.filter(item => 
        item.description.trim() && parseFloat(item.amount) > 0
      );
      
      if (validItems.length === 0) {
        Alert.alert('Error', 'At least one invoice item with description and amount is required');
        return false;
      }
      
      // Format items for API
      const formattedItems = items.map(item => ({
        description: item.description,
        quantity: parseFloat(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
        amount: parseFloat(item.amount) || 0
      }));
      
      const invoiceData = {
        // Create nested client object as expected by the API
        client: {
          name: clientName,
          email: clientEmail,
          address: clientAddress
        },
        invoiceNumber,
        issuedDate,
        dueDate,
        items: formattedItems,
        taxRate: parseFloat(taxRate) || 0,
        discount: parseFloat(discount) || 0,
        notes,
        subtotal: calculateSubtotal(),
        total: calculateTotal(),
        status: invoiceStatus
      };
      
      const response = await createBusinessInvoice(invoiceData);
      
      if (response && response.id) {
        return response;
      } else {
        Alert.alert('Error', 'Failed to create invoice. Please try again.');
        return false;
      }
      
    } catch (error) {
      //console.error('Error creating invoice:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      return false;
    }
  };


  // Load business profile
  useEffect(() => {
    loadBusinessProfile();
  }, []);

  const loadBusinessProfile = async () => {
    try {
      const profile = await getBusinessProfile();
      if (profile) {
        setBusinessProfile(profile);
      }
    } catch (error) {
      //console.error('Error loading business profile:', error);
    }
  };




  // Handle save invoice click
  const handleSaveInvoice = async () => {
    const result = await handleCreateInvoice(INVOICE_STATUS.DRAFT);
    if (result) {
      Alert.alert(
        'Success',
        'Invoice saved as draft',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('BusinessInvoices') 
          }
        ]
      );
    }
  };
  
  // Handle generate invoice click
  const handleGenerateInvoice = async () => {
    try {
      // Show loading indicator while validating and generating PDF
      setLoading(true);
      
      // Check if user has premium subscription using our subscription service
      const isPremium = await hasPremiumSubscription();
      
      // If not premium, show upgrade message and stop processing
      if (!isPremium) {
        setLoading(false);
        Alert.alert(
          'Premium Feature',
          'Invoice generation is available only for premium users. Upgrade your plan to generate unlimited invoices.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Upgrade Plan',
              onPress: () => navigation.navigate('BusinessSubscription'),
            },
          ]
        );
        return;
      }
      
      // Validate required fields
      if (!clientName.trim()) {
        setLoading(false);
        Alert.alert('Error', 'Please enter client name');
        return;
      }
      
      if (!invoiceNumber.trim()) {
        setLoading(false);
        Alert.alert('Error', 'Invoice number is required');
        return;
      }
      
      // Check if at least one item has description and amount
      const validItems = items.filter(item => 
        item.description.trim() && parseFloat(item.amount) > 0
      );
      
      if (validItems.length === 0) {
        setLoading(false);
        Alert.alert('Error', 'At least one invoice item with description and amount is required');
        return;
      }
      
      // Format items for PDF generation
      const formattedItems = items.map(item => ({
        description: item.description,
        quantity: parseFloat(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
        amount: parseFloat(item.amount) || 0
      }));

      // Prepare invoice data for PDF generation
      const invoiceData = {
        invoiceNumber,
        issuedDate,
        dueDate,
        // Client information
        client: {
          name: clientName,
          email: clientEmail,
          address: clientAddress,
          phone: clientPhone
        },
        // Business information - we can later pull this from user profile/settings
        businessName: businessProfile.businessUser.businessName || '',
        businessAddress: businessProfile.businessUser.address.street || '',
        businessCity: businessProfile.businessUser.address.city || '',
        businessState: businessProfile.businessUser.address.state || '',
        businessZip: businessProfile.businessUser.address.zip || '',
        businessCountry: businessProfile.businessUser.address.country || '',
        businessEmail: businessProfile.businessUser.businessEmail || '',
        businessPhone: businessProfile.businessUser.phone || '',
        // Invoice details
        items: formattedItems,
        taxRate: parseFloat(taxRate) || 0,
        discount: parseFloat(discount) || 0,
        notes,
        subtotal: calculateSubtotal(),
        total: calculateTotal(),
        status: INVOICE_STATUS.PENDING,
      };
      
      // Generate beautiful PDF directly without API call
      const pdfResult = await generateInvoicePDF(invoiceData);
      
      setLoading(false);
      
      // If PDF generation succeeded
      if (pdfResult && pdfResult.pdfPath) {
        Alert.alert(
          'Invoice Ready',
          'Your invoice PDF has been generated successfully',
          [
            {
              text: 'View Invoice',
              onPress: () => {
                // Navigate to the PDF viewer screen with the PDF path
                navigation.navigate('BusinessPDFViewer', {
                  pdfPath: pdfResult.pdfPath,
                  invoiceNumber: invoiceNumber,
                });
              },
            },
           {/* {
              text: 'Share PDF',
              onPress: () => navigation.navigate('BusinessInvoiceShare', { 
                invoiceId: invoiceNumber, // We're not creating an invoice record now
                pdfPath: pdfResult.pdfPath,
                fileName: pdfResult.fileName,
                invoiceData: invoiceData // Pass the data for email body generation
              }),
            }, */}
          ]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to generate invoice PDF. Please try again.'
        );
      }
    } catch (error) {
      setLoading(false);
      //console.error('Error generating invoice PDF:', error);
      Alert.alert(
        'Error',
        'Failed to generate invoice PDF. Please try again.'
      );
    }
  };

  return (
  <SafeAreaView style={styles.safeArea}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Invoice</Text>
        <View style={styles.placeholderRight} />
      </View>

      <ScrollView style={styles.formContainer}>
      {/* Client Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Client Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Client Name *</Text>
          <TextInput
            style={styles.textInput}
            value={clientName}
            onChangeText={setClientName}
            placeholder="Enter client name"
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Client Email</Text>
          <TextInput
            style={styles.textInput}
            value={clientEmail}
            onChangeText={setClientEmail}
            placeholder="Enter client email"
            keyboardType="email-address"
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Client Phone</Text>
          <TextInput
            style={styles.textInput}
            value={clientPhone}
            onChangeText={setClientPhone}
            placeholder="Enter client phone"
            keyboardType="phone-pad"
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Client Address</Text>
          <TextInput
            style={[styles.textInput, styles.addressInput]}
            value={clientAddress}
            onChangeText={setClientAddress}
            placeholder="Enter client address"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            numberOfLines={3}
          />
        </View>
      </View>
      
      {/* Invoice Details Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Invoice Details</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Invoice Number *</Text>
          <TextInput
            style={styles.textInput}
            value={invoiceNumber}
            onChangeText={setInvoiceNumber}
            placeholder="Enter invoice number"
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Issue Date</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowIssuedDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {format(issuedDate, 'MMMM d, yyyy')}
            </Text>
            <MaterialIcons name="calendar-today" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          {showIssuedDatePicker && (
            <DateTimePicker
              value={issuedDate}
              mode="date"
              display="default"
              onChange={onIssuedDateChange}
            />
          )}
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Due Date</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDueDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {format(dueDate, 'MMMM d, yyyy')}
            </Text>
            <MaterialIcons name="calendar-today" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          {showDueDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display="default"
              onChange={onDueDateChange}
            />
          )}
        </View>
      </View>
      
      {/* Invoice Items Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Invoice Items</Text>
          <TouchableOpacity
            style={styles.addItemButton}
            onPress={addInvoiceItem}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.addItemText}>Add Item</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={items}
          renderItem={renderInvoiceItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      </View>
      
      {/* Tax and Discount Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tax & Discount</Text>
        
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 16 }]}>
            <Text style={styles.inputLabel}>Tax Rate (%)</Text>
            <TextInput
              style={styles.textInput}
              value={taxRate}
              onChangeText={setTaxRate}
              placeholder="0"
              keyboardType="decimal-pad"
              placeholderTextColor={theme.colors.textTertiary}
            />
            {parseFloat(taxRate) > 0 && (
              <Text style={styles.calculationText}>
                ${(calculateSubtotal() * parseFloat(taxRate) / 100).toFixed(2)} tax
              </Text>
            )}
          </View>
          
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Discount (%)</Text>
            <TextInput
              style={styles.textInput}
              value={discount}
              onChangeText={setDiscount}
              placeholder="0"
              keyboardType="decimal-pad"
              placeholderTextColor={theme.colors.textTertiary}
            />
            {parseFloat(discount) > 0 && (
              <Text style={styles.calculationText}>
                ${(calculateSubtotal() * parseFloat(discount) / 100).toFixed(2)} discount
              </Text>
            )}
          </View>
        </View>
      </View>
      
      {/* Additional Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Notes</Text>
        
        <View style={styles.inputGroup}>
          <TextInput
            style={[styles.textInput, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes to client (optional)"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            numberOfLines={4}
          />
        </View>
      </View>
      
      {/* Invoice Summary */}
      <View style={[styles.section, styles.summarySection]}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>${calculateSubtotal().toFixed(2)}</Text>
        </View>
        
        {parseFloat(discount) > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount ({discount}%)</Text>
            <Text style={styles.summaryValue}>
              -${((parseFloat(discount) / 100) * calculateSubtotal()).toFixed(2)}
            </Text>
          </View>
        )}
        
        {parseFloat(taxRate) > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax ({taxRate}%)</Text>
            <Text style={styles.summaryValue}>
              ${((parseFloat(taxRate) / 100) * (calculateSubtotal() - ((parseFloat(discount) / 100) * calculateSubtotal()))).toFixed(2)}
            </Text>
          </View>
        )}
        
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${calculateTotal().toFixed(2)}</Text>
        </View>
      </View>
      
      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
      {/*  <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSaveInvoice}
        >
          <Text style={styles.saveButtonText}>Save Draft</Text>
        </TouchableOpacity> */}
        
        <TouchableOpacity 
          style={styles.generateButton}
          onPress={handleGenerateInvoice}
        >
          <MaterialIcons name="receipt" size={20} color="#FFFFFF" style={styles.generateButtonIcon} />
          <Text style={styles.generateButtonText}>Generate Invoice</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
);
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  formFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 24,
    paddingHorizontal: 16,
  },
  calculationText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
    textAlign: 'center',
  },
  placeholderRight: {
    width: 40,  // Same width as the back button for balance
  },
  headerSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.gray300,
    opacity: 0.7,
  },
  headerSaveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  addressInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
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
    backgroundColor: theme.colors.background,
  },
  dateText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  addItemText: {
    color: '#fff',
    marginLeft: 4,
    fontWeight: '500',
  },
  invoiceItem: {
    borderWidth: 1,
    borderColor: theme.colors.gray200,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: theme.colors.background,
  },
  invoiceItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceItemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  removeItemButton: {
    padding: 4,
  },
  itemDetails: {
    flexDirection: 'row',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginRight: 4,
  },
  amountText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  row: {
    flexDirection: 'row',
  },
  summarySection: {
    backgroundColor: theme.colors.cardBackground,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray200,
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  generateButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  generateButtonIcon: {
    marginRight: 6,
  },
});



export default BusinessAddInvoiceScreen;
