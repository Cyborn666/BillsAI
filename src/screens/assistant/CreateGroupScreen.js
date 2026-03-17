/**
 * CreateGroupScreen.js
 * Modern UI for creating a new expense sharing group
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import theme from '../../styles/theme';
import * as splitService from '../../services/splitService';

const CreateGroupScreen = ({ navigation }) => {
  // State for group details
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState('other');
  const [step, setStep] = useState(1); // 1: Group details, 2: Member selection
  
  // State for contacts
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(true);

  // Group type options
  const groupTypes = [
    { id: 'trip', icon: 'plane', label: 'Trip' },
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'couple', icon: 'heart', label: 'Couple' },
    { id: 'other', icon: 'list', label: 'Other' }
  ];

  // Fetch contacts on component mount
  useEffect(() => {
    fetchContacts();
  }, []);

  // Fetch contacts from API
  const fetchContacts = async () => {
    try {
      setContactsLoading(true);
      const response = await splitService.getRecentContacts();
      // Safe logging for debugging
      console.log('Contacts response:', JSON.stringify(response || {}));
      if (response && Array.isArray(response)) {
        // Extract and log each contact to debug
        const contactList = response
          .filter(item => item && item.splitUser) // Make sure we have valid items
          .map(item => item.splitUser);
        // Safe logging for debugging
        console.log('Processed contacts:', JSON.stringify(contactList || []));
        setContacts(contactList);
        setFilteredContacts(contactList);
      } else {
        console.log('Invalid response format or empty contacts');
        setContacts([]);
        setFilteredContacts([]);
      }
    } catch (error) {
      // Safe error handling
      console.error('Error fetching contacts:', error?.message || 'Unknown error');
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setContactsLoading(false);
    }
  };

  // Handle search
  const handleSearch = (text) => {
    setSearchQuery(text);
    
    // Safe logging
    console.log('Searching for:', text);
    console.log('Available contacts count:', contacts?.length || 0);
    if (!text || text.trim() === '') {
      setFilteredContacts(contacts);
      return;
    }
    
    const searchText = text.toLowerCase().trim();
    const filtered = contacts.filter(contact => {
      // Check if contact is valid
      if (!contact) return false;
      // Search in multiple fields
      const displayName = (contact.displayName || '').toLowerCase();
      const email = (contact.email || '').toLowerCase();
      const phone = (contact.phone || '').toLowerCase();
      
      return (
        displayName.includes(searchText) ||
        email.includes(searchText) ||
        phone.includes(searchText)
      );
    });
    // Safe logging
    console.log('Filtered contacts count:', filtered?.length || 0);
    setFilteredContacts(filtered);
  };

  // Toggle contact selection
  const toggleContact = (contact) => {
    if (selectedContacts.some(c => c._id === contact._id)) {
      setSelectedContacts(selectedContacts.filter(c => c._id !== contact._id));
    } else {
      setSelectedContacts([...selectedContacts, contact]);
    }
  };

  // Create group with selected contacts
  const createGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (selectedContacts.length === 0) {
      Alert.alert('Error', 'Please select at least one contact');
      return;
    }

    try {
      setIsLoading(true);
      const memberIds = selectedContacts.map(contact => contact._id);
      
      const response = await splitService.createSplitGroup({
        name: groupName,
        groupType: groupType,
        members: memberIds
      });

      if (response && response._id) {
        Alert.alert('Success', 'Group created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        throw new Error('Failed to create group');
      }
    } catch (error) {
      Alert.alert('Error', error?.message || 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  };

  // Next step button action
  const handleNextStep = () => {
    if (step === 1) {
      if (!groupName.trim()) {
        Alert.alert('Error', 'Please enter a group name');
        return;
      }
      setStep(2);
    } else {
      createGroup();
    }
  };

  // Render a contact item
  const renderContactItem = ({ item }) => {
    // Safety check for item
    if (!item) return null;
    const isSelected = selectedContacts.some(c => c._id === item._id);
    
    return (
      <TouchableOpacity
        style={[styles.contactItem, isSelected && styles.selectedContactItem]}
        onPress={() => toggleContact(item)}
        activeOpacity={0.7}
      >
        <View style={styles.contactInfo}>
          <View style={styles.avatarContainer}>
            {item.avatar ? (
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
            ) : (
              <Text style={styles.avatarText}>
                {(item.displayName?.charAt(0) || '').toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.contactName}>{item.displayName || 'Unnamed Contact'}</Text>
        </View>
        
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  // Render group type selection
  const renderGroupTypeSelection = () => (
    <View style={styles.typeSection}>
      <Text style={styles.sectionTitle}>Group Type</Text>
      <View style={styles.typeGrid}>
        {groupTypes.map(type => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.typeCard,
              groupType === type.id && styles.selectedTypeCard
            ]}
            onPress={() => setGroupType(type.id)}
          >
            <FontAwesome5
              name={type.icon}
              size={24}
              color={groupType === type.id ? theme.colors.primary : '#757575'}
            />
            <Text
              style={[
                styles.typeLabel,
                groupType === type.id && styles.selectedTypeLabel
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (step === 2) {
                setStep(1);
              } else {
                navigation.goBack();
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {step === 1 ? 'Create Group' : 'Add Members'}
          </Text>
          <TouchableOpacity
            style={[styles.nextButton, (!groupName.trim() && step === 1) && styles.disabledButton]}
            onPress={handleNextStep}
            disabled={isLoading || (!groupName.trim() && step === 1)}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.nextButtonText}>
                {step === 1 ? 'Next' : 'Create'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {step === 1 ? (
          /* Step 1: Group Details */
          <View style={styles.content}>
            <View style={styles.inputSection}>
              <Text style={styles.sectionTitle}>Group Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter a name for your group"
                value={groupName}
                onChangeText={setGroupName}
                placeholderTextColor="#9CA3AF"
                autoCapitalize="sentences"
                autoCorrect={false}
              />
            </View>
            
            {renderGroupTypeSelection()}
          </View>
        ) : (
          /* Step 2: Member Selection */
          <View style={styles.content}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search contacts"
                value={searchQuery}
                onChangeText={handleSearch}
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setFilteredContacts(contacts);
                  }}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            
            {contactsLoading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
            ) : (
              <>
                {selectedContacts.length > 0 && (
                  <View style={styles.selectedCount}>
                    <Text style={styles.selectedCountText}>
                      {selectedContacts.length} {selectedContacts.length === 1 ? 'contact' : 'contacts'} selected
                    </Text>
                  </View>
                )}
                
                <FlatList
                  data={filteredContacts}
                  renderItem={renderContactItem}
                  keyExtractor={(item) => item?._id || Math.random().toString()}
                  contentContainerStyle={styles.contactsList}
                  showsVerticalScrollIndicator={false}
                  ListHeaderComponent={
                    <Text style={styles.contactsHeader}>
                      {filteredContacts.length} contacts available
                    </Text>
                  }
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <MaterialIcons name="person-search" size={48} color="#D1D5DB" />
                      <Text style={styles.emptyText}>No contacts found</Text>
                    </View>
                  }
                />
              </>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  nextButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  typeSection: {
    marginBottom: 24,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  typeCard: {
    width: '48%',
    aspectRatio: 1.5,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    padding: 16,
  },
  selectedTypeCard: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  typeLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  selectedTypeLabel: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
  },
  selectedCount: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  selectedCountText: {
    color: '#4B5563',
    fontWeight: '500',
  },
  contactsList: {
    flexGrow: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedContactItem: {
    backgroundColor: '#F9FAFB',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  contactName: {
    fontSize: 16,
    color: '#111827',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  loader: {
    marginTop: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 16,
    color: '#9CA3AF',
  },
  contactsHeader: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    paddingVertical: 4,
  },
});

export default CreateGroupScreen;