/**
 * Restore Purchases Button Component
 * Platform-specific button for restoring prior App Store purchases
 * Only displayed on iOS
 */
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../styles/theme';

const RestorePurchasesButton = ({ onPress, isRestoring }) => {
  // Only render on iOS
  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={isRestoring}
    >
      {isRestoring ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <>
          <Ionicons
            name="refresh-circle-outline"
            size={18}
            color={theme.colors.primary}
          />
          <Text style={styles.text}>Restore Purchases</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  text: {
    marginLeft: 8,
    color: theme.colors.primary,
    fontWeight: '500',
    fontSize: 16,
  },
});

export default RestorePurchasesButton;
