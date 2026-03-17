import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../contexts/AuthContext';
import { deleteBusinessAccount } from '../services/businessApiService';

const BusinessDeleteAccountScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Confirmation phrase that user must type
  const confirmationPhrase = 'DELETE ACCOUNT';
  
  // Function to handle account deletion
  const handleDeleteAccount = async () => {
    // Validate inputs
    if (confirmation !== confirmationPhrase) {
      setError('Please type DELETE ACCOUNT exactly as shown to confirm');
      return;
    }
    
    if (!password) {
      setError('Please enter your password');
      return;
    }
    
    // Show final confirmation alert
    Alert.alert(
      'Delete Account Permanently',
      'This action cannot be undone. All your business data, invoices, clients, and settings will be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              setError('');
              
              // Call API to delete account
              await deleteBusinessAccount({ password, accountType: 'business' });
              
              // Log user out after successful deletion
              await logout();
              
              // No need to navigate - AuthContext will handle this
              // Show success message
              Alert.alert(
                'Account Deleted',
                'Your account has been successfully deleted. Thank you for using BillsAI.'
              );
            } catch (err) {
              // Handle error
              setError(err.message || 'Failed to delete account. Please try again.');
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: false }
    );
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.warningContainer}>
          <MaterialIcons name="warning" size={50} color="#FF3B30" />
          <Text style={styles.warningTitle}>Warning: Permanent Action</Text>
        </View>
        
        <Text style={styles.infoText}>
          Deleting your account will permanently remove all of your data, including:
        </Text>
        
        <View style={styles.listContainer}>
          <View style={styles.listItem}>
            <MaterialIcons name="check-circle" size={18} color="#FF3B30" />
            <Text style={styles.listText}>Business profile information</Text>
          </View>
          <View style={styles.listItem}>
            <MaterialIcons name="check-circle" size={18} color="#FF3B30" />
            <Text style={styles.listText}>All invoice records and history</Text>
          </View>
          <View style={styles.listItem}>
            <MaterialIcons name="check-circle" size={18} color="#FF3B30" />
            <Text style={styles.listText}>Client information and data</Text>
          </View>
          <View style={styles.listItem}>
            <MaterialIcons name="check-circle" size={18} color="#FF3B30" />
            <Text style={styles.listText}>Payment and transaction records</Text>
          </View>
          <View style={styles.listItem}>
            <MaterialIcons name="check-circle" size={18} color="#FF3B30" />
            <Text style={styles.listText}>All saved preferences and settings</Text>
          </View>
        </View>
        
        <Text style={styles.infoText}>
          This action cannot be undone. Once your account is deleted, it cannot be recovered.
        </Text>
        
        {/* Confirmation inputs */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            To confirm, please type "{confirmationPhrase}" below:
          </Text>
          <TextInput
            style={styles.input}
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder={`Type ${confirmationPhrase} here`}
            placeholderTextColor="#999999"
            autoCapitalize="characters"
          />
          
          <Text style={styles.label}>Enter your password:</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor="#999999"
            secureTextEntry
          />
          
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          
          <TouchableOpacity
            style={[
              styles.deleteButton,
              (confirmation !== confirmationPhrase || !password || loading) && styles.deleteButtonDisabled,
            ]}
            onPress={handleDeleteAccount}
            disabled={confirmation !== confirmationPhrase || !password || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <MaterialIcons name="delete-forever" size={20} color="#FFFFFF" />
                <Text style={styles.deleteButtonText}>Delete My Account</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  placeholder: {
    width: 40,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  warningContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginTop: 10,
  },
  infoText: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 15,
    lineHeight: 22,
  },
  listContainer: {
    marginBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  listText: {
    fontSize: 15,
    color: '#333333',
    marginLeft: 10,
  },
  inputContainer: {
    marginTop: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  errorText: {
    color: '#FF3B30',
    marginBottom: 15,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  deleteButtonDisabled: {
    backgroundColor: 'rgba(255, 59, 48, 0.5)',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cancelButton: {
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelButtonText: {
    color: '#4A6FFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default BusinessDeleteAccountScreen;
