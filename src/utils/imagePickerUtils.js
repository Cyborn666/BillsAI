/**
 * Image Picker Utilities for BillsAI app
 * Native implementation without Expo dependencies
 */

import { Platform, PermissionsAndroid } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

/**
 * Request camera permission for Android
 * @returns {Promise<boolean>} - Whether permission was granted
 */
const requestCameraPermission = async () => {
  if (Platform.OS !== 'android') return true;
  
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'BillsAI needs access to your camera to take pictures',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.error('Error requesting camera permission:', err);
    return false;
  }
};

/**
 * Launch device camera to take a photo
 * @param {Object} options - Camera options
 * @returns {Promise<Object>} - The selected image result
 */
export const takePicture = async (options = {}) => {
  const hasPermission = await requestCameraPermission();
  
  if (!hasPermission && Platform.OS === 'android') {
    return { cancelled: true, error: 'Camera permission not granted' };
  }
  
  return new Promise((resolve) => {
    launchCamera(
      {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 1200,
        maxWidth: 1200,
        quality: 0.8,
        ...options,
      },
      (response) => {
        if (response.didCancel) {
          resolve({ cancelled: true });
        } else if (response.errorCode) {
          resolve({ 
            cancelled: true, 
            error: response.errorMessage || 'Unknown error occurred' 
          });
        } else {
          const asset = response.assets?.[0];
          if (asset) {
            resolve({
              cancelled: false,
              uri: asset.uri,
              width: asset.width,
              height: asset.height,
              type: asset.type,
              fileName: asset.fileName,
            });
          } else {
            resolve({ cancelled: true, error: 'No image selected' });
          }
        }
      }
    );
  });
};

/**
 * Launch image library to pick an image
 * @param {Object} options - Image library options
 * @returns {Promise<Object>} - The selected image result
 */
export const pickImage = async (options = {}) => {
  return new Promise((resolve) => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 1200,
        maxWidth: 1200,
        quality: 0.8,
        selectionLimit: 1,
        ...options,
      },
      (response) => {
        if (response.didCancel) {
          resolve({ cancelled: true });
        } else if (response.errorCode) {
          resolve({ 
            cancelled: true, 
            error: response.errorMessage || 'Unknown error occurred' 
          });
        } else {
          const asset = response.assets?.[0];
          if (asset) {
            resolve({
              cancelled: false,
              uri: asset.uri,
              width: asset.width,
              height: asset.height,
              type: asset.type,
              fileName: asset.fileName,
            });
          } else {
            resolve({ cancelled: true, error: 'No image selected' });
          }
        }
      }
    );
  });
};
