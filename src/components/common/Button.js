/**
 * Custom Button component for BillsAI app
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import theme from '../../styles/theme';

const Button = ({
  title,
  onPress,
  variant = 'primary',  // primary, secondary, outline, text
  size = 'medium',      // small, medium, large
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  iconPosition = 'left', // 'left' or 'right'
}) => {
  const getButtonStyles = () => {
    let buttonStyles = [styles.button, styles[`${size}Button`]];
    // Apply variant styles
    switch (variant) {
      case 'primary':
        buttonStyles.push(styles.primaryButton);
        break;
      case 'secondary':
        buttonStyles.push(styles.secondaryButton);
        break;
      case 'outline':
        buttonStyles.push(styles.outlineButton);
        break;
      case 'text':
        buttonStyles.push(styles.textButton);
        break;
      default:
        buttonStyles.push(styles.primaryButton);
    }

    // Apply disabled styles
    if (disabled) {
      buttonStyles.push(styles.disabledButton);
    }

    // Apply custom styles
    if (style) {
      buttonStyles.push(style);
    }

    return buttonStyles;
  };

  const getTextStyles = () => {
    let textStyles = [styles.buttonText, styles[`${size}ButtonText`]];

    // Apply variant text styles
    switch (variant) {
      case 'primary':
        textStyles.push(styles.primaryButtonText);
        break;
      case 'secondary':
        textStyles.push(styles.secondaryButtonText);
        break;
      case 'outline':
        textStyles.push(styles.outlineButtonText);
        break;
      case 'text':
        textStyles.push(styles.textButtonText);
        break;
      default:
        textStyles.push(styles.primaryButtonText);
    }

    // Apply disabled text styles
    if (disabled) {
      textStyles.push(styles.disabledButtonText);
    }
    // Apply custom text styles
    if (textStyle) {
      textStyles.push(textStyle);
    }

    return textStyles;
  };

  return (
    <TouchableOpacity
      style={getButtonStyles()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'text' ? theme.colors.black : theme.colors.white}
        />
      ) : (
        <React.Fragment>
          {icon && iconPosition === 'left' && (
            <React.Fragment>
              {icon}
              <Text style={styles.iconSpacing} />
            </React.Fragment>
          )}
          <Text style={getTextStyles()}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <React.Fragment>
              <Text style={styles.iconSpacing} />
              {icon}
            </React.Fragment>
          )}
        </React.Fragment>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.small,
  },

  // Size variants
  smallButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    minHeight: 32,
  },
  mediumButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    minHeight: 44,
  },
  largeButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 52,
  },
  // Variant styles
  primaryButton: {
    backgroundColor: theme.colors.black,
    borderWidth: 0,
  },
  secondaryButton: {
    backgroundColor: theme.colors.gray700,
    borderWidth: 0,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.black,
  },
  textButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: theme.spacing.xs,
  },

  // Disabled state
  disabledButton: {
    backgroundColor: theme.colors.gray300,
    borderColor: theme.colors.gray300,
    opacity: 0.7,
  },

  // Text styles
  buttonText: {
    fontWeight: theme.typography.fontWeights.medium,
    textAlign: 'center',
  },

  // Text size variants
  smallButtonText: {
    fontSize: theme.typography.fontSizes.small,
  },
  mediumButtonText: {
    fontSize: theme.typography.fontSizes.medium,
  },
  largeButtonText: {
    fontSize: theme.typography.fontSizes.large,
  },

  // Text variant styles
  primaryButtonText: {
    color: theme.colors.white,
  },
  secondaryButtonText: {
    color: theme.colors.white,
  },
  outlineButtonText: {
    color: theme.colors.black,
  },
  textButtonText: {
    color: theme.colors.black,
  },

  // Disabled text
  disabledButtonText: {
    color: theme.colors.gray600,
  },
  iconSpacing: {
    width: 8,
  },
});

export default Button;
