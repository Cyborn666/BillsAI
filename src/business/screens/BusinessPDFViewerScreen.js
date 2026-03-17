import React, { useState } from 'react';
import { 
  StyleSheet, 
  Dimensions, 
  View, 
  Text,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Share,
  Alert
} from 'react-native';
import Pdf from 'react-native-pdf';
import ReactNativeBlobUtil from 'react-native-blob-util';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import theme from '../../styles/theme';

const BusinessPDFViewerScreen = ({ route, navigation }) => {
  const { pdfPath, invoiceNumber } = route.params || {};
  const [loading, setLoading] = useState(false);
  
  // Handle source depending on if we have a path or base64 data
  const source = pdfPath ? { uri: pdfPath } : null;
  
  // Function to share the PDF
  const handleSharePDF = async () => {
    if (!pdfPath) {
      Alert.alert('Error', 'No PDF file available to share.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Read the PDF file as base64
      const fileBase64 = await ReactNativeBlobUtil.fs.readFile(pdfPath, 'base64');
      const fileUri = `data:application/pdf;base64,${fileBase64}`;
      
      // Use React Native's Share API
      await Share.share({
        title: `Invoice #${invoiceNumber || 'PDF'}`,
        message: `Invoice #${invoiceNumber || 'PDF'}`,
        url: fileUri,
      });
      
    } catch (error) {
      //console.error('Error sharing PDF:', error);
      Alert.alert('Error', 'Failed to share the PDF file. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (!source) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No PDF data available</Text>
          <TouchableOpacity 
            style={styles.buttonContainer}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {invoiceNumber ? `Invoice #${invoiceNumber}` : 'Invoice PDF'}
        </Text>
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={handleSharePDF}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <MaterialIcons name="share" size={24} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.pdfContainer}>
        <Pdf
          source={source}
          onLoadComplete={(numberOfPages, filePath) => {
            //console.log(`PDF loaded with ${numberOfPages} pages`);
          }}
          onPageChanged={(page, numberOfPages) => {
            //console.log(`Current page: ${page}`);
          }}
          onError={(error) => {
            //console.log('PDF loading error:', error);
          }}
          onPressLink={(uri) => {
            //console.log(`Link pressed: ${uri}`);
          }}
          style={styles.pdf}
          renderActivityIndicator={() => <ActivityIndicator color={theme.colors.primary} size="large" />}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
    color: theme.colors.text,
  },
  shareButton: {
    padding: 8,
  },
  pdfContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    backgroundColor: '#f0f0f0',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 20,
    color: theme.colors.error,
  },
  buttonContainer: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default BusinessPDFViewerScreen;
