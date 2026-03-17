import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import businessAiService from '../services/businessAiService';
import * as businessApiService from '../services/businessApiService';
import  theme  from '../../styles/theme';

const BusinessAiInsightsScreen = ({ navigation }) => {
  // States for different types of AI insights
  const [activeTab, setActiveTab] = useState('insights');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Business data state
  const [businessData, setBusinessData] = useState({
    expenses: [],
    invoices: [],
    bills: [],
    statistics: {},
    clients: [],
  });

  // AI insights states
  const [aiInsights, setAiInsights] = useState(null);
  const [insightType, setInsightType] = useState('financial');

  // Chat states
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');

  // Forecast states
  const [forecast, setForecast] = useState(null);
  const [forecastType, setForecastType] = useState('revenue');
  const [forecastPeriod, setForecastPeriod] = useState(3); // 3 months

  // Load business data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchBusinessData();
    }, [])
  );

  // Fetch all required business data
  const fetchBusinessData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch expenses, invoices, bills, and statistics in parallel
      const [expenses, invoices, bills, dashboardStats, analyticsData, clients, profile] = await Promise.all([
        businessApiService.getBusinessExpenses(),
        businessApiService.getBusinessInvoices(),
        businessApiService.getBusinessBills(),
        businessApiService.getDashboardStatistics(),
        businessApiService.getAnalyticsTabData(),
        businessApiService.getBusinessClients(),
        businessApiService.getBusinessProfile(),
      ]);

      setBusinessData({
        expenses,
        invoices,
        bills,
        statistics: { ...dashboardStats, ...analyticsData },
        clients,
        profile,
      });
    } catch (err) {
      //console.error('Error fetching business data:', err);
      setError('Failed to load business data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate AI insights based on current insight type
  const generateInsights = async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const insights = await businessAiService.generateBusinessInsights(businessData, insightType);
      setAiInsights(insights);
    } catch (err) {
      //console.error('Error generating insights:', err);
      setError('Failed to generate insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Send message in chat and get AI response
  const sendMessage = async () => {
    if (!messageText.trim() || loading) {
      return;
    }

    const userMessage = { role: 'user', content: messageText };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setMessageText('');
    setLoading(true);

    try {
      const response = await businessAiService.generateBusinessChatResponse(
        [...messages, userMessage],
        businessData
      );

      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'assistant', content: response },
      ]);
    } catch (err) {
      //console.error('Error getting AI response:', err);
      setError('Failed to get a response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate business forecast
  const generateForecast = async () => {
    if (loading) { return; }
    
    setLoading(true);
    setError(null);
    try {
      // Get historical data based on forecast type
      const typeToDataMap = {
        'revenue': businessData.statistics.revenueData || [],
        'expenses': businessData.statistics.expensesData || [],
        'cash-flow': businessData.statistics.cashFlowData || [],
      };
      
      const historicalData = typeToDataMap[forecastType] || [];
      
      const forecastData = await businessAiService.generateBusinessForecast(
        historicalData,
        forecastType,
        forecastPeriod
      );
      setForecast(forecastData);
    } catch (err) {
      //console.error('Error generating forecast:', err);
      setError('Failed to generate forecast. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // UI Components for Tab Rendering
  const renderInsightsTab = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Business AI Insights</Text>
        <Text style={styles.headerSubtitle}>Your business intelligence at a glance</Text>
      </View>

      <View style={styles.insightTypeContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.insightTypeScroll}>
          {['financial', 'clients', 'growth', 'cash-flow', 'tax'].map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.insightTypeBtn, insightType === type && styles.activeInsightTypeBtn]}
              onPress={() => {
                if (type !== insightType) {
                  setInsightType(type);
                  setAiInsights(null); // Clear existing insights when type changes
                }
              }}
            >
              <Text style={[styles.insightTypeBtnText, insightType === type && styles.activeInsightTypeBtnText]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {aiInsights ? (
        <View style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <Text style={styles.insightsTitle}>{insightType.charAt(0).toUpperCase() + insightType.slice(1)} Insights</Text>
            <Text style={styles.timestamp}>{new Date(aiInsights.generatedAt).toLocaleString()}</Text>
          </View>
          <Text style={styles.insightsContent}>{aiInsights.insights}</Text>
          {aiInsights.isCached && (
            <Text style={styles.insightsCached}>Showing cached insights. Refresh for updated data.</Text>
          )}
        </View>
      ) : (
        <View style={styles.emptyStateContainer}>
          <Icon name="lightbulb-outline" size={64} color={theme.colors.gray400} />
          <Text style={styles.emptyStateText}>Select an insight type and generate AI-powered analysis</Text>
          <TouchableOpacity 
            style={styles.generateButton} 
            onPress={generateInsights}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.white} size="small" />
            ) : (
              <Text style={styles.buttonText}>Generate Insights</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={20} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </ScrollView>
  );

  const renderChatTab = () => (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Business AI Assistant</Text>
        <Text style={styles.headerSubtitle}>Ask anything about your finances, clients, or business growth</Text>
      </View>
      
      <FlatList
        style={styles.messagesContainer}
        data={messages}
        keyExtractor={(item, index) => `msg-${index}`}
        ListEmptyComponent={() => (
          <View style={styles.suggestionsContainer}>
            <TouchableOpacity 
              style={styles.suggestion}
              onPress={() => {
                setMessageText('What are my top expense categories?');
                setTimeout(sendMessage, 100);
              }}
            >
              <Icon name="chart-pie" size={24} color={theme.colors.businessPrimary} style={styles.suggestionIcon} />
              <Text style={styles.suggestionText}>What are my top expense categories?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.suggestion}
              onPress={() => {
                setMessageText('How can I improve my cash flow?');
                setTimeout(sendMessage, 100);
              }}
            >
              <Icon name="cash-multiple" size={24} color={theme.colors.businessPrimary} style={styles.suggestionIcon} />
              <Text style={styles.suggestionText}>How can I improve my cash flow?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.suggestion}
              onPress={() => {
                setMessageText('Give me tax saving tips');
                setTimeout(sendMessage, 100);
              }}
            >
              <Icon name="calculator" size={24} color={theme.colors.businessPrimary} style={styles.suggestionIcon} />
              <Text style={styles.suggestionText}>Give me tax saving tips</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={[styles.messageItem, item.role === 'user' ? styles.userMessage : styles.assistantMessage]}>
            <Text style={item.role === 'user' ? styles.userMessageText : styles.assistantMessageText}>
              {item.content}
            </Text>
          </View>
        )}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask anything about your business..."
          placeholderTextColor={theme.colors.gray500}
          value={messageText}
          onChangeText={setMessageText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          disabled={!messageText.trim() || loading}
          onPress={sendMessage}
        >
          <Icon name="send" size={20} color={theme.colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderForecastTab = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Business Forecast</Text>
        <Text style={styles.headerSubtitle}>Future projections and trends</Text>
      </View>
      
      {forecast ? (
        <View style={styles.forecastContainer}>
          <Text style={styles.forecastTitle}>{forecastType} Forecast</Text>
          <Text style={styles.forecastSubtitle}>Next {forecastPeriod} month projection</Text>
          
          <View style={styles.forecastData}>
            {/* Forecast visualization would go here */}
            <Text style={styles.forecastContent}>{forecast.analysis}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyStateContainer}>
          <Icon name="chart-line" size={64} color={theme.colors.gray400} />
          <Text style={styles.emptyStateText}>Generate financial forecasts for your business</Text>
          <TouchableOpacity 
            style={styles.generateButton} 
            onPress={generateForecast}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.white} size="small" />
            ) : (
              <Text style={styles.buttonText}>Generate Forecast</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'insights' && styles.activeTab]}
          onPress={() => setActiveTab('insights')}
        >
          <Icon name="lightbulb-outline" size={24} color={activeTab === 'insights' ? theme.colors.businessPrimary : theme.colors.gray600} />
          <Text style={[styles.tabText, activeTab === 'insights' && styles.activeTabText]}>Insights</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
          onPress={() => setActiveTab('chat')}
        >
          <Icon name="chat-processing" size={24} color={activeTab === 'chat' ? theme.colors.businessPrimary : theme.colors.gray600} />
          <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>Chat</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'forecast' && styles.activeTab]}
          onPress={() => setActiveTab('forecast')}
        >
          <Icon name="chart-line" size={24} color={activeTab === 'forecast' ? theme.colors.businessPrimary : theme.colors.gray600} />
          <Text style={[styles.tabText, activeTab === 'forecast' && styles.activeTabText]}>Forecast</Text>
        </TouchableOpacity>
      </View>
      
      {/* Tab Content */}
      {activeTab === 'insights' && renderInsightsTab()}
      {activeTab === 'chat' && renderChatTab()}
      {activeTab === 'forecast' && renderForecastTab()}
      
      {/* Global Loading Overlay */}
      {loading && (
        <View style={styles.globalLoading}>
          <ActivityIndicator size="large" color={theme.colors.businessPrimary} />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Main container
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  globalLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  
  // Tab navigation
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
    backgroundColor: theme.colors.white,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.businessPrimary,
  },
  tabText: {
    fontSize: 13,
    marginTop: 4,
    color: theme.colors.gray600,
  },
  activeTabText: {
    color: theme.colors.businessPrimary,
    fontWeight: '500',
  },
  
  // Tab content
  tabContent: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.white,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.businessText,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.businessTextSecondary,
    marginBottom: 8,
  },
  
  // Insights tab
  insightTypeContainer: {
    paddingVertical: 12,
    backgroundColor: theme.colors.white,
    marginBottom: 16,
  },
  insightTypeScroll: {
    paddingHorizontal: 12,
  },
  insightTypeBtn: {
    backgroundColor: theme.colors.gray100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  activeInsightTypeBtn: {
    backgroundColor: theme.colors.businessPrimary,
  },
  insightTypeBtnText: {
    color: theme.colors.gray700,
    fontSize: 14,
  },
  activeInsightTypeBtnText: {
    color: theme.colors.white,
    fontWeight: '500',
  },
  
  // Insights content
  insightsCard: {
    margin: 16,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.businessText,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.gray500,
  },
  insightsContent: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text,
  },
  insightsCached: {
    fontSize: 12,
    color: theme.colors.gray500,
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },
  
  // Empty states and errors
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginHorizontal: 16,
    marginTop: 32,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.gray600,
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 22,
  },
  errorContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.error,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    color: theme.colors.error,
    marginLeft: 8,
    fontSize: 14,
  },
  
  // Buttons
  generateButton: {
    backgroundColor: theme.colors.businessPrimary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.gray300,
  },
  
  // Chat
  messagesContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.colors.background,
  },
  messageItem: {
    marginVertical: 6,
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.businessPrimary,
    borderBottomRightRadius: 4,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.white,
    borderBottomLeftRadius: 4,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  userMessageText: {
    color: theme.colors.white,
    fontSize: 15,
  },
  assistantMessageText: {
    color: theme.colors.text,
    fontSize: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray200,
  },
  textInput: {
    flex: 1,
    backgroundColor: theme.colors.gray100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.text,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: theme.colors.businessPrimary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  
  // Suggestions
  suggestionsContainer: {
    marginVertical: 16,
  },
  suggestion: {
    backgroundColor: theme.colors.businessPrimaryLight,
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    color: theme.colors.businessText,
    fontSize: 15,
    flex: 1,
  },
  
  // Forecast
  forecastContainer: {
    margin: 16,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  forecastTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.businessText,
    marginBottom: 4,
  },
  forecastSubtitle: {
    fontSize: 14,
    color: theme.colors.gray600,
    marginBottom: 16,
  },
  forecastData: {
    marginTop: 16,
  },
  forecastContent: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text,
  },
});

export default BusinessAiInsightsScreen;
