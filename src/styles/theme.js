/**
 * Theme configuration for BillsAI app
 * Enhanced with a professional business color palette
 */

const theme = {
  colors: {
    // Pure black and white
    black: 'hsl(0, 0%, 0%)',
    white: 'hsl(0, 0%, 98%)',

    // Shades of gray
    gray100: 'hsl(0, 0%, 96%)',
    gray200: 'hsl(0, 0%, 90%)',
    gray300: 'hsl(0, 0%, 80%)',
    gray400: 'hsl(0, 0%, 70%)',
    gray500: 'hsl(0, 0%, 60%)',
    gray600: 'hsl(0, 0%, 50%)',
    gray700: 'hsl(0, 0%, 40%)',
    gray800: 'hsl(0, 0%, 30%)',
    gray900: 'hsl(0, 0%, 20%)',

    // Functional colors
    error: 'hsl(0, 80%, 50%)',  // Red
    success: 'hsl(142, 76%, 36%)',  // Green
    info: 'hsl(200, 80%, 50%)',  // Blue
    warning: 'hsl(40, 100%, 50%)',  // Yellow/Orange

    

    errorOpacity: 'hsl(0, 80%, 50%)',  // Red
    successOpacity: 'hsl(142, 76%, 36%)',  // Green
    infoOpacity: 'hsl(200, 80%, 50%)',  // Blue
    warningOpacity: 'hsl(40, 100%, 50%)',  // Y



    // Business color palette
    primary: '#1A73E8',  // Professional blue
    secondary: '#7B1FA2',  // Deep purple
    accent: '#00C853',  // Fresh green

    // Business theme colors
    businessPrimary: '#3867d6',  // Strong blue
    businessSecondary: '#5E35B1',  // Rich purple
    businessAccent: '#00C853',  // Fresh green
    businessSuccess: '#43A047',  // Business green
    businessError: '#E53935',  // Business red
    businessWarning: '#FB8C00',  // Business orange
    businessInfo: '#039BE5',  // Business light blue

    // Background and surface colors
    background: '#FFFFFF',
    surface: '#FFFFFF',
    cardBackground: '#FFFFFF',
    businessBackground: '#FFFFFF',  // Light blue-gray
    businessSurface: '#FFFFFF',
    businessCardBackground: '#FFFFFF',
    businessAccentLight: '#E8F5E9',  // Light green background
    businessPrimaryLight: '#E3F2FD',  // Light blue background

    // Text colors
    text: '#212121',  // Almost black
    textSecondary: '#757575',  // Medium gray
    textDisabled: '#BDBDBD',  // Light gray
    textInverse: '#FFFFFF',  // White text for dark backgrounds
    businessText: '#263238',  // Deep blue-gray
    businessTextSecondary: '#546E7A',  // Medium blue-gray
  },

  typography: {
    fontSizes: {
      small: 12,
      medium: 14,
      large: 16,
      xlarge: 18,
      xxlarge: 22,
      xxxlarge: 28,
    },
    fontWeights: {
      regular: '400',
      medium: '500',
      bold: '700',
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },

  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
    round: 9999,
  },
};

export default theme;
