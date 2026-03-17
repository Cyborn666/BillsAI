/**
 * Add Expense Screen for expense splitting functionality
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  FlatList,
  InteractionManager,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as imagePickerUtils from '../../utils/imagePickerUtils';
import theme from '../../styles/theme';
import * as splitService from '../../services/splitService';
import userService from '../../services/userService';
import { formatCurrency } from '../../utils/currencyUtils';

const CATEGORIES = [
  { id: 'FOOD', icon: 'fast-food', label: 'Food', color: '#FF5252' },
  { id: 'TRANSPORTATION', icon: 'car', label: 'Transport', color: '#448AFF' },
  { id: 'ENTERTAINMENT', icon: 'film', label: 'Entertainment', color: '#E040FB' },
  { id: 'SHOPPING', icon: 'cart', label: 'Shopping', color: '#FF9800' },
  { id: 'RENT', icon: 'home', label: 'Rent', color: '#4CAF50' },
  { id: 'UTILITIES', icon: 'flash', label: 'Utilities', color: '#FFC107' },
  { id: 'TRAVEL', icon: 'airplane', label: 'Travel', color: '#2196F3' },
  { id: 'HEALTH', icon: 'medical', label: 'Health', color: '#F44336' },
  { id: 'OTHER', icon: 'ellipsis-horizontal', label: 'Other', color: '#9E9E9E' },
];

const SPLIT_TYPES = [
  { id: 'equal', label: 'Equal', icon: 'equals' },
  { id: 'exact', label: 'Exact Amounts', icon: 'currency-usd' },
  { id: 'percentage', label: 'Percentages', icon: 'percent' },
  { id: 'shares', label: 'Shares', icon: 'pie-chart' },
];

const AddExpenseScreen = ({ navigation, route }) => {
  // Get params (optional group from route)
  const groupId = route.params?.groupId;
  const contactId = route.params?.contactId;

  // State variables
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [splitMethod, setSplitMethod] = useState('equal'); // 'equal' or 'custom'
  const [category, setCategory] = useState('OTHER');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [receiptImage, setReceiptImage] = useState(null);
  
  // Participants and splitting
  const [splitType, setSplitType] = useState('equal');
  const [splitProfile, setSplitProfile] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [payer, setPayer] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  
  // Used to prevent state updates on unmounted component
  const isMounted = useRef(true);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [showPayerSelector, setShowPayerSelector] = useState(false);
  const [showSplitTypeSelector, setShowSplitTypeSelector] = useState(false);

  // Handle cleanup to prevent memory leaks and animation issues
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      // Set mounted flag to false when component unmounts
      isMounted.current = false;
    };
  }, []);

  // Initialize component data
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        // Get user's profile
        const profile = await userService.getUserProfile();
        console.log('Current user profile:', profile); // Debug current user profile
        
        // Ensure the profile has an _id field (critical for expense creation)
        if (profile && !profile._id && profile.id) {
          profile._id = profile.id; // Use id as _id if _id is missing
        }
        
        console.log('Current user profile with ID:', profile?._id || profile?.id || 'No ID found');
        
        if (isMounted.current) {
          setSplitProfile(profile);
          // Set current user as default payer
          setPayer(profile);
        }

        // Add current user to participants by default
        if (isMounted.current) {
          setParticipants([{
            splitUser: profile,
            share: 0,
            included: true
          }]);
        }

        // Fetch groups and contacts
        const userGroups = await splitService.getSplitGroups();
        setGroups(userGroups || []);

        const recentContacts = await splitService.getRecentContacts();
        if (recentContacts && Array.isArray(recentContacts)) {
          setContacts(recentContacts.map((contact) => contact?.splitUser).filter(Boolean));
        } else {
          setContacts([]);
        }
        
        // If groupId is provided, fetch group and set as selected
        if (groupId) {
          const group = await splitService.getSplitGroup(groupId);
          setSelectedGroup(group);
          
          // Add group members as participants
          const memberParticipants = group.members.map(member => ({
            splitUser: member.splitUser,
            share: 0,
            included: true
          }));
          setParticipants(memberParticipants);
          setGroupMembers(group.members?.map(member => member?.splitUser).filter(Boolean) || []);
        }
        
        // If contactId is provided, fetch contact and add to participants
        if (contactId) {
          const contactDetails = await splitService.getBalanceWithUser(contactId);
          const contact = contactDetails.otherSplitUser;
          setParticipants([
            {
              splitUser: {
                id: profile._id,
                name: profile.fullName,
                email: profile.email,
                avatar: profile.avatar,
              },
              share: 0,
              included: true
            },
            {
              splitUser: contact,
              share: 0,
              included: true
            }
          ]);
        }
      } catch (error) {
        console.error('Error initializing expense data:', error);
        Alert.alert('Error', 'Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeData();
  }, [groupId, contactId]);
  
  // Calculate shares based on split type
  useEffect(() => {
    if (amount && participants.length > 0) {
      const includedParticipants = participants.filter(p => p.included);
      
      if (includedParticipants.length === 0) return;
      
      let updatedParticipants = [...participants];
      
      if (splitType === 'equal') {
        const equalShare = parseFloat(amount) / includedParticipants.length;
        updatedParticipants = participants.map(p => ({
          ...p,
          share: p.included ? equalShare : 0,
          owes: p.included && payer && p.splitUser._id !== payer._id ? equalShare : 0,
          isOwed: p.included && payer && p.splitUser._id === payer._id ? parseFloat(amount) - equalShare : 0
        }));
      } else if (splitType === 'percentage') {
        // For a new percentage split, distribute evenly
        const equalPercentage = 100 / includedParticipants.length;
        updatedParticipants = participants.map(p => {
          const amountShare = p.included ? (parseFloat(amount) * equalPercentage / 100) : 0;
          return {
            ...p,
            share: p.included ? equalPercentage : 0,
            owes: p.included && payer && p.splitUser._id !== payer._id ? amountShare : 0,
            isOwed: p.included && payer && p.splitUser._id === payer._id ? parseFloat(amount) - amountShare : 0
          };
        });
      } else if (splitType === 'shares') {
        // For a new shares split, give 1 share to each
        const totalShares = includedParticipants.length; // Initially 1 share each
        const shareValue = parseFloat(amount) / totalShares;
        
        updatedParticipants = participants.map(p => ({
          ...p,
          share: p.included ? 1 : 0,
          owes: p.included && payer && p.splitUser._id !== payer._id ? shareValue : 0,
          isOwed: p.included && payer && p.splitUser._id === payer._id ? parseFloat(amount) - shareValue : 0
        }));
      }
      
      setParticipants(updatedParticipants);
    }
  }, [splitType, amount, participants.filter(p => p.included).length, payer?._id]);
  
  // Handle date change
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };
  
  // Pick image for receipt
  const pickImage = async () => {
    try {
      const result = await imagePickerUtils.pickImage({
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (!result.cancelled && result.uri) {
        setReceiptImage(result.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select an image. Please try again.');
    }
  };
  
  // Update participant share
  const updateParticipantShare = (index, value) => {
    const newParticipants = [...participants];
    const newShare = parseFloat(value) || 0;
    newParticipants[index].share = newShare;
    
    // Update owes/isOwed values
    if (payer) {
      // For the participant whose share is being updated
      if (newParticipants[index].splitUser._id !== payer._id) {
        newParticipants[index].owes = newShare;
      }
      
      // Calculate total owed to payer
      let totalOwed = 0;
      newParticipants.forEach(p => {
        if (p.included && p.splitUser._id !== payer._id) {
          totalOwed += p.share || 0;
        }
      });
      
      // Update isOwed for payer
      const payerIndex = newParticipants.findIndex(p => p.splitUser._id === payer._id);
      if (payerIndex !== -1) {
        newParticipants[payerIndex].isOwed = totalOwed;
      }
    }
    
    setParticipants(newParticipants);
  };
  
  // Handle contact selection
  const handleContactSelection = (contact) => {
    // Check if contact is already in participants
    const existingParticipant = participants.find(
      (p) => p.splitUser.id === contact._id || p.splitUser._id === contact._id
    );
    
    if (!existingParticipant) {
      // Add contact to participants
      const updatedParticipants = [
        ...participants,
        {
          splitUser: {
            id: contact._id,
            _id: contact._id,
            name: contact.fullName,
            email: contact.email,
            avatar: contact.avatar,
          },
          share: 0,
          included: true,
        },
      ];
      
      setParticipants(updatedParticipants);
      
      // Recalculate split amount if we're using equal split
      if (splitMethod === 'equal') {
        const totalAmount = parseFloat(amount) || 0;
        const splitAmount = totalAmount / updatedParticipants.length;
        
        // Update shares for all participants
        const newParticipants = updatedParticipants.map(p => ({
          ...p,
          share: splitAmount,
        }));
        
        setParticipants(newParticipants);
      }
    }
    
    // Don't close the modal - allow selecting multiple contacts
    // setShowContactSelector(false);
  };
  
  // Handle completing contact selection
  const handleFinishContactSelection = () => {
    // Close the modal when done selecting
    setShowContactSelector(false);
  };
  
  // Handle group selection
  const handleGroupSelection = (group) => {
    // Set selected group
    setSelectedGroup(group);
    
    // Reset participants to just the current user + group members
    if (splitProfile) {
      const groupParticipants = [
        {
          splitUser: splitProfile,
          share: 0,
          included: true,
        },
      ];
      
      // Add group members as participants
      if (group.members && Array.isArray(group.members)) {
        group.members.forEach((member) => {
          // Don't add the current user twice
          if (member.id !== splitProfile.id) {
            groupParticipants.push({
              splitUser: member,
              share: 0,
              included: true,
            });
          }
        });
      }
      
      setParticipants(groupParticipants);
    }
    
    // Close the modal
    setShowGroupSelector(false);
  };
  
  // Handle payer selection
  const handlePayerSelection = (user) => {
    setPayer(user);
    setShowPayerSelector(false);
    
    // Recalculate owes/isOwed values based on new payer
    if (user) {
      const newParticipants = [...participants];
      let totalOwedToPayer = 0;
      
      newParticipants.forEach(p => {
        if (p.included) {
          if (p.splitUser._id !== user._id) {
            p.owes = p.share || 0;
            totalOwedToPayer += p.share || 0;
            p.isOwed = 0;
          } else {
            p.owes = 0;
            // We'll set isOwed below
          }
        } else {
          p.owes = 0;
          p.isOwed = 0;
        }
      });
      
      // Update isOwed for new payer
      const payerIndex = newParticipants.findIndex(p => p.splitUser._id === user._id);
      if (payerIndex !== -1) {
        newParticipants[payerIndex].isOwed = totalOwedToPayer;
      }
      
      setParticipants(newParticipants);
    }
  };
  
  // Toggle participant inclusion
  const toggleParticipantInclusion = (index) => {
    const newParticipants = [...participants];
    newParticipants[index].included = !newParticipants[index].included;
    
    // Recalculate shares based on the current split type
    if (splitType === 'equal' && amount) {
      const includedParticipants = newParticipants.filter(p => p.included);
      if (includedParticipants.length > 0) {
        const equalShare = parseFloat(amount) / includedParticipants.length;
        
        // Update each participant's share
        newParticipants.forEach(participant => {
          if (participant.included) {
            participant.share = equalShare;
            participant.isOwed = participant.splitUser._id === payer?._id ? 
              parseFloat(amount) - equalShare : -equalShare;
          } else {
            participant.share = 0;
            participant.isOwed = 0;
          }
        });
      }
    }
    
    setParticipants(newParticipants);
  };
  
  // Update amount
  const updateAmount = (value) => {
    setAmount(value);
    
    // Recalculate shares if equal split
    if (splitType === 'equal' && value) {
      const newParticipants = [...participants];
      const includedParticipants = newParticipants.filter(p => p.included);
      if (includedParticipants.length > 0) {
        const equalShare = parseFloat(value) / includedParticipants.length;
        let totalOwedToPayer = 0;
        
        newParticipants.forEach(p => {
          if (p.included) {
            p.share = equalShare;
            
            // Update owes/isOwed values
            if (payer) {
              if (p.splitUser._id !== payer._id) {
                p.owes = equalShare;
                totalOwedToPayer += equalShare;
              }
            }
          } else {
            p.share = 0;
            p.owes = 0;
          }
        });
      }
    }
    
    setParticipants(newParticipants);
  };
  
  // Validate before saving
  const validateExpense = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an expense title');
      return false;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return false;
    }
    
    if (!payer) {
      Alert.alert('Error', 'Please select who paid');
      return false;
    }
    
    const includedParticipants = participants.filter(p => p.included);
    if (includedParticipants.length === 0) {
      Alert.alert('Error', 'Please include at least one participant');
      return false;
    }
    
    if (splitType === 'percentage') {
      const totalPercentage = includedParticipants.reduce((sum, p) => sum + parseFloat(p.share || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        Alert.alert('Error', 'Percentages must add up to 100%');
        return false;
      }
    }
    
    return true;
  };
  
  // Save expense
  const saveExpense = async () => {
    if (!validateExpense()) return;
    
    setIsSaving(true);
    
    try {
      // Prepare expense data
      // Log participant data for debugging
      console.log('Current participants:', participants.map(p => ({
        name: p.splitUser?.name || 'Unknown',
        id: p.splitUser?._id || p.splitUser?.id || 'No ID',
        included: p.included,
      })));
      
      // Ensure payer has a valid ID
      if (payer && !payer._id && payer.id) {
        payer._id = payer.id; // Ensure payer has _id field
      }
      
      console.log('Selected payer ID:', payer?._id || payer?.id || 'No payer ID');
      
      const expenseData = {
        title,
        amount: parseFloat(amount),
        category,
        date: date.toISOString(),
        notes: description,
        receiptImageUrl: receiptImage,
        splitType,
        groupId: selectedGroup?._id,
        // Use the payer ID from the dropdown selection (or from id if _id is missing)
        paidBy: payer?._id || payer?.id,
        participants: participants
          .filter(p => p.included)
          .map(p => {
            // Ensure participant has valid ID
            let splitUser = p.splitUser;
            if (splitUser && !splitUser._id && splitUser.id) {
              splitUser._id = splitUser.id;
            }
            
            // If this participant is the current user, use the payer ID
            const isCurrentUser = (
              (splitUser?._id && payer?._id && splitUser._id === payer._id) ||
              (splitUser?.id && payer?.id && splitUser.id === payer.id)
            );
            
            // Use _id first, then id, then payer id if current user
            const participantId = splitUser?._id || splitUser?.id || (isCurrentUser ? payer?._id || payer?.id : null);
            
            console.log('Participant:', {
              name: splitUser?.name || 'Unknown',
              id: participantId || 'No ID',
              isCurrentUser,
            });
            
            return {
              splitUserId: participantId,
              share: parseFloat(p.share || 0),
            };
          }),
      };
      
      // Create expense
      await splitService.createSplitExpense(expenseData);
      
      Alert.alert(
        'Success',
        'Expense added successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error saving expense:', error);
      Alert.alert('Error', 'Failed to save expense. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add an Expense</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveExpense}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Expense Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expense Details</Text>

            {/* Title Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="What was this expense for?"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Amount Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            {/* Date Picker */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text>{date.toLocaleDateString()}</Text>
                <Icon name="calendar-outline" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                />
              )}
            </View>
                        {/* Split With Options */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Split With</Text>
              <View style={styles.splitWithOptions}>
                <TouchableOpacity 
                  style={[styles.splitWithOption, !selectedGroup && styles.splitWithOptionSelected]}
                  onPress={() => {
                    setShowContactSelector(true);
                    setSelectedGroup(null);
                  }}
                >
                  <Icon name="people" size={20} color={!selectedGroup ? theme.colors.white : '#5C6BC0'} />
                  <Text style={[styles.splitWithText, !selectedGroup && styles.splitWithTextSelected]}>Friends</Text>
                </TouchableOpacity>
    
                <TouchableOpacity 
                  style={[styles.splitWithOption, selectedGroup && styles.splitWithOptionSelected]}
                  onPress={() => setShowGroupSelector(true)}
                >
                  <Icon name="people-circle" size={20} color={selectedGroup ? theme.colors.white : '#26A69A'} />
                  <Text style={[styles.splitWithText, selectedGroup && styles.splitWithTextSelected]}>Group</Text>
                </TouchableOpacity>
              </View>
  
              {/* Selection Display */}
              <View style={styles.selectionDisplay}>
                {selectedGroup ? (
                  <View style={styles.selectedItem}>
                    <View style={[styles.selectedItemIcon, styles.groupIconBackground]}>
                      <Icon name="people-circle" size={16} color={theme.colors.white} />
                    </View>
                    <Text style={styles.selectedItemText}>{selectedGroup.name || 'Group'}</Text>
                    <TouchableOpacity 
                      style={styles.removeSelectionButton}
                      onPress={() => {
                        setSelectedGroup(null);
                        // Reset participants to just the current user
                        if (splitProfile) {
                          setParticipants([{
                            splitUser: splitProfile,
                            share: 0,
                            included: true
                          }]);
                          setPayer(splitProfile);
                        }
                      }}
                    >
                      <Icon name="close" size={14} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                ) : participants.filter(p => p.splitUser.id !== splitProfile?.id).length > 0 ? (
                  <ScrollView horizontal style={styles.selectedFriendsScroll}>
                    {participants.filter(p => p.splitUser.id !== splitProfile?.id).map((participant) => (
                      <View key={participant.splitUser.id} style={styles.selectedItem}>
                        <View style={[styles.selectedItemIcon, styles.friendIconBackground]}>
                          <Text style={styles.selectedItemInitial}>
                            {participant.splitUser.name ? participant.splitUser.name.charAt(0).toUpperCase() : '?'}
                          </Text>
                        </View>
                        <Text style={styles.selectedItemText}>{participant.splitUser.name}</Text>
                        <TouchableOpacity 
                          style={styles.removeSelectionButton}
                          onPress={() => {
                            // Remove participant
                            setParticipants(participants.filter(
                              p => p.splitUser.id !== participant.splitUser.id
                            ));
                          }}
                        >
                          <Icon name="close" size={14} color={theme.colors.text} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <TouchableOpacity 
                    style={styles.addSelectionButton}
                    onPress={() => setShowContactSelector(true)}
                  >
                    <Icon name="search" size={20} color={theme.colors.primary} />
                    <Text style={styles.addSelectionText}>Find people to split with</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Category Selection */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryScrollContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryContainer}
                >
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryItem,
                        category === cat.id && styles.categoryItemSelected
                      ]}
                      onPress={() => setCategory(cat.id)}
                    >
                      <View style={[styles.categoryIcon, category === cat.id ? styles.categoryIconSelected : { backgroundColor: cat.color + '20' }]}>
                        <Icon
                          name={cat.icon}
                          size={24}
                          color={category === cat.id ? theme.colors.white : cat.color}
                        />
                      </View>
                      <Text
                        style={[
                          styles.categoryLabel,
                          category === cat.id && styles.categoryLabelSelected
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Description/Notes */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.inputField, styles.notesInput]}
                placeholder="Add notes about this expense"
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Receipt Image */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Receipt Image (Optional)</Text>
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={pickImage}
              >
                {receiptImage ? (
                  <Image source={{ uri: receiptImage }} style={styles.receiptImage} />
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <Icon name="camera-outline" size={24} color={theme.colors.textLight} />
                    <Text style={styles.imagePickerText}>Add Receipt</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Payer Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Who Paid?</Text>
            <Text style={styles.sectionSubtitle}>Select who paid for this expense (can be any participant)</Text>
            <TouchableOpacity
              style={[styles.dropdown, styles.payerDropdown]}
              onPress={() => setShowPayerSelector(true)}
            >
              <View style={styles.payerInfo}>
                {payer && (
                  <View style={styles.payerInfoContent}>
                    <View style={[styles.payerAvatar, styles.payerDropdownAvatar]}>
                      <Text style={styles.payerAvatarText}>
                        {payer.fullName ? payer.fullName.charAt(0).toUpperCase() : '?'}
                      </Text>
                    </View>
                    <Text style={styles.payerName}>{payer.fullName || 'Unknown'}</Text>
                  </View>
                )}
              </View>
              <Icon name="chevron-down-outline" size={20} color={theme.colors.gray} />
            </TouchableOpacity>
          </View>

          {/* Split Options Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Split Type</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowSplitTypeSelector(true)}
            >
              <Text style={styles.dropdownText}>
                {SPLIT_TYPES.find(type => type.id === splitType)?.label || 'Equal Split'}
              </Text>
              <Icon name="chevron-down-outline" size={20} color={theme.colors.gray} />
            </TouchableOpacity>
          </View>

          {/* Participants Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Participants</Text>
             {/*<TouchableOpacity
                style={styles.addParticipantButton}
                onPress={() => setShowContactSelector(true)}
              >
                <Icon name="person-add-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.addParticipantText}>Add</Text>
              </TouchableOpacity>*/}
            </View>

            {/* Participants list */}
            {participants && participants.map((participant, index) => (
              <View key={participant?.splitUser?._id || `participant-${index}`} style={styles.participantItem}>
                <View style={styles.participantInfo}>
                  <View style={styles.checkboxContainer}>
                    <TouchableOpacity
                      style={[
                        styles.checkbox,
                        participant.included && styles.checkboxSelected
                      ]}
                      onPress={() => toggleParticipantInclusion(index)}
                    >
                      {participant.included && (
                        <Icon name="checkmark" size={16} color={theme.colors.white} />
                      )}
                    </TouchableOpacity>
                  </View>
                  <View style={styles.participantAvatar}>
                    <Text style={styles.participantAvatarText}>
                      {(participant?.splitUser?.fullName || participant?.splitUser?.name || participant?.splitUser?.displayName) ?
                        (participant.splitUser.fullName || participant.splitUser.name || participant.splitUser.displayName).charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                  <View style={styles.participantNameContainer}>
                    <Text style={styles.participantName}>
                      {participant?.splitUser?.fullName || participant?.splitUser?.name || participant?.splitUser?.displayName || 'Unknown'}
                      {participant?.splitUser && participant.splitUser._id && payer && payer._id && participant.splitUser._id === payer._id ? ' (Paid)' : ''}
                    </Text>
                    {participant?.splitUser && payer && participant.splitUser._id !== payer._id && participant.included && (
                      <Text style={styles.owesText}>
                        Owes: {formatCurrency(participant.owes || 0)}
                      </Text>
                    )}
                    {participant?.splitUser && payer && participant.splitUser._id === payer._id && participant.included && (
                      <Text style={styles.isOwedText}>
                        Is owed: {formatCurrency(participant.isOwed || 0)}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Remove participant button */}
                {participant?.splitUser && participant?.splitUser?._id && splitProfile?.id && participant.splitUser._id !== splitProfile.id && (
                  <TouchableOpacity
                    style={styles.removeParticipantButton}
                    onPress={() => {
                      // Use InteractionManager to defer the update until after animations
                      InteractionManager.runAfterInteractions(() => {
                        if (isMounted.current) {
                          setParticipants(currentParticipants => 
                            currentParticipants.filter(
                              p => !p.splitUser || p.splitUser._id !== participant.splitUser._id
                            )
                          );
                        }
                      });
                    }}
                  >
                    <Icon name="close-circle-outline" size={22} color={theme.colors.error} />
                  </TouchableOpacity>
                )}
    
                {participant.included && (
                  <View style={styles.participantShare}>
                    {splitType === 'equal' ? (
                      <Text style={styles.shareText}>
                        {formatCurrency(parseFloat(amount || 0) / (participants?.filter(p => p?.included)?.length || 1))}
                      </Text>
                    ) : splitType === 'exact' ? (
                      <TextInput
                        style={styles.shareInput}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        value={participant.share?.toString() || ''}
                        onChangeText={(text) => updateParticipantShare(index, text)}
                      />
                    ) : splitType === 'percentage' ? (
                      <View style={styles.percentageContainer}>
                        <TextInput
                          style={styles.percentageInput}
                          keyboardType="decimal-pad"
                          placeholder="0"
                          value={participant.share?.toString() || ''}
                          onChangeText={(text) => updateParticipantShare(index, text)}
                        />
                        <Text style={styles.percentageSymbol}>%</Text>
                      </View>
                    ) : (
                      <TextInput
                        style={styles.shareInput}
                        keyboardType="numeric"
                        placeholder="1"
                        value={participant.share?.toString() || ''}
                        onChangeText={(text) => updateParticipantShare(index, text)}
                      />
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Contact Selector Modal */}
      <Modal
        visible={showContactSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowContactSelector(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select People</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowContactSelector(false)}
              >
                <Icon name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Display selected participants */}
            {participants.length > 0 && (
              <View style={styles.selectedParticipantsContainer}>
                <Text style={styles.selectedParticipantsTitle}>Selected</Text>
                <FlatList
                  data={participants}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.splitUser._id || item.splitUser.id}
                  renderItem={({ item }) => (
                    <View style={styles.selectedParticipantItem}>
                      <TouchableOpacity 
                        style={styles.selectedParticipantAvatar}
                        onPress={() => {
                          // Remove participant when avatar is tapped
                          const updatedParticipants = participants.filter(
                            p => p.splitUser._id !== item.splitUser._id && p.splitUser.id !== item.splitUser.id
                          );
                          setParticipants(updatedParticipants);
                        }}
                      >
                        {item.splitUser.avatar ? (
                          <Image source={{ uri: item.splitUser.avatar }} style={styles.selectedAvatarImage} />
                        ) : (
                          <Text style={styles.selectedAvatarText}>
                            {item.splitUser.name ? item.splitUser.name.charAt(0).toUpperCase() : '?'}
                          </Text>
                        )}
                        <View style={styles.removeIndicator}>
                          <Text style={styles.removeIndicatorText}>×</Text>
                        </View>
                      </TouchableOpacity>
                      <Text style={styles.selectedParticipantName} numberOfLines={1}>
                        {item.splitUser.name || item.splitUser.fullName || 'Unknown'}
                      </Text>
                    </View>
                  )}
                />
              </View>
            )}

            <ContactSelectorContent 
              onSelectContact={handleContactSelection}
            />

            {/* Done button */}
            <TouchableOpacity 
              style={styles.doneButton}
              onPress={handleFinishContactSelection}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Split Type Selector Modal */}
      <Modal
        visible={showSplitTypeSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSplitTypeSelector(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Split Type</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowSplitTypeSelector(false)}
              >
                <Icon name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {SPLIT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={styles.modalOption}
                onPress={() => {
                  setSplitType(type.id);
                  setShowSplitTypeSelector(false);
                }}
              >
                <View style={styles.modalOptionContent}>
                  <MaterialCommunityIcons
                    name={type.icon}
                    size={24}
                    color={theme.colors.primary}
                    style={styles.modalOptionIcon}
                  />
                  <View>
                    <Text style={styles.modalOptionTitle}>{type.label}</Text>
                    <Text style={styles.modalOptionDescription}>
                      {type.id === 'equal' && 'Split the bill equally between all participants'}
                      {type.id === 'percentage' && 'Split by percentage of the total'}
                      {type.id === 'shares' && 'Split by shares (e.g. 1 share, 2 shares)'}
                      {type.id === 'exact' && 'Enter exact amounts for each person'}
                    </Text>
                  </View>
                </View>
                {splitType === type.id && (
                  <Icon name="checkmark" size={24} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </Modal>
      
      {/* Payer Selector Modal */}
      <Modal
        visible={showPayerSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPayerSelector(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Who Paid?</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowPayerSelector(false)}
              >
                <Icon name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Select who paid for this expense. Any participant can be the payer.</Text>

            {participants.length > 0 ? (
              <FlatList
                data={participants}
                keyExtractor={(item) => item.splitUser._id || item.splitUser.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalOption}
                    onPress={() => {
                      setPayer(item.splitUser);
                      setShowPayerSelector(false);
                    }}
                  >
                    <View style={styles.modalOptionContent}>
                      <View style={[styles.payerAvatar, payer && payer._id === item.splitUser._id ? styles.selectedPayerAvatar : null]}>
                        <Text style={styles.payerAvatarText}>
                          {(item.splitUser.fullName || item.splitUser.name) ? (item.splitUser.fullName || item.splitUser.name).charAt(0).toUpperCase() : '?'}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.modalOptionTitle}>{item.splitUser.fullName || item.splitUser.name || 'Unknown'}</Text>
                        {item.splitUser._id === splitProfile?.id && (
                          <Text style={styles.modalOptionDescription}>You</Text>
                        )}
                      </View>
                    </View>
                    {payer && payer._id === item.splitUser._id && (
                      <Icon name="checkmark" size={24} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.payerEmptyStateContainer}>
                <Text style={styles.payerEmptyStateText}>No participants added yet. Add participants to select who paid.</Text>
                <TouchableOpacity
                  style={styles.payerEmptyStateButton}
                  onPress={() => {
                    setShowPayerSelector(false);
                    setShowContactSelector(true);
                  }}
                >
                  <Text style={styles.payerEmptyStateButtonText}>Add Participants</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
      
      {/* Group Selector Modal */}
      <Modal
        visible={showGroupSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGroupSelector(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Group</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowGroupSelector(false)}
              >
                <Icon name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <GroupSelectorContent 
              onSelectGroup={handleGroupSelection}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

// Contact selector content component
const ContactSelectorContent = ({ onSelectContact }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [recentContacts, setRecentContacts] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Load recent contacts on component mount - using dummy recent contacts for now
  useEffect(() => {
    // Instead of loading from splitService, we'll use an empty array or recent user history if available
    setRecentContacts([]);
    
    // If we had a way to get recent contacts from user history, we would use it here
    // For now, this is just a placeholder until we implement proper contact history
  }, []);

  // Search for users when query changes
  const handleSearch = async (query) => {
    if (query.trim().length === 0) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      // Server search is by username, so let's pass the query as is
      // The server will do partial matching on the username field
      const result = await userService.searchUsers(query);
      
      // If we have results, use them
      if (result.users && result.users.length > 0) {
        // Sort results to prioritize matches by fullName first
        const sortedUsers = [...result.users].sort((a, b) => {
          // Check if fullName contains the query (case insensitive)
          const aFullNameMatch = a.fullName?.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
          const bFullNameMatch = b.fullName?.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
          
          // Prioritize fullName matches
          return bFullNameMatch - aFullNameMatch;
        });
        
        setSearchResults(sortedUsers);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce((text) => handleSearch(text), 500),
    []
  );

  const handleChangeText = (text) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  return (
    <View style={styles.contactSelectorContainer}>
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, or phone"
          value={searchQuery}
          onChangeText={handleChangeText}
          autoFocus
          placeholderTextColor="#9CA3AF"
        />
      </View>
      
      {isSearching ? (
        <View style={styles.centeredLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : hasSearched && searchQuery.length > 0 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => onSelectContact(item)}
            >
              <View style={styles.contactAvatar}>
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>
                    {item.fullName ? item.fullName.charAt(0).toUpperCase() : (item.username ? item.username.charAt(0).toUpperCase() : '?')}
                  </Text>
                )}
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.fullName || item.username || 'Unknown'}</Text>
                {item.email && (
                  <Text style={styles.contactDetail}>{item.email}</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No users found</Text>
            </View>
          }
          contentContainerStyle={styles.contactList}
        />
      ) : (
        <FlatList
          data={recentContacts}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => onSelectContact(item)}
            >
              <View style={styles.contactAvatar}>
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>
                    {item.fullName ? item.fullName.charAt(0).toUpperCase() : (item.username ? item.username.charAt(0).toUpperCase() : '?')}
                  </Text>
                )}
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.fullName || item.username || 'Unknown'}</Text>
                {item.email && (
                  <Text style={styles.contactDetail}>{item.email}</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListHeaderComponent={
            <Text style={styles.contactsHeader}>Recent Contacts</Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No recent contacts</Text>
            </View>
          }
          contentContainerStyle={styles.contactList}
        />
      )}
    </View>
  );
};

// Group selector content component
const GroupSelectorContent = ({ onSelectGroup }) => {
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadGroups = async () => {
      setIsLoading(true);
      try {
        const userGroups = await splitService.getSplitGroups();
        setGroups(userGroups || []);
      } catch (error) {
        console.error('Error loading groups:', error);
        Alert.alert('Error', 'Failed to load groups. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadGroups();
  }, []);

  return (
    <View style={styles.groupSelectorContainer}>
      {isLoading ? (
        <View style={styles.centeredLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.groupItem}
              onPress={() => onSelectGroup(item)}
            >
              <View style={styles.groupAvatar}>
                <Icon name="people-circle" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.groupDetail}>{item.members.length} members</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No groups found</Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => Alert.alert('Create Group', 'Navigate to Create Group screen')}
              >
                <Text style={styles.emptyStateButtonText}>Create Group</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={styles.groupList}
        />
      )}
    </View>
  );
};

// Debounce utility function
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  centeredLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 50,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  modalCloseButton: {
    padding: 8,
  },
  
  // Contact Selector Styles
  contactSelectorContainer: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    margin: 16,
    height: 50,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    height: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactList: {
    padding: 16,
  },
  contactsHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  contactDetail: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: theme.colors.white,
    fontWeight: '500',
  },
  
  // Group Selector Styles
  groupSelectorContainer: {
    flex: 1,
  },
  groupList: {
    padding: 16,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  groupDetail: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.white,
    marginBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
    letterSpacing: 0.4,
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.text,
    fontSize: 16,
  },
  section: {
    backgroundColor: theme.colors.white,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 8,
    
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  notesInput: {
    minHeight: 100,
    backgroundColor: '#F9FAFB',
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    textAlignVertical: 'top',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  categoryScrollContainer: {
    marginTop: 6,
    marginBottom: 12,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 18,
    width: 70,
  },
  categoryIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  categoryIconSelected: {
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: '#D1E0FD',
  },
  categoryLabel: {
    fontSize: 12,
    marginTop: 4,
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  categoryLabelSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  imagePickerButton: {
    borderWidth: 0,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    backgroundColor: '#F9FAFB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  imagePickerPlaceholder: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    margin: 4,
  },
  imagePickerText: {
    marginTop: 10,
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  receiptImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 12,
  },
  payerSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 10,
  },
  payerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  payerInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  payerDropdown: {
    height: 56,
  },
  payerDropdownAvatar: {
    marginRight: 0,
  },
  payerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedPayerAvatar: {
    borderWidth: 2,
    borderColor: '#D1E0FD',
  },
  payerAvatarText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  payerName: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
    marginLeft: 10,
  },
  splitTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  dropdown: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
  },
  dropdownText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalOptionIcon: {
    marginRight: 12,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  modalOptionDescription: {
    fontSize: 14,
    color: '#718096',
    maxWidth: '90%',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  payerEmptyStateContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payerEmptyStateText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 16,
  },
  payerEmptyStateButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  payerEmptyStateButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 0,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  participantAvatarText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  participantNameContainer: {
    marginLeft: 10,
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  owesText: {
    fontSize: 14,
    color: '#D32F2F',
    marginTop: 2,
  },
  isOwedText: {
    fontSize: 14,
    color: '#2E7D32',
    marginTop: 2,
  },
  participantShare: {
    minWidth: 100,
    alignItems: 'flex-end',
  },
  removeParticipantButton: {
    padding: 8,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  shareInput: {
    height: 40,
    borderWidth: 0,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentageInput: {
    width: 60,
    textAlign: 'right',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  percentageSymbol: {
    marginLeft: 2,
    color: theme.colors.text,
  },
  // Split With Styles
  splitWithOptions: {
    flexDirection: 'row',
    marginVertical: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  groupIconBackground: {
    backgroundColor: '#26A69A',
  },
  friendIconBackground: {
    backgroundColor: '#5C6BC0',
  },
  splitWithOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  splitWithOptionSelected: {
    backgroundColor: theme.colors.primary,
  },
  splitWithText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    letterSpacing: 0.2,
  },
  splitWithTextSelected: {
    color: theme.colors.white,
  },
  selectionDisplay: {
    marginTop: 12,
    marginBottom: 8,
    minHeight: 48,
    borderWidth: 0,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedFriendsScroll: {
    flexGrow: 0,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 10,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#D1E0FD',
  },
  selectedItemIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  selectedItemInitial: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectedItemText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
  },
  removeSelectionButton: {
    marginLeft: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  addSelectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  addSelectionText: {
    color: theme.colors.primary,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },



  // Selected participants styles
  selectedParticipantsContainer: {
    marginVertical: 10,
    paddingHorizontal: 16,
  },
  selectedParticipantsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  selectedParticipantItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 60,
  },
  selectedParticipantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  selectedAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  selectedAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  selectedParticipantName: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
  },
  removeIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  removeIndicatorText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  
  // Done button styles
  doneButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AddExpenseScreen;
