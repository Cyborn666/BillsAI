/**
 * Second Onboarding Screen for BillsAI
 */
import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, SafeAreaView, StatusBar, ScrollView, Image } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import theme from '../../styles/theme';
import { useNavigation } from '@react-navigation/native';

const Onboarding2Screen = () => {
  const navigation = useNavigation();

  const handleNext = () => {
    navigation.navigate('Onboarding4');
  };

  const handleBack = () => {
    navigation.navigate('Onboarding3', { animation: 'slide_from_left' });
  };

  // No longer using feature list - replaced with image

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

      {/* Header space */}
      <View style={styles.headerSpace} />

      {/* Main content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Business Account</Text>
        {/* Business Illustration Image */}
        <View style={styles.imageContainer}>
          <Image
            source={require('../../assets/images/invoices_illu.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <View style={styles.tagContainer}>
          <Text style={styles.tagline}>Know Your Numbers.</Text>
          <Text style={styles.tagDescription}>Track, analyze, and grow — all in one intelligent dashboard.</Text>
        </View>
      </View>

      {/* Footer with pagination and buttons */}
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
            style={[styles.paginationDot, styles.activeDot]}
            activeOpacity={0.7}
          />
          <TouchableOpacity
            style={[styles.paginationDot]}
            activeOpacity={0.7}
          />
        </View>

        <View style={styles.buttonContainer}>
         {/*} <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <MaterialIcons name="arrow-back" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity> */}

          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>
      </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  },
  imageContainer: {
    width: '100%',
    height: 450,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  tagContainer: {
    //marginTop: 10,
    alignItems: 'center',
  },
  tagline: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.colors.businessPrimary,
    marginBottom: 5,
    textAlign: 'center',
  },
  tagDescription: {
    fontSize: 16,
    color: theme.colors.gray700,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.businessPrimary,
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
    backgroundColor: 'rgba(103, 151, 255, 0.17)',
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
    paddingTop: 30,
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
    width: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButtonText: {
    color: theme.colors.businessPrimary,
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 5,
  },
  nextButton: {
    backgroundColor: theme.colors.businessPrimary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.businessPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 4,
  },
  buttonIcon: {
    marginLeft: 4,
  },
});

export default Onboarding2Screen;
