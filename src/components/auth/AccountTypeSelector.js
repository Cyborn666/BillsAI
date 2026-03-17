/**
 * Account Type Selector Component
 * Redesigned with modern UI and improved color scheme
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import theme from '../../styles/theme';

const AccountTypeSelector = ({ selectedType, onSelect }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Account Type</Text>
      
      <View style={styles.selectorContainer}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity 
            style={[
              styles.segmentButton,
              selectedType === 'personal' && styles.activeSegment
            ]}
            activeOpacity={0.8}
            onPress={() => onSelect('personal')}
          >
            <MaterialIcons 
              name="person"
              size={20} 
              color={selectedType === 'personal' ? theme.colors.white : theme.colors.gray700}
              style={styles.icon}
            />
            <Text 
              style={[
                styles.segmentText, 
                selectedType === 'personal' && styles.activeSegmentText
              ]}
            >
              Personal
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.segmentButton,
              selectedType === 'business' && styles.activeSegment
            ]}
            activeOpacity={0.8}
            onPress={() => onSelect('business')}
          >
            <MaterialIcons 
              name="business"
              size={20} 
              color={selectedType === 'business' ? theme.colors.white : theme.colors.gray700}
              style={styles.icon}
            />
            <Text 
              style={[
                styles.segmentText, 
                selectedType === 'business' && styles.activeSegmentText
              ]}
            >
              Business
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.descriptionContainer}>
        {selectedType === 'personal' && (
          <Text style={styles.description}>
            Personal accounts are for managing your personal bills and expenses.
          </Text>
        )}
        
        {selectedType === 'business' && (
          <Text style={styles.description}>
            Business accounts provide additional features for managing business finances, invoices, and expenses.
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
    width: '100%',
  },
  label: {
    marginBottom: theme.spacing.sm,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.gray900,
  },
  selectorContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    width: '100%',
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.gray100,
    overflow: 'hidden',
    borderWidth: 0,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  activeSegment: {
    //backgroundColor: theme.colors.secondary,
    backgroundColor: '#1d2951',
    borderRadius: 25,
  },
  segmentText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.gray700,
  },
  activeSegmentText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  icon: {
    marginRight: 8,
  },
  descriptionContainer: {
    backgroundColor: theme.colors.gray100,
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    minHeight: 46,
  },
  description: {
    fontSize: 14,
    color: theme.colors.gray700,
    textAlign: 'center',
    fontWeight: '400',
  },
});

export default AccountTypeSelector;
