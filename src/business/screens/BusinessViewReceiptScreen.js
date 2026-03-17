/**
 * Business View Receipt Screen
 * Displays receipt images for business expenses
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Dimensions,
  Alert,
  Share,
  Platform
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { format } from 'date-fns';
import theme from '../../styles/theme';
import { getExpenseDetails } from '../services/businessApiService';

const { width } = Dimensions.get('window');

const BusinessViewReceiptScreen = ({ route, navigation }) => {
  const { expenseId, receiptUrl } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expense, setExpense] = useState(null);
  const [imageAspectRatio, setImageAspectRatio] = useState(1);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  const scrollViewRef = useRef(null);
  const [currentScale, setCurrentScale] = useState(1);
  
  useEffect(() => {
    if (!receiptUrl && !expenseId) {
      setError('No receipt information provided');
      setLoading(false);
      return;
    }
    
    if (receiptUrl) {
      // Direct receipt URL provided
      setLoading(false);
    } else if (expenseId) {
      // Fetch expense details to get the receipt URL
      fetchExpenseDetails();
    }
  }, [expenseId, receiptUrl]);
  
  useEffect(() => {
    // Get image dimensions when receipt URL is available
    const url = receiptUrl || (expense?.receiptUrl);
    if (url) {
      // For the demo, we'll just use a static aspect ratio
      // In a real app, you'd use Image.getSize to get the dimensions
      setImageAspectRatio(0.75); // Default aspect ratio (4:3)
      
      // Simulate actual image loading
      setImageLoading(true);
      setTimeout(() => {
        setImageLoading(false);
      }, 1000);
    }
  }, [receiptUrl, expense]);
  
  const fetchExpenseDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getExpenseDetails(expenseId);
      setExpense(response);
      
      if (!response.receiptUrl) {
        setError('No receipt found for this expense');
      }
    } catch (err) {
      //console.error('Error fetching expense details:', err);
      setError('Failed to load expense details');
    } finally {
      setLoading(false);
    }
  };
  
  const handleImageLoad = () => {
    setImageLoading(false);
  };
  
  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };
  
  const shareReceipt = async () => {
    try {
      const url = receiptUrl || (expense?.receiptUrl);
      if (!url) {
        Alert.alert('Error', 'No receipt to share');
        return;
      }
      
      const result = await Share.share({
        title: 'Expense Receipt',
        message: `Check out this expense receipt: ${url}`,
        url: url // iOS only
      });
      
      if (result.action === Share.sharedAction) {
        //console.log('Shared successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share receipt');
    }
  };
  
  // Function to render expense details if available
  const renderExpenseDetails = () => {
    if (!expense) return null;
    
    return (
      <View style={styles.expenseDetails}>
        <Text style={styles.expenseTitle}>{expense.title || expense.name || 'Unnamed Expense'}</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount:</Text>
          <Text style={styles.detailValue}>${parseFloat(expense.amount || 0).toFixed(2)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>
            {expense.date ? format(new Date(expense.date), 'MMM d, yyyy') : 'N/A'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category:</Text>
          <Text style={styles.detailValue}>
            {expense.category ? formatCategory(expense.category) : 'Uncategorized'}
          </Text>
        </View>
        
        {expense.vendor && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Vendor:</Text>
            <Text style={styles.detailValue}>{expense.vendor}</Text>
          </View>
        )}
        
        {expense.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{expense.notes}</Text>
          </View>
        )}
      </View>
    );
  };
  
  const formatCategory = (category) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading receipt...</Text>
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
          onPress={expenseId ? fetchExpenseDetails : () => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>
            {expenseId ? 'Retry' : 'Go Back'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const receiptImageUrl = receiptUrl || (expense?.receiptUrl);
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receipt</Text>
        {receiptImageUrl && (
          <TouchableOpacity
            style={styles.shareButton}
            onPress={shareReceipt}
          >
            <MaterialIcons name="share" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Receipt Image */}
        {receiptImageUrl && (
          <View style={styles.imageContainer}>
            {imageLoading && (
              <View style={styles.imageLoadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.imageLoadingText}>Loading image...</Text>
              </View>
            )}
            
            {imageError ? (
              <View style={styles.imageErrorContainer}>
                <MaterialIcons name="broken-image" size={64} color={theme.colors.textTertiary} />
                <Text style={styles.imageErrorText}>Failed to load receipt image</Text>
              </View>
            ) : (
              <Image
                source={{ uri: receiptImageUrl }}
                style={[
                  styles.receiptImage,
                  { aspectRatio: imageAspectRatio },
                  imageLoading && { opacity: 0 }
                ]}
                resizeMode="contain"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}
          </View>
        )}
        
        {/* Expense Details */}
        {renderExpenseDetails()}
        
        {/* Download/Actions */}
        {receiptImageUrl && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                // In a real app, this would trigger a download
                Alert.alert('Download', 'Receipt download would start here in a real app');
              }}
            >
              <MaterialIcons name="cloud-download" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Download Receipt</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    padding: 16,
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
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  shareButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 24,
  },
  imageContainer: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingVertical: 16,
  },
  receiptImage: {
    width: width,
    backgroundColor: '#000',
  },
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  imageLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
  imageErrorContainer: {
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageErrorText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  expenseDetails: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  expenseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  notes: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 16,
  },
  notesLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  actionsContainer: {
    margin: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default BusinessViewReceiptScreen;
