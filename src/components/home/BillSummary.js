/**
 * Bill Summary component showing financial overview
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../../styles/theme';

const BillSummary = ({ summary = {} }) => {
  const {
    dueAmount = '$0',
    upcomingCount = 0,
    overdueCount = 0,
  } = summary;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Summary</Text>
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{dueAmount}</Text>
          <Text style={styles.summaryLabel}>Due this month</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{upcomingCount}</Text>
          <Text style={styles.summaryLabel}>Upcoming bills</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{overdueCount}</Text>
          <Text style={styles.summaryLabel}>Overdue</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.fontSizes.large,
    fontWeight: theme.typography.fontWeights.bold,
    marginBottom: theme.spacing.md,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: theme.typography.fontSizes.xlarge,
    fontWeight: theme.typography.fontWeights.bold,
    marginBottom: theme.spacing.xs,
  },
  summaryLabel: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.gray700,
  },
});

export default BillSummary;
