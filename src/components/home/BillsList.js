/**
 * Bills List component for displaying multiple bills
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import theme from '../../styles/theme';
import BillItem from './BillItem';

const BillsList = ({ title, bills = [], onBillPress, handleViewAllPress, emptyMessage = 'No bills to display' }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity onPress={handleViewAllPress}>
        <Text style={styles.viewAll}>View All</Text>
      </TouchableOpacity>
      </View>

      {bills.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      ) : (
        <View style={styles.billsList}>
          {bills.slice(0, 5).map((bill, index) => (
            <BillItem
              key={bill.id || index}
              bill={bill}
              onPress={onBillPress}
            />
          ))}
        </View>
      )}
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
  billsList: {
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
  },
  emptyContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: theme.typography.fontSizes.medium,
    color: theme.colors.gray700,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAll: {
    fontSize: theme.typography.fontSizes.medium,
    color: theme.colors.primary,
  },
});

export default BillsList;
