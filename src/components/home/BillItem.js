/**
 * Bill Item component for rendering a single bill
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import theme from '../../styles/theme';
import BillIcon from '../bill/BillIcon';

const BillItem = ({ bill = {}, onPress }) => {
  const {
    name = 'Unnamed Bill',
    title, // Handle both name and title fields (API inconsistency)
    dueDate = 'No due date',
    amount = '$0',
    status = 'UPCOMING',  // PAID, UNPAID, OVERDUE, UPCOMING, PARTIALLY_PAID
    category = 'UTILITIES',
  } = bill;

  // Handle the name/title inconsistency
  const billName = title || name;

  // Determine status color
  const getStatusColor = () => {
    switch (status) {
      case 'PAID':
        return theme.colors.success;
      case 'OVERDUE':
        return theme.colors.error;
      case 'PARTIALLY_PAID':
        return theme.colors.warning;
      default:
        return theme.colors.info;
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress && onPress(bill)}
    >
      <View style={styles.statusContainer}>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
      </View>
      <View style={styles.iconContainer}>
        <BillIcon
          billName={billName}
          category={category}
          size={28}
          showBrandLogo={true}
        />
      </View>
      <View style={styles.billInfo}>
        <Text style={styles.billName}>{billName}</Text>
        <Text style={styles.billDate}>{dueDate}</Text>
      </View>
      <View style={styles.amountContainer}>
        <Text style={styles.billAmount}>{amount}</Text>

      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
    backgroundColor: theme.colors.white,
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    fontSize: theme.typography.fontSizes.medium,
    fontWeight: theme.typography.fontWeights.medium,
    marginBottom: theme.spacing.xs / 2,
    paddingLeft: theme.spacing.sm,
  },
  billDate: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.gray700,
    paddingLeft: theme.spacing.sm,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  billAmount: {
    fontSize: theme.typography.fontSizes.large,
    fontWeight: theme.typography.fontWeights.bold,
    marginBottom: theme.spacing.xs / 2,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
});

export default BillItem;
