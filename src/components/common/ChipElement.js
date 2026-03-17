// components/EMVChip.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import ChipC from '../../assets/svgs/chipC.svg';

const ChipElement = () => {
  return (
    <View style={styles.chipWrapper}>
      <ChipC width="100%" height="100%" />
    </View>
  );
};

const styles = StyleSheet.create({
  chipWrapper: {
    width: 65,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
});

export default ChipElement;
