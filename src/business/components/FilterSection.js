/**
 * FilterSection Component
 * Reusable component for filter sections in filter screens
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const FilterSection = ({ title, children, style }) => {
  return (
    <View style={[styles.section, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 12,
  },
  sectionContent: {
    marginTop: 4,
  }
});

export default FilterSection;
