/**
 * Business Import Invoice Screen
 * For parsing and importing invoice data from PDF files
 */
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';
import businessApiService, { parseInvoicePDF, createBusinessInvoice } from '../services/businessApiService';
import DocumentPicker from 'react-native-document-picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import theme from '../../styles/theme';
import { INVOICE_STATUS } from '../utils/businessConstants';
import { format } from 'date-fns';

// AI configuration is managed by openaiService

const BusinessImportInvoiceScreen = ({ navigation }) => {
  // File state
  const [selectedFile, setSelectedFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    vendorName: '',
    invoiceNumber: '',
    issueDate: new Date(),
    dueDate: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000), // Default 30 days from now
    items: [],
    subtotal: '0',
    taxRate: '0',
    discount: '0',
    totalAmount: 0,
    clientName: '',
    clientAddress: '',
    clientEmail: '',
    notes: '',
    status: INVOICE_STATUS.UNPAID,
  });
  
  // Date picker states
  const [showIssueDatePicker, setShowIssueDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  
  // Initialize invoice form with empty item
  useState(() => {
    // Initialize with an empty item if no items exist
    if (invoiceData.items.length === 0) {
      setInvoiceData(prev => ({
        ...prev,
        items: [{ id: 'item-1', description: '', quantity: '1', unitPrice: '0', amount: '0' }],
      }));
    }
  }, [invoiceData.items]);
  
  // Step 1: Pick a PDF document from device storage
  const pickDocument = async () => {
    try {
      setIsUploading(true);
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf],
      });
      
      const fileData = {
        uri: result[0].uri,
        name: result[0].name,
        size: result[0].size,
        type: result[0].type,
      };
      
      setSelectedFile(fileData);
      
      // Process the PDF with the file data we just got
      await processPdf(fileData);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('Error', 'Failed to select document. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };
  
  // Step 2 & 3: Process PDF using server-side parsing
  const processPdf = async (fileData) => {
    try {
      setIsParsing(true);
      //console.log('Sending PDF file to server for processing:', fileData.uri);
      
      if (!fileData) {
        throw new Error('No file selected');
      }
      
      // Send the PDF to the server for parsing and AI processing
      const parsedData = await parseInvoicePDF(fileData);
      
      // Map the extracted data to our form
      //console.log('Server returned parsed invoice data');
      mapDataToForm(parsedData);
      
    } catch (error) {
      //console.error('Error processing PDF:', error);
      Alert.alert('Error', 'Failed to process PDF. Please try again or enter details manually.');
    } finally {
      setIsParsing(false);
    }
  };
  
  // Map extracted data to form fields
  const mapDataToForm = (extractedData) => {
    try {
      //console.log('Extracted data received:', JSON.stringify(extractedData));
      
      // Format items data as needed
      const formattedItems = extractedData.items?.map((item) => ({
        id: `item-${Math.random().toString(36).substring(7)}`,
        description: item.description || '',
        quantity: item.quantity?.toString() || '1',
        unitPrice: item.unitPrice?.toString() || '0',
        amount: item.amount?.toString() || '0',
      })) || [];
      
      // Update the form data
      setInvoiceData({
        invoiceNumber: extractedData.invoiceNumber || '',
        issueDate: extractedData.issueDate ? new Date(extractedData.issueDate) : new Date(),
        dueDate: extractedData.dueDate ? new Date(extractedData.dueDate) : new Date(new Date().setDate(new Date().getDate() + 30)),
        clientName: extractedData.client?.name || extractedData.clientName || '',
        clientEmail: extractedData.client?.email || extractedData.clientEmail || '',
        clientAddress: extractedData.client?.address || extractedData.clientAddress || '',
        items: formattedItems.length > 0 ? formattedItems : [
          { id: 'item-1', description: '', quantity: '1', unitPrice: '0', amount: '0' },
        ],
        subtotal: extractedData.subtotal?.toString() || '0',
        taxAmount: extractedData.tax?.amount ? extractedData.tax.amount.toString() : '0',
        discount: extractedData.discount?.percentage ? extractedData.discount.percentage.toString() : '0',
        notes: extractedData.notes || '',
        terms: extractedData.terms || '',
      });
    } catch (error) {
      //console.error('Error mapping data to form:', error);
      Alert.alert('Error', 'Failed to process extracted data. Some fields may need manual entry.');
    }
  };
  
  // Save parsed invoice
  const saveInvoice = async () => {
    try {
      // Validate parsed data
      if (!invoiceData.clientName.trim()) {
        Alert.alert('Error', 'Client name is required');
        return;
      }
      
      if (!invoiceData.invoiceNumber.trim()) {
        Alert.alert('Error', 'Invoice number is required');
        return;
      }
      
      if (invoiceData.items.length === 0) {
        Alert.alert('Error', 'Invoice must contain at least one item');
        return;
      }
      
      // Validate at least one item has description and amount
      const hasValidItem = invoiceData.items.some(
        item => item.description.trim() && parseFloat(item.amount) > 0,
      );
      
      if (!hasValidItem) {
        Alert.alert('Error', 'At least one item must have a description and amount greater than zero');
        return;
      }
      
      // Calculate tax values for database
      const subtotal = calculateItemsTotal();
      const discountPercent = parseFloat(invoiceData.discount) || 0;
      const discountAmount = (discountPercent / 100) * subtotal;
      const afterDiscount = subtotal - discountAmount;
      const taxAmount = parseFloat(invoiceData.taxAmount) || 0;
      
      // Calculate effective tax rate - avoid division by zero
      const effectiveTaxRate = afterDiscount > 0 ? (taxAmount / afterDiscount) * 100 : 0;
      
      // Format data for API
      const formattedData = {
        client: {
          name: invoiceData.clientName.trim(),
          email: invoiceData.clientEmail.trim(),
          address: {
            street: invoiceData.clientAddress.trim(),
          },
        },
        invoiceNumber: invoiceData.invoiceNumber.trim() || `INV-${Date.now()}`,
        issueDate: format(invoiceData.issueDate, 'yyyy-MM-dd'),
        dueDate: format(invoiceData.dueDate, 'yyyy-MM-dd'),
        notes: invoiceData.notes.trim(),
        items: invoiceData.items.map(item => ({
          description: item.description,
          quantity: parseFloat(item.quantity) || 0,
          unitPrice: parseFloat(item.unitPrice) || 0,
          total: parseFloat(item.amount) || 0, // Server expects 'total' not 'amount'
        })).filter(item => item.description.trim() && item.total > 0), // Only include valid items
        subtotal: subtotal,
        taxRate: effectiveTaxRate,
        taxAmount: taxAmount,
        discount: discountPercent,
        total: calculateTotal(), // Server expects 'total' not 'totalAmount'
        status: INVOICE_STATUS.DRAFT,
      };
      
      try {
        // Show loading indicator
        setIsParsing(true);
        
        // Call API to create invoice
        const response = await createBusinessInvoice(formattedData);
        
        // Clear loading state before showing success message
        setIsParsing(false);
        
        // Check if the response indicates a subscription limit error
        if (response && 
            (response.status === 403 || response.action === 'upgrade' || response.actionRequired === true)) {
          // This is a subscription limit error, handle it separately
          Alert.alert(
            'Subscription Limit Reached',
            `${response.message}\n\n${response.details || ''}`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Upgrade Plan',
                onPress: () => navigation.navigate('BusinessSubscription'),
              },
            ],
          );
          return; // Exit the function here
        }
        
        // Check for other API errors
        if (!response || response.error || (response.status && response.status >= 400)) {
          throw {
            message: (response && response.message) || 'Failed to create invoice - possibly a duplicate invoice number'
          };
        }
        
        // Only show success if we reach this point (no errors)
        //console.log('Invoice created successfully:', response);
        
        Alert.alert(
          'Success',
          'Invoice imported successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      } catch (apiError) {
        //console.error('API Error saving invoice:', apiError);
        setIsParsing(false); // Ensure loading state is cleared
        // First check for our specific duplicate invoice flag
        if (apiError.isDuplicateInvoice) {
          Alert.alert(
            'Duplicate Invoice Number',
            'An invoice with this number already exists. Please use a different invoice number.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        // Fallback check for other patterns suggesting duplicate invoice errors
        const errorMessage = apiError.message || '';
        const responseData = apiError.response?.data || {};
        const responseMessage = responseData.message || '';
        const errorStack = apiError.stack || '';
        
        // Create combined text to check for duplicate patterns
        const fullErrorText = [errorMessage, responseMessage, errorStack].join(' ').toLowerCase();
        
        if (fullErrorText.includes('duplicate') || 
            fullErrorText.includes('already exists') || 
            fullErrorText.includes('invoice number') ||
            fullErrorText.includes('duplicate key') ||
            (apiError.status === 500 && invoiceData.invoiceNumber && 
             fullErrorText.includes('e11000'))) { // MongoDB duplicate key error code
          
          Alert.alert(
            'Duplicate Invoice Number',
            'An invoice with this number already exists. Please use a different invoice number.',
            [{ text: 'OK' }]
          );
        } else {
          // Generic error handling for other errors
          Alert.alert('Error', `Failed to save invoice: ${errorMessage || 'Unknown error'}`);
        }
      } finally {
        setIsParsing(false);
      }
    } catch (error) {
      //console.error('Error processing invoice data:', error);
      Alert.alert('Error', 'Failed to process invoice data. Please check your inputs and try again.');
      setIsParsing(false);
    }
  };
  
  // Helper functions
  // Keeping for reference, but we now use direct subtotal input instead of calculating from items
  /* const calculateSubtotal = () => {
    return invoiceData.items.reduce((total, item) => {
      return total + (parseFloat(item.amount) || 0);
    }, 0);
  }; */
  
  // Calculate the sum of all item totals
  const calculateItemsTotal = () => {
    if (!invoiceData || !invoiceData.items || !Array.isArray(invoiceData.items)) {
      return 0;
    }
    return invoiceData.items.reduce((total, item) => {
      const amount = parseFloat(item.amount);
      return total + (isNaN(amount) ? 0 : amount);
    }, 0);
  };
  
  const calculateTotal = () => {
    const subtotal = calculateItemsTotal();
    const discountPercent = parseFloat(invoiceData.discount);
    const discountAmount = !isNaN(discountPercent) ? (discountPercent / 100) * subtotal : 0;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = parseFloat(invoiceData.taxAmount);
    return afterDiscount + (isNaN(taxAmount) ? 0 : taxAmount);
  };
  
  // Update invoice data
  const updateInvoiceData = (field, value) => {
    setInvoiceData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // If updating dates, make sure dueDate is not before issueDate
    if (field === 'issueDate') {
      const currentDueDate = new Date(invoiceData.dueDate);
      const newIssueDate = new Date(value);
      
      if (currentDueDate < newIssueDate) {
        // Set due date to at least the issue date
        const newDueDate = new Date(newIssueDate);
        newDueDate.setDate(newDueDate.getDate() + 30); // Default to 30 days after issue date
        setInvoiceData(prev => ({
          ...prev,
          dueDate: newDueDate
        }));
      }
    }
  };
  
  // Helper function to create a new item
  const createNewItem = () => ({
    id: `item-${Date.now()}`,
    description: '',
    quantity: '1',
    unitPrice: '0',
    amount: '0'
  });
  
  // Update item data - simplified but kept for backward compatibility
  const updateItemData = (index, field, value) => {
    const updatedItems = [...invoiceData.items];
    if (index >= updatedItems.length) return;
    
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    // Recalculate amount
    const quantity = parseFloat(updatedItems[index].quantity);
    const unitPrice = parseFloat(updatedItems[index].unitPrice);
    
    // Check if values are valid numbers
    if (!isNaN(quantity) && !isNaN(unitPrice)) {
      updatedItems[index].amount = (quantity * unitPrice).toFixed(2);
    } else {
      updatedItems[index].amount = '0.00';
    }
    
    // Calculate the new subtotal
    const newSubtotal = updatedItems.reduce((sum, item) => {
      const itemAmount = parseFloat(item.amount);
      return sum + (isNaN(itemAmount) ? 0 : itemAmount);
    }, 0);
    setInvoiceData(prev => ({
      ...prev,
      items: updatedItems,
      // Update the subtotal to match items
      subtotal: newSubtotal.toFixed(2),
    }));
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : null}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Import Invoice</Text>
          <TouchableOpacity
            style={[styles.saveButton, isParsing && styles.saveButtonDisabled]}
            onPress={saveInvoice}
            disabled={isParsing}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content}>
          {/* File Selection Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upload Invoice PDF</Text>
            
            {!selectedFile ? (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickDocument}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <>
                    <MaterialIcons name="upload-file" size={32} color={theme.colors.primary} />
                    <Text style={styles.uploadText}>Tap to select PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.filePreview}>
                <MaterialIcons name="description" size={24} color={theme.colors.primary} />
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName}>{selectedFile.name}</Text>
                  <Text style={styles.fileSize}>{(selectedFile.size / 1024).toFixed(1)} KB</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => {
                    setSelectedFile(null);
                    setInvoiceData({
                      clientName: '',
                      clientEmail: '',
                      clientAddress: '',
                      invoiceNumber: '',
                      issueDate: new Date(),
                      dueDate: new Date(),
                      items: [],
                      notes: '',
                      taxRate: '0',
                      discount: '0'
                    });
                  }}
                >
                  <MaterialIcons name="close" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          {/* Parsing Status */}
          {isParsing && (
            <View style={styles.section}>
              <View style={styles.parsingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.parsingText}>Parsing invoice data...</Text>
              </View>
            </View>
          )}
          
                  {/* Invoice Form Section - Always visible regardless of PDF upload */}
          <View style={[styles.section, styles.dataSection]}>
            <Text style={styles.sectionTitle}>
              {selectedFile && !isParsing ? 'Extracted Invoice Data' : 'Create Invoice'}
            </Text>
            {selectedFile && !isParsing && (
              <Text style={styles.sectionSubtitle}>Review and edit the extracted information</Text>
            )}
            {!selectedFile && (
              <Text style={styles.sectionSubtitle}>Enter invoice details manually or upload a PDF to auto-fill</Text>
            )}
            
            {/* Client Information */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Client Name *</Text>
              <TextInput
                style={styles.textInput}
                value={invoiceData.clientName}
                onChangeText={(value) => updateInvoiceData('clientName', value)}
                placeholder="Client name"
                editable={!isParsing}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Client Email</Text>
              <TextInput
                style={styles.textInput}
                value={invoiceData.clientEmail}
                onChangeText={(value) => updateInvoiceData('clientEmail', value)}
                placeholder="client@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isParsing}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Client Address</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={invoiceData.clientAddress}
                onChangeText={(value) => updateInvoiceData('clientAddress', value)}
                placeholder="Street, City, State, ZIP"
                multiline
                numberOfLines={3}
                editable={!isParsing}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Invoice Number *</Text>
              <TextInput
                style={styles.textInput}
                value={invoiceData.invoiceNumber}
                onChangeText={(value) => updateInvoiceData('invoiceNumber', value)}
                placeholder="Invoice #"
                editable={!isParsing}
              />
            </View>
            
            <View style={styles.dateRow}>
              <View style={[styles.inputGroup, styles.dateInput]}>
                <Text style={styles.inputLabel}>Issue Date</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  disabled={isParsing || isUploading}
                  onPress={() => setShowIssueDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {format(invoiceData.issueDate, 'MM/dd/yyyy')}
                  </Text>
                  <MaterialIcons name="calendar-today" size={20} color={theme.colors.text} />
                </TouchableOpacity>
                {showIssueDatePicker && (
                  <DateTimePicker
                    value={invoiceData.issueDate}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowIssueDatePicker(false);
                      if (selectedDate) {
                        updateInvoiceData('issueDate', selectedDate);
                      }
                    }}
                  />
                )}
              </View>
              
              <View style={[styles.inputGroup, styles.dateInput]}>
                <Text style={styles.inputLabel}>Due Date</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  disabled={isParsing || isUploading}
                  onPress={() => setShowDueDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {format(invoiceData.dueDate, 'MM/dd/yyyy')}
                  </Text>
                  <MaterialIcons name="calendar-today" size={20} color={theme.colors.text} />
                </TouchableOpacity>
                {showDueDatePicker && (
                  <DateTimePicker
                    value={invoiceData.dueDate}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDueDatePicker(false);
                      if (selectedDate) {
                        updateInvoiceData('dueDate', selectedDate);
                      }
                    }}
                  />
                )}
              </View>
            </View>
            
            {/* Item Management Section */}
            <View style={styles.itemsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Invoice Items</Text>
              </View>
              {invoiceData.items.map((item, index) => (
                <View key={`item-${index}`} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>Item #{index + 1}</Text>
                    {invoiceData.items.length > 1 && (
                      <TouchableOpacity
                        style={styles.removeItemButton}
                        onPress={() => {
                          const newItems = [...invoiceData.items];
                          newItems.splice(index, 1);
                          setInvoiceData(prev => ({
                            ...prev,
                            items: newItems,
                            subtotal: newItems.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0).toFixed(2)
                          }));
                        }}
                      >
                        <MaterialIcons name="close" size={20} color={theme.colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <View style={styles.itemField}>
                    <Text style={styles.itemLabel}>Description</Text>
                    <TextInput
                      style={styles.itemInput}
                      value={item.description}
                      onChangeText={(text) => updateItemData(index, 'description', text)}
                      placeholder="Item description"
                      placeholderTextColor={theme.colors.textSecondary}
                      editable={!isParsing}
                    />
                  </View>
                  
                  <View style={styles.itemRow}>
                    <View style={styles.itemHalfField}>
                      <Text style={styles.itemLabel}>Quantity</Text>
                      <TextInput
                        style={styles.itemHalfInput}
                        value={String(item.quantity)}
                        onChangeText={(text) => updateItemData(index, 'quantity', text)}
                        keyboardType="numeric"
                        placeholder="1"
                        placeholderTextColor={theme.colors.textSecondary}
                        editable={!isParsing}
                      />
                    </View>
                    
                    <View style={styles.itemHalfField}>
                      <Text style={styles.itemLabel}>Unit Price ($)</Text>
                      <TextInput
                        style={styles.itemHalfInput}
                        value={String(item.unitPrice)}
                        onChangeText={(text) => updateItemData(index, 'unitPrice', text)}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor={theme.colors.textSecondary}
                        editable={!isParsing}
                      />
                    </View>
                  </View>
                  
                  <View style={styles.itemTotal}>
                    <Text style={styles.itemLabel}>Amount</Text>
                    <View style={styles.amountInputContainer}>
                      <Text style={styles.amountPrefix}>$</Text>
                      <TextInput
                        style={[styles.textInput, styles.itemTotalInput]}
                        value={isNaN(parseFloat(item.amount)) ? '0.00' : parseFloat(item.amount).toFixed(2)}
                        onChangeText={(text) => updateItemData(index, 'amount', text)}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor={theme.colors.textSecondary}
                        editable={!isParsing}
                      />
                    </View>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                style={styles.addItemButton}
                onPress={() => {
                  const newItems = [...invoiceData.items, {
                    id: `item-${Date.now()}`,
                    description: '',
                    quantity: '1',
                    unitPrice: '0',
                    amount: '0',
                  }];
                  setInvoiceData(prev => ({
                    ...prev,
                    items: newItems,
                  }));
                }}
                disabled={isParsing}
              >
                <MaterialIcons name="add" size={20} color={theme.colors.primary} />
                <Text style={styles.addItemText}>Add Item</Text>
              </TouchableOpacity>
              <View style={styles.summaryRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Items Count</Text>
                  <Text style={styles.summaryValue}>{invoiceData.items.length}</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Subtotal ($)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={invoiceData.subtotal || calculateItemsTotal().toFixed(2)}
                    onChangeText={(value) => updateInvoiceData('subtotal', value)}
                    placeholder="0"
                    keyboardType="numeric"
                    editable={!isParsing}
                  />
                </View>
              </View>
            </View>

           {/* <View style={styles.summaryRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Total Amount ($)</Text>
                <TextInput
                  style={[styles.textInput, styles.readOnlyInput]}
                  value={calculateTotal().toFixed(2)}
                  placeholder="0"
                  keyboardType="numeric"
                  editable={false}
                />
              </View>
            </View>*/}

            <View style={styles.rateRow}>
              <View style={[styles.inputGroup, styles.rateInput]}>
                <Text style={styles.inputLabel}>Tax Amount ($)</Text>
                <TextInput
                  style={styles.textInput}
                  value={invoiceData.taxAmount}
                  onChangeText={(value) => updateInvoiceData('taxAmount', value)}
                  placeholder="0"
                  keyboardType="numeric"
                  editable={!isParsing}
                />
              </View>

              <View style={[styles.inputGroup, styles.rateInput]}>
                <Text style={styles.inputLabel}>Discount (%)</Text>
                <TextInput
                  style={styles.textInput}
                  value={invoiceData.discount}
                  onChangeText={(value) => updateInvoiceData('discount', value)}
                  placeholder="0"
                  keyboardType="numeric"
                  editable={!isParsing}
                />
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={invoiceData.notes}
                onChangeText={(value) => updateInvoiceData('notes', value)}
                placeholder="Additional notes or payment instructions"
                multiline
                numberOfLines={3}
                editable={!isParsing}
              />
            </View>
            
            {/* Total Section - Simplified */}
            <View style={styles.totalSection}>
              <View style={styles.totalCard}>
                <View style={styles.totalItem}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <View style={styles.plainValueContainer}>
                    <Text style={styles.currencyPrefix}>$</Text>
                    <TextInput
                      style={styles.plainValueInput}
                      value={parseFloat(invoiceData.subtotal || 0).toFixed(2)}
                      onChangeText={(value) => updateInvoiceData('subtotal', value)}
                      keyboardType="numeric"
                      editable={!isParsing}
                      placeholder="0.00"
                    />
                  </View>
                </View>
                
                <View style={styles.totalItem}>
                  <Text style={styles.totalLabel}>Discount ({invoiceData.discount}%)</Text>
                  <Text style={styles.totalValue}>
                    -${((parseFloat(invoiceData.discount) / 100) * parseFloat(invoiceData.subtotal || 0)).toFixed(2)}
                  </Text>
                </View>
                
                <View style={styles.totalItem}>
                  <Text style={styles.totalLabel}>Tax Amount</Text>
                  <Text style={styles.totalValue}>
                    ${parseFloat(invoiceData.taxAmount || 0).toFixed(2)}
                  </Text>
                </View>
                
                <View style={styles.totalItem}>
                  <Text style={styles.totalLabel}>Effective Tax Rate</Text>
                  <Text style={styles.totalValue}>
                    {(() => {
                      const subtotal = parseFloat(invoiceData.subtotal || 0);
                      const discount = parseFloat(invoiceData.discount || 0);
                      const taxAmount = parseFloat(invoiceData.taxAmount || 0);
                      const afterDiscount = subtotal - (discount / 100 * subtotal);

                      // Avoid division by zero
                      const effectiveTaxRate = afterDiscount > 0 ? (taxAmount / afterDiscount) * 100 : 0;
                      return `${effectiveTaxRate.toFixed(2)}%`;
                    })()}
                  </Text>
                </View>

                <View style={styles.grandTotalRow}>
                  <Text style={styles.grandTotalLabel}>Total</Text>
                  <Text style={styles.grandTotalValue}>${calculateTotal().toFixed(2)}</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Item card styles
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  removeItemButton: {
    padding: 4,
  },
  itemField: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemHalfField: {
    flex: 1,
    marginRight: 8,
  },
  itemLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  itemInput: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
    fontSize: 14,
  },
  itemHalfInput: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
    fontSize: 14,
  },
  itemTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
  },
  itemTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  itemTotalInput: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'right',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
  },
  totalValueInput: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'right',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
    flex: 1,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    paddingHorizontal: 8,
  },
  amountPrefix: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginRight: 4,
  },
  totalValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    paddingHorizontal: 8,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginRight: 4,
  },
  plainValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plainValueInput: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'right',
    paddingVertical: 4,
    paddingHorizontal: 0,
    minWidth: 80,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addItemText: {
    color: theme.colors.primary,
    fontWeight: '500',
    marginLeft: 8,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 4,
  },
  readOnlyInput: {
    backgroundColor: '#f5f5f5',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateInput: {
    width: '48%',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.gray100,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateText: {
    color: theme.colors.text,
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rateInput: {
    width: '48%',
  },
  itemContainer: {
    marginBottom: 16,
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    padding: 12,
    shadowColor: theme.colors.gray500,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemForm: {
    marginTop: 8,
  },
  itemDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  qtyInput: {
    width: '25%',
  },
  priceInput: {
    width: '35%',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '35%',
  },

  amountInput: {
    flex: 1,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noItemsText: {
    color: theme.colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    shadowColor: theme.colors.gray400,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  saveButton: {
    backgroundColor: theme.colors.businessPrimary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: theme.colors.gray800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.primary + '80',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    shadowColor: theme.colors.gray400,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  uploadButton: {
    backgroundColor: theme.colors.businessPrimaryLight,
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  uploadText: {
    marginTop: 8,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.businessPrimaryLight,
    borderRadius: 8,
    padding: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  fileSize: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  removeButton: {
    padding: 4,
  },
  parsingContainer: {
    alignItems: 'center',
    padding: 16,
  },
  parsingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  dataSection: {
    padding: 0,
    overflow: 'hidden',
  },
  inputGroup: {
    marginBottom: 16,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: theme.colors.gray100,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  itemsSection: {
    padding: 16,
  },
  item: {
    marginBottom: 12,
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    padding: 12,
  },

  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemDescription: {
    flex: 1,
    fontSize: 14,
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  totalCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: theme.colors.gray500,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray100,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.businessPrimaryLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 12,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.businessPrimary,
  },
});

export default BusinessImportInvoiceScreen;