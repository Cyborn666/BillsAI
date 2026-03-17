/**
 * FilterOptionButton Component
 * Reusable component for filter option buttons
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const FilterOptionButton = ({ 
  label, 
  selected, 
  onPress, 
  style,
  labelStyle 
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.optionButton,
        selected && styles.selectedButton,
        style
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.optionText,
        selected && styles.selectedText,
        labelStyle
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
    marginBottom: 8,
  },
  selectedButton: {
    backgroundColor: '#3867d6',
  },
  optionText: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '600',
  }
});

export default FilterOptionButton;
