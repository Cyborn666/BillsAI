/**
 * EmptyState Component
 * A reusable component for displaying empty states throughout the app
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import theme from '../../styles/theme';

const EmptyState = ({ 
  title = 'No Data Available', 
  message = 'There is no data to display at this time.', 
  icon = 'document-outline',
  customImage = null,
  containerStyle = {} 
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {customImage ? (
        <Image source={customImage} style={styles.image} resizeMode="contain" />
      ) : (
        <Icon name={icon} size={64} color={theme.colors.gray500} style={styles.icon} />
      )}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.white,
  },
  icon: {
    marginBottom: theme.spacing.md,
  },
  image: {
    width: 120,
    height: 120,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.fontSizes.large,
    fontWeight: 'bold',
    color: theme.colors.gray800,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  message: {
    fontSize: theme.typography.fontSizes.medium,
    color: theme.colors.gray600,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
});

export default EmptyState;
