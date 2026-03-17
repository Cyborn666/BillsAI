/**
 * AI Assistant Screen for BillsAI app
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import theme from '../../styles/theme';
import * as billService from '../../services/billService';
import openaiService from '../../services/openaiService';

export default function AIAssistantScreen({ navigation }) {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello! I\'m your BillsAI assistant. How can I help you manage your finances today?', isUser: false },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [billData, setBillData] = useState(null);
  const [billStats, setBillStats] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [conversationContext, setConversationContext] = useState({
    lastTopic: null,
    mentionedCategories: [],
    mentionedTimeframes: [],
    askedAboutBudget: false,
    budgetMode: false,
  });
  const scrollViewRef = useRef(null);

  // Sample suggested questions
  const suggestions = [
    'How many bills are due this week?',
    'Show my spending by category',
    'Which bill costs me the most?',
    'Help me budget for next month',
  ];

  // Budget planning suggestions
  const budgetSuggestions = [
    'Create a monthly budget plan',
    'How should I allocate my income?',
    'Suggest a savings strategy',
    'Help reduce my spending',
  ];

  // Load bill data when component mounts
  useEffect(() => {
    const loadBillData = async () => {
      try {
        const billsResponse = await billService.getBills();
        const statsResponse = await billService.getBillStatistics();
        const analyticsResponse = await billService.getBillAnalytics();

        setBillData(billsResponse.bills || []);
        setBillStats(statsResponse || {});
        setAnalyticsData(analyticsResponse || {});
      } catch (error) {
        ////console.error('Failed to load data for AI assistant:', error);
      }
    };

    loadBillData();
  }, []);

  /**
   * Update conversation context based on user input
   * This helps with client-side suggestions/UI adaptations
   */
  const updateConversationContext = (input) => {
    const lowerInput = input.toLowerCase();
    const newContext = {...conversationContext};

    // Detect topics for contextual UI suggestions
    if (lowerInput.includes('budget') || lowerInput.includes('spending') || lowerInput.includes('save')) {
      newContext.lastTopic = 'budget';
      newContext.askedAboutBudget = true;
    } else if (lowerInput.includes('bill') || lowerInput.includes('payment') || lowerInput.includes('due')) {
      newContext.lastTopic = 'bills';
    } else if (lowerInput.includes('category') || lowerInput.includes('categories')) {
      newContext.lastTopic = 'categories';
    }

    // Extract referenced categories for UI suggestions
    const categories = ['rent', 'utilities', 'groceries', 'entertainment', 'transportation', 'mortgage'];
    categories.forEach(category => {
      if (lowerInput.includes(category) && !newContext.mentionedCategories.includes(category)) {
        newContext.mentionedCategories.push(category);
      }
    });

    // Extract timeframes
    const timeframes = ['week', 'month', 'year', 'tomorrow', 'next'];
    timeframes.forEach(timeframe => {
      if (lowerInput.includes(timeframe) && !newContext.mentionedTimeframes.includes(timeframe)) {
        newContext.mentionedTimeframes.push(timeframe);
      }
    });

    setConversationContext(newContext);
    return newContext;
  };

  /**
   * Get a response from OpenAI based on conversation history and financial data
   */
  const getAIResponse = async (currentMessages) => {
    try {
      // Prepare financial context for the AI
      const financialContext = {
        bills: billData || [],
        statistics: billStats || {},
        analytics: analyticsData || {},
        conversationContext,
      };

      // Create specialized prompt for budget planning mode
      if (conversationContext.budgetMode) {
        return await getBudgetPlanningResponse(currentMessages, financialContext);
      }

      // Call OpenAI service
      const response = await openaiService.generateResponse(currentMessages, financialContext);
      return response;
    } catch (error) {
      //console.error('Error getting AI response:', error);
      Alert.alert('Connection Error', 'Unable to connect to the assistant. Please try again later.');
      return 'I\'m sorry, I encountered a problem connecting to my knowledge base. Please try again.';
    }
  };

  const handleSend = async () => {
    if (inputText.trim() === '') { return; }

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: inputText,
      isUser: true,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    // Update conversation context for UI suggestions
    updateConversationContext(inputText);

    try {
      // Get response from OpenAI
      const responseText = await getAIResponse(updatedMessages);

      const assistantMessage = {
        id: updatedMessages.length + 1,
        text: responseText,
        isUser: false,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      //console.error('Error in handleSend:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get specialized budget planning response from OpenAI
   * Includes enhanced budget-specific prompting
   */
  const getBudgetPlanningResponse = async (currentMessages, financialContext) => {
    try {
      // Add budget planning specific context
      const enhancedContext = {
        ...financialContext,
        budgetMode: true,
        budgetGoals: {
          reducingDebt: conversationContext.mentionedCategories.includes('debt'),
          increasingSavings: conversationContext.mentionedTimeframes.includes('future') ||
                           conversationContext.mentionedTimeframes.includes('save'),
          expenseCategories: conversationContext.mentionedCategories,
        },
      };

      // Call OpenAI service with enhanced budget planning system prompt
      const response = await openaiService.generateBudgetResponse(currentMessages, enhancedContext);
      return response;
    } catch (error) {
      //console.error('Error getting budget AI response:', error);
      return 'I\'m sorry, I encountered a problem with budget planning. Please try again.';
    }
  };

  /**
   * Format text to display ** surrounded text as bold
   * @param {string} text - Text to format
   * @param {Array} baseStyles - Base styles to apply to all text
   * @returns {React.ReactNode} - Formatted text components
   */
  const renderFormattedText = (text, baseStyles) => {
    if (!text) {
      return null;
    }

    // Split text by ** pattern
    const parts = text.split(/\*\*/);

    // If there are no ** patterns, return plain text
    if (parts.length === 1) {
      return <Text style={baseStyles}>{text}</Text>;
    }

    // Create an array of text and bold text elements
    return (
      <Text style={baseStyles}>
        {parts.map((part, index) => {
          // Even indices are regular text, odd indices are bold text
          const isBold = index % 2 === 1;
          return (
            <Text key={index} style={isBold ? styles.boldText : null}>
              {part}
            </Text>
          );
        })}
      </Text>
    );
  };

  /**
   * Toggle budget planning mode on/off
   */
  const toggleBudgetMode = () => {
    const newBudgetMode = !conversationContext.budgetMode;
    setConversationContext(prev => ({
      ...prev,
      budgetMode: newBudgetMode,
      lastTopic: newBudgetMode ? 'budget' : prev.lastTopic,
    }));

    // Add system message informing user of mode change
    const systemMessage = {
      id: messages.length + 1,
      text: newBudgetMode
        ? "I've switched to Budget Planning mode. Let's create a personalized budget plan for you! What's your monthly income?"
        : "I've exited Budget Planning mode. How else can I help you?",
      isUser: false,
    };

    setMessages(prev => [...prev, systemMessage]);
  };

  const handleSuggestionPress = (suggestion) => {
    setInputText(suggestion);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Empty space for layout balance */}
        </View>
        <Text style={styles.headerTitle}>
          {conversationContext.budgetMode ? 'Budget Planning' : 'AI Assistant'}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleBudgetMode} style={styles.modeButton}>
            <Icon
              name={conversationContext.budgetMode ? 'chatbubble-outline' : 'calculator-outline'}
              size={24}
              color={theme.colors.black}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.isUser ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              {!message.isUser && (
                <View style={styles.assistantHeader}>
                  <Icon name="sparkles" size={16} color={theme.colors.black} />
                  <Text style={styles.assistantLabel}>Financial Assistant</Text>
                </View>
              )}
              {/* Format text with ** as bold */}
              {renderFormattedText(message.text,
                [styles.messageText, message.isUser ? styles.userText : styles.assistantText]
              )}
            </View>
          ))}

          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.colors.black} />
              <Text style={styles.loadingText}>Thinking...</Text>
            </View>
          )}
        </ScrollView>

        {/* Initial suggestion chips */}
        {messages.length < 3 && !conversationContext.budgetMode && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.suggestionsContainer}
            contentContainerStyle={styles.suggestionsContent}
          >
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => handleSuggestionPress(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Budget planning suggestion chips */}
        {conversationContext.budgetMode && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.suggestionsContainer}
            contentContainerStyle={styles.suggestionsContent}
          >
            {budgetSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.suggestionChip, styles.budgetChip]}
                onPress={() => handleSuggestionPress(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Budget-related suggestions */}
        {messages.length >= 3 && conversationContext.lastTopic === 'budget' && !conversationContext.budgetMode && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.suggestionsContainer}
            contentContainerStyle={styles.suggestionsContent}
          >
            <TouchableOpacity
              style={styles.suggestionChip}
              onPress={() => handleSuggestionPress('My monthly income is $4000')}
            >
              <Text style={styles.suggestionText}>My monthly income is $4000</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.suggestionChip}
              onPress={() => handleSuggestionPress('Help me create a savings plan')}
            >
              <Text style={styles.suggestionText}>Help me create a savings plan</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Category-related suggestions */}
        {messages.length >= 3 && conversationContext.lastTopic === 'categories' && !conversationContext.budgetMode && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.suggestionsContainer}
            contentContainerStyle={styles.suggestionsContent}
          >
            <TouchableOpacity
              style={styles.suggestionChip}
              onPress={() => handleSuggestionPress('How can I reduce my utilities bills?')}
            >
              <Text style={styles.suggestionText}>How can I reduce my utilities bills?</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.suggestionChip}
              onPress={() => handleSuggestionPress('Show me spending trends by category')}
            >
              <Text style={styles.suggestionText}>Show me spending trends</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Input area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask something about your bills..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Icon name="send" size={24} color={inputText.trim() ? theme.colors.white : theme.colors.black} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  modeButton: {
    padding: theme.spacing.xs,
  },
  headerLeft: {
    width: 40,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: theme.typography.fontSizes.large,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.black,
    textAlign: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
    padding: theme.spacing.md,
  },
  chatContent: {
    paddingBottom: theme.spacing.md,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.small,
    marginBottom: theme.spacing.md,

  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.black,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.gray100,
    borderWidth: 1,
    borderColor: theme.colors.gray200,
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  assistantLabel: {
    fontSize: theme.typography.fontSizes.small,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.black,
    marginLeft: theme.spacing.xs,
  },
  messageText: {
    fontSize: theme.typography.fontSizes.medium,
    lineHeight: 22,
  },
  userText: {
    color: theme.colors.white,
  },
  assistantText: {
    color: theme.colors.black,
  },
  boldText: {
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.gray100,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.round,
    marginBottom: theme.spacing.md,
  },
  loadingText: {
    marginLeft: theme.spacing.xs,
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.gray700,
  },
  suggestionsContainer: {
    maxHeight: 50,
    marginBottom: theme.spacing.sm,
  },
  suggestionsContent: {
    paddingHorizontal: theme.spacing.md,
  },
  suggestionChip: {
    justifyContent: 'center',
    backgroundColor: theme.colors.gray100,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.round,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    alignItems: 'center',
  },
  suggestionText: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.black,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray200,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    maxHeight: 250,
    fontSize: theme.typography.fontSizes.medium,
  },
  sendButton: {
    backgroundColor: theme.colors.black,
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.white,
  },
});
