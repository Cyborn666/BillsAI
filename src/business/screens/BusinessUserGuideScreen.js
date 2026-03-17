/**
 * Business User Guide Screen
 * Provides information about features and how to use the app
 */
import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import theme from '../../styles/theme';

// Feature guide item component with icon and description
const FeatureGuideItem = ({ icon, title, description }) => (
  <View style={styles.featureItem}>
    <View style={styles.featureIconContainer}>
      <MaterialIcons name={icon} size={24} color={theme.colors.businessPrimary} />
    </View>
    <View style={styles.featureContent}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

const BusinessUserGuideScreen = ({ navigation }) => {
  // Feature guide data
  const features = [
    {
      icon: 'dashboard',
      title: 'Dashboard Overview',
      description: 'Get a complete overview of your business performance including revenue, expenses, and upcoming bills.',
    },
    {
      icon: 'receipt-long',
      title: 'Invoice Management',
      description: 'Create, send, and track invoices for your customers with customizable templates and automated reminders.',
    },
    {
      icon: 'attach-money',
      title: 'Expense Tracking',
      description: 'Track and categorize all your business expenses to stay on top of your cash flow and prepare for tax season.',
    },
    {
      icon: 'insert-chart',
      title: 'Reports & Analytics',
      description: 'Generate detailed reports and visualize your business data to make informed decisions.',
    },
    {
      icon: 'account-balance',
      title: 'Banking Integration',
      description: 'Connect your bank accounts to automatically import transactions and reconcile your records.',
    },
    {
      icon: 'people',
      title: 'Client Management',
      description: 'Manage your client information, communication history, and payment preferences in one place.',
    },
    {
      icon: 'notifications',
      title: 'Payment Reminders',
      description: 'Set up automatic reminders for upcoming bills and invoices to maintain healthy cash flow.',
    },
    {
      icon: 'settings',
      title: 'Account Settings',
      description: 'Customize your account preferences, notification settings, and security options.',
    },
  ];

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
        <Text style={styles.headerTitle}>User Guide</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Introduction */}
        <View style={styles.introSection}>
          <Text style={styles.sectionTitle}>Welcome to BillsAI Business</Text>
          <Text style={styles.introText}>
            BillsAI makes it easy to manage your business finances with powerful features designed to save you time and provide insights about your business.
          </Text>

          {/* Video tutorials coming soon banner */}
          <View style={styles.comingSoonBanner}>
            <MaterialIcons name="play-circle-outline" size={24} color="#FFFFFF" />
            <Text style={styles.comingSoonText}>Video Tutorials Coming Soon!</Text>
          </View>
        </View>

        {/* Feature guide section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Features Guide</Text>
          
          {features.map((feature, index) => (
            <FeatureGuideItem
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </View>

        {/* Help section */}
        <View style={styles.helpSection}>
          <Text style={styles.sectionTitle}>Need More Help?</Text>
          <TouchableOpacity 
            style={styles.helpButton}
            onPress={() => navigation.navigate('BusinessSupport')}
          >
            <MaterialIcons name="contact-support" size={20} color="#FFFFFF" />
            <Text style={styles.helpButtonText}>Contact Support</Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  introSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333333',
  },
  introText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#555555',
    marginBottom: 20,
  },
  comingSoonBanner: {
    backgroundColor: theme.colors.businessPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  comingSoonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
  featuresSection: {
    marginBottom: 30,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(90, 128, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333333',
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666666',
  },
  helpSection: {
    marginBottom: 20,
  },
  helpButton: {
    backgroundColor: theme.colors.businessPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  helpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  spacer: {
    height: 40,
  },
});

export default BusinessUserGuideScreen;
