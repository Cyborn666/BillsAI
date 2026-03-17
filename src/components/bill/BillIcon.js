/**
 * BillIcon Component
 * Displays appropriate icon or logo based on bill name and category
 * Can be used throughout the app for consistent bill visualizations
 */

import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { getCategoryIcon, getBrandLogo } from '../../utils/brandUtils';
import theme from '../../styles/theme';

const BillIcon = ({
  billName,
  category,
  size = 24,
  showBrandLogo = false,
  style = {},
  iconStyle = {},
  containerStyle = {},
}) => {
  const [brandLogo, setBrandLogo] = useState(null);
  const [hasLogoError, setHasLogoError] = useState(false);
  const { name: iconName, color: iconColor } = getCategoryIcon(billName, category);

  // Fetch brand logo if needed
  useEffect(() => {
    if (showBrandLogo) {
      const fetchLogo = async () => {
        try {
          const logo = await getBrandLogo(billName);
          setBrandLogo(logo);
        } catch (error) {
          ////console.log('Error fetching brand logo:', error);
          setHasLogoError(true);
        }
      };
      fetchLogo();
    }
  }, [billName, showBrandLogo]);

  // Calculate dimensions based on size prop
  const containerSize = {
    width: size * 1.5,
    height: size * 1.5,
    borderRadius: size * 0.75,
  };

  return (
    <View style={[styles.container, containerSize, containerStyle]}>
      {showBrandLogo && brandLogo && !hasLogoError ? (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: brandLogo }}
            style={[styles.logo, { width: size, height: size }, style]}
            onError={() => setHasLogoError(true)}
          />
        </View>
      ) : (
        <View style={styles.imageWrapper}>
          <MaterialIcons
            name={iconName}
            size={size}
            color={iconColor}
            style={iconStyle}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 6,
  },
  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  logo: {
    resizeMode: 'center',
    marginLeft:3,
  },
});

export default BillIcon;
