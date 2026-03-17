/**
 * BillAnalytics.js
 * Analytics component showing spending patterns and bill distribution charts
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';


import theme from '../../styles/theme';
import * as billService from '../../services/billService';

// Data handling is kept minimal for performance

const BillAnalytics = ({ data: initialData, isLoading: initialLoading }) => {
  // Local state to handle real-time updates
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(initialLoading);
  // Function to refresh analytics data
  const refreshAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      const analyticsResponse = await billService.getBillAnalytics();
      setData(analyticsResponse);
      ////console.log('Analytics data refreshed in real-time');
    } catch (error) {
      ////console.error('Failed to refresh analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  // Subscribe to data changes
  useEffect(() => {
    // When initial data changes, update local state
    setData(initialData);
    setIsLoading(initialLoading);
  }, [initialData, initialLoading]);
  // Subscribe to real-time updates
  useEffect(() => {
    // Subscribe to data updates from billService
    const unsubscribe = billService.subscribeToDataUpdates(() => {
      ////console.log('Data update received, refreshing analytics...');
      refreshAnalytics();
    });
    // Clean up subscription when component unmounts
    return () => {
      unsubscribe();
    };
  }, [refreshAnalytics]);
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (!data || !data.categoryDistribution || !data.monthlyTrends ||
      !Array.isArray(data.categoryDistribution) || !Array.isArray(data.monthlyTrends) ||
      data.categoryDistribution.length === 0 || data.monthlyTrends.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No analytics data available</Text>
      </View>
    );
  }

  // Format data for the pie chart - with validation
  const pieChartData = data.categoryDistribution
    .filter(item => {
      // Filter out any items with invalid values
      const hasValidAmount = typeof item.amount === 'number' && isFinite(item.amount) && item.amount >= 0;
      const hasValidPercentage = typeof item.percentage === 'number' && isFinite(item.percentage) && item.percentage >= 0;
      if (!hasValidAmount || !hasValidPercentage) {
        ////console.warn('Invalid data in categoryDistribution:', item);
      }
      return hasValidAmount && hasValidPercentage;
    })
    .map((item, itemIndex) => {
      // Vibrant color scheme for different bill categories
      const colorOptions = [
        '#4A90E2', // Blue - UTILITIES
        '#50E3C2', // Teal - SUBSCRIPTION
        '#F5A623', // Orange - RENT
        '#D0021B', // Red - MORTGAGE
        '#7ED321', // Green - INSURANCE
        '#BD10E0', // Purple - EDUCATION
        '#9013FE', // Violet - HEALTHCARE
        '#B8E986', // Light Green - GROCERIES
        '#FF9500', // Amber - TRANSPORTATION
        '#4A4A4A', // Dark Gray - TAXES
        '#8B572A', // Brown - ENTERTAINMENT
        '#417505', // Dark Green - SAVINGS
        '#FF3B30',  // Bright Red - DEBT
      ];
      
      // Map category to specific color if possible
      const getCategoryColor = (category) => {
        // Simple string hash function to consistently map category to colors
        const hashString = (str) => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            // Using multiply by 31 instead of bit shift to avoid lint warning
            hash = str.charCodeAt(i) + ((hash * 31) - hash);
          }
          return hash;
        };

        const categoryColors = {
          'UTILITIES': '#4A90E2',
          'SUBSCRIPTION': '#50E3C2',
          'RENT': '#F5A623',
          'MORTGAGE': '#D0021B',
          'INSURANCE': '#7ED321',
          'EDUCATION': '#BD10E0',
          'HEALTHCARE': '#9013FE',
          'GROCERIES': '#B8E986',
          'TRANSPORTATION': '#FF9500',
          'TAXES': '#4A4A4A',
          'ENTERTAINMENT': '#8B572A',
          'SAVINGS': '#417505',
          'DEBT': '#FF3B30',
          'OTHER': '#4A4A4A',
        };

        // Make sure we have a valid category and return a fallback color if not
      if (!category) {
        return colorOptions[0]; // Default to first color
      }

      try {
        const upperCategory = category.toUpperCase();
        const mappedColor = categoryColors[upperCategory];

        if (mappedColor) {
          return mappedColor;
        }

        // Use hash-based color selection with proper validation
        const hashIndex = Math.abs(hashString(category) % colorOptions.length);
        return colorOptions[hashIndex];
      } catch (error) {
        ////console.warn('Error getting category color:', error);
        return colorOptions[0]; // Fallback color
      }
      };
      
      // Calculate a slightly darker shade for the stroke to create borders
      const getDarkerShade = (color) => {
        // Check if color is valid hex
        if (!color || typeof color !== 'string' || !color.startsWith('#') || color.length !== 7) {
          return '#4A4A4A'; // Default to dark gray as fallback
        }

        try {
          // Simple darkening for hex colors
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          
          // Check for NaN values
          if (isNaN(r) || isNaN(g) || isNaN(b)) {
            return '#4A4A4A';
          }
          
          const darken = (val) => Math.max(0, val - 20);
          
          return `#${darken(r).toString(16).padStart(2, '0')}${darken(g).toString(16).padStart(2, '0')}${darken(b).toString(16).padStart(2, '0')}`;
        } catch (error) {
          ////console.warn('Error processing color:', error);
          return '#4A4A4A'; // Default fallback
        }
      };
      
      // Apply patterns based on index to further distinguish segments
      const getPattern = (index) => {
        const patterns = ['solid', 'dotted', 'dashed', 'diagonal', 'horizontal', 'vertical'];
        return patterns[index % patterns.length];
      };
      
      // Ensure we have valid category data
      const category = item.category || 'Other';
      
      // Use category-specific color with guaranteed valid value
      let baseColor = getCategoryColor(category);
      
      // Additional validation to ensure we never pass undefined to React Native's color system
      if (!baseColor || typeof baseColor !== 'string' || !baseColor.startsWith('#')) {
        ////console.warn(`Invalid color generated for category: ${category}. Using fallback.`);
        baseColor = '#4A4A4A'; // Dark gray fallback
      }
      
      // Get stroke color with guaranteed valid value
      let strokeColor = getDarkerShade(baseColor);
      
      // Extra validation for stroke color
      if (!strokeColor || typeof strokeColor !== 'string' || !strokeColor.startsWith('#')) {
        ////console.warn(`Invalid stroke color generated for category: ${category}. Using fallback.`);
        strokeColor = '#333333'; // Darker gray fallback
      }
      
      // Format the name to display a more readable amount and category label
      // Format to a shorter label to prevent overflow
      const formattedName = `$${Math.round(item.amount)} ${category.substring(0, 6)}`;
      
      return {
        name: formattedName,
        amount: item.amount,
        percentage: item.percentage,
        color: baseColor, // Now guaranteed to be valid
        strokeColor: strokeColor, // Now guaranteed to be valid
        strokeWidth: 2,
        pattern: getPattern(itemIndex),
        legendFontColor: '#333333',
        legendFontSize: 12,
      };
    });

  // Format data for the line chart - with validation
  const validMonthlyTrends = data.monthlyTrends.filter(item => {
    const isValidAmount = typeof item.amount === 'number' && isFinite(item.amount) && item.amount >= 0;
    if (!isValidAmount) {
      ////console.warn('Invalid data in monthlyTrends:', item);
    }
    return isValidAmount;
  });
  
  // Note: We're keeping this data preparation for when we implement the line chart
  // For now, we're only using the pie chart

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bills Analytics</Text>
      <View style={styles.titleUnderline} />
      
      {/* Category distribution pie chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>
          Spending by Category
        </Text>
        {pieChartData.length > 0 ? (
          <View style={styles.pieChartWrapper}>
            <View style={styles.centeredChartContainer}>
              <PieChart
                data={pieChartData.slice(0, 8)} // Limit to 8 categories max for better visibility
                width={300} // Width to fit full circle
                height={300} // Match width for perfect circle
                chartConfig={{
                  backgroundColor: theme.colors.white,
                  backgroundGradientFrom: theme.colors.white,
                  backgroundGradientTo: theme.colors.white,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  propsForLabels: {
                    fontSize: '9',
                    fontWeight: 'bold'
                  }
                }}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="0"
                absolute
                hasLegend={false}
                avoidFalseZero
                center={[75, 0]} // Adjusted to show full circle
                strokeWidth={2}
              />
            </View>

            {/* Custom legend */}
            <View style={styles.legendContainer}>
              {pieChartData.map((item, legendIndex) => (
                <View key={legendIndex} style={styles.legendItem}>
                  <View style={[styles.legendColor, {backgroundColor: item.color}]} />
                  <Text style={styles.legendText}>
                    {item.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyChartContainer}>
            <Text style={styles.emptyChartText}>No category data available</Text>
          </View>
        )}
      </View>

      {/* Monthly trends line chart 
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>
          <Text style={{color: theme.colors.black}}>●</Text> Monthly Spending Trends
        </Text>
        {validMonthlyTrends.length > 0 ? (
          <LineChart
            data={lineChartData}
            width={Dimensions.get('window').width - 40}
            height={220}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: theme.colors.black,
              backgroundGradientTo: theme.colors.white,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity * 0.8})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '5',
                strokeWidth: '2',
                stroke: theme.colors.black,
                fill: theme.colors.white,
              },
              propsForBackgroundLines: {
                strokeDasharray: '5,5',
                strokeWidth: 1,
                stroke: 'rgba(0,0,0,0.1)',
              },
              fillShadowGradientFrom: theme.colors.black,
              fillShadowGradientTo: theme.colors.white,
              fillShadowGradientOpacity: 0.6,
              formatYLabel: (value) => `$${value}`,
              formatTopBarValue: (value) => `$${value}`,
            }}
            bezier
            withShadow={true}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLines={false}
            decorator={renderTooltipDecorator}
            onDataPointClick={handleDataPointClick}
            style={styles.lineChartStyle}
          />
        ) : (
          <View style={styles.emptyChartContainer}>
            <Text style={styles.emptyChartText}>No trend data available</Text>
          </View>
        )}
      </View> */}

      {/* Summary statistics 
      <Text style={styles.statsSectionTitle}>Key Metrics</Text>
      <View style={styles.statsContainer}>
        {data.summaryStats && data.summaryStats.map((stat, index) => {
          // Get the highest category from pieChartData if available
          const highestCategory = pieChartData && pieChartData.length > 0
            ? pieChartData.sort((a, b) => b.amount - a.amount)[0]
            : null;
            
          // Determine color based on the metric type and data
          let cardColor;
          
          if (stat.label.includes('Total')) {
            // Total metrics - use a gradient of blue
            cardColor = theme.colors.chartOnyx;
          } else if (stat.label.includes('Paid')) {
            // Paid metrics - use green shades
            cardColor = '#3CB371'; // Medium Sea Green
          } else if (stat.label.includes('Overdue') || stat.label.includes('Late')) {
            // Overdue metrics - use red/orange shades
            cardColor = '#FF5252'; // Red
          } else if (stat.label.includes('Upcoming')) {
            // Upcoming metrics - use amber/gold shades
            cardColor = '#FFC107'; // Amber
          } else if (highestCategory) {
            // For other stats, use the color of the highest spending category
            cardColor = highestCategory.color;
          } else {
            // Fallback
            cardColor = theme.colors.chartBlack;
          }
          
          return (
            <View key={index} style={[styles.statCard, { backgroundColor: cardColor }]}>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            </View>
          );
        })}
      </View>
      */}
    </View>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
    color: theme.colors.black,
    textAlign: 'center',
  },
  titleUnderline: {
    height: 3,
    width: '40%',
    backgroundColor: theme.colors.black,
    alignSelf: 'center',
    marginBottom: 16,
    borderRadius: 10,
  },
  chartContainer: {
    marginBottom: 24,
    padding: 8,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.medium,
    
    alignItems: 'center', // Center content horizontally
  },
  centeredChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    overflow: 'visible', // Allow overflow to ensure visibility
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 10,
    maxHeight: 160, // Limit height for many categories with scrolling if needed
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 11,
    color: theme.colors.text,
    maxWidth: 100, // Prevent long text from overflowing
    flexShrink: 1,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: theme.colors.black,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
    color: theme.colors.text,
    paddingLeft: 4,
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  statGradient: {
    borderRadius: 16,
    height: '100%',
  },
  statContent: {
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    height: 110,
  },
  statValue: {
    fontSize: theme.typography.fontSizes.large,
    fontWeight: 'bold',
    marginBottom: 8,
    color: theme.colors.white,
    textTransform: 'capitalize',
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'left',
    color: theme.colors.chartErieWhite,
    textTransform: 'capitalize',
    opacity: 0.9,
  },
  percentageText: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333333',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pieChartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.colors.textLight,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.black,
    borderRadius: 12,
    margin: 8,
  },
  emptyChartContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.black,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.chartTeal,
    borderStyle: 'dashed',
  },
  emptyChartText: {
    fontSize: 16,
    color: theme.colors.white,
    textAlign: 'center',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
  lineChartStyle: {
    marginVertical: 12,
    borderRadius: 16,
    paddingRight: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  tooltipContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 4,
    marginRight: 16,
    marginBottom: 8,
  },
  tooltipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default BillAnalytics;
