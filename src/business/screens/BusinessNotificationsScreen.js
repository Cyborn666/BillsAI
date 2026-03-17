/**
 * Business Notifications Screen
 * Allows business users to manage notification preferences
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import theme from '../../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NotificationOption = ({ icon, title, description, value, onValueChange }) => (
  <View style={styles.optionContainer}>
    <View style={styles.optionContent}>
      <View style={styles.iconContainer}>
        <MaterialIcons name={icon} size={22} color="#4A4A4A" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
    </View>
    <Switch
      trackColor={{ false: '#D1D1D6', true: theme.colors.businessPrimary }}
      thumbColor="#FFFFFF"
      ios_backgroundColor="#D1D1D6"
      value={value}
      onValueChange={onValueChange}
    />
  </View>
);

const BusinessNotificationsScreen = ({ navigation }) => {
  // State for notification settings
  const [settings, setSettings] = useState({
    invoiceReminders: true,
    paymentReceipts: true,
    dueDateAlerts: true,
    marketingUpdates: false,
    newFeatures: true,
    emailNotifications: true,
    pushNotifications: true,
  });
  const [loading, setLoading] = useState(true);

  // Load saved notification settings
  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      setLoading(true);
      const savedSettings = await AsyncStorage.getItem('businessNotificationSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      //console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveNotificationSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('businessNotificationSettings', JSON.stringify(newSettings));
    } catch (error) {
      //console.error('Error saving notification settings:', error);
      Alert.alert('Error', 'Failed to save notification settings');
    }
  };

  const handleToggle = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    saveNotificationSettings(newSettings);
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
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notification Types Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Types</Text>
          
          <NotificationOption
            icon="receipt"
            title="Invoice Reminders"
            description="Receive reminders about unpaid invoices"
            value={settings.invoiceReminders}
            onValueChange={() => handleToggle('invoiceReminders')}
          />
          
          <NotificationOption
            icon="payment"
            title="Payment Receipts"
            description="Get notifications when a payment is received"
            value={settings.paymentReceipts}
            onValueChange={() => handleToggle('paymentReceipts')}
          />
          
          <NotificationOption
            icon="event"
            title="Due Date Alerts"
            description="Be notified about upcoming invoice due dates"
            value={settings.dueDateAlerts}
            onValueChange={() => handleToggle('dueDateAlerts')}
          />
        </View>

        {/* Updates Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Updates</Text>
          
          <NotificationOption
            icon="campaign"
            title="Marketing Updates"
            description="Receive promotions and special offers"
            value={settings.marketingUpdates}
            onValueChange={() => handleToggle('marketingUpdates')}
          />
          
          <NotificationOption
            icon="new-releases"
            title="New Features"
            description="Get notified when new features are available"
            value={settings.newFeatures}
            onValueChange={() => handleToggle('newFeatures')}
          />
        </View>

        {/* Notification Methods Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Methods</Text>
          
          <NotificationOption
            icon="email"
            title="Email Remainders"
            description="Receive payment reminders via email"
            value={settings.emailNotifications}
            onValueChange={() => handleToggle('emailNotifications')}
          />
          
          <NotificationOption
            icon="notifications"
            title="Push Notifications"
            description="Receive notifications on your device"
            value={settings.pushNotifications}
            onValueChange={() => handleToggle('pushNotifications')}
          />
        </View>

        <View style={styles.infoContainer}>
          <MaterialIcons name="info" size={20} color="#666666" />
          <Text style={styles.infoText}>
            You can change your notification preferences at any time. Email notifications will be sent to your registered email address.
          </Text>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333333',
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  optionContent: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: '#777777',
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F8',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  spacer: {
    height: 40,
  },
});

export default BusinessNotificationsScreen;
