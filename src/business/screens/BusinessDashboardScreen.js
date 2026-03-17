/**
 * Business Dashboard Screen
 */
import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { getDashboardStatistics, getRecentActivity, getBusinessProfile } from '../services/businessApiService';
import theme from '../../styles/theme';

// Import SVG avatars directly as components
import Avatar1 from '../../assets/svgs/businessprofile/Group-1.svg';
import Avatar2 from '../../assets/svgs/businessprofile/Group-2.svg';
import Avatar4 from '../../assets/svgs/businessprofile/Group-4.svg';
import Avatar6 from '../../assets/svgs/businessprofile/Group-6.svg';
import Avatar8 from '../../assets/svgs/businessprofile/Group-8.svg';
import Avatar10 from '../../assets/svgs/businessprofile/Group-10.svg';

// Array of available avatars
const avatars = [
  { id: 1, component: Avatar1 },
  { id: 2, component: Avatar2 },
  { id: 4, component: Avatar4 },
  { id: 6, component: Avatar6 },
  { id: 8, component: Avatar8 },
  { id: 10, component: Avatar10 },
];

const BusinessDashboardScreen = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState([]);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(1);
  const [dashboardData, setDashboardData] = useState({
    currentMonth: {
      netSales: 0,
      cashAmount: 0,
      cardAmount: 0,
      transactions: 0,
      miscExpenses: 0,
      miscIncome: 0,
      averageTicket: 0,
      monthOverMonthGrowth: 0,
      totalExpenses: 0,
    },
    invoices: {
      pending: 0,
      paid: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalOutstanding: 0,
    },
    paymentMethodsDistribution: [],
  });
  
  // Refresh function to fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [dashboardResponse, activitiesResponse, profileResponse] = await Promise.all([
        getDashboardStatistics(),
        getRecentActivity(),
        getBusinessProfile(),
      ]);
      
      if (dashboardResponse && dashboardResponse.data) {
        setDashboardData(dashboardResponse.data);
      }
      
      if (activitiesResponse && activitiesResponse.data) {
        setRecentActivities(activitiesResponse.data);
      }

      if (profileResponse) {
        // The business profile is under a businessUser property
        if (profileResponse.businessUser) {
          setBusinessProfile(profileResponse.businessUser);
        } else if (profileResponse.data && profileResponse.data.businessUser) {
          setBusinessProfile(profileResponse.data.businessUser);
        } else {
          //console.log('Business profile data structure not as expected:', profileResponse);
        }
      }
    } catch (error) {
      //console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update selected avatar when businessProfile changes
  useEffect(() => {
    if (businessProfile) {
      setSelectedAvatar(businessProfile.avatarId || 1);
    }
  }, [businessProfile]);
  
  // Get current avatar component without updating state
  const getCurrentAvatar = () => {
    return avatars.find(a => a.id === selectedAvatar)?.component || Avatar1;
  };

  // Use useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
      return () => {
        // Optional cleanup function
      };
    }, [fetchDashboardData])
  );

  // Reminder state management
  const [hasImportantReminder, setHasImportantReminder] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [reminderData, setReminderData] = useState(null);

  useEffect(() => {
    // Find pending invoice in recent activities
    const pendingInvoice = recentActivities.find(activity => 
      activity.type === 'invoice' && activity.status?.toLowerCase() === 'pending'
    );
    
    // Find unpaid bill in recent activities
    const unpaidBill = recentActivities.find(activity => 
      activity.type === 'bill' && activity.status?.toLowerCase() === 'unpaid'
    );
    
    if (dashboardData?.invoices?.pending > 0 && pendingInvoice) {
      // Only show reminder if we have actual pending invoice data
      setHasImportantReminder(true);
      const today = new Date();
      
      setReminderData({
        type: 'invoice',
        id: pendingInvoice.id,
        dueDate: 'Today',
        dueTime: today.getHours() < 12 ? '5:00 PM' : '11:59 PM',
        clientName: pendingInvoice.clientName,
        amount: pendingInvoice.amount || dashboardData.invoices.totalOutstanding / dashboardData.invoices.pending,
      });
    } else if (dashboardData?.currentMonth?.bills?.unpaid > 0 && unpaidBill) {
      // Only show reminder if we have actual unpaid bill data
      setHasImportantReminder(true);
      
      setReminderData({
        type: 'bill',
        id: unpaidBill.id,
        dueDate: 'Today',
        dueTime: '11:59 PM',
        vendorName: unpaidBill.vendorName,
        amount: unpaidBill.amount,
      });
    } else {
      setHasImportantReminder(false);
      setReminderData(null);
    }
  }, [dashboardData, recentActivities]);

  // Add pull-to-refresh functionality
  const [refreshing, setRefreshing] = useState(false);
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  }, [fetchDashboardData]);


  // Legacy demo data for backward compatibility
  // eslint-disable-next-line no-unused-vars
  const [demoData] = useState({
    expenses: {
      total: 8320.00,
      count: 12,
      change: -5.2
    },
    invoices: {
      total: 12450.00,
      pending: 3080.00,
      count: 3
    },
    profit: {
      amount: 4130.00,
      change: 8.7
    },
    activities: [
      {
        id: 1,
        title: 'Invoice Paid',
        description: 'Acme Corp paid invoice #INV-2023-001',
        amount: 6352.50,
        timestamp: 'Today, 10:30 AM'
      },
      {
        id: 2,
        title: 'Expense Added',
        description: 'Office supplies purchase recorded',
        amount: 245.80,
        timestamp: 'Yesterday, 3:15 PM'
      },
      {
        id: 3,
        title: 'Invoice Created',
        description: 'New invoice for TechStart Inc.',
        amount: 3200.00,
        timestamp: 'May 12, 2023'
      }
    ]
  });

  // Format currency
  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2196F3']}
            tintColor={'#2196F3'}
          />
        }
      >

         {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#f0f9ff', '#e1f5fe']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerGreeting}>Welcome back</Text>
                <Text style={styles.headerSubtitle}>{businessProfile?.ownerName || businessProfile?.businessName || 'Business Dashboard'}</Text>
                <View style={styles.dateContainer}>
                  <Text style={styles.currentDate}>{new Date().toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})}</Text>
                </View>
              </View>
              <View style={styles.headerRightContainer}>

                <View style={styles.avatarContainer}>
                  <View style={styles.avatarInner}>
                    {React.createElement(getCurrentAvatar(), {
                              width: 90,
                              height: 90,
                            })}
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Important Reminder Card */}
        {hasImportantReminder && !reminderDismissed && reminderData && (
          <View style={styles.reminderCard}>
            <View style={styles.reminderHeader}>
              <View style={styles.reminderIconContainer}>
                <Ionicons 
                  name={reminderData.type === 'invoice' ? "alert-circle" : "warning"} 
                  size={24} 
                  color="#ff6b6b" 
                />
              </View>
              <Text style={styles.reminderTitle}>
                {reminderData.type === 'invoice' ? 'Invoice Due Today' : 'Bill Payment Due'}
              </Text>
              <TouchableOpacity 
                style={styles.reminderCloseButton}
                onPress={() => setReminderDismissed(true)}
              >
                <Ionicons name="close" size={22} color="#8395a7" />
              </TouchableOpacity>
            </View>
            <View style={styles.reminderDivider} />
            <View style={styles.reminderDetail}>
              <View style={styles.reminderRow}>
                <Ionicons name="calendar" size={18} color="#2C3E50" />
                <Text style={styles.reminderText}>{reminderData.dueDate}</Text>
                <View style={styles.reminderBadge}>
                  <Text style={styles.reminderBadgeText}>Due {reminderData.dueTime}</Text>
                </View>
              </View>
              <View style={styles.reminderRow}>
                <Ionicons 
                  name={reminderData.type === 'invoice' ? "document-text" : "briefcase"} 
                  size={18} 
                  color="#2C3E50" 
                />
                <Text style={styles.reminderText}>
                  {reminderData.type === 'invoice' 
                    ? `Client: ${reminderData.clientName}` 
                    : `Vendor: ${reminderData.vendorName}`}
                </Text>
              </View>
              <View style={styles.reminderRow}>
                <Ionicons name="cash" size={18} color="#2C3E50" />
                <Text style={styles.reminderAmount}>{formatCurrency(reminderData.amount)}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.viewButton}
              onPress={() => {
                // Navigate to the right screen based on reminder type
                if (reminderData.type === 'invoice') {
                  navigation.navigate('BusinessInvoiceDetail', { invoiceId: reminderData.id });
                } else {
                  navigation.navigate('BusinessBillDetail', { billId: reminderData.id });
                }
                // Dismiss the reminder after navigating
                setReminderDismissed(true);
              }}
            >
              <Text style={styles.viewButtonText}>
                {reminderData.type === 'invoice' ? 'View Invoice' : 'View Bill'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={theme.primaryColor} />
            </TouchableOpacity>
          </View>
        )}

        {/* Monthly Statistics */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Monthly Statistics</Text>
        </View>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={{paddingHorizontal: 16}}>
          
          {/* Monthly Sales Card */}
          <View style={[styles.metricCard,styles.monthlysales]}>
            <View style={[styles.iconContainer,styles.monthlysalesIcon]}>
              <Ionicons name="cash" size={22} color="#4CAF50" />
            </View>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Monthly Sales</Text>
            </View>
            <Text style={styles.metricValue}>{formatCurrency(dashboardData?.currentMonth?.netSales || 0)}</Text>
            <View style={styles.metricFooter}>
              {(dashboardData?.currentMonth?.monthOverMonthGrowth || 0) >= 0 ? (
                <>
                  <Ionicons name="arrow-up-outline" size={14} color="#4CAF50" />
                  <Text style={styles.positiveChange}>{(dashboardData?.currentMonth?.monthOverMonthGrowth || 0).toFixed(1)}% </Text>
                </>
              ) : (
                <>
                  <Ionicons name="arrow-down-outline" size={14} color="#F44336" />
                  <Text style={styles.negativeChange}>{Math.abs(dashboardData?.currentMonth?.monthOverMonthGrowth || 0).toFixed(1)}% </Text>
                </>
              )}
              <Text style={styles.metricSubtext}>vs. last month</Text>
            </View>
          </View>

          {/* Total Expenses Card */}
          <View style={[styles.metricCard,styles.expenses]}>
            <View style={[styles.iconContainer,styles.expensesIcon]}>
              <Ionicons name="wallet" size={22} color="#F44336"/>
            </View>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Expenses</Text>
            </View>
            <Text style={styles.metricValue}>{formatCurrency(dashboardData.currentMonth?.totalExpenses || 0)}</Text>
            <View style={styles.metricFooter}>
              <Text style={styles.metricSubtext}>Bills and Expenses</Text>
            </View>
          </View>

          {/* Invoices Paid Card */}
          <View style={[styles.metricCard,styles.invoicesPaid]}>
            <View style={[styles.iconContainer,styles.invoicesPaidIcon]}>
            <Ionicons name="checkmark-circle" size={22} color="#2196F3" />
            </View>

            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Invoices Paid</Text>
              
            </View>
            <Text style={styles.metricValue}>{dashboardData.invoices?.paid || 0}</Text>
            <View style={styles.metricFooter}>
              <Text style={styles.metricSubtext}>{formatCurrency(dashboardData.invoices?.totalPaid || 0)} collected</Text>
            </View>
          </View>

          {/* Invoices Pending Card */}
          <View style={[styles.metricCard,styles.invoicesPending]}>
            <View style={[styles.iconContainer,styles.invoicesPendingIcon]}>
               <Ionicons name="hourglass" size={22} color="#FF9800" />
            </View>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Invoices Pending</Text>
            </View>
            <Text style={styles.metricValue}>{dashboardData.invoices?.pending || 0}</Text>
            <View style={styles.metricFooter}>
              <Text style={styles.metricSubtext}>{formatCurrency(dashboardData.invoices?.totalOutstanding || 0)} outstanding</Text>
            </View>
          </View>


        </ScrollView>

        {/* Today's Metrics */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Activity</Text>
        </View>
        <View style={styles.todayActivity}>
          {/* Today's Sales Card */}
          <View style={styles.todaySales}>
            <View style={[styles.iconContainer, {backgroundColor: '#e0e9fb'}]}>
            <Ionicons name='today' size={22} color="#2962FF" />
            </View>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Today's Sales</Text>
            </View>
            <Text style={styles.metricValue}>{formatCurrency(dashboardData.today?.sales || 0)}</Text>
            <View style={styles.metricFooter}>
              <Text style={styles.metricSubtext}>Current day total</Text>
            </View>
          </View>

          {/* Over/Short Card */}
          <View style={styles.overShort}>
            <View style={[styles.iconContainer,styles.overShortIconContainer, {backgroundColor: dashboardData.today?.overShort >= 0 ? '#E8F5E9' : '#FFEBEE'}]}>
            <Ionicons name='swap-vertical-outline' size={22} color={dashboardData.today?.overShort >= 0 ? '#4CAF50' : '#F44336'} />
            </View>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Over/Short</Text>
            </View>
            <Text style={[styles.metricValue, {color: dashboardData.today?.overShort >= 0 ? '#4CAF50' : '#F44336'}]}>
              {dashboardData.today?.overShort >= 0 ? '+' : ''}{formatCurrency(dashboardData.today?.overShort || 0)}
            </Text>
            <View style={styles.metricFooter}>
              <Text style={styles.metricSubtext}>Cash balance</Text>
            </View>
          </View>
        </View>
        {/* Banner */}
        <TouchableOpacity 
          style={styles.bannerContainer}
          onPress={() => navigation.navigate('BusinessTaxCalculator')}
        >
          <View style={styles.bannerIconContainer}>
            <Ionicons name="calculator-outline" size={24} color="white" />
          </View>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>Need help with taxes?</Text>
            <Text style={styles.bannerDescription}>Our tax calculator can save you time and money</Text>
          </View>
          <TouchableOpacity style={styles.bannerButton} onPress={() => navigation.navigate('BusinessTaxCalculator')}>
            <Text style={styles.bannerButtonText}>Try Now</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={styles.bannerButtonIcon} />
          </TouchableOpacity>
        </TouchableOpacity>
        

        {/* Quick Actions Section */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('BusinessAddExpense')}>
              <View style={styles.addExpenseIcon}>
                <Ionicons name="add" size={20} color="#F44336" />
              </View>
              <Text style={styles.actionText}>Add Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('BusinessImportInvoice')}>
              <View style={styles.addInvoiceIcon}>
                <Ionicons name="document-outline" size={20} color="#2196F3" />
              </View>
              <Text style={styles.actionText}>Add Invoice</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('BusinessDailyReport')}>
              <View style={styles.reportsIcon}>
                <Ionicons name="stats-chart-outline" size={20} color="#4CAF50" />
              </View>
              <Text style={styles.actionText}>Daily Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('BusinessMiscellaneous')}>
              <View style={styles.miscIcon}>
                <Ionicons name="wallet-outline" size={20} color="#FF9800" />
              </View>
              <Text style={styles.actionText}>Miscellaneous</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          
          {recentActivities.length === 0 ? (
            <View style={styles.noActivitiesContainer}>
              <Text style={styles.noActivitiesText}>No recent activities</Text>
            </View>
          ) : (
            recentActivities.map((activity) => (
              <TouchableOpacity 
                key={activity.id} 
                style={styles.activityCard}
                onPress={() => {
                  if (activity.link) {
                    // Extract path segments from the link
                    const segments = activity.link.split('/');
                    // Get the resource ID (last segment of the path)
                    const id = segments[segments.length - 1]; // resource ID
                    
                    // Navigate based on activity type
                    switch(activity.type) {
                      case 'invoice':
                        navigation.navigate('BusinessInvoiceDetails', { invoiceId: id });
                        break;
                      case 'bill':
                        navigation.navigate('BusinessBillDetails', { billId: id });
                        break;
                      case 'expense':
                        navigation.navigate('BusinessExpenseDetails', { expenseId: id });
                        break;
                      case 'dailyReport':
                        navigation.navigate('BusinessDailyReport', { reportId: id });
                        break;
                      case 'miscTransaction':
                        navigation.navigate('BusinessMiscellaneous');
                        break;
                      default:
                        //console.log('Unknown activity type:', activity.type);
                    }
                  }
                }}
              >
                <View style={styles.activityRow}>
                  <View style={[styles.activityIconContainer, 
                    activity.type === 'invoice' ? styles.invoiceIconBg : 
                    activity.type === 'expense' ? styles.expenseIconBg : 
                    activity.type === 'bill' ? styles.billIconBg :
                    activity.type === 'dailyReport' ? styles.reportIconBg :
                    styles.miscIconBg
                  ]}>
                    <Ionicons 
                      name={activity.type === 'invoice' ? 'document-outline' : 
                           activity.type === 'expense' ? 'cart-outline' : 
                           activity.type === 'bill' ? 'wallet-outline' : 
                           activity.type === 'dailyReport' ? 'stats-chart-outline' :
                           'cash-outline'} 
                      size={20} 
                      color={activity.type === 'invoice' ? '#2196F3' : 
                            activity.type === 'expense' ? '#FF9800' : 
                            activity.type === 'bill' ? '#F44336' : 
                            activity.type === 'dailyReport' ? '#4CAF50' :
                            '#757575'} 
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <View style={styles.activityHeader}>
                      <Text style={styles.activityTitle}>{activity.title}</Text>
                      {activity.amount !== undefined && activity.amount !== null && (
                        <Text style={styles.activityAmount}>{formatCurrency(activity.amount)}</Text>
                      )}
                    </View>
                    <Text style={styles.activityDescription}>{activity.description}</Text>
                    <View style={styles.activityFooter}>
                      <Text style={styles.activityTime}>
                        {new Date(activity.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      {activity.status && (
                        <View style={[
                          styles.activityStatus,
                          {
                            backgroundColor: 
                              activity.status.toLowerCase() === 'paid' || activity.status.toLowerCase() === 'completed' ? '#e6f7ed' : 
                              activity.status.toLowerCase() === 'sent' ? '#e6f0f9' : 
                              '#fff8e1'
                          }
                        ]}>

                          <Text style={[
                            styles.statusText,
                            {
                              color: 
                                activity.status.toLowerCase() === 'paid' || activity.status.toLowerCase() === 'completed' ? '#4CAF50' : 
                                activity.status.toLowerCase() === 'sent' ? '#2196F3' : 
                                '#FFA000'
                            }
                          ]}>
                            {activity.status.charAt(0).toUpperCase() + activity.status.slice(1).toLowerCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 60 : 0,
  },
  header: {
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerGradient: {
    width: '100%',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical:12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerRightContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  headerGreeting: {
    fontSize: 18,
    color: '#5a7089',
    fontWeight: '500',
  },
  dateContainer: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal:12,

    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
    alignSelf: 'flex-start',
    marginTop: 12,
    
  },
  currentDate: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  avatarInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    backgroundColor: theme.primaryColor,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-between',
  },
  reminderCloseButton: {
    width: 32, 
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
  },
  reminderIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reminderTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#2d3748',
    flex: 1,
    marginLeft: 12,
  },
  reminderDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
  reminderDetail: {
    padding: 16,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reminderText: {
    fontSize: 14,
    color: '#2C3E50',
    marginLeft: 10,
    flex: 1,
  },
  reminderAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A5276',
    marginLeft: 10,
  },
  reminderBadge: {
    backgroundColor: '#feebc8',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 10,
  },
  reminderBadgeText: {
    fontSize: 12,
    color: '#b7791f',
    fontWeight: '500',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  viewButtonText: {
    color: theme.primaryColor,
    fontWeight: '600',
    fontSize: 14,
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
  },
  headerSubtitle: {
    fontSize: 32,
    color: theme.colors.businessPrimary,
    marginTop: 4,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    width: '100%',
  },
  metricsContainer: {
    paddingHorizontal: 22,
    paddingBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '24%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginLeft: 16,
    borderWidth:1,
    borderColor:theme.colors.gray200,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#757575',
    flex: 1,
    paddingRight: 10,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
  },
  metricFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingRight: 18,
  },
  metricChange: {
    fontSize: 14,
    fontWeight: '500',
  },
  positiveChange: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
  },
  negativeChange: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F44336',
  },
  metricSubtext: {
    fontSize: 14,
    color: '#757575',
  },
  overdueCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderColor: '#FFEBEE',
    borderWidth: 1,
  },
  actionsContainer: {
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth:1,
    borderColor:theme.colors.gray200,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#424242',
    marginTop: 12,
  },
  addExpenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addInvoiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miscIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  activitySection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  activityDescription: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  bannerContainer: {
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth:1,
    borderColor:theme.colors.gray200,
  },
  bannerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3867d6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  bannerDescription: {
    fontSize: 14,
    color: '#000000',
  },
  bannerButton: {
    backgroundColor: '#3867d6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  bannerButtonIcon: {
    marginLeft: 4,
  },
  actionStats: {
    width: '46%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionStatsLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  actionStatsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseIconBg: {
    backgroundColor: '#FFF3E0',
  },
  invoiceIconBg: {
    backgroundColor: '#E3F2FD',
  },
  billIconBg: {
    backgroundColor: '#FFEBEE',
  },
  reportIconBg: {
    backgroundColor: '#E8F5E9',
  },
  miscIconBg: {
    backgroundColor: '#EEEEEE',
  },
  activityContent: {
    flex: 1,
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  noActivitiesContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginHorizontal: 16,
  },
  noActivitiesText: {
    fontSize: 16,
    color: '#757575',
    fontWeight: '500',
  },
  activityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
    marginRight: 6,
  },
  pendingDot: {
    backgroundColor: '#FF9800',
  },
  successDot: {
    backgroundColor: '#4CAF50',
  },
  statusText: {
    fontSize: 12,
    color: '#757575',
  },
  monthlysales: {
    backgroundColor: '#ffffff',
  },
  expenses: {
    backgroundColor: '#ffffff',
  },
  invoicesPaid: {
    backgroundColor: '#ffffff',
  },
  invoicesPending: {
    backgroundColor: '#ffffff',
  },
  todaySales: {
    backgroundColor: '#ffffff',
    width: '48%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth:1,
    borderColor:theme.colors.gray200,
  },
  overShort: {
    backgroundColor: '#ffffff',
    width: '48%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth:1,
    borderColor:theme.colors.gray200,
  },
  todayActivity: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 14,
  },
  expensesIcon: {
    backgroundColor: '#FFEBEE',
  },
  invoicesPaidIcon: {
    backgroundColor: '#E3F2FD',
  },
  invoicesPendingIcon: {
    backgroundColor: '#FFF3E0',
  },
  monthlysalesIcon: {
    backgroundColor: '#E8F5E9',
  },
});

export default BusinessDashboardScreen;
