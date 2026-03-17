/**
 * Business AI Service
 * Provides interactive AI-powered insights, analytics, and recommendations for businesses
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OPENAI_API_KEY } from '@env';
import axios from 'axios';

// Storage key for cached AI insights
const BUSINESS_AI_INSIGHTS_KEY = 'business_ai_insights';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Business AI Service provides AI-powered insights and recommendations
 */
const businessAiService = {
  /**
   * Generate business insights based on various types of business data
   *
   * @param {Object} businessData - Object containing business data for analysis
   * @param {Array} businessData.expenses - Business expenses
   * @param {Array} businessData.invoices - Business invoices
   * @param {Array} businessData.bills - Business bills
   * @param {Object} businessData.statistics - Business statistics
   * @param {Array} businessData.clients - Business clients
   * @param {string} insightType - Type of insight to generate (financial, clients, growth, cash-flow, tax)
   * @returns {Promise<Object>} AI-generated insights and recommendations
   */
  generateBusinessInsights: async (businessData, insightType = 'financial') => {
    try {
      // Format the prompt based on insight type
      let systemPrompt = 'You are an expert business finance AI assistant. ';
      systemPrompt += 'Analyze the provided business data and generate actionable insights. ';
      systemPrompt += 'Use ONLY the data provided to you. If data is missing or incomplete, mention this limitation. ';
      systemPrompt += 'Be specific, data-driven, and practical in your recommendations.';
      
      // Customize the prompt based on insight type
      switch (insightType) {
        case 'financial':
          systemPrompt += `
Focus on financial health indicators:
- Profit margins and trends
- Expense patterns and optimization opportunities
- Revenue growth trends
- Cash flow projections
- Financial risk assessment`;
          break;
        case 'clients':
          systemPrompt += `
Focus on client insights:
- Client segmentation (revenue contribution)
- Client retention metrics
- Payment patterns by client
- Opportunities for upselling/cross-selling
- Client acquisition suggestions`;
          break;
        case 'growth':
          systemPrompt += `
Focus on growth opportunities:
- Revenue trend analysis
- High-performing service/product identification
- Market expansion opportunities
- Pricing strategy recommendations
- Resource allocation suggestions`;
          break;
        case 'cash-flow':
          systemPrompt += `
Focus on cash flow management:
- Accounts receivable aging analysis
- Payment collection recommendations
- Expense timing optimization
- Cash reserve adequacy
- Working capital management`;
          break;
        case 'tax':
          systemPrompt += `
Focus on tax optimization:
- Expense categorization for tax purposes
- Potential tax deductions identification
- Tax liability forecasting
- Tax planning recommendations
- Compliance considerations`;
          break;
      }

      // Format the message for OpenAI
      const messages = [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Please analyze my business data and provide insights on ${insightType}. Here's my data: ${JSON.stringify(businessData)}`
        }
      ];

      // Use the OpenAI API directly with the business-specific API key
      const response = await axios.post(
        OPENAI_API_URL, 
        {
          model: 'gpt-4o',
          messages,
          temperature: 0.3,
          max_tokens: 1000,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
        }
      );

      // With axios, the response data is already parsed
      if (response.data.error) {
        throw new Error(response.data.error.message || 'Error generating business insights');
      }

      const insights = response.data.choices[0].message.content;
      
      // Cache the insights for offline access
      try {
        const cachedInsights = await AsyncStorage.getItem(BUSINESS_AI_INSIGHTS_KEY) || '{}';
        const insightsObj = JSON.parse(cachedInsights);
        
        insightsObj[insightType] = {
          insights,
          timestamp: new Date().toISOString(),
          dataSnapshot: {
            expenseCount: businessData.expenses?.length || 0,
            invoiceCount: businessData.invoices?.length || 0,
            billCount: businessData.bills?.length || 0,
            clientCount: businessData.clients?.length || 0,
          }
        };
        
        await AsyncStorage.setItem(BUSINESS_AI_INSIGHTS_KEY, JSON.stringify(insightsObj));
      } catch (cacheError) {
        //console.warn('Failed to cache business insights', cacheError);
      }
      
      return {
        insights,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      //console.error('Error generating business insights:', error);
      
      // Try to retrieve cached insights as fallback
      try {
        const cachedInsights = await AsyncStorage.getItem(BUSINESS_AI_INSIGHTS_KEY) || '{}';
        const insightsObj = JSON.parse(cachedInsights);
        
        if (insightsObj[insightType]) {
          return {
            insights: insightsObj[insightType].insights,
            generatedAt: insightsObj[insightType].timestamp,
            isCached: true
          };
        }
      } catch (cacheError) {
        //console.warn('Failed to retrieve cached insights', cacheError);
      }
      
      return {
        insights: "I couldn't generate insights at this time. Please check your connection and try again.",
        error: error.message
      };
    }
  },
  
  /**
   * Generate interactive chat responses for business inquiries
   * 
   * @param {Array} messages - Array of message objects with role and content properties
   * @param {Object} businessContext - Business data context to inform responses
   * @returns {Promise<string>} AI-generated response
   */
  generateBusinessChatResponse: async (messages, businessContext) => {
    try {
      // Format messages for OpenAI
      const formattedMessages = [
        {
          role: 'system',
          content: `You are a knowledgeable business financial assistant. 
You help business owners understand their finances, optimize operations, and make data-driven decisions.
Be concise, practical, and specific in your advice. If you don't have enough information, ask clarifying questions.
Here is the business data context: ${JSON.stringify(businessContext)}`,
        },
        ...messages,
      ];

      // Use the OpenAI API directly with the business-specific API key
      const response = await axios.post(
        OPENAI_API_URL, 
        {
          model: 'gpt-4o',
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: 500,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
        }
      );

      // With axios, the response data is already parsed
      if (response.data.error) {
        throw new Error(response.data.error.message || 'Error generating business chat response');
      }

      return response.data.choices[0].message.content;
    } catch (error) {
      //console.error('Error generating business chat response:', error);
      return "I'm sorry, I'm having trouble accessing my knowledge base right now. Please try again in a moment.";
    }
  },
  
  /**
   * Generate business forecast and predictions
   * 
   * @param {Object} historicalData - Historical business data for forecasting
   * @param {string} forecastType - Type of forecast (revenue, expenses, cash-flow)
   * @param {number} periodMonths - Number of months to forecast (1-12)
   * @returns {Promise<Object>} Forecast data and visualizations
   */
  generateBusinessForecast: async (historicalData, forecastType = 'revenue', periodMonths = 3) => {
    try {
      // Format the prompt for AI forecasting
      const forecastPrompt = `As an AI business analyst, create a ${periodMonths}-month forecast for ${forecastType} based on the following historical data. 
Provide month-by-month predictions with a brief analysis of trends and factors. 
For each month, return a forecast value and confidence interval (high/low estimates).
Format your response as JSON with this structure:
{
  "forecast": [
    { "month": "YYYY-MM", "value": number, "lowEstimate": number, "highEstimate": number }
  ],
  "analysis": "Brief analysis of trends and key insights",
  "recommendations": "Actionable recommendations based on the forecast"
}
Historical data: ${JSON.stringify(historicalData)}`;

      // Format the message for OpenAI
      const messages = [
        {
          role: 'system',
          content: 'You are an expert business forecasting AI. Provide accurate, data-driven forecasts and return them in valid JSON format only. No explanatory text outside the JSON.'
        },
        {
          role: 'user',
          content: forecastPrompt
        }
      ];

      // Use the OpenAI API directly with the business-specific API key
      const response = await axios.post(
        OPENAI_API_URL, 
        {
          model: 'gpt-4o',
          messages,
          temperature: 0.2,
          max_tokens: 800,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
        }
      );

      // With axios, the response data is already parsed
      if (response.data.error) {
        throw new Error(response.data.error.message || 'Error generating business forecast');
      }

      // Parse the JSON response
      const forecastResponse = JSON.parse(response.data.choices[0].message.content);
      
      return {
        ...forecastResponse,
        generatedAt: new Date().toISOString(),
        forecastType,
        periodMonths
      };
    } catch (error) {
      //console.error('Error generating business forecast:', error);
      return {
        error: error.message,
        forecast: [],
        analysis: "Unable to generate forecast at this time. Please check your connection or try again later."
      };
    }
  },
  
  /**
   * Generate industry-specific business recommendations
   * 
   * @param {Object} businessProfile - Business profile data
   * @param {Object} businessMetrics - Business performance metrics
   * @returns {Promise<Array>} List of business recommendations
   */
  generateBusinessRecommendations: async (businessProfile, businessMetrics) => {
    try {
      // Format the prompt for AI recommendations
      const recommendationPrompt = `As an AI business consultant, provide strategic recommendations for a ${businessProfile.industry || 'small'} business.
Focus on actionable advice that can improve business performance based on the current metrics.
For each recommendation:
1. Provide a clear action item
2. Explain the expected benefit
3. Suggest how to implement it
4. Estimate the impact (high/medium/low)
5. Estimate the effort required (high/medium/low)

Format your response as JSON with this structure:
{
  "recommendations": [
    {
      "title": "Brief recommendation title",
      "description": "Detailed explanation of the recommendation",
      "implementation": "Steps to implement this recommendation",
      "impact": "high|medium|low",
      "effort": "high|medium|low",
      "category": "financial|operational|marketing|customer|other"
    }
  ],
  "summary": "Brief summary of the key recommendations"
}

Business profile: ${JSON.stringify(businessProfile)}
Business metrics: ${JSON.stringify(businessMetrics)}`;

      // Format the message for OpenAI
      const messages = [
        {
          role: 'system',
          content: 'You are an expert business consultant AI. Provide practical, industry-specific recommendations in JSON format only. No explanatory text outside the JSON.'
        },
        {
          role: 'user',
          content: recommendationPrompt
        }
      ];

      // Use the OpenAI API directly with the business-specific API key
      const response = await axios.post(
        OPENAI_API_URL, 
        {
          model: 'gpt-4o',
          messages,
          temperature: 0.4,
          max_tokens: 1000,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
        }
      );

      // With axios, the response data is already parsed
      if (response.data.error) {
        throw new Error(response.data.error.message || 'Error generating business recommendations');
      }

      // Parse the JSON response
      const recommendationsResponse = JSON.parse(response.data.choices[0].message.content);
      
      return {
        ...recommendationsResponse,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      //console.error('Error generating business recommendations:', error);
      return {
        error: error.message,
        recommendations: [],
        summary: "Unable to generate recommendations at this time. Please try again later."
      };
    }
  },
  
  /**
   * Analyze business competition based on market data
   * 
   * @param {Object} businessData - Business profile and performance data
   * @param {Array} competitorData - Data about competitors (if available)
   * @param {string} industry - Business industry for market analysis
   * @returns {Promise<Object>} Competitive analysis and positioning
   */
  analyzeBusinessCompetition: async (businessData, competitorData = [], industry = '') => {
    try {
      // Format the prompt for competitive analysis
      const competitiveAnalysisPrompt = `As an AI market analyst, provide a competitive analysis for a business in the ${industry || businessData.industry || 'unknown'} industry.
Include:
1. Market positioning analysis
2. Competitive advantages and disadvantages
3. Opportunities for differentiation
4. Threat assessment
5. Strategic recommendations to improve competitive position

Format your response as JSON with this structure:
{
  "marketPosition": "Analysis of current market position",
  "strengths": ["List of competitive strengths"],
  "weaknesses": ["List of competitive weaknesses"],
  "opportunities": ["List of market opportunities"],
  "threats": ["List of competitive threats"],
  "recommendations": ["Strategic recommendations"],
  "competitorAnalysis": [
    {
      "name": "Competitor category or archetype",
      "strengths": "What they do well",
      "weaknesses": "Their vulnerabilities",
      "howToCompete": "Strategy to compete against this type"
    }
  ]
}

Business data: ${JSON.stringify(businessData)}
Competitor data: ${JSON.stringify(competitorData)}`;

      // Format the message for OpenAI
      const messages = [
        {
          role: 'system',
          content: 'You are an expert market analyst AI. Provide insightful competitive analysis in JSON format only. If specific competitor data is not provided, use industry knowledge to create archetypal competitor profiles.'
        },
        {
          role: 'user',
          content: competitiveAnalysisPrompt
        }
      ];

      // Use the OpenAI API directly with the business-specific API key
      const response = await axios.post(
        OPENAI_API_URL, 
        {
          model: 'gpt-4o',
          messages,
          temperature: 0.4,
          max_tokens: 1000,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
        }
      );

      // With axios, the response data is already parsed
      if (response.data.error) {
        throw new Error(response.data.error.message || 'Error analyzing business competition');
      }

      // Parse the JSON response
      const competitiveAnalysis = JSON.parse(response.data.choices[0].message.content);
      
      return {
        ...competitiveAnalysis,
        generatedAt: new Date().toISOString(),
        industry: industry || businessData.industry || 'Unknown'
      };
    } catch (error) {
      //console.error('Error analyzing business competition:', error);
      return {
        error: error.message,
        marketPosition: "Unable to analyze competitive position at this time.",
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: [],
        recommendations: [],
        competitorAnalysis: []
      };
    }
  }
};

export default businessAiService;
