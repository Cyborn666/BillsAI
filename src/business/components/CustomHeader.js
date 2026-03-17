/**
 * Custom Header Component for Business screens
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const CustomHeader = ({ title, navigation, rightComponent, showBackButton, onBackPress }) => {
  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          // Handle both cases - either use onBackPress if provided or navigation.goBack
          if (onBackPress) {
            onBackPress();
          } else if (navigation && navigation.goBack) {
            navigation.goBack();
          }
        }}
      >
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      
      <Text style={styles.headerTitle}>{title}</Text>
      
      {rightComponent ? (
        <View style={styles.rightContainer}>
          {rightComponent}
        </View>
      ) : (
        <View style={styles.emptyRightSide} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF'
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
  },
  rightContainer: {
    marginLeft: 'auto',
  },
  emptyRightSide: {
    width: 28,
    height: 24,
  },
});

export default CustomHeader;
