/**
 * Monthly Overview component showing financial summary for the month
 * Flips to show analytics when clicked
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Easing } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import theme from '../../styles/theme';

const MonthlyOverview = ({ data = {}, analyticsData = null }) => {
  // Flip animation state
  const [isFlipped, setIsFlipped] = useState(false);
  const [title, setTitle] = useState('Monthly Overview');
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });
  const {
    totalDue = '$0',
    paid = '$0',
    remaining = '$0',
    billCount = 0,
    month = getCurrentMonth(),
  } = data;

  // Helper to get current month name
  function getCurrentMonth() {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return months[new Date().getMonth()];
  }

  // Calculate percentage paid (for visual indicator)
  const calculateProgress = () => {
    // Simple implementation - just a mock percentage
    // In real app, would calculate from actual amounts
    return data.percentPaid || 0;
  };

  // Function to handle card flip
  const flipCard = () => {
    // Flip animation
    Animated.timing(flipAnimation, {
      toValue: isFlipped ? 0 : 180,
      duration: 500,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();

    // Update title based on flip state
    setTitle(isFlipped ? 'Monthly Overview' : 'Monthly Spending Trends');
    setIsFlipped(!isFlipped);
  };

  // Prepare chart data if available
  const getChartData = () => {
    // Default data if analytics not provided
    if (!analyticsData || !analyticsData.trends) {
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{ data: [0, 0, 0, 0, 0, 0] }],
      };
    }

    // Use the provided analytics data
    const validTrends = analyticsData.trends.filter(item =>
      typeof item.spending === 'number' && isFinite(item.spending) && item.spending >= 0
    );

    return {
      labels: validTrends.map(item => item.month?.substring(0, 3) || ''),
      datasets: [{
        data: validTrends.length > 0 ? validTrends.map(item => item.spending) : [0],
        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        strokeWidth: 2,
      }],
    };
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity activeOpacity={0.9} onPress={flipCard}>
        {/* Front side (Monthly Overview) */}
        <Animated.View style={[
          styles.card,
          styles.frontCard,
          { transform: [{ rotateY: frontInterpolate }] },
        ]}>
          <Text style={styles.monthLabel}>{month}</Text>
          <View style={styles.mainAmount}>
            <Text style={styles.totalDueLabel}>Due</Text>
            <Text style={styles.totalDueValue}>{remaining}</Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${calculateProgress()}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{calculateProgress()}% paid</Text>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Paid</Text>
              <Text style={styles.detailAmount}>{paid}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Total</Text>
              <Text style={styles.detailAmount}>{totalDue}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Bills</Text>
              <Text style={styles.detailCount}>{billCount}</Text>
            </View>
          </View>
          <Text style={styles.flipHint}>Tap to view analytics</Text>
        </Animated.View>

        {/* Back side (Analytics) */}
        <Animated.View style={[
          styles.card,
          styles.backCard,
          { transform: [{ rotateY: backInterpolate }] },
        ]}>

          <View style={styles.chartContainer}>
            <LineChart
              data={getChartData()}
              width={Dimensions.get('window').width - 40}
              height={180}
            chartConfig={{
              backgroundColor: theme.colors.white,
              backgroundGradientFrom: theme.colors.white,
              backgroundGradientTo: theme.colors.white,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              strokeWidth: 2,
              propsForDots: {
                r: '5',
                strokeWidth: '2',
                stroke: theme.colors.black,
                fill: theme.colors.white,
              },
              formatYLabel: (value) => `$${value}`,
            }}
            bezier
            withShadow={false}
            withInnerLines={true}
            withOuterLines={false}
            style={styles.chart}
            />
          </View>
          <Text style={[styles.flipHint, { color: theme.colors.black }]}>Tap to view summary</Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,

    height: 300, // Fixed height to prevent layout shifts
    zIndex: 1, // Lower zIndex to prevent overlap with action buttons
    perspective: 1000, // Required for 3D animation effect

  },
  title: {
    fontSize: theme.typography.fontSizes.large,
    fontWeight: theme.typography.fontWeights.bold,
    marginBottom: theme.spacing.md,
  },
  card: {
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    minHeight: 220, // Ensure consistent height between front and back
    position: 'absolute',
    width: '100%',
    zIndex: 0, // Ensure cards stay below other UI elements
    backfaceVisibility: 'hidden', // Hide backface during animation
  },
  frontCard: {
    backgroundColor: theme.colors.black,
  },
  backCard: {
    backgroundColor: '#FEFCFB',
    justifyContent: 'center',
    borderColor: theme.colors.gray300,
  },
  monthLabel: {
    fontSize: theme.typography.fontSizes.medium,
    color: theme.colors.black,
    opacity: 0.9,
    marginBottom: theme.spacing.sm,
  },
  mainAmount: {
    marginBottom: theme.spacing.sm,
  },
  totalDueLabel: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.white,
    opacity: 0.9,
  },
  totalDueValue: {
    fontSize: 32,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.white,
  },
  progressContainer: {
    marginBottom: theme.spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: theme.borderRadius.round,
    marginBottom: theme.spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.round,
  },
  progressText: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.white,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.white,
    opacity: 0.8,
    marginBottom: 2,
  },
  detailAmount: {
    fontSize: theme.typography.fontSizes.medium,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.white,
  },
  detailCount: {
    fontSize: theme.typography.fontSizes.medium,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.white,
  },
  chartTitle: {
    fontSize: theme.typography.fontSizes.medium,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.black,
    marginBottom: 5,
    textAlign: 'center',
  },
  chartDescription: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.gray,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  chartContainer: {
    marginLeft: 0, // Shift chart left
    alignItems: 'center',
  },
  chart: {
    borderRadius: theme.borderRadius.medium,

    marginVertical: theme.spacing.sm,
    backgroundColor: theme.colors.white,
  },
  flipHint: {
    fontSize: theme.typography.fontSizes.small,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    opacity: 0.6,
    fontStyle: 'italic',
    color: theme.colors.white, // Default color for front card
  },
});

export default MonthlyOverview;
