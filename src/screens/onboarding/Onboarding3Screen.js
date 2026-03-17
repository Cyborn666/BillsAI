/**
 * Third Onboarding Screen for BillsAI (positioned between original screens 1 and 2)
 */
import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, SafeAreaView, StatusBar, Image } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import theme from '../../styles/theme';
// Using navigation hooks instead of NavigationRef
import { useNavigation } from '@react-navigation/native';

const Onboarding3Screen = () => {
  const navigation = useNavigation();

  const handleNext = () => {
    navigation.navigate('Onboarding2');
  };

  const handleBack = () => {
    navigation.navigate('Onboarding1', { animation: 'slide_from_left' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header space */}
      <View style={styles.headerSpace} />

      {/* Main content */}
      <View style={styles.contentContainer}>
        {/* Background Image */}
        <View style={styles.backgroundImageContainer}>
          <Image
            source={require('../../assets/images/black.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.overlayContent}>
          <Text style={[styles.tagline, { color: '#A9A9A9' }]}>Black Card</Text>
          <Text style={[styles.tagDescription, { color: '#E0E0E0' }]}>Exclusive benefits await on our waitlist</Text>
        </View>
      </View>

      {/* Footer with pagination and buttons */}
      <View style={styles.footerContainer}>
        {/* Pagination dots */}
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={styles.paginationDot}
            activeOpacity={0.7}
          />
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
        </View>

        <View style={styles.buttonContainer}>
         {/* <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <MaterialIcons name="arrow-back" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity> */}

          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#000" style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerSpace: {
    height: 30,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  backgroundImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.9,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  overlayContent: {
    alignItems: 'center',
    paddingHorizontal: 30,
    zIndex: 10,
  },
  tagline: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  tagDescription: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 26,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
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
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 5,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  nextButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
    marginRight: 5,
  },
  buttonIcon: {
    marginTop: 1,
  },
});

export default Onboarding3Screen;
