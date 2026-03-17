/**
 * Membership Screen for BillsAI app
 * Showcases premium card with Robinhood-inspired design
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Dimensions,
  Animated,
  StatusBar,
  Platform,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../../styles/theme';

// Import credit card image
import creditCardImage from '../../assets/images/creditcard.png';
import credit2Image from '../../assets/images/credit2.png';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = height * 0.35;
const CARD_WIDTH = width * 0.85;

const MembershipScreen = () => {
  // Using navigation for potential back navigation
  const navigation = useNavigation();

  // Animation values
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardRotate = useRef(new Animated.Value(0)).current;
  const bottomGlowOpacity = useRef(new Animated.Value(0)).current;
  const cardShimmer = useRef(new Animated.Value(0)).current;
  const borderLightAngle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate card appearance with enhanced sequence
    Animated.sequence([
      // First fade in the card
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }),
      // Then run parallel animations for a more dynamic effect
      Animated.parallel([
        // Scale up with spring physics
        Animated.spring(cardScale, {
          toValue: 1,
          tension: 35,
          friction: 6.5,
          useNativeDriver: true,
        }),
        // Fade in the bottom glow
        Animated.timing(bottomGlowOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        // Add a subtle rotation effect
        Animated.sequence([
          Animated.timing(cardRotate, {
            toValue: -0.02,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(cardRotate, {
            toValue: 0.02,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(cardRotate, {
            toValue: 0,
            friction: 5,
            tension: 20,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();

    // Start the shimmer animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(cardShimmer, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(cardShimmer, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ]),
    ).start();

    // Animate white light tracing around the card edges
    Animated.loop(
      Animated.timing(borderLightAngle, {
        toValue: 360, // Full rotation
        duration: 4000, // Animation duration in milliseconds
        useNativeDriver: false,
        easing: Easing.linear,
      }),
    ).start();

    // Set status bar to light content for this screen
    StatusBar.setBarStyle('light-content');

    return () => {
      // Reset status bar when leaving screen
      StatusBar.setBarStyle('dark-content');
    };
  }, [cardScale, cardOpacity, cardRotate, bottomGlowOpacity, cardShimmer, borderLightAngle]);

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Black Card</Text>
        <View style={styles.spacer} />
      </View>

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollableContent}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <LinearGradient
          colors={['#3A1A00', '#201000', '#121212', '#0A0A0A', '#050505', '#000000']}
          locations={[0.0, 0.2, 0.4, 0.6, 0.8, 1.0]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0}}
          style={styles.gradientBackground}
        >
          {/* Main Headline */}
          <View style={styles.headlineContainer}>
            <Text style={styles.headlineText}>One Card. All Bills.</Text>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            {/* Premium Card - Now using credit card image */}
            <Animated.View
              style={[
                styles.premiumCard,
                {
                  transform: [
                    { scale: cardScale },
                    { rotateZ: cardRotate.interpolate({
                      inputRange: [-1, 1],
                      outputRange: ['-1deg', '1deg'],
                    }) },
                  ],
                  opacity: cardOpacity,
                },
              ]}
            >
              {/* Credit Card Image - Main card content */}
              <Image
                source={creditCardImage}
                style={styles.creditCardImage}
                resizeMode="cover"
              />

              {/* Card chip element - optional if we want to keep it on top of the image
              <View style={styles.cardElement}>
                <ChipElement />
              </View>
              */}
              {/* BillsAI Logo in bottom right
              <View style={styles.logoContainer}>
                <Text style={styles.logoText}>BillsAI</Text>
              </View>
              */}
            </Animated.View>

            {/* Tagline */}
            <View style={styles.taglineContainer}>

            {/* <Text style={styles.taglineText}>Pay bills without exposing</Text>
              <Text style={styles.taglineText}>your personal bank details.</Text>*/}
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Waitlist')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>Reserve your spot</Text>
            </TouchableOpacity>

            <View style={styles.cardDivider} />

            <View style={styles.materialInfoContainer}>
              
              <View style={styles.materialContainer}>
                <Text style={styles.materialText}>MATERIAL</Text>
                <Text style={styles.materialSubText}>Stainless steel</Text>
              </View>
              <View style={styles.materialContainer}>
                <Text style={styles.materialText}>WEIGHT</Text>
                <Text style={styles.materialSubText}>17 grams</Text>
              </View>
            </View>

            {/* Rewards Tag */}
            <View style={styles.rewardsTagContainer}>
              <View style={styles.rewardsTag}>
                <Ionicons name="star" size={18} color="#FFD700" />
                <Text style={styles.rewardsTagText}>Earn rewards for every bill pay</Text>
              </View>
            </View>

            {/* Benefits Section */}

            <View style={styles.benefitsSection}>
             {/* <Text style={styles.benefitsSectionTitle}>Earn more than ever</Text> */}

              {/* Simple benefit items instead of cards */}
              <View style={[styles.benefitItem,styles.firstbenefit]}>
                <Ionicons name="shield-checkmark" size={24} color="#FFD700" />
                <View style={styles.benefitTextContainer}>
                  <Text style={styles.benefitTitle}>Advanced Security</Text>
                  <Text style={styles.benefitDescription}>Your financial information remains secure with encryption.</Text>
                </View>
              </View>

              <View style={styles.benefitDivider} />

              <View style={styles.benefitItem}>
                <Ionicons name="cash" size={24} color="#FFD700" />
                <View style={styles.benefitTextContainer}>
                  <Text style={styles.benefitTitle}>Cashback Rewards</Text>
                  <Text style={styles.benefitDescription}>Earn up to 3% cashback on every bill you pay through BillsAI.</Text>
                </View>
              </View>
              <View style={styles.benefitDivider} />
              <View style={[styles.benefitItem,styles.lastbenefit]}>
                <Ionicons name="timer" size={24} color="#FFD700" />
                <View style={styles.benefitTextContainer}>
                  <Text style={styles.benefitTitle}>Priority Support</Text>
                  <Text style={styles.benefitDescription}>Get instant access to our dedicated support team 24/7.</Text>
                </View>
              </View>
            </View>

            {/* Additional Card Showcase at 45 degrees */}
            <View style={styles.additionalCardSection}>
              <View style={styles.additionalCardContainer}>
                <Animated.View style={[styles.premiumCard, styles.secondCardStyle]}>
                  {/* Credit2 Card Image with improved visibility */}
                  <TouchableOpacity
                    onPress={() => {}}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={credit2Image}
                      style={styles.secondCardImage}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>
            {/* Premium Features Section */}
            <View style={styles.premiumFeaturesContainer}>
              
              
              {/* Wallet Integration - Row Layout */}
              <View style={styles.featureRow}>
                <View style={styles.featureIconContainer}>
                  <Ionicons name="wallet-outline" size={32} color="#FFD700" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Digital Wallet Ready</Text>
                  <Text style={styles.featureDescription}>One tap to add to Apple Pay, Google Pay or Samsung Pay.</Text>
                </View>
              </View>
              
              {/* Divider line with dot */}
              <View style={styles.featureDivider}>
                <View style={styles.featureDividerDot} />
              </View>
              
              {/* Virtual Control - Row Layout */}
              <View style={styles.featureRow}>
                <View style={styles.featureIconContainer}>
                  <Ionicons name="shield-checkmark-outline" size={32} color="#FFD700" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Smart Card Controls</Text>
                  <Text style={styles.featureDescription}>Freeze card, set limits and receive instant alerts all in real-time.</Text>
                </View>
              </View>
            </View>

            {/* Terms Apply Text */}
            <View style={styles.termsContainer}>
              <Ionicons name="information-circle" size={24} color="#FFD700" />
              <Text style={styles.termsText}>Terms apply</Text>
            </View>

        </View>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: theme.colors.black,
  },
  gradientBackground: {
    flex: 1,
    paddingBottom: 40,
  },
  scrollableContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff8dc',
    letterSpacing: 0.3,
  },
  backButton: {
    padding: 8,
  },
  spacer: {
    width: 24,
  },
  headlineContainer: {
    paddingHorizontal: 20,
    marginTop: 40,
    alignItems: 'center',
  },
  headlineText: {
    fontSize: 52,
    fontWeight: 800,
    color: '#fff8dc',
    textAlign: 'center',
    lineHeight: 52,
    letterSpacing: -0.5,
    lineSpacing: 10,
    paddingVertical: 10,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',

    paddingBottom: 30,
  },
  premiumCard: {
    width: '100%',
    height: CARD_HEIGHT,
    marginBottom: 20,
    backgroundColor: 'transparent',
    position: 'relative',
    alignSelf: 'stretch',
  },
  
  creditCardImage: {
  
    width: '147%',
    height: '145%',
    resizeMode: 'contain',
    top: -17,
    left: -80,
  
  },
  secondCardImage: {
    width: '155%',
    height: '135%',
    resizeMode: 'cover',
    top: -100,
    left: -80,
    bottom: -5,

  },

  cardElement: {
    position: 'absolute',
    top: 90,
    left: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    borderRadius: theme.borderRadius.round,
  },
  secondCard: {
    top: 75,
    left: 50,
  },
  platinumChip: {
    width: 50,
    height: 38,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: '#fff8dc', // Platinum color
    marginRight: 10,
    borderWidth: 0.5,
    borderColor: '#E8E3DE',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    zIndex: 2,
    flexDirection: 'column',
  },
  chipCircuits: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  chipCircuit1: {
    position: 'absolute',
    top: 6,
    left: 5,
    width: 40,
    height: 1.5,
    backgroundColor: '#B1A99E',
  },
  chipCircuit2: {
    position: 'absolute',
    top: 12,
    left: 8,
    width: 32,
    height: 1.5,
    backgroundColor: '#B1A99E',
  },
  chipCircuit3: {
    position: 'absolute',
    top: 18,
    left: 5,
    width: 37,
    height: 1.5,
    backgroundColor: '#B1A99E',
  },
  chipCircuit4: {
    position: 'absolute',
    top: 24,
    left: 8,
    width: 32,
    height: 1.5,
    backgroundColor: '#B1A99E',
  },
  chipCircuit5: {
    position: 'absolute',
    top: 30,
    left: 5,
    width: 40,
    height: 1.5,
    backgroundColor: '#B1A99E',
  },
  logoContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 3,
  },
  logoGradient: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  bottomGlowContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    zIndex: 2,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  bottomGlow: {
    width: '100%',
    height: '100%',
  },

  cardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    zIndex: 2,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 7,
  },
  edgeLightContainer: {
    position: 'absolute',
    width: '115%',
    height: '115%',
    top: '-7.5%',
    left: '-7.5%',
    zIndex: 5,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowDot: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.7)',
    top: 0,
    marginTop: -9,  // Half of height to center on the edge
    shadowColor: '#ffffff',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 10,
  },
  diagonalLine: {
    position: 'absolute',
    top: '40%',
    left: -50,
    width: '150%',
    height: 2,
    backgroundColor: 'rgba(130,76,240,0.2)',
    transform: [{ rotate: '-20deg' }],
    zIndex: 2,
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: 4,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    zIndex: 2,
  },
  cardAccentGradient: {
    width: '100%',
    height: '100%',
  },
  diagonalHighlight: {
    position: 'absolute',
    width: '150%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.09)',
    transform: [{ rotate: '-35deg' }],
    left: -120,
    top: '35%',
    zIndex: 2,
  },
  logoText: {
    color: '#fff8dc',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.8,
    opacity: 0.95,
    zIndex: 2,
  },
  elementText: {
    color: '#fff8dc',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  cardNumberContainer: {
    position: 'absolute',
    bottom: 95,
    left: 20,
    zIndex: 2,
  },
  cardNumberText: {
    color: '#fff8dc',
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 2,
  },
  validThruContainer: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    zIndex: 2,
  },
  validThruLabel: {
    color: '#fff8dc',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
    marginBottom: 2,
  },
  validThruText: {
    color: '#fff8dc',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
  },
  shieldIconContainer: {
    position: 'absolute',
    top: 30,
    right: 30,
    zIndex: 2,
  },
  securityNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  securityNoteText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff8dc',
    marginLeft: 5,
  },
  comingSoonLabel: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
    textTransform: 'uppercase',
    backgroundColor: 'rgba(255, 215, 0, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    overflow: 'hidden',
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 20,
    marginHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    color: '#fff8dc',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#fff8dc',
  },
  activeTabText: {
    color: '#fff8dc',
    fontWeight: '600',
  },
  contentContainer: {
    marginTop: 20,
    marginHorizontal: 20,
  },
  featuresList: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  premiumFeatureIconContainer: {
    width: 46,
    height: 46,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  premiumFeatureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10,
  },
  premiumFeatureDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10,
  },
  pricingContainer: {
    marginTop: 20,
    marginHorizontal: 20,
  },
  pricingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#fff8dc',
  },
  pricingCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderColor: '#FFBF00',
    borderWidth: 1,
  },
  pricingHeader: {
    marginBottom: 16,
  },
  pricingPlan: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff8dc',
    marginBottom: 8,
  },
  pricingAmountContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff8dc',
    marginTop: 6,
  },
  pricingAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff8dc',
  },
  pricingPeriodContainer: {
    flexDirection: 'column',
    marginTop: 8,
  },
  pricingCents: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff8dc',
  },
  pricingPeriod: {
    fontSize: 14,
    color: '#fff8dc',
    marginTop: 2,
  },
  pricingDetails: {
    marginTop: 16,
  },
  pricingDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pricingDetailText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#fff8dc',
  },
  taglineContainer: {
    marginTop: 30,
    alignItems: 'center',
    marginBottom: 30,
  },
  taglineText: {
    color: '#fff8dc',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  actionButton: {
    backgroundColor: '#fff8dc',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 30,
    width: '70%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    marginTop: 16,
  },
  actionButtonText: {
    color: 'black',
    fontWeight: '600',
    fontSize: 18,
    letterSpacing: 0.3,
  },
  ctaButton: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignItems: 'center',
    borderColor: '#FFBF00',
    borderWidth: 1,
  },
  ctaButtonText: {
    color: '#fff8dc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ctaNote: {
    marginTop: 16,
    fontSize: 14,
    color: '#fff8dc',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#fff8dc',
    width: '80%',
    alignSelf: 'center',
    marginTop: 80,

  },
  materialInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
    marginBottom: 60,
  },
  materialContainer: {
    alignItems: 'center',
  },
  materialText: {
    color: '#fff8dc',
    fontSize: 18,
    fontWeight: 700,
    textAlign: 'center',
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  materialSubText: {
    color: '#fff8dc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  rewardsTagContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  rewardsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  rewardsTagText: {
    marginLeft: 8,
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 3,
  },
  benefitsSection: {
    paddingTop: 20,
    marginBottom: 40,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    width: '100%',
    paddingBottom: 40,
  },
  benefitsSectionTitle: {
    fontSize: 24,
    fontFamily: 'System',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    letterSpacing: -0.3,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10,
    marginTop: 60,
  },
  benefitCard: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,

    marginBottom: 16,
    flexDirection: 'row',
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
  },
  benefitIconContainer: {
    marginRight: 16,
    justifyContent: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 5,
  },
  benefitDescription: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 3,
    letterSpacing: -0.2,
  },
  additionalCardSection: {
    marginTop: 5,
    marginBottom: 40,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 0,
  },
  additionalCardTitle: {
    fontSize: 24,
    fontFamily: 'System',
    fontWeight: '600',
    color: theme.colors.black,
    marginBottom: 25,
    marginTop: 10,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  additionalCardContainer: {
    height: CARD_HEIGHT * 1.4,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  firstbenefit:{

    marginTop:60

  },
  lastbenefit:{
    marginBottom:60
  },
  
  benefitItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    marginVertical: 8,
    paddingHorizontal: 20,
    marginHorizontal: 10,
  },
  benefitTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  benefitDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 8,
  },
  robinhoodButton: {
    marginTop: 30,
    backgroundColor: '#1A1A1A',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: theme.borderRadius.large,
    alignSelf: 'center',
    minWidth: 200,
    borderColor: '#FFBF00',
    borderWidth: 1,
  },
  robinhoodButtonText: {
    color: '#fff8dc',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardTransforms: {
    width: CARD_WIDTH * 0.95,  // Make slightly smaller for better proportions
    height: CARD_HEIGHT * 0.85,
    transform: [
      { perspective: 1000},  // Add perspective for a more realistic tilt
      { rotateX: '10deg' },   // Tilt forward slightly
      { rotateY: '-10deg' },  // Tilt to the left slightly
    ],
    backgroundColor: 'transparent',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  secondCardStyle: {
    width: '100%',
    height: CARD_HEIGHT * 1.4,
    backgroundColor: 'transparent',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'visible',
  },
  rewardsButton: {
    marginTop: 30,
    backgroundColor: '#1A1A1A',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: theme.borderRadius.large,
    alignSelf: 'center',
    minWidth: 200,
    marginBottom: 50,
    borderColor: '#FFBF00',
    borderWidth: 1,
  },
  rewardsButtonText: {
    fontWeight: '600',
  },
  termsContainer:{
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  termsText:{
    color: '#fff8dc',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginLeft: 8,
  },
  premiumFeaturesContainer: {
    marginHorizontal: 0,
    marginVertical: 30,
    borderWidth: 0,
    width: '100%',
    padding: 20,

  },
  premiumFeaturesHeader: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 20,
    textAlign: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  featureIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    color: '#fff8dc',
    fontSize: 14,
    lineHeight: 20,
  },
  featureDivider: {
    height: 40,
    width: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    marginLeft: 30,
    position: 'relative',
  },
  featureDividerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFD700',
    position: 'absolute',
    left: -2.5,
    top: '50%',
    marginTop: -3,
  },
});

export default MembershipScreen;
