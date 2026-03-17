/**
 * Splash Screen Component for BillsAI
 */
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Image, Text, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import theme from '../../styles/theme';
import LogoBills from '../../assets/svgs/Frame 24.svg';


const SplashScreen = () => {
  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(0.8)).current;

  // State for text animation
  const [displayText, setDisplayText] = useState('');
  const fullAppName = 'BillsAI';
  const subtitleText = 'Smart Bill Management';
  const [displaySubtitle, setDisplaySubtitle] = useState('');
  useEffect(() => {
    // Sequence of animations
    Animated.sequence([
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      // Scale animation for icon
      Animated.spring(iconScaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    // Text generation animation for app name
    let currentIndex = 0;
    const textInterval = setInterval(() => {
      if (currentIndex <= fullAppName.length) {
        setDisplayText(fullAppName.substring(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(textInterval);
        // Start subtitle animation after app name is complete
        let subtitleIndex = 0;
        const subtitleInterval = setInterval(() => {
          if (subtitleIndex <= subtitleText.length) {
            setDisplaySubtitle(subtitleText.substring(0, subtitleIndex));
            subtitleIndex++;
          } else {
            clearInterval(subtitleInterval);
          }
        }, 50);
      }
    }, 150);
    
    // Clean up intervals on unmount
    return () => {
      clearInterval(textInterval);
    };
  }, [fadeAnim, iconScaleAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.logoContainer,
            { transform: [{ scale: iconScaleAnim }] },
          ]}
        >
          <LogoBills width='100%' height='100%' />
        </Animated.View>
        <View style={styles.textContainer}>
          <MaskedView
            style={styles.titleContainer}
            maskElement={
              <Text style={styles.title}>{displayText}</Text>
            }
          >
            <LinearGradient
              colors={['#000000', '#3867d6']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.linearGradient}
            >
              <Text style={styles.transparentText}>{displayText}</Text>
            </LinearGradient>
          </MaskedView>
          <Text style={styles.subtitle}>{displaySubtitle}</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.black,
    borderRadius: 75,
    marginBottom: 30,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  logo: {
    width: 120,
    height: 120,
    tintColor: '#FFFFFF',
  },
  textContainer: {
    alignItems: 'center',
    height: 150, // Fixed height to prevent layout shifts during animation
  },
  titleContainer: {
    height: 50,
    marginBottom: 10,
    alignSelf: 'center',
  },
  linearGradient: {
    flex: 1,
    paddingLeft: 15,
    paddingRight: 15,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transparentText: {
    // This text is invisible, only used for sizing
    fontSize: 55,
    fontWeight: 'bold',
    color: 'transparent',
  },
  title: {
    fontSize: 55,
    fontWeight: 'bold',
    textAlign: 'center',
    // Important for the mask to work properly
    backgroundColor: 'transparent',
    color: 'black', // This color doesn't matter, as it's used as a mask
  },
  subtitle: {
    fontSize: 24,
    color: theme.colors.black,
    opacity: 0.8,
    height: 24,
    paddingBottom: 10,
  },
});

export default SplashScreen;
