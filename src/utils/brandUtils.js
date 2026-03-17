/**
 * Utility functions for working with brand logos and identities
 */
import theme from '../styles/theme';

// Store cached logos to avoid repeated API calls
const logoCache = {};

/**
 * Fetch a brand logo based on company name
 * @param {string} brandName - The name of the company/brand
 * @returns {Promise<string>} - URL to the brand logo image
 */
export const getBrandLogo = async (brandName) => {
  if (!brandName) {return null;}

  // Check cache first
  const normalizedName = brandName.toLowerCase().trim();
  if (logoCache[normalizedName]) {
    return logoCache[normalizedName];
  }

  // For well-known service names, we can provide fallback logos using Clearbit
  // if the primary API fails
  try {
    // First try Clearbit as a free fallback (no API key needed)
    const companyDomain = `${normalizedName.replace(/\s+/g, '')}.com`;
    const clearbitUrl = `https://logo.clearbit.com/${companyDomain}`;

    // Store in cache and return
    logoCache[normalizedName] = clearbitUrl;
    return clearbitUrl;
  } catch (error) {
    ////console.log('Error fetching brand logo:', error);
    return null;
  }
};

/**
 * Get an appropriate Material icon for a bill category or company name
 * @param {string} billName - Name of the bill/company
 * @param {string} category - Bill category
 * @returns {Object} - Icon family and name
 */
export const getCategoryIcon = (billName, category) => {
  const normalizedName = billName ? billName.toLowerCase().trim() : '';
  const normalizedCategory = category ? category.toLowerCase().trim() : '';

  // Company-specific icons
  const companyIcons = {
    'netflix': { name: 'movie', color: '#E50914' },
    'hulu': { name: 'movie', color: '#1CE783' },
    'spotify': { name: 'music-note', color: '#1DB954' },
    'apple': { name: 'phone-iphone', color: '#A2AAAD' },
    'youtube': { name: 'smart-display', color: '#FF0000' },
    'amazon': { name: 'shopping-cart', color: '#FF9900' },
    'prime': { name: 'shopping-cart', color: '#FF9900' },
    'disney': { name: 'movie', color: '#113CCF' },
    'hbo': { name: 'movie', color: '#5A31F4' },
    'att': { name: 'wifi', color: '#00A8E0' },
    'verizon': { name: 'cell-tower', color: '#CD040B' },
    't-mobile': { name: 'cell-tower', color: '#E20074' },
    'comcast': { name: 'wifi', color: '#000000' },
    'xfinity': { name: 'wifi', color: '#000000' },
  };

  // Category-based icons
  const categoryIcons = {
    'utilities': { name: 'electrical-services', color: '#FFA000' },
    'electricity': { name: 'electrical-services', color: '#FFA000' },
    'water': { name: 'water-drop', color: '#039BE5' },
    'gas': { name: 'local-fire-department', color: '#F57C00' },
    'internet': { name: 'wifi', color: '#039BE5' },
    'phone': { name: 'smartphone', color: '#7B1FA2' },
    'mobile': { name: 'smartphone', color: '#7B1FA2' },
    'rent': { name: 'home', color: '#00897B' },
    'mortgage': { name: 'house', color: '#00897B' },
    'insurance': { name: 'health-and-safety', color: '#D32F2F' },
    'credit card': { name: 'credit-card', color: '#5D4037' },
    'subscription': { name: 'subscriptions', color: '#3949AB' },
    'entertainment': { name: 'tv', color: '#3949AB' },
    'streaming': { name: 'subscriptions', color: '#3949AB' },
    'gym': { name: 'fitness-center', color: '#D81B60' },
    'fitness': { name: 'fitness-center', color: '#D81B60' },
  };

  // Check for company name match
  for (const [key, value] of Object.entries(companyIcons)) {
    if (normalizedName.includes(key)) {
      return value;
    }
  }

  // Check for category match
  for (const [key, value] of Object.entries(categoryIcons)) {
    if (normalizedCategory.includes(key) || normalizedName.includes(key)) {
      return value;
    }
  }

  // Default icon
  return { name: 'receipt', color: theme?.colors?.primary || '#6200EA' };
};
