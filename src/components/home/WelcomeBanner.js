/**
 * Welcome Banner component for the home screen
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../../styles/theme';
import userService from '../../services/userService';

const WelcomeBanner = ({ userName }) => {
  const [displayName, setDisplayName] = useState(userName || 'User');
  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {return 'Good morning';}
    if (hour < 18) {return 'Good afternoon';}
    return 'Good evening';
  };

  // Get current date in user-friendly format
  const getFormattedDate = () => {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString(undefined, options);
  };

  // Fetch user data only once when component mounts
  useEffect(() => {
    // Only fetch if no userName was passed
    if (!userName) {
      const fetchUserData = async () => {
        try {
          const userData = await userService.getUserProfile();
          if (userData && userData.fullName) {
            setDisplayName(userData.fullName);
          }
        } catch (error) {
          //console.error('Error fetching user data:', error);
        }
      };

      fetchUserData();
    }
  }, [userName]); // Include userName in the dependency array

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.greeting}>{getGreeting()},</Text>
        <Text style={styles.name}>{displayName}!</Text>
        <Text style={styles.date}>{getFormattedDate()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
    borderBottomColor: theme.colors.gray200,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  content: {
    flexDirection: 'column',
  },
  greeting: {
    fontSize: theme.typography.fontSizes.large,
    color: theme.colors.gray700,
  },
  name: {
    fontSize: theme.typography.fontSizes.xxxlarge,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.black,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  date: {
    fontSize: theme.typography.fontSizes.medium,
    color: theme.colors.gray600,
  },
});

export default WelcomeBanner;
