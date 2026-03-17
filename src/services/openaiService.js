import axios from 'axios';
import { OPENAI_API_KEY } from '@env';


// API configurations
const OPENAI_API_URL = process.env.OPENAI_API_URL;

/**
 * Service to handle OpenAI API interactions
 */
const openaiService = {
  /**
   * Generate a standard response from OpenAI based on conversation history and financial data
   *
   * @param {Array} messages - Array of message objects with text and isUser properties
   * @param {Object} financialContext - Object containing financial data (bills, stats, etc.)
   * @returns {Promise<string>} - The generated response
   */
  generateResponse: async (messages, financialContext) => {
    try {
      // Format messages for OpenAI
      const formattedMessages = [
        {
          role: 'system',
          content: `You are a helpful financial assistant in a bill management app.
You help users understand their spending, manage bills, and create budgets.
Here is the user's financial data: ${JSON.stringify(financialContext)}`,
        },
        ...messages.map(msg => ({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.text,
        })),
      ];

      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: 'gpt-3.5-turbo',
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: 300,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      // OpenAI API Error handling

      // Fallback response in case of API failure
      return "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again in a moment.";
    }
  },

  /**
   * Generate a specialized budget planning response with detailed financial advice
   *
   * @param {Array} messages - Array of message objects with text and isUser properties
   * @param {Object} financialContext - Object containing financial data with budget-specific information
   * @returns {Promise<string>} - The generated budget advice response
   */
  generateBudgetResponse: async (messages, financialContext) => {
    try {
      // Enhanced system prompt for budget planning
      const budgetSystemPrompt = `You are an expert financial advisor specializing in budget planning.
Your goal is to help the user create a personalized budget plan based on their income, expenses, and financial goals.

Focus on providing actionable advice for:
1. Allocating income to different spending categories (housing, food, utilities, etc.)
2. Establishing emergency funds and savings goals
3. Reducing unnecessary expenses
4. Planning for recurring bills and payments
5. Setting realistic financial goals

When giving advice, reference their specific bill data and spending patterns.
If the user provides their income, use the 50/30/20 rule as a starting point (50% needs, 30% wants, 20% savings).

Here is the user's financial data: ${JSON.stringify(financialContext.bills)}
Here are the user's spending statistics: ${JSON.stringify(financialContext.statistics)}
Here are the user's spending analytics: ${JSON.stringify(financialContext.analytics)}`;

      // Format messages for OpenAI with enhanced budget prompt
      const formattedMessages = [
        {
          role: 'system',
          content: budgetSystemPrompt,
        },
        ...messages.map(msg => ({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.text,
        })),
      ];

      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: 'gpt-3.5-turbo',
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: 600, // Larger response for detailed budget advice
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      // OpenAI Budget API Error handling

      // Fallback response in case of API failure
      return "I'm sorry, I'm having trouble analyzing your financial data for budget planning right now. Please try again in a moment.";
    }
  },

  /**
   * Extract invoice data from document text using OpenAI
   * 
   * @param {string} invoiceText - The text content extracted from an invoice document
   * @returns {Promise<Object>} - The structured invoice data as a JavaScript object
   */
  extractInvoiceData: async (invoiceText) => {
    try {
      // Create a specialized prompt for invoice extraction
      const extractionPrompt = `Extract the following information from this invoice and return it as a JSON object:
- Vendor name
- Invoice number 
- Issue date
- Due date
- Items (with description, quantity, unit price, and amount)
- Subtotal
- Tax amount and percentage
- Discount amount and percentage
- Total amount
- Client name
- Client address
- Client email
- Notes/memo

Invoice text:
${invoiceText}

Return ONLY valid JSON with these fields. Do not include any explanation or other text.`;

      // Format the message
      const messages = [
        {
          role: 'system',
          content: 'You are an invoice data extraction specialist. Extract precise structured data from invoice text.',
        },
        {
          role: 'user',
          content: extractionPrompt,
        },
      ];

      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: 'gpt-3.5-turbo',
          messages: messages,
          temperature: 0.3, // Lower temperature for more precise output
          max_tokens: 500,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
        }
      );

      const aiResponseText = response.data.choices[0].message.content;
      
      // Parse the response as JSON
      try {
        const invoiceData = JSON.parse(aiResponseText);
        return invoiceData;
      } catch (parseError) {
        //console.error('Failed to parse invoice data JSON:', parseError);
        throw new Error('AI returned invalid JSON format for invoice data');
      }

    } catch (error) {
      //console.error('Error extracting invoice data:', error);
      throw error;
    }


  },

};




export default openaiService;
