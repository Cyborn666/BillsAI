/**
 * Fourth Onboarding Screen for BillsAI (business-focused)
 */
import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, SafeAreaView, StatusBar, Image } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import theme from '../../styles/theme';
import { useNavigation } from '@react-navigation/native';
import { useOnBoardingProvider } from '../../contexts/OnBoardingContext';
import { NavigationRef } from '../../navigation/NavigationRef';

const Onboarding4Screen = () => {
  const { completeOnboarding } = useOnBoardingProvider();
  const navigation = useNavigation();

  const handleGetStarted = async () => {
    try {
      // Mark onboarding as complete using the context function
      await completeOnboarding();
      //console.log('Onboarding completed');

      // Force reload of the app to refresh the navigation state
      if(NavigationRef.current){
        NavigationRef.current.reset({
          index: 0,
          routes: [{ name: 'App' }],
        });
      }
    } catch (error) {
      //console.log('Failed to complete onboarding');
    }
  };

  const handleBack = () => {
    navigation.navigate('Onboarding2');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

      {/* Header space */}
      <View style={styles.headerSpace} />

      {/* Main content */}
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Business Solutions</Text>

        {/* Business Illustration Image */}
        <View style={styles.imageContainer}>
          <Image
            source={require('../../assets/images/business_illu.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <View style={styles.tagContainer}>
          <Text style={styles.tagline}>Smart Business</Text>
          <Text style={styles.tagDescription}>Manage clients and invoices effortlessly</Text>
        </View>
      </View>

      {/* Footer with pagination and button */}
      <View style={styles.footerContainer}>
        {/* Pagination dots */}
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[styles.paginationDot]}
            activeOpacity={0.7}
          />
          <TouchableOpacity
            style={[styles.paginationDot]}
            activeOpacity={0.7}
          />
          <TouchableOpacity
            style={[styles.paginationDot]}
            activeOpacity={0.7}
          />
          <TouchableOpacity
            style={[styles.paginationDot, styles.activeDot]}
            activeOpacity={0.7}
          />
        </View>

        <View style={styles.buttonContainer}>
         {/* <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <MaterialIcons name="arrow-back" size={20} color={theme.colors.businessPrimary} style={styles.buttonIcon} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity> */}

          <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
            <Text style={styles.getStartedButtonText}>Get Started</Text>
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
    backgroundColor: '#faf9ff', // Milk color
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.businessPrimary,
    textAlign: 'center',
    marginBottom: 16,
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
    color: theme.colors.businessPrimary,
    marginBottom: 5,
  },
  tagDescription: {
    fontSize: 16,
    color: theme.colors.gray700,
    textAlign: 'center',
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
    backgroundColor: 'rgba(56, 56, 56, 0.3)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: theme.colors.businessPrimary,
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
    borderWidth: 1,
    borderColor: theme.colors.businessPrimary,
  },
  backButtonText: {
    color: theme.colors.businessPrimary,
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 5,
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    backgroundColor: theme.colors.businessPrimary,
  },
  getStartedButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginRight: 5,
  },
  buttonIcon: {
    marginTop: 1,
  },
});

export default Onboarding4Screen;
