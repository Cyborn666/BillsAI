/**
 * Business Subscription Support Screen
 * Provides 24/7 subscription support and assistance
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import CustomHeader from '../components/CustomHeader';
import theme from '../../styles/theme';
import { getSupportMessages, sendSupportMessage, markMessagesAsRead , sendSubscriptionSupportMessage} from '../services/SubscriptionSupportService';
import { sendGeneralSupportMessage } from '../services/GeneralSupportService';


// Category selector component (defined outside the main component to avoid re-creation)
const CategorySelector = ({ categories, selectedCategory, onSelectCategory }) => (
  <View style={styles.categoriesContainer}>
    <Text style={styles.sectionTitle}>What can we help you with?</Text>
    <View style={styles.categoriesList}>
      {categories.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.categoryButton,
            selectedCategory === item.id && styles.selectedCategory,
          ]}
          onPress={() => onSelectCategory(item.id)}
        >
          <Ionicons
            name={item.icon}
            size={24}
            color={selectedCategory === item.id ? '#FFFFFF' : theme.colors.primary}
          />
          <Text style={[
            styles.categoryLabel,
            selectedCategory === item.id && styles.selectedCategoryText,
          ]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const BusinessSubscriptionSupportScreen = ({ navigation, route }) => {
  const [messageText, setMessageText] = useState('');
  const [category, setCategory] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const scrollViewRef = useRef(null);
  const [isSupportSending, setIsSupportSending] = useState(false);
  const [isSupportSentSuccess, setIsSupportSentSuccess] = useState(false);
  
  // Get subscription data if passed from previous screen
  const { subscriptionData } = route.params || {};
  // Support categories
  const supportCategories = [
    { id: 'billing', label: 'Billing Issues', icon: 'card-outline' },
    { id: 'account', label: 'Account Management', icon: 'person-outline' },
    { id: 'features', label: 'Premium Features', icon: 'star-outline' },
    { id: 'cancellation', label: 'Cancellation Help', icon: 'close-circle-outline' },
    { id: 'technical', label: 'Technical Support', icon: 'settings-outline' },
  ];

  // Fetch messages when component mounts
  useEffect(() => {
    fetchMessages(true);
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }
  }, [messages]);

  const fetchMessages = async (forceRefresh = false) => {
    setIsLoadingMessages(true);
    try {
      const fetchedMessages = await getSupportMessages({
        forceRefresh,
        onError: (error) => {
          //console.error(`Error loading messages: ${error}`);
        },
      });
      setMessages(fetchedMessages);
      
      // Mark unread messages as read
      const unreadIds = fetchedMessages
        .filter(msg => !msg.read)
        .map(msg => msg.id);
        
      if (unreadIds.length > 0) {
        await markMessagesAsRead(unreadIds);
      }
    } catch (error) {
      //console.error('Error fetching messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendSupportRequest = async () => {
    if (!messageText) {
      alert('Please enter your message');
      return;
    }
    setIsSupportSending(true);
    try {
      await sendGeneralSupportMessage(
        {
          content: messageText,
          category: 'subscription',
          subject: 'Subscription Support'
        },
        {
          onError: (error) => {
            //console.error(`Error sending message: ${error}`);
          }
        }
      );
      setIsSupportSending(false);
      setIsSupportSentSuccess(true);
      setTimeout(() => {
        setMessageText('');
        setIsSupportSentSuccess(false);
      }, 3000);
    } catch (error) {
      //console.error('Error sending message:', error);
      setIsSupportSending(false);
    }

  }

      

  const handleSendRequest = async () => {
    if (!messageText || !category) {
      // Ensure user has selected category and entered message
      //console.warn('Please select a category and enter your message');
      return;
    }

    setIsSending(true);
    
    try {
      await sendSupportMessage(
        { 
          content: messageText,
          category: category 
        },
        {
          onError: (error) => {
            //console.error(`Error sending message: ${error}`);
          }
        }
      );
      
      // Success! Refresh messages to show the new one
      await fetchMessages(true);
      setIsSending(false);
      setSentSuccess(true);
      setMessageText('');
      setCategory('');
      
      // Reset after showing success message
      setTimeout(() => {
        setSentSuccess(false);
      }, 3000);
    } catch (error) {
      //console.error('Error sending message:', error);
      setIsSending(false);
    }
  };



  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomHeader
        title="Subscription Support"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.supportHeader}>
            <Ionicons name="headset-outline" size={36} color={theme.colors.primary} />
            <Text style={styles.supportTitle}>24/7 Subscription Support</Text>
            <Text style={styles.supportSubtitle}>
              Our support team is available anytime to help with your subscription needs
            </Text>
          </View>

          {subscriptionData && (
            <View style={styles.subscriptionInfo}>
              <Text style={styles.infoTitle}>Your Subscription</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Plan:</Text>
                <Text style={styles.infoValue}>
                  {subscriptionData.planId?.charAt(0).toUpperCase() + subscriptionData.planId?.slice(1) || 'Premium'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status:</Text>
                <Text style={[
                  styles.infoValue, 
                  subscriptionData.status === 'active' ? styles.activeStatus : styles.inactiveStatus
                ]}>
                  {subscriptionData.status?.charAt(0).toUpperCase() + subscriptionData.status?.slice(1) || 'Active'}
                </Text>
              </View>
              {subscriptionData.currentPeriodEnd && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Renews:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(subscriptionData.currentPeriodEnd).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          )}

          <CategorySelector
            categories={supportCategories}
            selectedCategory={category}
            onSelectCategory={setCategory}
          />

          {/* Display support messages */}
          {isLoadingMessages ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading support messages...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.noMessagesContainer}>
              <Ionicons name="chatbubble-outline" size={40} color="#BDBDBD" />
              <Text style={styles.noMessagesText}>No previous messages. Start a conversation below.</Text>
            </View>
          ) : (
            <View style={styles.messagesContainer}>
              <Text style={styles.sectionTitle}>Support Conversation</Text>
              <ScrollView 
                style={styles.messagesScrollView}
                ref={scrollViewRef}
                contentContainerStyle={styles.messagesContent}
              >
                {messages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageItem,
                      msg.type === 'user' ? styles.userMessage :
                      msg.type === 'agent' ? styles.agentMessage :
                      styles.systemMessage
                    ]}
                  >
                    {msg.type === 'agent' && (
                      <View style={styles.agentInfo}>
                        {msg.agentAvatar && (
                          <View style={styles.avatarContainer}>
                            <Text style={styles.avatarText}>{msg.agentName?.charAt(0) || 'A'}</Text>
                          </View>
                        )}
                        <Text style={styles.agentName}>{msg.agentName}</Text>
                      </View>
                    )}
                    <Text style={styles.messageText}>{msg.content}</Text>
                    <Text style={styles.messageTime}>
                      {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
          
          {/* New message input */}
          <View style={styles.messageSection}>
            <Text style={styles.sectionTitle}>Your Message</Text>
            <TextInput
              style={styles.messageInput}
              multiline
              placeholder="Describe your issue or question here..."
              value={messageText}
              onChangeText={setMessageText}
              textAlignVertical="top"
            />
          </View>

            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendSupportRequest}
              disabled={isSupportSending || !messageText }
            >
              {isSupportSending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                  <Text style={styles.sendButtonText}>Send Support Request</Text>
                </>
              )}
            </TouchableOpacity>

          {isSupportSentSuccess && (
            <View style={styles.successMessage}>
              <Ionicons name="checkmark-circle" size={20} color="green" />
              <Text style={styles.successText}>Message sent successfully!</Text>
            </View>
          )}

          <View style={styles.faqSection}>
            <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
            
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>How do I update my payment method?</Text>
              <Text style={styles.faqAnswer}>
                Go to the Payment Settings section in your profile and select "Update Payment Method".
              </Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>When will I be charged for my subscription?</Text>
              <Text style={styles.faqAnswer}>
                Your subscription renewal will be charged automatically on your billing date. You can find this date in your subscription details.
              </Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>How do I cancel my subscription?</Text>
              <Text style={styles.faqAnswer}>
                You can disable auto-renewal in the subscription screen. Your subscription will remain active until the end of your current billing period.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  supportHeader: {
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
  },
  supportTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: 8,
  },
  supportSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
  subscriptionInfo: {
    backgroundColor: '#F5F7FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    flex: 1,
  },
  activeStatus: {
    color: '#4CAF50',
  },
  inactiveStatus: {
    color: '#F44336',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  categoriesContainer: {
    marginBottom: 24,
  },
  categoriesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedCategory: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryLabel: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  selectedCategoryText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  messageSection: {
    marginBottom: 24,
  },
  messageInput: {
    backgroundColor: '#F5F7FF',
    borderRadius: 8,
    padding: 12,
    height: 120,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  successMessage: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  successText: {
    color: '#2E7D32',
    marginLeft: 8,
    flex: 1,
  },
  faqSection: {
    marginBottom: 32,
  },
  faqTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  faqItem: {
    marginBottom: 16,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FF',
    borderRadius: 8,
    marginBottom: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#666666',
    fontSize: 14,
  },
  noMessagesContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FF',
    borderRadius: 8,
    marginBottom: 24,
  },
  noMessagesText: {
    marginTop: 12,
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
  },
  // Message styles
  messagesContainer: {
    marginBottom: 24,
  },
  messagesScrollView: {
    maxHeight: 300,
    backgroundColor: '#F5F7FF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  messagesContent: {
    paddingVertical: 8,
  },
  messageItem: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#E3F2FD',
    borderBottomRightRadius: 0,
  },
  agentMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 0,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: '#F5F5F5',
    width: '90%',
  },
  agentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  agentName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    color: '#9E9E9E',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
});

export default BusinessSubscriptionSupportScreen;
