/**
 * Rate BillsAI Screen for BillsAI app
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../styles/theme';
import userService from '../../services/userService';

const RateBillsAIScreen = () => {
  const navigation = useNavigation();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // App store links
  const appStoreLink = 'https://apps.apple.com/app/billsai/id1234567890';
  const playStoreLink = 'https://play.google.com/store/apps/details?id=com.billsai';

  const handleStarPress = (selectedRating) => {
    setRating(selectedRating);
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleStarPress(i)}
          style={styles.starContainer}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={40}
            color={i <= rating ? theme.colors.warning : theme.colors.gray}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  {/*const handleSubmitFeedback = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit feedback to server
      await userService.submitAppRating(rating, feedback);
      
      Alert.alert(
        'Thank You!',
        'Your feedback has been submitted. Would you like to also rate us on the app store?',
        [
          {
            text: 'No Thanks',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
          {
            text: 'Rate on App Store',
            onPress: handleRateOnStore,
          },
        ]
      );
      
      // Reset form after submission
      setRating(0);
      setFeedback('');
    } catch (error) {
      //console.error('Error submitting rating:', error);
      Alert.alert(
        'Submission Error',
        'We couldn\'t submit your rating at this time. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };*/}

  const handleSubmitFeedback = () => {

    Alert.alert(
      'Thank You!',
      'Your feedback has been submitted. Would you like to also rate us on the app store?',
      [
        {
          text: 'No Thanks',
          style: 'cancel',
          onPress: () => navigation.goBack(),
        },
        {
          text: 'Rate on App Store',
          onPress: handleRateOnStore,
        },
      ]
    );

  };


  const handleRateOnStore = () => {
    // Determine which app store to open based on platform
    const storeUrl = Platform.OS === 'ios' ? appStoreLink : playStoreLink;
    
    Linking.canOpenURL(storeUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(storeUrl);
        } else {
          Alert.alert('Error', 'Could not open the app store. Please rate us directly on the app store.');
        }
      })
      .catch((error) => {
        //console.error('Error opening app store link:', error);
        Alert.alert('Error', 'Could not open the app store. Please try again later.');
      });
  };

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.title}>Rate BillsAI</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.rateText}>
                We value your feedback! Your ratings help us improve the app and provide better service.
              </Text>

              <View style={styles.starsContainer}>
                {renderStars()}
              </View>

              <Text style={styles.ratingText}>
                {rating > 0 ? `${rating} out of 5 stars` : 'Tap a star to rate'}
              </Text>

              <View style={styles.feedbackContainer}>
                <Text style={styles.inputLabel}>Additional Feedback (Optional)</Text>
                <TextInput
                  style={styles.feedbackInput}
                  value={feedback}
                  onChangeText={setFeedback}
                  placeholder="Tell us what you think about BillsAI..."
                  placeholderTextColor={theme.colors.gray}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmitFeedback}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Feedback</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rateStoreButton}
                onPress={handleRateOnStore}
              >
                <Ionicons name="star" size={20} color={theme.colors.white} style={styles.buttonIcon} />
                <Text style={styles.rateStoreButtonText}>
                  Rate on {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: theme.colors.white,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
  },
  backButton: {
    padding: theme.spacing.xs,
    position: 'absolute',
    left: theme.spacing.lg,
    zIndex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
    textAlign : 'center',
  },
  scrollContent: {
    padding: 16,
  },
  content: {
    paddingBottom: 20,
  },
  section: {
    alignItems: 'center',
    marginBottom: 20,
  },
  rateText: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
  },
  starContainer: {
    padding: 5,
  },
  ratingText: {
    fontSize: 16,
    color: theme.colors.text,
    marginTop: 5,
    marginBottom: 20,
  },
  feedbackContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  feedbackInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.small,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 120,
  },
  submitButton: {
    backgroundColor: theme.colors.black,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadius.small,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  submitButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  rateStoreButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadius.small,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  rateStoreButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
});

export default RateBillsAIScreen;
