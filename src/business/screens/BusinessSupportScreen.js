/**
 * Business Support Screen
 * Allows business users to get help and contact support
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../styles/theme';
import { sendGeneralSupportMessage } from '../services/GeneralSupportService';

// Support options component with icon
const SupportOption = ({ icon, title, description, onPress }) => (
  <TouchableOpacity style={styles.supportOptionCard} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.supportOptionIcon}>
      <MaterialIcons name={icon} size={24} color={theme.colors.businessPrimary} />
    </View>
    <View style={styles.supportOptionContent}>
      <Text style={styles.supportOptionTitle}>{title}</Text>
      <Text style={styles.supportOptionDescription}>{description}</Text>
    </View>
    <MaterialIcons name="chevron-right" size={22} color="#BBBBBB" />
  </TouchableOpacity>
);

// FAQ item component with expandable content
const FAQItem = ({ question, answer }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <View style={styles.faqItem}>
      <TouchableOpacity
        style={styles.faqQuestion}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.faqQuestionText}>{question}</Text>
        <MaterialIcons
          name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
          size={24}
          color="#777777"
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.faqAnswer}>
          <Text style={styles.faqAnswerText}>{answer}</Text>
        </View>
      )}
    </View>
  );
};

const BusinessSupportScreen = ({ navigation }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);

  const [sentSuccess, setSentSuccess] = useState(false);
  const [contactExpanded, setContactExpanded] = useState(false);
  
  // Refs for scrolling to specific sections
  const scrollViewRef = useRef(null);
  const faqSectionRef = useRef(null);
  const contactFormRef = useRef(null);

  // Support categories
  const supportCategories = [
    { id: 'general', label: 'General', icon: 'settings' },
    { id: 'technical', label: 'Technical', icon: 'build' },
    { id: 'billing', label: 'Billing', icon: 'account-balance' },
    { id: 'account', label: 'Account', icon: 'person' },
    { id: 'feature_request', label: 'Feature Request', icon: 'star' },
  ];
  

  
  // Common FAQs data
  const faqs = [
    {
      question: 'How do I create an invoice?',
      answer: 'To create a new invoice, go to the Invoice Generator section and tap the "+" button. Follow the on-screen instructions to add your client information, invoice items, and payment terms.'
    },
    {
      question: 'How do I update my subscription?',
      answer: 'You can update your subscription by going to the Subscription section in the Business Settings menu. From there, you can view available plans and make changes to your current subscription.'
    },
    {
      question: 'Can I export my financial data?',
      answer: 'Yes, you can export your financial data in various formats (PDF, CSV, Excel) from the Financial Analytics section. Look for the export icon in the top-right corner of the reports you want to export.'
    },
    {
      question: 'How do I add a new client?',
      answer: 'To add a new client, navigate to the Clients section and tap the "+" button. Fill in the required information such as name, contact details, and billing address, then tap "Save".'
    },
    {
      question: 'Is my data backed up?',
      answer: 'Yes, all your data is automatically backed up to our secure cloud servers. You can also manually create backups from the Settings menu if desired.'
    }
  ];

  // Handle support message submission
  const handleSubmitSupport = async () => {
    // Validate inputs
    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject for your support request.');
      return;
    }
    
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message describing your issue.');
      return;
    }
    
    // Submit support request
    setSubmitting(true);
    
    try {
      // Send message using the support service
      await sendGeneralSupportMessage(
        { 
          content: message,
          category: category,
          subject: subject
        },
        {
          onError: (error) => {
            Alert.alert('Error', `Failed to send message: ${error}`);
            //console.error(`Error sending message: ${error}`);
          }
        }
      );
      
      // Success!
      setSubmitting(false);
      setSentSuccess(true);
      
      // Reset after showing success message
      setTimeout(() => {
        setSentSuccess(false);
      }, 3000);
      
      // Clear input fields
      setSubject('');
      setMessage('');
    } catch (error) {
      //console.error('Error submitting support request:', error);
      Alert.alert('Error', 'Failed to send your message. Please try again later.');
      setSubmitting(false);
    }
  };
  
  // Helper to format message date
  const formatMessageDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={theme.colors.businessPrimary} barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        ref={scrollViewRef}>

        {/* Support Options */}
        <Text style={styles.sectionTitle}>How can we help?</Text>
        
        <TouchableOpacity
          style={styles.supportOptionCard}
          onPress={() => setContactExpanded(!contactExpanded)}
        >
          <View style={styles.supportOptionIcon}>
            <MaterialIcons name="contact-support" size={24} color={theme.colors.businessPrimary} />
          </View>
          <View style={styles.supportOptionContent}>
            <Text style={styles.supportOptionTitle}>Contact Support</Text>
            <Text style={styles.supportOptionDescription}>Get help from our support team</Text>
          </View>
          <MaterialIcons 
            name={contactExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
            size={24} 
            color="#777777" 
          />
        </TouchableOpacity>
        
        {contactExpanded && (
          <View style={styles.contactDetailsContainer}>
            <View style={styles.contactDetailRow}>
              <MaterialIcons name="email" size={20} color={theme.colors.businessPrimary} />
              <Text style={styles.contactDetailText}>support@billsai.org</Text>
            </View>
            <TouchableOpacity 
              style={styles.contactDetailButton}
              onPress={() => {
                if (scrollViewRef.current && contactFormRef.current) {
                  contactFormRef.current.measure((x, y, width, height, pageX, pageY) => {
                    scrollViewRef.current.scrollTo({
                      y: pageY - 80,
                      animated: true
                    });
                  });
                }
              }}
            >
              <Text style={styles.contactDetailButtonText}>Send a Message</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <SupportOption
          icon="help-outline"
          title="FAQs"
          description="Find answers to common questions"
          onPress={() => {
            if (scrollViewRef.current && faqSectionRef.current) {
              faqSectionRef.current.measure((x, y, width, height, pageX, pageY) => {
                scrollViewRef.current.scrollTo({
                  y: pageY - 80,
                  animated: true
                });
              });
            }
          }}
        />
        
        <SupportOption
          icon="menu-book"
          title="User Guide"
          description="Learn how to use the app"
          onPress={() => navigation.navigate('BusinessUserGuide')}
        />
        
        <SupportOption
          icon="play-circle-outline"
          title="Video Tutorials"
          description="Watch helpful tutorial videos"
          onPress={() => Alert.alert('Coming Soon', 'Video tutorials will be available in the next update!')}
        />

        {/* Contact Form Section */}
        <View style={styles.formSection} ref={contactFormRef}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.formDescription}>
            Send us a message and we'll get back to you as soon as possible.
          </Text>
          
          {/* Category selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category</Text>
            <View>
              {supportCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.categoryRow}
                  onPress={() => setCategory(cat.id)}
                >
                  <View style={styles.categoryIconContainer}>
                    <MaterialIcons
                      name={cat.icon}
                      size={20}
                      color={category === cat.id ? theme.colors.businessPrimary : '#777'}
                    />
                  </View>
                  <Text style={styles.categoryLabel}>
                    {cat.label}
                  </Text>
                  {category === cat.id && (
                    <MaterialIcons name="check" size={20} color={theme.colors.businessPrimary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Subject</Text>
            <TextInput
              style={styles.textInput}
              value={subject}
              onChangeText={setSubject}
              placeholder="Enter subject"
              placeholderTextColor="#999999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[styles.textInput, styles.messageInput]}
              value={message}
              onChangeText={setMessage}
              placeholder="Describe your issue or question"
              placeholderTextColor="#999999"
              multiline
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmitSupport}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
          
          {sentSuccess && (
            <View style={styles.successMessage}>
              <Ionicons name="checkmark-circle" size={20} color="green" />
              <Text style={styles.successText}>Message sent successfully!</Text>
            </View>
          )}
        </View>

        {/* FAQs Section */}
        <View style={styles.faqSection} ref={faqSectionRef}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          
          {faqs.map((faq, index) => (
            <FAQItem 
              key={index}
              question={faq.question}
              answer={faq.answer}
            />
          ))}
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 15,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333333',
  },
  supportOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  supportOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(90, 128, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  supportOptionContent: {
    flex: 1,
  },
  supportOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
    color: '#333333',
  },
  supportOptionDescription: {
    fontSize: 14,
    color: '#777777',
  },
  formSection: {
    marginTop: 30,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
  },
  formDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333333',
  },
  messageInput: {
    minHeight: 120,
    paddingTop: 12,
  },

  // Category selection styles
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
  },

  submitButton: {
    backgroundColor: theme.colors.businessPrimary,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  faqSection: {
    marginBottom: 20,
  },
  faqItem: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 8,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#FFFFFF',
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#333333',
    paddingRight: 10,
  },
  contactDetailsContainer: {
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 12,
    borderRadius: 8,
    marginTop: -12,
  },
  contactDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactDetailText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#333333',
  },
  contactDetailButton: {
    backgroundColor: theme.colors.businessPrimary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 4,
    alignItems: 'center',
  },
  contactDetailButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  faqAnswer: {
    padding: 15,
    backgroundColor: '#F9F9F9',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  spacer: {
    height: 40,
  },
});

export default BusinessSupportScreen;
