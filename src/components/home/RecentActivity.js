/**
 * Recent Activity component for displaying recent bill activities
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../../styles/theme';

const ActivityItem = ({ activity }) => {
  const {
    description = 'Unknown activity',
    date = 'Unknown date',
    amount = '',
    type = 'payment',// payment, reminder, update
  } = activity;

  // Determine icon/color based on activity type
  const getActivityColor = () => {
    switch (type) {
      case 'payment':
        return theme.colors.success;
      case 'reminder':
        return theme.colors.info;
      case 'update':
        return theme.colors.warning;
      default:
        return theme.colors.gray500;
    }
  };

  return (
    <View style={styles.activityItem}>
      <View style={[styles.activityIndicator, { backgroundColor: getActivityColor() }]} />
      <View style={styles.activityContent}>
        <Text style={styles.activityDescription}>{description}</Text>
        <Text style={styles.activityDate}>{date}</Text>
      </View>
      {amount ? <Text style={styles.activityAmount}>{amount}</Text> : null}
    </View>
  );
};

const RecentActivity = ({ activities = [], title = 'Recent Activity' }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {activities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No recent activity</Text>
        </View>
      ) : (
        <View style={styles.activitiesContainer}>
          {activities.map((activity, index) => (
            <ActivityItem
              key={activity.id || index}
              activity={activity}
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
  activitiesContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
    paddingVertical: theme.spacing.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
  },
  activityIndicator: {
    width: 10,
    height: 10,
    borderRadius: theme.borderRadius.round,
    marginRight: theme.spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: theme.typography.fontSizes.medium,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.black,
  },
  activityDate: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.gray700,
    marginTop: 2,
  },
  activityAmount: {
    fontSize: theme.typography.fontSizes.medium,
    fontWeight: theme.typography.fontWeights.bold,
  },
  emptyContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.gray600,
    fontSize: theme.typography.fontSizes.medium,
  },
});

export default RecentActivity;
