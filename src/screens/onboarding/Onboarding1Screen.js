/**
 * First Onboarding Screen for BillsAI
 */
import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, SafeAreaView, StatusBar, Dimensions, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationRef } from '../../navigation/NavigationRef';
import { useOnBoardingProvider } from '../../contexts/OnBoardingContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import theme from '../../styles/theme';

const Onboarding1Screen = () => {
  const navigation = useNavigation();

  const handleNext = () => {
    navigation.navigate('Onboarding3', { fromLeft: true });
  };

  const { completeOnboarding } = useOnBoardingProvider();

  const handleSkip = async () => {
    try {
      await completeOnboarding();
      if (NavigationRef.current) {
        NavigationRef.current.reset({
          index: 0,
          routes: [{ name: 'App' }],
        });
      }
    } catch (error) {
      //console.log('Failed to skip onboarding:', error);
    }
  };

  // No longer using feature list - replaced with image
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

      {/* Header space */}
      <View style={styles.headerSpace} />

      {/* Main content */}
      <View style={styles.contentContainer}>
        <Text style={styles.title}>No More Late Fees</Text>
        {/* Student Travel Image */}
        <View style={styles.imageContainer}>
          <Image
            source={require('../../assets/images/studenttravel.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <View style={styles.tagContainer}>
          <Text style={styles.tagline}>Smart Money</Text>
          <Text style={styles.tagDescription}>Effortlessly Manage your Bills</Text>
        </View>
      </View>

      {/* Footer with pagination and buttons */}
      <View style={styles.footerContainer}>
        {/* Pagination dots */}
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[styles.paginationDot, styles.activeDot]}
            activeOpacity={0.7}
          />
          <TouchableOpacity
            style={styles.paginationDot}
            activeOpacity={0.7}
          />
          <TouchableOpacity
            style={styles.paginationDot}
            activeOpacity={0.7}
          />
          <TouchableOpacity
            style={styles.paginationDot}
            activeOpacity={0.7}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E9E8EA', // Milk color
  },
  headerSpace: {
    height: 30,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 20, // Add bottom padding to prevent overlap
  },
  imageContainer: {
    width: '100%',
    height: '70%', // Use percentage of screen height instead of fixed height
    marginVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  tagContainer: {
    marginTop: 10,
    marginBottom: 20, // Add bottom margin to prevent overlap with pagination dots
    alignItems: 'center',
  },
  tagline: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  tagDescription: {
    fontSize: 16,
    color: theme.colors.gray700,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.black,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: theme.colors.gray700,
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  featuresContainer: {
    width: '100%',
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(56, 56, 56, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.black,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: theme.colors.gray700,
    lineHeight: 20,
  },
  footerContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 10,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(113, 175, 255, 0.3)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor:'#000000',
    width: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    color: theme.colors.gray700,
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
});

export default Onboarding1Screen;
