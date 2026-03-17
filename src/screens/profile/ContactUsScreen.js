/**
 * Contact Us Screen for BillsAI app
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../styles/theme';
import userService from '../../services/userService';

const ContactUsScreen = () => {
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Company contact information
  const contactInfo = {
    email: 'support@billsai.org',
    phone: '+1 (555) 123-4567',
    address: '123 Finance Street, Suite 500, San Francisco, CA 94105',
    socialMedia: {
      twitter: '@BillsAI',
      facebook: 'facebook.com/BillsAI',
      instagram: 'instagram.com/BillsAI',
    },
  };

  const validateEmail = (emailAddress) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailAddress);
  };

  const handleSendMessage = async () => {
    // Validate form fields
    if (!name.trim()) {
      Alert.alert('Missing Information', 'Please enter your name.');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Missing Information', 'Please enter your email address.');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (!subject.trim()) {
      Alert.alert('Missing Information', 'Please enter a subject for your message.');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Missing Information', 'Please enter your message.');
      return;
    }

    setIsLoading(true);
    try {
      // Send contact form data to the API
      const result = await userService.sendContactMessage(name, email, subject, message);
      
      if (result.success) {
        Alert.alert(
          'Message Sent',
          'Thank you for contacting us! We will review your message and respond to you soon.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        
        // Clear form fields after successful submission
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      //console.error('Error sending contact message:', error);
      
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
              const emailSubject = encodeURIComponent(subject);
              const emailBody = encodeURIComponent(`Name: ${name}\n\n${message}`);
              const mailtoLink = `mailto:${contactInfo.email}?subject=${emailSubject}&body=${emailBody}`;

              Linking.canOpenURL(mailtoLink)
                .then(supported => {
                  if (supported) {
                    Linking.openURL(mailtoLink);
                  } else {
                    Alert.alert('Error', `Could not open email client. Please send an email to ${contactInfo.email}`);
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

  const handleEmailPress = () => {
    Linking.openURL(`mailto:${contactInfo.email}`);
  };

  const handlePhonePress = () => {
    Linking.openURL(`tel:${contactInfo.phone.replace(/[^0-9+]/g, '')}`);
  };

  const handleSocialMediaPress = (platform) => {
    let url;
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/${contactInfo.socialMedia.twitter.replace('@', '')}`;
        break;
      case 'facebook':
        url = `https://${contactInfo.socialMedia.facebook}`;
        break;
      case 'instagram':
        url = `https://${contactInfo.socialMedia.instagram}`;
        break;
      default:
        return;
    }

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', `Could not open ${platform} page.`);
    });
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
          <Text style={styles.title}>Contact Us</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* Contact Information Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Get in Touch</Text>
              <Text style={styles.paragraph}>
                Have questions or feedback? We'd love to hear from you. Use the form below
                or contact us directly through any of these channels.
              </Text>

              <View style={styles.contactInfoContainer}>
                <TouchableOpacity style={styles.contactItem} onPress={handleEmailPress}>
                  <View style={styles.contactIconContainer}>
                    <Ionicons name="mail" size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.contactTextContainer}>
                    <Text style={styles.contactLabel}>Email</Text>
                    <Text style={styles.contactValue}>{contactInfo.email}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.contactItem} onPress={handlePhonePress}>
                  <View style={styles.contactIconContainer}>
                    <Ionicons name="call" size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.contactTextContainer}>
                    <Text style={styles.contactLabel}>Phone</Text>
                    <Text style={styles.contactValue}>{contactInfo.phone}</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.contactItem}>
                  <View style={styles.contactIconContainer}>
                    <Ionicons name="location" size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.contactTextContainer}>
                    <Text style={styles.contactLabel}>Address</Text>
                    <Text style={styles.contactValue}>{contactInfo.address}</Text>
                  </View>
                </View>
                <View style={styles.socialMediaContainer}>
                  <Text style={styles.socialMediaLabel}>Follow Us</Text>
                  <View style={styles.socialIcons}>
                    <TouchableOpacity 
                      style={styles.socialIcon} 
                      onPress={() => handleSocialMediaPress('twitter')}
                    >
                      <Ionicons name="logo-twitter" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.socialIcon} 
                      onPress={() => handleSocialMediaPress('facebook')}
                    >
                      <Ionicons name="logo-facebook" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.socialIcon} 
                      onPress={() => handleSocialMediaPress('instagram')}
                    >
                      <Ionicons name="logo-instagram" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Contact Form Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Send Us a Message</Text>

              <View style={styles.formContainer}>
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Your Name"
                    placeholderTextColor={theme.colors.gray}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Your Email Address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={theme.colors.gray}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Subject</Text>
                  <TextInput
                    style={styles.input}
                    value={subject}
                    onChangeText={setSubject}
                    placeholder="Message Subject"
                    placeholderTextColor={theme.colors.gray}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Message</Text>
                  <TextInput
                    style={[styles.input, styles.messageInput]}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Type your message here..."
                    placeholderTextColor={theme.colors.gray}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleSendMessage}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.white} />
                  ) : (
                    <>
                      <Ionicons name="paper-plane" size={20} color={theme.colors.white} style={styles.buttonIcon} />
                      <Text style={styles.sendButtonText}>Send Message</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.white,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginLeft: 16,
  },
  scrollContent: {
    padding: 16,
  },
  content: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
    marginBottom: 16,
  },
  contactInfoContainer: {
    marginTop: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactTextContainer: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    color: theme.colors.gray,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    color: theme.colors.text,
  },
  socialMediaContainer: {
    marginTop: 16,
  },
  socialMediaLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 12,
  },
  socialIcons: {
    flexDirection: 'row',
  },
  socialIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  formContainer: {
    marginTop: 8,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  messageInput: {
    minHeight: 120,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  sendButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
});

export default ContactUsScreen;
