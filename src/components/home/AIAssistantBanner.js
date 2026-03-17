/**
 * AI Assistant Banner Component for BillsAI app
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import theme from '../../styles/theme';

const AIAssistantBanner = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Icon name="sparkles" size={24} color={theme.colors.black} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>AI Assistant</Text>
        <Text style={styles.subtitle}>Get help with your bills and finances</Text>
      </View>
      <Icon name="chevron-forward" size={24} color={theme.colors.gray700} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.md,
  },
  iconContainer: {

    borderRadius: theme.borderRadius.round,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.fontSizes.large,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.black,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSizes.small,
    color: theme.colors.gray700,
  },
});

export default AIAssistantBanner;
