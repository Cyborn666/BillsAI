/**
 * OCR Service for Client-Side Processing
 * Handles document scanning and data extraction using Google Cloud Vision API directly
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GOOGLE_CLOUD_VISION_API_KEY ,GOOGLE_CLOUD_VISION_API_URL,OPENAI_API_KEY,OPENAI_API_URL} from '@env';

// Constants for API


/**
 * Process an image with Google Cloud Vision API directly from the client
 * @param {String} base64Image - Base64 encoded image data without 'data:image/...' prefix
 * @returns {Promise<Object>} - OCR results
 */
export const processImageWithGoogleVision = async (base64Image) => {
  try {
    //console.log('Processing image with Google Cloud Vision API');
    
    // Get the API key from environment variable
    const apiKey = GOOGLE_CLOUD_VISION_API_KEY;
    
    if (!apiKey) {
      throw new Error('Google Cloud Vision API key not found');
    }
    
    // Prepare the request body for Google Cloud Vision API
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 1,
            },
          ],
        },
      ],
    };
    
    // Make the API request to Google Cloud Vision
    const response = await fetch(`${GOOGLE_CLOUD_VISION_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      throw new Error(`Google Cloud Vision API error: ${response.status}`);
    }
    
    // Extract the OCR results
    const data = await response.json();
    //console.log('Google Cloud Vision API response received');
    
    // Extract the text from the response
    const textAnnotations = data.responses[0]?.textAnnotations;
    if (!textAnnotations || textAnnotations.length === 0) {
      return { fullText: '', blocks: [] };
    }
    
    // The first textAnnotation contains the full text
    const fullText = textAnnotations[0].description;
    
    // Return the extracted text and detailed annotations
    return {
      fullText,
      blocks: textAnnotations.slice(1), // The individual text blocks
    };
  } catch (error) {
    //console.error('Error processing image with Google Cloud Vision:', error);
    throw error;
  }
};

/**
 * Refine raw OCR text using OpenAI
 * @param {String} ocrText - Raw OCR text
 * @param {String} documentType - Type of document ('expense', 'invoice', etc.)
 * @returns {Promise<Object>} - Structured data extracted from OCR text
 */
export const refineOcrWithAI = async (ocrText, documentType = 'expense') => {
  try {
    //console.log('Refining OCR text with AI');

    // For expenses, we extract different fields than for invoices
    const promptType = documentType === 'invoice' ? 'invoice' : documentType;

    // Make request to our backend's AI processing endpoint
    // If we've moved all OCR to the client, we can use a service like OpenAI directly
    // or send this to a serverless function instead
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }
    
    // Construct the appropriate prompt based on document type
    let prompt = '';
    if (promptType === 'expense') {
      prompt = `Extract the following information from this receipt OCR text: 
        1. Title (store or merchant name)
        2. Date (in YYYY-MM-DD format)
        3. Total amount (just the number)
        4. Subtotal (pre-tax amount, just the number)
        5. Tax amount (just the number)
        6. Discount amount (if any, just the number)
        7. Payment method (CASH, CREDIT_CARD, DEBIT_CARD, OTHER)
        8. Category (one of: FOOD, TRAVEL, OFFICE, UTILITY, OPERATIONAL, OTHER)
        
        For each item, if the information is not found in the text, use null.
        
        Receipt text:
        ${ocrText}
        
        Return the information in JSON format with keys: title, date, amount, subtotal, tax, discount, paymentMethod, category.`;
    } else if (promptType === 'invoice') {
      prompt = `Extract the following information from this invoice OCR text:
        1. Invoice number
        2. Invoice date (in YYYY-MM-DD format)
        3. Due date (in YYYY-MM-DD format)
        4. Total amount (just the number)
        5. Vendor name
        6. Description of services
        
        For each item, if the information is not found in the text, use null.
        
        Invoice text:
        ${ocrText}
        
        Return the information in JSON format with keys: invoiceNumber, invoiceDate, dueDate, amount, vendor, description.`;
    } else if (promptType === 'report') {
      prompt = `Extract the following information from this daily business report OCR text:
        1. Date (in YYYY-MM-DD format)
        2. Total sales amount (just the number)
        3. Total expenses amount (just the number)
        4. Total cash amount (just the number)
        5. Total card amount (just the number)
        6. Number of transactions (just the number)
        7. Notes or comments (text)
        
        For each item, if the information is not found in the text, use null.
        
        Report text:
        ${ocrText}
        
        Return the information in JSON format with keys: date, totalSales, totalExpenses, cashAmount, cardAmount, transactionCount, notes.`;
    }
    
    // Make the API request to OpenAI
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that extracts structured data from OCR text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`AI refinement error: ${response.status}`);
    }
    
    const aiData = await response.json();
    const refinedText = aiData.choices[0]?.message?.content || '';
    
    // Parse the JSON response
    try {
      // Extract JSON object from response (handle case where AI includes markdown)
      const jsonMatch = refinedText.match(/\{[^]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        return JSON.parse(jsonStr);
      } else {
        throw new Error('Could not extract JSON from AI response');
      }
    } catch (parseError) {
      //console.error('Error parsing AI response:', parseError);
      // Fallback structure with empty fields
      return documentType === 'expense' 
        ? { title: '', date: '', amount: '', category: 'OTHER' }
        : { invoiceNumber: '', invoiceDate: '', dueDate: '', amount: '', vendor: '', description: '' };
    }
  } catch (error) {
    //console.error('Error refining OCR with AI:', error);
    throw error;
  }
};

/**
 * Scan an expense receipt using client-side OCR
 * @param {String} base64Image - Base64 encoded image data
 * @returns {Promise<Object>} - Extracted expense data
 */
export const scanExpenseReceipt = async (base64Image) => {
  try {
    //console.log('Starting client-side OCR processing for expense receipt');

    // Process the image with Google Cloud Vision
    const ocrResult = await processImageWithGoogleVision(base64Image);

    // Refine the OCR results with AI
    const refinedData = await refineOcrWithAI(ocrResult.fullText, 'expense');

    // Add the original OCR text for reference
    refinedData.originalText = ocrResult.fullText;

    // Return the extracted expense data
    return {
      success: true,
      extractedExpense: refinedData,
    };
  } catch (error) {
    //console.error('Error scanning expense receipt:', error);
    throw error;
  }
};

/**
 * Scan a daily business report using client-side OCR
 * @param {String} base64Image - Base64 encoded image data
 * @returns {Promise<Object>} - Extracted report data
 */
export const scanDailyReport = async (base64Image) => {
  try {
    //console.log('Starting client-side OCR processing for daily report');

    // Process the image with Google Cloud Vision
    const ocrResult = await processImageWithGoogleVision(base64Image);

    // Refine the OCR results with AI, specifying this is a report document
    const refinedData = await refineOcrWithAI(ocrResult.fullText, 'report');

    // Add the original OCR text for reference
    refinedData.originalText = ocrResult.fullText;

    // Return the extracted report data
    return {
      success: true,
      extractedReport: refinedData,
    };
  } catch (error) {
    //console.error('Error scanning daily report:', error);
    throw error;
  }
};

/**
 * Map the extracted data to our expense schema
 * @param {Object} extractedData - Data extracted from OCR and refined with AI
 * @param {String} userId - User ID
 * @param {String} businessId - Business ID
 * @returns {Object} - Data mapped to expense schema
 */
export const mapToExpenseSchema = (extractedData, userId, businessId) => {
  return {
    title: extractedData.title || 'Receipt',
    amount: extractedData.amount ? parseFloat(extractedData.amount) : 0,
    date: extractedData.date ? new Date(extractedData.date) : new Date(),
    category: extractedData.category || 'OTHER',
    subtotal: extractedData.subtotal ? parseFloat(extractedData.subtotal) : null,
    tax: extractedData.tax ? parseFloat(extractedData.tax) : null,
    discount: extractedData.discount ? parseFloat(extractedData.discount) : null,
    paymentMethod: extractedData.paymentMethod || 'OTHER',
    notes: extractedData.notes || 'Scanned with OCR',
    businessId,
    createdBy: userId,
    originalText: extractedData.originalText,
  };
};

/**
 * Map the extracted data to our daily report schema
 * @param {Object} extractedData - Data extracted from OCR and refined with AI
 * @param {String} userId - User ID
 * @param {String} businessId - Business ID
 * @returns {Object} - Data mapped to daily report schema
 */
export const mapToReportSchema = (extractedData, businessId) => {
  return {
    date: extractedData.date ? new Date(extractedData.date) : new Date(),
    totalSales: extractedData.totalSales ? parseFloat(extractedData.totalSales) : 0,
    totalExpenses: extractedData.totalExpenses ? parseFloat(extractedData.totalExpenses) : 0,
    cashAmount: extractedData.cashAmount ? parseFloat(extractedData.cashAmount) : 0,
    cardAmount: extractedData.cardAmount ? parseFloat(extractedData.cardAmount) : 0,
    transactionCount: extractedData.transactionCount ? parseInt(extractedData.transactionCount, 10) : 0,
    notes: extractedData.notes || '',
    businessId,
    originalText: extractedData.originalText,
    salesTax: extractedData.salesTax ? parseFloat(extractedData.salesTax) : 0,
    Drops: extractedData.drops ? parseFloat(extractedData.drops) : 0,
    OverShort: extractedData.overShort ? parseFloat(extractedData.overShort) : 0,
    subtotal: extractedData.subtotal ? parseFloat(extractedData.subtotal) : 0,
  };
};
