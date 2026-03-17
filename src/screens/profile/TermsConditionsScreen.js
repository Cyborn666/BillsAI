/**
 * Terms & Conditions Screen for BillsAI app
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../styles/theme';

const TermsConditionsScreen = () => {
  const navigation = useNavigation();

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
          <Text style={styles.title}>Terms & Conditions</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.lastUpdated}>Last Updated: May 12, 2025</Text>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
              <Text style={styles.paragraph}>
                By accessing or using the BillsAI application, you agree to be bound by these Terms and Conditions. 
                If you disagree with any part of the terms, you do not have permission to access the service.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Description of Service</Text>
              <Text style={styles.paragraph}>
                BillsAI provides a bill management and tracking platform that allows users to organize, monitor, 
                and analyze their personal and household expenses.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. User Accounts</Text>
              <Text style={styles.paragraph}>
                To use certain features of the service, you must create an account. You are responsible for 
                maintaining the confidentiality of your account information and for all activities that occur under your account.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Privacy Policy</Text>
              <Text style={styles.paragraph}>
                Your use of BillsAI is also governed by our Privacy Policy, which can be found in the app settings. 
                The policy describes how we collect, use, and share your personal information.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. User Content</Text>
              <Text style={styles.paragraph}>
                You retain ownership of any content you submit to the service. By submitting content, you grant 
                BillsAI a worldwide, non-exclusive license to use, reproduce, and display the content in connection 
                with providing and promoting the service.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. Prohibited Activities</Text>
              <Text style={styles.paragraph}>
                You agree not to engage in any of the following activities:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Violating any applicable laws or regulations</Text>
                <Text style={styles.bulletItem}>• Attempting to interfere with or compromise the system integrity or security</Text>
                <Text style={styles.bulletItem}>• Using the service for any illegal or unauthorized purpose</Text>
                <Text style={styles.bulletItem}>• Attempting to reverse engineer any portion of the service</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7. Termination</Text>
              <Text style={styles.paragraph}>
                We reserve the right to terminate or suspend your account and access to the service at our sole discretion, 
                without notice, for conduct that we believe violates these Terms or is harmful to other users, us, 
                or third parties, or for any other reason.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
              <Text style={styles.paragraph}>
                To the maximum extent permitted by law, BillsAI and its affiliates shall not be liable for any indirect, 
                incidental, special, consequential, or punitive damages resulting from your access to or use of, 
                or inability to access or use, the service.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>9. Changes to Terms</Text>
              <Text style={styles.paragraph}>
                We reserve the right to modify these terms at any time. We will provide notice of significant changes 
                by updating the "Last Updated" date at the top of this page. Your continued use of the service after 
                such changes constitutes your acceptance of the new terms.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>10. Contact Information</Text>
              <Text style={styles.paragraph}>
                If you have any questions about these Terms, please contact us at support@billsai.org
              </Text>
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
  },
  backButton: {
    padding: theme.spacing.xs,
    position: 'absolute',
    left: theme.spacing.lg,
    zIndex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  content: {
    paddingBottom: 20,
  },
  lastUpdated: {
    fontSize: 14,
    color: theme.colors.gray,
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
    marginBottom: 12,
  },
  bulletList: {
    marginTop: 8,
    marginLeft: 8,
  },
  bulletItem: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
    marginBottom: 6,
  },
});

export default TermsConditionsScreen;
