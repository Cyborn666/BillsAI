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
              <Text style={styles.paragraph}>
                Please read these Terms and Conditions ("Terms") carefully before using the BillsAI mobile application 
                operated by BillsAI ("us", "we", or "our"). Your access to and use of the Service is conditioned on 
                your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others 
                who access or use the Service.
              </Text>
              <Text style={styles.paragraph}>
                By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part 
                of the terms, you may not access the Service.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Accounts</Text>
              <Text style={styles.paragraph}>
                When you create an account with us, you must provide accurate, complete, and current information at all times. 
                Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
              </Text>
              <Text style={styles.paragraph}>
                You are responsible for safeguarding the password that you use to access the Service and for any activities 
                or actions under your password, whether your password is with our Service or a third-party service.
              </Text>
              <Text style={styles.paragraph}>
                You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware 
                of any breach of security or unauthorized use of your account.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Account Types</Text>
              <Text style={styles.paragraph}>
                BillsAI offers both personal and business accounts:
              </Text>
              <Text style={styles.subSectionTitle}>Personal Accounts</Text>
              <Text style={styles.paragraph}>
                Personal accounts are intended for individual use to manage personal finances and bills. Features may 
                include bill tracking, payment reminders, and personal financial analytics.
              </Text>
              <Text style={styles.subSectionTitle}>Business Accounts</Text>
              <Text style={styles.paragraph}>
                Business accounts provide extended functionality for businesses to manage invoices, expenses, and 
                financial operations. Business accounts may require subscription plans with recurring payments.
              </Text>
              <Text style={styles.paragraph}>
                Users with business accounts are subject to additional terms relating to payment processing, data retention, 
                and business-specific features.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Subscription Terms</Text>
              <Text style={styles.paragraph}>
                Some aspects of the Service may be offered on a subscription basis. The following terms apply to subscriptions:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Subscriptions automatically renew unless auto-renewal is turned off at least 24 hours before the end of the current period.</Text>
                <Text style={styles.bulletItem}>• You can manage your subscription and turn off auto-renewal through your account settings after purchase.</Text>
                <Text style={styles.bulletItem}>• Payment will be charged to your selected payment method at confirmation of purchase and at the beginning of each renewal term.</Text>
                <Text style={styles.bulletItem}>• Subscriptions cannot be canceled during an active subscription period.</Text>
                <Text style={styles.bulletItem}>• No refunds will be granted for partial subscription periods.</Text>
              </View>
              
              <Text style={styles.subSectionTitle}>iOS App Store Purchases</Text>
              <Text style={styles.paragraph}>
                For users subscribing through the iOS App Store, the following additional terms apply:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• All subscription payments are processed by Apple through the App Store using your Apple ID payment method.</Text>
                <Text style={styles.bulletItem}>• To manage or cancel your subscription, access your Apple ID settings, select "Subscriptions," locate the BillsAI subscription, and follow Apple's instructions for managing or canceling.</Text>
                <Text style={styles.bulletItem}>• Apple's standard cancellation policy applies to all subscription purchases.</Text>
                <Text style={styles.bulletItem}>• If you need to restore previous purchases made through the App Store, use the "Restore Purchases" option in the app.</Text>
                <Text style={styles.bulletItem}>• BillsAI does not have direct access to your payment information and cannot directly process refunds for App Store purchases.</Text>
                <Text style={styles.bulletItem}>• All refund requests for in-app purchases must be submitted to Apple according to their refund policies.</Text>
              </View>
              <Text style={styles.paragraph}>
                By purchasing a subscription through the App Store, you acknowledge and agree that Apple's terms of service also apply to your transaction.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Security</Text>
              <Text style={styles.paragraph}>
                We implement a variety of security measures to maintain the safety of your personal information and account data:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• All sensitive data is encrypted in transit and at rest using industry-standard protocols.</Text>
                <Text style={styles.bulletItem}>• We use server-side validation for all inputs regardless of client-side validation.</Text>
                <Text style={styles.bulletItem}>• Authentication and authorization checks are performed on all API endpoints.</Text>
                <Text style={styles.bulletItem}>• CSRF protection is implemented for sensitive operations.</Text>
                <Text style={styles.bulletItem}>• We employ rate limiting to prevent brute force attacks.</Text>
                <Text style={styles.bulletItem}>• Input sanitization is used to prevent XSS attacks.</Text>
              </View>
              <Text style={styles.paragraph}>
                You acknowledge that no security system is perfect, and you are responsible for using strong, unique passwords 
                and maintaining the security of your devices that access our Service.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. User Content</Text>
              <Text style={styles.paragraph}>
                Our Service allows you to post, store, and share content, including bills, financial records, and personal 
                information ("User Content"). You retain all rights to your User Content.
              </Text>
              <Text style={styles.paragraph}>
                By posting User Content, you grant us a non-exclusive, worldwide, royalty-free license to use, copy, modify, 
                and display your User Content in connection with the operation of the Service.
              </Text>
              <Text style={styles.paragraph}>
                You are solely responsible for your User Content and the consequences of posting it. We reserve the right 
                to remove any User Content that violates these Terms or that we find objectionable.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. Prohibited Uses</Text>
              <Text style={styles.paragraph}>
                You agree not to use the Service for any purpose that is illegal or prohibited by these Terms.
              </Text>
              <Text style={styles.paragraph}>
                Prohibited uses include, but are not limited to:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Using the Service for any illegal activity or to violate any laws.</Text>
                <Text style={styles.bulletItem}>• Attempting to gain unauthorized access to other user accounts or our systems.</Text>
                <Text style={styles.bulletItem}>• Interfering with or disrupting the Service or servers connected to the Service.</Text>
                <Text style={styles.bulletItem}>• Attempting to modify the app to bypass security features or subscription requirements.</Text>
                <Text style={styles.bulletItem}>• Collecting or tracking personal information from other users.</Text>
                <Text style={styles.bulletItem}>• Using the Service to transmit malware, viruses, or other malicious code.</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7. Financial Data and Accuracy</Text>
              <Text style={styles.paragraph}>
                BillsAI provides tools to help you manage financial information, but we do not guarantee the accuracy 
                of any calculations, predictions, or analytics provided through the Service.
              </Text>
              <Text style={styles.paragraph}>
                You acknowledge that:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• BillsAI is not a financial advisor, accountant, or tax professional.</Text>
                <Text style={styles.bulletItem}>• Information provided by the Service should not be considered financial advice.</Text>
                <Text style={styles.bulletItem}>• You are responsible for verifying all information and calculations before making financial decisions.</Text>
                <Text style={styles.bulletItem}>• Any alerts or reminders are provided as a convenience and you remain responsible for timely payment of bills.</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>8. Third-Party Integrations</Text>
              <Text style={styles.paragraph}>
                The Service may integrate with third-party services, including payment processors, financial institutions, 
                and other service providers. Your use of these integrations is subject to the respective terms and 
                privacy policies of those third parties.
              </Text>
              <Text style={styles.paragraph}>
                We are not responsible for the content, policies, or practices of any third-party services and make no warranties 
                about the services they provide.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>9. Termination</Text>
              <Text style={styles.paragraph}>
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including 
                but not limited to a breach of these Terms.
              </Text>
              <Text style={styles.paragraph}>
                Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, 
                you may simply discontinue using the Service or use the account deletion feature within the app.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>10. Limitation of Liability</Text>
              <Text style={styles.paragraph}>
                In no event shall BillsAI, its directors, employees, partners, agents, suppliers, or affiliates be liable for 
                any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of 
                profits, data, use, goodwill, or other intangible losses, resulting from:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Your access to or use of or inability to access or use the Service.</Text>
                <Text style={styles.bulletItem}>• Any conduct or content of any third party on the Service.</Text>
                <Text style={styles.bulletItem}>• Any content obtained from the Service.</Text>
                <Text style={styles.bulletItem}>• Unauthorized access, use, or alteration of your transmissions or content.</Text>
                <Text style={styles.bulletItem}>• Any financial decisions made based on information provided by the Service.</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>11. Changes to Terms</Text>
              <Text style={styles.paragraph}>
                We reserve the right to modify or replace these Terms at any time. We will provide notice of any changes by 
                posting the new Terms on this screen and updating the "Last Updated" date.
              </Text>
              <Text style={styles.paragraph}>
                Your continued use of the Service after any such changes constitutes your acceptance of the new Terms. 
                You are advised to review these Terms periodically for any changes.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>12. Contact Us</Text>
              <Text style={styles.paragraph}>
                If you have any questions about these Terms, please contact us at:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• By email: support@billsai.org</Text>
                <Text style={styles.bulletItem}>• By visiting our website: billsai.org</Text>
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
    fontSize: 18,
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
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  tertiaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 10,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text,
    marginBottom: 12,
  },
  bulletList: {
    marginTop: 8,
    marginLeft: 8,
    marginBottom: 12,
  },
  bulletItem: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text,
    marginBottom: 8,
  },
  bold: {
    fontWeight: 'bold',
  },
});

export default TermsConditionsScreen;
