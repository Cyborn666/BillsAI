/**
 * Currency utility functions for the BillsAI app
 */

/**
 * Format a number as currency with the specified currency symbol
 * @param {number} amount - The amount to format
 * @param {string} currencySymbol - The currency symbol to use (default: '$')
 * @param {string} locale - The locale to use for formatting (default: 'en-US')
 * @returns {string} The formatted currency string
 */
export const formatCurrency = (amount, currencySymbol = '$', locale = 'en-US') => {
  if (amount === null || amount === undefined) {
    return `${currencySymbol}0.00`;
  }

  // Ensure amount is a number
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Handle NaN
  if (isNaN(numericAmount)) {
    return `${currencySymbol}0.00`;
  }

  try {
    // Use the Intl.NumberFormat for locale-aware formatting
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    // Format the number and add the currency symbol
    return `${currencySymbol}${formatter.format(numericAmount)}`;
  } catch (error) {
    // Fallback formatting if Intl API fails
    return `${currencySymbol}${numericAmount.toFixed(2)}`;
  }
};

/**
 * Parse a currency string into a number
 * @param {string} currencyString - The currency string to parse
 * @returns {number} The parsed amount
 */
export const parseCurrency = (currencyString) => {
  if (!currencyString) return 0;
  
  // Remove currency symbol and any non-numeric characters except decimal point
  const numericString = currencyString.replace(/[^0-9.-]/g, '');
  return parseFloat(numericString) || 0;
};

/**
 * Calculate total from an array of amounts
 * @param {Array<number>} amounts - Array of numeric amounts
 * @returns {number} The total sum
 */
export const calculateTotal = (amounts = []) => {
  if (!Array.isArray(amounts) || amounts.length === 0) {
    return 0;
  }
  
  return amounts.reduce((sum, amount) => {
    const value = typeof amount === 'string' ? parseCurrency(amount) : amount;
    return sum + (isNaN(value) ? 0 : value);
  }, 0);
};
