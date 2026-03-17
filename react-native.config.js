/**
 * Configuration for React Native
 * This file ensures proper linking of native modules
 */
module.exports = {
  dependencies: {
    'react-native-vector-icons': {
      platforms: {
        ios: {},
        android: {},
      },
    },
  },
  assets: ['./node_modules/react-native-vector-icons/Fonts'],
};
