/**
 * Mode Selection Screen for BillsAI app
 * Allows users to select between personal and business accounts
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Image,
  StatusBar
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../styles';

const ModeSelectionScreen = ({ navigation }) => {
  const { setAccountType } = useAuth();
  const [selectedMode, setSelectedMode] = useState(null);

  const handleModeSelect = (mode) => {
    setSelectedMode(mode);
  };

  const handleGetStarted = async () => {
    if (selectedMode) {
      // Set the account type in context
      await setAccountType(selectedMode);
      // Navigate to the login screen
      navigation.navigate('Login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFF8C2" barStyle="dark-content" />
      
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>
            Pay <Text style={styles.highlightBills}>bills</Text>,{' '}
            <Text style={styles.highlightRent}>rent</Text>,{'\n'}
            or buy <Text style={styles.highlightGroceries}>groceries</Text>.
          </Text>
          
          <Text style={styles.subheader}>
            We help hard-working employees get ahead on their finances.
          </Text>
        </View>
        
        <View style={styles.illustrationContainer}>
          <Image 
            source={require('../../assets/images/finance-illustration.png')} 
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.modeContainer}>
          <Text style={styles.modeTitle}>Select your account type</Text>
          
          <TouchableOpacity 
            style={[
              styles.modeButton, 
              selectedMode === 'personal' && styles.selectedModeButton
            ]}
            onPress={() => handleModeSelect('personal')}
          >
            <View style={styles.modeIconContainer}>
              <Text style={styles.modeIconText}>👤</Text>
            </View>
            <View style={styles.modeTextContainer}>
              <Text style={styles.modeButtonText}>Personal</Text>
              <Text style={styles.modeDescription}>Manage personal bills and expenses</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.modeButton, 
              selectedMode === 'business' && styles.selectedModeButton
            ]}
            onPress={() => handleModeSelect('business')}
          >
            <View style={styles.modeIconContainer}>
              <Text style={styles.modeIconText}>💼</Text>
            </View>
            <View style={styles.modeTextContainer}>
              <Text style={styles.modeButtonText}>Business</Text>
              <Text style={styles.modeDescription}>Track invoices and business expenses</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.getStartedButton,
            !selectedMode && styles.disabledButton
          ]}
          onPress={handleGetStarted}
          disabled={!selectedMode}
        >
          <Text style={styles.getStartedText}>Get started</Text>
          <Text style={styles.arrowIcon}>→</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8C2', // Light yellow background from the image
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  headerContainer: {
    marginTop: 20,
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 42,
    marginBottom: 16,
  },
  highlightBills: {
    backgroundColor: '#D1F4A6', // Light green
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  highlightRent: {
    backgroundColor: '#C6C4F9', // Light purple
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  highlightGroceries: {
    backgroundColor: '#FFD0D0', // Light pink
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  subheader: {
    fontSize: 16,
    lineHeight: 22,
    color: '#555',
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    height: 200,
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  modeContainer: {
    marginBottom: 30,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedModeButton: {
    borderColor: '#000',
  },
  modeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modeIconText: {
    fontSize: 20,
  },
  modeTextContainer: {
    flex: 1,
  },
  modeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 14,
    color: '#666',
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'black',
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignSelf: 'center',
    width: '80%',
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  getStartedText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  arrowIcon: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ModeSelectionScreen;
