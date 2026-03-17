/**
 * Home Screen for BillsAI app
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Text, RefreshControl, StatusBar, Platform } from 'react-native';
import theme from '../../styles/theme';
import Button from '../../components/common/Button';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  BillsList,
  WelcomeBanner,
  MonthlyOverview,
} from '../../components/home';
import * as billService from '../../services/billService';
import {BillAnalytics} from '../../components/analytics';
import { AIAssistantBanner } from '../../components/home';
import LinearGradient from 'react-native-linear-gradient';
import DefaultAvatar from '../../assets/svgs/users-avatar-svgrepo-com.svg';
import MaleAvatar1 from '../../assets/svgs/avatar-svgrepo-com.svg';
import MaleAvatar2 from '../../assets/svgs/avatar-svgrepo-com (1).svg';
import userService from '../../services/userService';

const HomeScreen = ({ navigation }) => {
  // State for API data
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statistics, setStatistics] = useState({
    totalDue: '$0',
    paid: '$0',
    remaining: '$0',
    billCount: 0,
    percentPaid: 0,
  });
  const [upcomingBills, setUpcomingBills] = useState([]);
  const [overdueBills, setOverdueBills] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [currentAvatarId, setCurrentAvatarId] = useState('default');
  const [user, setUser] = useState(null);

  // Available avatars for selection - keep in sync with ProfileScreen
  const avatarOptions = [
    { id: 'default', component: DefaultAvatar },
    { id: 'male1', component: MaleAvatar1 },
    { id: 'male2', component: MaleAvatar2 },
  ];

  // Get current avatar component
  const getCurrentAvatar = () => {
    const avatarOption = avatarOptions.find(option => option.id === currentAvatarId);
    return avatarOption ? avatarOption.component : MaleAvatar2; // Default to Male2 as fallback
  };

  // Format currency from number to string with dynamic currency symbol
  const [currencySymbol, setCurrencySymbol] = useState('$');

  // Format currency from number to string with dynamic currency symbol
  const formatCurrency = useCallback((amount) => {
    if (amount === undefined || amount === null) { return `${currencySymbol}0`; }
    return `${currencySymbol}${parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }, [currencySymbol]);

  // Format due date to readable string
  const formatDueDate = useCallback((date, status) => {
    if (!date) { return 'No due date'; }

    const dueDate = new Date(date);
    const today = new Date();

    // Calculate the difference in days
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (status === 'OVERDUE') {
      return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else if (diffDays > 1) {
      return `Due in ${diffDays} days`;
    } else {
      return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
    }
  }, []);

  // Format status to ensure consistent values
  const formatStatus = useCallback((status, dueDate) => {
    if (!status) {
      return 'UPCOMING';
    }




    const today = new Date();
    const billDueDate = new Date(dueDate);

    // If due date is in the past, it's overdue
    if (billDueDate < today) {
      return 'OVERDUE';
    }
    // If due date is within the next 30 days, it's upcoming
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    if (billDueDate <= thirtyDaysFromNow) {
      return 'UPCOMING';
    }
  }, []);

  // Format bills from API to display format
  const formatBillsForDisplay = useCallback((bills) => {
    if (!bills || !Array.isArray(bills)) { return []; }

    return bills.map(bill => ({
      id: bill._id,
      name: bill.title,
      dueDate: formatDueDate(bill.dueDate, bill.status),
      amount: formatCurrency(bill.amount),
      status: formatStatus(bill.status, bill.dueDate) || 'UPCOMING',
      category: bill.category || 'MISC', // Include category for BillIcon
    }));
  }, [formatDueDate, formatCurrency, formatStatus]);

  //Load data from api


  // Function to fetch user profile data - handles avatar and currency preferences
  const fetchUserProfile = useCallback(async () => {
    try {
      // Load user profile
      const userProfile = await userService.getUserProfile();
      setUser(userProfile);

      // Process avatar ID
      if (userProfile && userProfile.avatarId) {
        setCurrentAvatarId(userProfile.avatarId);
      } else {
        // Fallback to loading avatar from storage if not in profile
        try {
          const avatarId = await userService.getCurrentAvatarId();
          setCurrentAvatarId(avatarId);
        } catch (err) {
          // Silent fail - default avatar will be used
        }
      }
      
      // Extract currency symbol from user preferences
      if (userProfile?.preferences?.currency) {
        const match = userProfile.preferences.currency.match(/\(([^)]+)\)/);
        if (match && match[1]) {
          setCurrencySymbol(match[1]);
        }
      }

      return userProfile;
    } catch (error) {
      ////console.error('Error fetching user profile:', error);
      return null;
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get user profile first (consolidated fetch)
      const userProfile = await fetchUserProfile();
      const userId = userProfile ? userProfile.id : null;

      // Get pre-filtered bills from service
      const upcomingBillsData = await billService.getUpcomingBills(userId);
      const overdueBillsData = await billService.getOverdueBills(userId);

      // Format for display
      setUpcomingBills(formatBillsForDisplay(upcomingBillsData));
      setOverdueBills(formatBillsForDisplay(overdueBillsData));


      // Get bill statistics
      const statsResponse = await billService.getBillStatistics();
      ////console.log('Bill statistics loaded:', statsResponse);
      setStatistics({
        totalDue: formatCurrency(statsResponse.totalAmountThisMonth),
        paid: formatCurrency(statsResponse.totalAmountPaidThisMonth),
        remaining: formatCurrency(statsResponse.totalAmountDueThisMonth),
        billCount: statsResponse.totalBills,
        percentPaid: statsResponse.totalBills > 0 ? Math.round((statsResponse.totalAmountPaidThisMonth / statsResponse.totalAmountThisMonth) * 100) : 0,
      });
      // Get analytics data
      try {
        setAnalyticsLoading(true);
        const analyticsResponse = await billService.getBillAnalytics();
        setAnalyticsData(analyticsResponse);
        ////console.log('Analytics data loaded:', analyticsResponse);
      } catch (analyticsError) {
        ////console.error('Failed to load analytics data:', analyticsError);
        // Keep previous analytics in case of error
      } finally {
        setAnalyticsLoading(false);
      }

    } catch (error) {
      ////console.error('Failed to load home data:', error);
      // If API fails, show empty state
      setUpcomingBills([]);
      setOverdueBills([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [formatBillsForDisplay, formatCurrency]);




  // Refresh data when pull-to-refresh is triggered
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);



  // Load data on component mount
  useEffect(() => {
    fetchData(); // Now includes user profile fetching

    // Subscribe to data updates from billService
    const dataUpdateUnsubscribe = billService.subscribeToDataUpdates(() => {
      ////console.log('Data update received, reloading home screen data...');
      fetchData();
    });

    // Subscribe to profile updates (especially avatar changes)
    const profileUpdateUnsubscribe = userService.subscribeToProfileUpdates((update) => {
      if (update.type === 'AVATAR_UPDATED') {
        ////console.log('Avatar update received:', update.data);
        setCurrentAvatarId(update.data);
      }
      if (update.type === 'PREFERENCES_UPDATED') {
        ////console.log('Preferences update received:', update.data);
        setCurrencySymbol(update.data.currency);
      }

    });

    // Clean up data update subscriptions when component unmounts
    return () => {
      dataUpdateUnsubscribe();
      profileUpdateUnsubscribe();
    };
  }, [fetchData, fetchUserProfile]);

  // Use useFocusEffect to refresh data when screen gets focus
  useFocusEffect(
    useCallback(() => {
      ////console.log('HomeScreen focused - refreshing data');
      // This ensures bill icons are updated when returning from editing a bill
      fetchData();
      fetchUserProfile();

      return () => {
        ////console.log('HomeScreen lost focus');
      };
    }, [fetchData, fetchUserProfile])
  );

  // Handlers for bill actions
  const handleBillPress = (bill) => {
    // Pass the billId parameter instead of the entire bill object
    // Use navigation.navigate to preserve the tab navigator
    navigation.navigate('BillDetails', { billId: bill.id });

   ////console.log('Bill pressed:', bill);
  };

  const handleAddNewBill = () => {
    navigation.navigate('AddBill');
    ////console.log('Add new bill');
    // Would navigate to add bill screen in a real app
  };

  const handleViewAllBills = () => {
    // Navigate to the AllBills tab instead of the AllBills screen
    navigation.navigate('AllBillsTab');
    ////console.log('View all bills');
  };


  const handleViewAllUpcomingBills = () => {
    // Navigate to the AllBills tab
    navigation.navigate('AllBillsTab');
    ////console.log('View all upcoming bills');
  };


  const handleViewAllOverdueBills = () => {
    // Navigate to the AllBills tab
    navigation.navigate('AllBillsTab');
    ////console.log('View all overdue bills');
  };


  const handleProfilePress = () => {
    // Navigate to the Profile tab instead of the Profile screen
    navigation.navigate('ProfileTab');
    ////console.log('Profile pressed');
  };

  const handleAIAssistantPress = () => {
    // Navigate to the AI Assistant screen in HomeStack
    navigation.navigate('AIAssistant');
    ////console.log('AI Assistant pressed');
  };


  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'android' && styles.androidSafeArea]}>
      {isLoading && <View style={styles.loadingOverlay}><Text>Loading...</Text></View>}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Welcome Banner */}
        <View style={styles.welcomeContainer}>
        <WelcomeBanner  />
        <TouchableOpacity
        style={styles.profileIcon}
        onPress={handleProfilePress}
      >
        {React.createElement(getCurrentAvatar(), {
          width: 90,
          height: 90,
        })}
      </TouchableOpacity>
        </View>

        {/* Monthly Overview Component - now with analytics flip */}
        <MonthlyOverview data={statistics} analyticsData={analyticsData} />

        {/* Add Bills & View all Bills*/}
        <View style={styles.quickActionSection}>
        <Button
            title="Add New Bill"
            icon={<Icon name="add-circle-outline" size={24} color={theme.colors.white} />}
            variant="primary"
            onPress={handleAddNewBill}
            style={styles.actionButton}
          />
          <Button
            title="View All Bills"
            icon={<Icon name="cash-outline" size={24} color={theme.colors.black} />}
            variant="outline"
            onPress={handleViewAllBills}
            style={styles.actionButton}
          />
        </View>

        {/* Upcoming Bills Component */}
        <BillsList
          title="Upcoming Bills"
          bills={upcomingBills}
          onBillPress={handleBillPress}
          handleViewAllPress={handleViewAllUpcomingBills}
        />


        {/* Overdue Bills Component */}
        <BillsList
          title="Overdue Bills"
          bills={overdueBills}
          onBillPress={handleBillPress}
          handleViewAllPress={handleViewAllOverdueBills}
        />

       
        <AIAssistantBanner onPress={handleAIAssistantPress} /> 

        {/* Premium Membership Banner 
        <TouchableOpacity onPress={handleMembershipPress} style={styles.membershipBannerContainer}>
         
            <View style={styles.membershipContent}>
              <View>
                <View style={styles.iconContainer}>
                <Icon name="card" size={24} color={theme.colors.black} />
                <Text style={styles.membershipTitle}>BillsAI Premium</Text>
                </View>
                <Text style={styles.membershipSubtitle}>Apply for our exclusive credit card</Text>
                <View style={styles.membershipFeatures}>
                  <View style={styles.membershipFeature}>
                    <Icon name="checkmark-circle" size={14} color={theme.colors.black} />
                    <Text style={styles.membershipFeatureText}>3% cashback on bill payments</Text>
                  </View>
                  <View style={styles.membershipFeature}>
                    <Icon name="checkmark-circle" size={14} color={theme.colors.black} />
                    <Text style={styles.membershipFeatureText}>Personalized savings plan</Text>
                  </View>
                </View>
              </View>
              <View style={styles.membershipCTA}>
                <Text style={styles.membershipCTAText}>SOON</Text>
                <Icon name="chevron-forward" size={24} color={theme.colors.gray700} />
              </View>
            </View>
  
        </TouchableOpacity>*/}

        {/* Bill Analytics Component */}
        <BillAnalytics
          data={analyticsData}
          isLoading={analyticsLoading}
        />


      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  androidSafeArea: {
    paddingTop: StatusBar.currentHeight || 0,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    zIndex: 1000,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.medium,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },

  scrollView: {
    flex: 1,
  },

  actionSection: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSizes.large,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.textDark,
  },
  actionButton: {
    marginBottom: theme.spacing.md,
  },
  logoutButton: {
    marginTop: theme.spacing.md,
    borderColor: theme.colors.gray400,
  },
  logoutText: {
    //color: theme.colors.black,
    color: 'black',
    fontWeight: theme.typography.fontWeights.bold,
  },
  welcomeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomColor: theme.colors.gray200,
    borderBottomWidth: 1,
  },
  profileIcon: {
    marginRight: theme.spacing.xl,
  },
  quickActionSection: {
    padding: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
    marginTop: 15, // Add more space between MonthlyOverview and buttons
    position: 'relative',
    zIndex: 5, // Higher z-index to ensure buttons appear above other components
  },
  iconContainer: {
  
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  // Membership banner styles - platinum card design
  membershipBannerContainer: {
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.xl,
    borderRadius: theme.borderRadius.large,
    overflow: 'hidden',
  },
  membershipBanner: {
    borderRadius: theme.borderRadius.large,
    marginLeft: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: '#000000',
  },
  membershipContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: theme.spacing.lg,
  },
  membershipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.black,
    marginBottom: 4,
    marginLeft: theme.spacing.sm,
  },
  membershipSubtitle: {
    fontSize: 14,
    color: theme.colors.black,
    marginBottom: theme.spacing.sm,
  },
  membershipFeatures: {
    marginTop: theme.spacing.sm,
  },
  membershipFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  membershipFeatureText: {
    fontSize: 12,
    color: theme.colors.black, // Platinum color to match card design
    marginLeft: 6,
  },
  membershipCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.small,
  },
  membershipCTAText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 4,
  },
});

export default HomeScreen;
