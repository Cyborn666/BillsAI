/**
 * Help & Support Screen for BillsAI app
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Linking,
  Alert,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../styles/theme';
import userService from '../../services/userService';


const HelpSupportScreen = () => {
  const navigation = useNavigation();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Support email address (fallback)
  const supportEmail = 'support@billsai.org';

  // FAQ data
  const faqItems = [
    {
      question: 'How do I add a new bill?',
      answer: 'To add a new bill, go to the Home screen and tap the "+" button at the bottom. Fill in the required details and tap "Save".',
    },
    {
      question: 'How do I set up recurring bills?',
      answer: 'When adding or editing a bill, toggle the "Recurring Bill" option. Then select how often the bill recurs (weekly, monthly, etc).',
    },
    {
      question: 'How do I share bills with others?',
      answer: 'When creating a bill, enable the "Shared Bill" option. You can search for other users by username and add them to share the bill. Note that all users must have the same currency preference to share bills.',
    },
    {
      question: 'How do I change my currency preference?',
      answer: 'Go to Settings > Currency and select your preferred currency from the list.',
    },
    {
      question: 'Can I export my bill data?',
      answer: 'Not currently, but we\'re working on adding this feature in a future update.',
    },
  ];

  const handleSendFeedback = async () => {
    if (!subject.trim()) {
      Alert.alert('Missing Information', 'Please enter a subject for your support request.');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Missing Information', 'Please enter a message describing your issue.');
      return;
    }

    setIsLoading(true);
    try {
      // Send the support message to the admin through the API
      const result = await userService.sendSupportMessage(subject, message);
      if (result.success) {
        Alert.alert(
          'Message Sent',
          'Your support request has been sent successfully. Our team will review it and get back to you soon.'
        );
        // Clear the form after successful submission
        setSubject('');
        setMessage('');
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      //console.error('Error sending support message:', error);

      // Fallback to email client if API fails
      Alert.alert(
        'Could Not Send Message',
        'Would you like to send your message via email instead?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Send Email',
            onPress: () => {
              const emailSubject = encodeURIComponent(`BillsAI Support: ${subject}`);
              const emailBody = encodeURIComponent(message);
              const mailtoLink = `mailto:${supportEmail}?subject=${emailSubject}&body=${emailBody}`;

              Linking.canOpenURL(mailtoLink)
                .then(supported => {
                  if (supported) {
                    Linking.openURL(mailtoLink);
                  } else {
                    Alert.alert('Error', `Could not open email client. Please send an email to ${supportEmail}`);
                  }
                })
                .catch(() => {
  Alert.alert('Error', 'Could not open email client.');
                });
            },
          },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.title}>Help & Support</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* FAQs Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Frequently Asked Questions
              </Text>

              {faqItems.map((item, index) => (
                <View key={index} style={styles.faqItem}>
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                </View>
              ))}
            </View>

            {/* Contact Support Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Contact Support
              </Text>

              <Text style={styles.supportText}>
                Need help with something not covered in the FAQs? Contact our support team and we'll get back to you as soon as possible.
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Subject</Text>
                <TextInput
                  style={styles.input}
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="What do you need help with?"
                  placeholderTextColor={theme.colors.gray}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Message</Text>
                <TextInput
                  style={[styles.input, styles.messageInput]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Please describe your issue in detail"
                  placeholderTextColor={theme.colors.gray}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendFeedback}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <>
                    <Ionicons name="mail" size={20} color={theme.colors.white} style={styles.buttonIcon} />
                    <Text style={styles.sendButtonText}>Send Message</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Additional Resources
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Additional Resources
              </Text>

              <TouchableOpacity
                style={styles.resourceItem}
                onPress={() => Linking.openURL('https://billsai.com/privacy')}
              >
                <Ionicons name="document-text" size={24} color={theme.colors.primary} />
                <Text style={styles.resourceText}>Privacy Policy</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.gray} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resourceItem}
                onPress={() => Linking.openURL('https://billsai.com/terms')}
              >
                <Ionicons name="document-text" size={24} color={theme.colors.primary} />
                <Text style={styles.resourceText}>Terms of Service</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.gray} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resourceItem}
                onPress={() => Linking.openURL('https://billsai.com/tutorials')}
              >
                <Ionicons name="videocam" size={24} color={theme.colors.primary} />
                <Text style={styles.resourceText}>Video Tutorials</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.gray} />
              </TouchableOpacity>
            </View>
            */}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.black,
    marginLeft: 16,
  },
  titleTablet: {
    fontSize: 24,
  },
  scrollContent: {
    padding: 16,
  },
  scrollContentTablet: {
    padding: 24,
  },
  content: {
    marginBottom: 20,
  },
  contentTablet: {
    marginBottom: 40,
  },
  section: {
    marginBottom: 24,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.medium,
    padding: 16,
  },
  sectionTablet: {
    marginBottom: 32,
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.black,
    marginBottom: 16,
  },
  sectionTitleTablet: {
    fontSize: 22,
    marginBottom: 24,
  },
  faqItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.black,
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: theme.colors.gray,
    lineHeight: 20,
  },
  supportText: {
    fontSize: 14,
    color: theme.colors.gray,
    marginBottom: 16,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: theme.colors.black,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: theme.borderRadius.small,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.black,
    borderWidth: 1,
    borderColor: theme.colors.gray200,
  },
  messageInput: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
  },
  sendButton: {
    backgroundColor: theme.colors.black,
    borderRadius: theme.borderRadius.small,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.white,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: theme.colors.gray200,
    borderBottomWidth: 1,
  },
  resourceText: {
    fontSize: 16,
    color: theme.colors.black,
    flex: 1,
    marginLeft: 12,
  },
});

export default HelpSupportScreen;
