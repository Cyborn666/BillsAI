/**
 * Business Daily Report Screen
 * Screen for creating and viewing daily business reports
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Image
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
// Using native DateTimePicker component
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { 
  createDailyReport, 
  getAllDailyReports,
  deleteDailyReport,
  updateDailyReport
} from '../services/businessApiService';
import { scanDailyReport } from '../services/ocrService';
import theme from '../../styles/theme';

const BusinessDailyReportScreen = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reportDate, setReportDate] = useState(new Date());
  const [reportData, setReportData] = useState({
    title: '',
    summary: '',
    netSales: '',
    salesTax: '',
    cashAmount: '',
    cardAmount: '',
    otherPaymentAmount: '',
    expectedTotal: '',
    actualTotal: '',
    overShortAmount: '',
    status: 'DRAFT',
  });
  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAmount, setTotalAmount]=useState(0);
  const [totalExpectedAmount, setTotalExpectedAmount]=useState(0);
  const [totalOverShortAmount, setTotalOverShortAmount]=useState(0);
  
  // OCR scanning state
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  // We need setOcrData for the processReportWithOcr function
  const [, setOcrData] = useState(null);
  const [reportImage, setReportImage] = useState(null);
  

  // Define fetchReports with useCallback to avoid circular dependencies
  const fetchReports = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getAllDailyReports({
        page: currentPage,
        limit: 10
      });
      
      if (response && response.data) {
        setReports(response.data);
        setTotalPages(response.totalPages || 1);
      }
    } catch (error) {
      //console.error('Error fetching daily reports:', error);
      Alert.alert('Error', 'Failed to load reports. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  // Fetch reports when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchReports();
    }, [fetchReports])
  );
   


  const handleSubmit = async () => {
    // Validate form data
    if (!reportData.netSales || !reportData.cashAmount || !reportData.cardAmount ||
        !reportData.actualTotal || !reportData.overShortAmount) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const data = {
        date: reportDate,
        title: reportData.title,
        summary: reportData.summary,
        netSales: parseFloat(reportData.netSales) || 0,
        salesTax: parseFloat(reportData.salesTax) || 0,
        cashAmount: parseFloat(reportData.cashAmount) || 0,
        cardAmount: parseFloat(reportData.cardAmount) || 0,
        otherPaymentAmount: parseFloat(reportData.otherPaymentAmount) || 0,
        expectedTotal: parseFloat(reportData.expectedTotal) || 0,
        actualTotal: parseFloat(reportData.actualTotal) || 0,
        overShortAmount: parseFloat(reportData.overShortAmount) || 0,
        status: reportData.status || 'DRAFT',
      };
      
      let response;
      
      if (isEditMode && reportData._id) {
        response = await updateDailyReport(reportData._id, data);
      } else {
        response = await createDailyReport(data);
      }
      
      // Check if the response itself is an error object with the specific 403 upgrade structure
      if (!isEditMode && response && 
          (response.status === 403 || response.action === "upgrade" || response.actionRequired === true)) {
        // This is a subscription limit error, handle it separately
        Alert.alert(
          'Subscription Limit Reached',
          `${response.message}\n\n${response.details}`,
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
          response: response,
          message: (response && response.message) || 'API error occurred'
        };
      }
      
      // Only show success if we reach this point without errors
      const successMessage = isEditMode
        ? 'Daily report has been updated successfully.'
        : 'Daily report has been created successfully.';
      
      Alert.alert('Success', successMessage);
      
      // Reset form only if API call was successful
      setReportData({
        title: '',
        summary: '',
        netSales: '',
        cashAmount: '',
        cardAmount: '',
        otherPaymentAmount: '',
        expectedTotal: '',
        actualTotal: '',
        overShortAmount: '',
        status: 'DRAFT',
      });
      
      setReportDate(new Date());
      setShowForm(false);
      setIsEditMode(false);
      fetchReports();
      
    } catch (error) {
      //console.error('Error creating/updating report:', error);
      
      // Generic error handling for other types of errors
      const errorMessage = 
        (error.response && error.response.message) ||
        error.message || 
        'Failed to create report. Please try again.';
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  



  const handleEditReport = (report) => {
    // Navigate to the form view with the report data for editing
    setShowForm(true);
    // Format the report data for the form fields
    setReportData({
      ...report,
      // Ensure all values are strings for the form inputs
      netSales: report.netSales?.toString() || '',
      cashAmount: report.cashAmount?.toString() || '',
      cardAmount: report.cardAmount?.toString() || '',
      otherPaymentAmount: report.otherPaymentAmount?.toString() || '',
      expectedTotal: report.expectedTotal?.toString() || '',
      actualTotal: report.actualTotal?.toString() || '',
      overShortAmount: report.overShortAmount?.toString() || ''
    });
    setIsEditMode(true);
    // Set report date if available
    if (report.date) {
      setReportDate(new Date(report.date));
    }
  };
  
  const handleNewReport = () => {
    // Reset form data for a new report
    setReportData({
      title: '',
      summary: '',
      netSales: '',
      cashAmount: '',
      cardAmount: '',
      otherPaymentAmount: '',
      expectedTotal: '',
      actualTotal: '',
      overShortAmount: '',
      status: 'DRAFT'
    });
    setReportDate(new Date());
    setIsEditMode(false);
    setShowForm(true);
  };

  const handleDeleteReport = async (reportId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this report?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await deleteDailyReport(reportId);
              Alert.alert('Success', 'Report deleted successfully');
              fetchReports();
            } catch (error) {
              //console.error('Error deleting report:', error);
              Alert.alert('Error', 'Failed to delete report. Please try again.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false); // Only hide on Android
    if (selectedDate) {
      setReportDate(selectedDate);
    }
  };

  const formatDate = (dateString) => {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d, yyyy');
    }
  };

  {/*Handle automatic cal of total,actual,over/short*/}

  useEffect(() => {
    // Calculate totals from the input fields
    const total = parseFloat(reportData.cashAmount || 0) + parseFloat(reportData.cardAmount || 0) + parseFloat(reportData.otherPaymentAmount || 0);
    setTotalAmount(total.toFixed(2)); // Format to 2 decimal places
    
    const expected = parseFloat(reportData.netSales || 0);
    setTotalExpectedAmount(expected.toFixed(2)); // Format to 2 decimal places
    
    const overShort = total - expected;
    setTotalOverShortAmount(overShort.toFixed(2)); // Format to 2 decimal places
    
    // Also update the report data with these calculated values
    setReportData(prev => ({
      ...prev,
      expectedTotal: expected.toFixed(2),
      actualTotal: total.toFixed(2),
      overShortAmount: overShort.toFixed(2)
    }));
  }, [reportData.cashAmount, reportData.cardAmount, reportData.otherPaymentAmount, reportData.netSales]);

  const renderReportItem = (report) => {
    return (
      <View 
        key={report._id || report.id}
        style={styles.reportCard}
        onPress={() => {}}
      >
        <View style={styles.reportHeader}>
          <Text style={styles.reportDate}>{formatDate(report.date)}</Text>
          {/* Money balance indicator dot */}
          <View
            style={[styles.balanceIndicator,
              parseFloat(report.actualTotal || 0) < parseFloat(report.expectedTotal || 0) ? styles.shortIndicator :
              parseFloat(report.actualTotal || 0) > parseFloat(report.expectedTotal || 0) ? styles.overIndicator :
              styles.balancedIndicator
            ]}
          />
        </View>
        
        <View style={styles.reportDetails}>
         {/* <Text style={styles.reportTitle}>{report.title}</Text>
          <Text style={styles.reportSummary} numberOfLines={2}>{report.summary}</Text>*/}
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Net Sales</Text>
              <Text style={styles.detailValue}>${parseFloat(report.netSales).toFixed(2)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Expected</Text>
              <Text style={styles.detailValue}>${parseFloat(report.expectedTotal).toFixed(2)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Actual</Text>
              <Text style={styles.detailValue}>
                ${parseFloat(report.actualTotal).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.paymentDetails}>
          <Text style={styles.paymentDetailsLabel}>Payment Breakdown:</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Cash: ${parseFloat(report.cashAmount).toFixed(2)}</Text>
            <Text style={styles.paymentLabel}>Card: ${parseFloat(report.cardAmount).toFixed(2)}</Text>
            <Text style={styles.paymentLabel}>Other: ${parseFloat(report.otherPaymentAmount).toFixed(2)}</Text>
          </View>
        </View>
        
        <View style={styles.reportActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditReport(report)}
          >
            <MaterialIcons name="edit" size={18} color={theme.colors.primary} />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteReport(report._id || report.id)}
          >
            <MaterialIcons name="delete-outline" size={18} color="#F44336" />
            <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity 
          style={[styles.paginationButton, currentPage === 1 ? styles.paginationButtonDisabled : {}]}
          onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          <MaterialIcons name="chevron-left" size={24} color={currentPage === 1 ? "#CCCCCC" : theme.colors.primary} />
        </TouchableOpacity>
        
        <Text style={styles.paginationText}>Page {currentPage} of {totalPages}</Text>
        
        <TouchableOpacity 
          style={[styles.paginationButton, currentPage === totalPages ? styles.paginationButtonDisabled : {}]}
          onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
        >
          <MaterialIcons name="chevron-right" size={24} color={currentPage === totalPages ? "#CCCCCC" : theme.colors.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  // Process report image with OCR
  const processReportWithOcr = async (imageData) => {
    try {
      setIsOcrProcessing(true);
      // Call OCR service
      const result = await scanDailyReport(imageData.base64);
      if (result && result.success && result.extractedReport) {
        const extractedData = result.extractedReport;
        setOcrData(extractedData);
        // Automatically apply the data to form fields
        let updatedReportData = {...reportData};

        // Basic report metadata
        if (extractedData.date) updatedReportData.date = new Date(extractedData.date);
        if (extractedData.title) updatedReportData.title = extractedData.title;
        if (extractedData.summary) updatedReportData.summary = extractedData.summary;
        // Handle different variations of sales fields (totalSales, netSales, subtotal)
        if (extractedData.totalSales) {
          updatedReportData.netSales = extractedData.totalSales.toString();
        } else if (extractedData.netSales) {
          updatedReportData.netSales = extractedData.netSales.toString();
        } else if (extractedData.subtotal) {
          updatedReportData.netSales = extractedData.subtotal.toString();
        }
        // Handle sales tax field
        if (extractedData.salesTax) {
          updatedReportData.salesTax = extractedData.salesTax.toString();
        } else if (extractedData.tax) {
          updatedReportData.salesTax = extractedData.tax.toString();
        }
        // Handle different variations of cash fields (cashAmount, cash, drops, deposit)
        if (extractedData.cash) {
          updatedReportData.cashAmount = extractedData.cash.toString();
        } else if (extractedData.drops) {
          updatedReportData.cashAmount = extractedData.drops.toString();
        } else if (extractedData.cashAmount) {
          updatedReportData.cashAmount = extractedData.cashAmount.toString();
        } else if (extractedData.deposit) {
          updatedReportData.cashAmount = extractedData.deposit.toString();
        }
        // Handle card payment fields
        if (extractedData.cardAmount) {
          updatedReportData.cardAmount = extractedData.cardAmount.toString();
        } else if (extractedData.card) {
          updatedReportData.cardAmount = extractedData.card.toString();
        } else if (extractedData.creditCard) {
          updatedReportData.cardAmount = extractedData.creditCard.toString();
        }
        // Handle other payment methods
        if (extractedData.otherPaymentAmount) {
          updatedReportData.otherPaymentAmount = extractedData.otherPaymentAmount.toString();
        } else if (extractedData.other) {
          updatedReportData.otherPaymentAmount = extractedData.other.toString();
        }
        
        // Calculate totals - include all possible field name variations
        const netSalesVal = parseFloat(extractedData.totalSales || extractedData.netSales || extractedData.total || 0);
        // Expected total should be net sales
        const expected = netSalesVal;
        
        // Actual total is the sum of all payment methods
        const actual = (parseFloat(extractedData.drops || extractedData.cashAmount || extractedData.cash || extractedData.deposit || 0)) +
                      (parseFloat(extractedData.cardAmount || extractedData.card || extractedData.creditCard || 0)) +
                      (parseFloat(extractedData.otherPaymentAmount || extractedData.other || 0));
        
        // Over/short calculation
        const overShort = actual - expected;
        updatedReportData.expectedTotal = expected.toString();
        updatedReportData.actualTotal = actual.toString();
        updatedReportData.overShortAmount = overShort.toString();
        
        // Set report data
        setReportData(updatedReportData);
        if (extractedData.date) {
          setReportDate(new Date(extractedData.date));
        }

        // Show confirmation alert
        Alert.alert(
          'Report Data Scanned',
          'Report data has been filled automatically. Please check and confirm the details are correct.',
          [{ text: 'OK', onPress: () => {}}] );
      } else {
        //console.log('OCR returned without expected data structure:', result);
        Alert.alert(
          'OCR Processing',
          'Image scanned, but no report data could be extracted. Please fill in the details manually.'
        );
      }
    } catch (error) {
      //console.error('OCR processing error:', error);
      Alert.alert(
        'OCR Processing Failed',
        'Could not process the report image. Please try again or enter details manually.'
      );
    } finally {
      setIsOcrProcessing(false);
    }
  };
  
  // Handle scanning image selection (camera or gallery)
  const handleReportImage = (type) => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1200,
      maxHeight: 1600,
      includeBase64: true,
    };

    if (type === 'camera') {
      launchCamera(options, response => {
        if (response.didCancel) {
          return;
        } else if (response.errorCode) {
          Alert.alert('Error', response.errorMessage);
          return;
        }
        setReportImage(response.assets[0]);
        processReportWithOcr(response.assets[0]);
      });
    } else {
      launchImageLibrary(options, response => {
        if (response.didCancel) {
          return;
        } else if (response.errorCode) {
          Alert.alert('Error', response.errorMessage);
          return;
        }
        setReportImage(response.assets[0]);
        processReportWithOcr(response.assets[0]);
      });
    }
  };
  
  // Select image method (camera or gallery)
  const selectReportImageMethod = () => {
    Alert.alert(
      'Scan Daily Report',
      'Choose a method to scan your report',
      [
        {
          text: 'Camera',
          onPress: () => handleReportImage('camera'),
        },
        {
          text: 'Photo Library',
          onPress: () => handleReportImage('gallery'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };
  
  // We've replaced these functions with direct data application and alert
  // Now OCR data is automatically applied and the user gets an alert to check and confirm

  const renderReportForm = () => {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.formContainer}
      >
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>{isEditMode ? 'Edit Daily Report' : 'New Daily Report'}</Text>

          <View style={styles.formHeaderActions}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <MaterialIcons name="close" size={24} color="#555" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Image preview if scanned */}
        {reportImage && (
          <View style={styles.imagePreviewContainer}>
            <Image
              source={{ uri: reportImage.uri }}
              style={styles.uploadedImage}
              resizeMode="contain"
            />
            <TouchableOpacity 
              style={styles.removeImageButton}
              onPress={() => setReportImage(null)}
            >
              <MaterialIcons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        
        <ScrollView style={styles.formScrollView}>
          {/* Scan Report Field */}
          <View style={styles.scanFieldContainer}>
            <Text style={styles.formLabel}>Scan Daily Report</Text>
            <View style={styles.scanFieldContent}>
              <TouchableOpacity 
                style={styles.scanReportButton}
                onPress={selectReportImageMethod}
                disabled={isOcrProcessing}
              >
                {isOcrProcessing ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <>
                    <MaterialIcons name="document-scanner" size={20} color={theme.colors.primary} />
                    <Text style={styles.scanReportButtonText}>Scan Report</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.scanHelpText}>
                Scan your daily report to automatically fill the form fields
              </Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Date</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>{format(reportDate, 'MMMM d, yyyy')}</Text>
              <MaterialIcons name='calendar-today' size={20} color='#555' />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={reportDate}
                mode='date'
                display='default'
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Title</Text>
            <TextInput
              style={styles.textInput}
              value={reportData.title}
              onChangeText={(text) => setReportData({...reportData, title: text})}
              placeholder="Report Title"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Summary</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={reportData.summary}
              onChangeText={(text) => setReportData({...reportData, summary: text})}
              placeholder="Summary of daily activities..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Net Sales</Text>
            <TextInput
              style={styles.textInput}
              value={reportData.netSales}
              onChangeText={(text) => {
                // Update netSales and recalculate expectedTotal
                const netSalesVal = parseFloat(text) || 0;
                setReportData(prev => ({
                  ...prev,
                  netSales: text,
                  expectedTotal: netSalesVal.toString()
                }));
                // Update the local variable for display
                setTotalExpectedAmount(netSalesVal.toString());
              }}
              placeholder="$0.00"
              keyboardType="decimal-pad"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Sales Tax</Text>
            <TextInput
              style={styles.textInput}
              value={reportData.salesTax}
              onChangeText={(text) => setReportData({...reportData, salesTax: text})}
              placeholder="$0.00"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.formRow}>
            <View style={[styles.formGroup, {flex: 1,}]}>
              <Text style={styles.formLabel}>Cash Amount</Text>
              <TextInput
                style={styles.textInput}
                value={reportData.cashAmount}
                onChangeText={(text) => setReportData({...reportData, cashAmount: text})}
                placeholder="$0.00"
                keyboardType="decimal-pad"
              />
            </View>
            
            <View style={[styles.formGroup]}>
              <Text style={styles.formLabel}>Card Amount</Text>
              <TextInput
                style={styles.textInput}
                value={reportData.cardAmount}
                onChangeText={(text) => setReportData({...reportData, cardAmount: text})}
                placeholder="$0.00"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          
          <View style={[styles.formGroup]}>
            <Text style={styles.formLabel}>Other Payment Amount</Text>
            <TextInput
              style={styles.textInput}
              value={reportData.otherPaymentAmount}
              onChangeText={(text) => setReportData({...reportData, otherPaymentAmount: text})}
              placeholder="$0.00"
              keyboardType="decimal-pad"
            />
          </View>
          
        {/*  <View style={styles.formRow}>
            <View style={[styles.formGroup, {flex: 1,}]}>
              <Text style={styles.formLabel}>Expected Total</Text>
              <TextInput
                style={styles.textInput}
                value={reportData.expectedTotal}
                onChangeText={(text) => setReportData({...reportData, expectedTotal: text})}
                placeholder="$0.00"
                keyboardType="decimal-pad"
              />
            </View>
            
            <View style={[styles.formGroup, {flex: 1,}]}>
              <Text style={styles.formLabel}>Actual Total</Text>
              <TextInput
                style={styles.textInput}
                value={reportData.actualTotal}
                onChangeText={(text) => setReportData({...reportData, actualTotal: text})}
                placeholder="$0.00"
                keyboardType="decimal-pad"
              />
            </View>
          </View>*/}

          <View style={styles.formRow}>
            <View style={[styles.formGroup, {flex: 1,}]}>
              <Text style={styles.formLabel}>Expected Total</Text>
              <TextInput
                style={styles.textInput}
                value={totalExpectedAmount}
                editable={false} // Make this read-only since it's calculated
                placeholder="$0.00"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.formGroup, {flex: 1,}]}>
              <Text style={styles.formLabel}>Actual Total</Text>
              <TextInput
                style={styles.textInput}
                value={totalAmount}
                editable={false} // Make this read-only since it's calculated
                placeholder="$0.00"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Over/Short Amount</Text>
            <TextInput
              style={[styles.textInput, parseFloat(totalOverShortAmount) < 0 ? {color: 'red'} : parseFloat(totalOverShortAmount) > 0 ? {color: 'green'} : {}]}
              value={totalOverShortAmount}
              editable={false} // Make this read-only since it's calculated
              placeholder="$0.00"
              keyboardType="decimal-pad"
            />
          </View>
          
        {/* <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Status</Text>
            <View style={styles.statusToggle}>
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  reportData.status === 'DRAFT' ? styles.statusOptionActive : {}
                ]}
                onPress={() => setReportData({...reportData, status: 'DRAFT'})}
              >
                <Text style={reportData.status === 'DRAFT' ? styles.statusTextActive : styles.statusTextInactive}>Draft</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  reportData.status === 'FINALIZED' ? styles.statusOptionActive : {}
                ]}
                onPress={() => setReportData({...reportData, status: 'FINALIZED'})}
              >
                <Text style={reportData.status === 'FINALIZED' ? styles.statusTextActive : styles.statusTextInactive}>Finalized</Text>
              </TouchableOpacity>
            </View>
          </View>*/}
        </ScrollView>
        
        <View style={styles.formActions}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => setShowForm(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.submitButton]}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>
            {isEditMode ? 'Update Report' : 'Create Report'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Reports</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => {
            setShowForm(!showForm);
            if (!showForm) {
              // Reset form when opening
              setReportDate(new Date());
              setReportData({
                title: '',
                summary: '',
                netSales: '',
                cashAmount: '',
                cardAmount: '',
                otherPaymentAmount: '',
                expectedTotal: '',
                actualTotal: '',
                overShortAmount: '',
              });
              setIsEditMode(false);
              setReportImage(null);
            }
          }}
        >
          <MaterialIcons 
            name={showForm ? 'close' : 'add'}
            size={24} 
            color="#FFF" 
          />
        </TouchableOpacity>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      ) : showForm ? (
        renderReportForm()
      ) : (
        <>
          {reports && reports.length > 0 ? (
            <>
              <ScrollView style={styles.reportsContainer}>
                {reports.map(report => renderReportItem(report))}
              </ScrollView>
              {totalPages > 1 && renderPagination()}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="assignment" size={64} color="#CCCCCC" />
              <Text style={styles.emptyTitle}>No Reports Found</Text>
              <Text style={styles.emptyDescription}>
                Start creating daily reports to track your business performance.
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setShowForm(true)}
              >
                <Text style={styles.createButtonText}>Create First Report</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
      
      {/* DateTimePicker is now inline in the form */}
    </View>
  );
};

const styles = StyleSheet.create({
  // Scan field styles
  scanFieldContainer: {
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  scanFieldContent: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  scanReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginBottom: 8,
  },
  scanReportButtonText: {
    color: theme.colors.primary,
    marginLeft: 8,
    fontWeight: '500',
  },
  scanHelpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  formRowItemRight: {
    flex: 1,
    marginRight: 8,
  },
  formRowItemLeft: {
    flex: 1,
    marginLeft: 8,
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
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  addButton: {
    backgroundColor: '#3867d6',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  reportsContainer: {
    flex: 1,
    padding: 16,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  balanceIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: 8,
  },
  shortIndicator: {
    backgroundColor: '#F44336', // Red for money short/deficit
  },
  overIndicator: {
    backgroundColor: '#4CAF50', // Green for money over/surplus
  },
  balancedIndicator: {
    backgroundColor: '#FFC107', // Amber/yellow for balanced/no difference
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  draftBadge: {
    backgroundColor: '#FFF8E1',
  },
  finalizedBadge: {
    backgroundColor: '#E0F2F1',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  reportDetails: {
    marginBottom: 16,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reportSummary: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212121',
  },
  positiveAmount: {
    color: '#4CAF50',
  },
  negativeAmount: {
    color: '#F44336',
  },
  notesContainer: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    color: '#555',
  },
  notesText: {
    fontSize: 13,
    color: '#666',
  },
  paymentDetails: {
    marginVertical: 8,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
  },
  paymentDetailsLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    color: '#555',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentLabel: {
    fontSize: 13,
    color: '#666',
  },
  reportActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    padding: 4,
  },
  actionText: {
    fontSize: 14,
    marginLeft: 4,
    color: theme.colors.primary,
  },
  deleteText: {
    color: '#F44336',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  paginationButton: {
    padding: 8,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#555555',
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  formScrollView: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212121',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#212121',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  dateText: {
    fontSize: 16,
    color: '#212121',
  },
  statusToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 8,
    overflow: 'hidden',
  },
  statusOption: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  statusOptionActive: {
    backgroundColor: theme.colors.primary,
  },
  statusTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  statusTextInactive: {
    color: '#616161',
  },
  formActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#616161',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    marginLeft: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default BusinessDailyReportScreen;
