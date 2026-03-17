import { createContext, useEffect, useState, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';


const OnBoardingContext = createContext();

export default OnBoardingContext;

// Custom hook to use the onboarding context
export const useOnBoardingProvider = () => {
    const context = useContext(OnBoardingContext);
    if (!context) {
        throw new Error('useOnBoardingProvider must be used within an OnBoardingProvider');
    }
    return context;
};

export const OnBoardingProvider = ({ children }) => {
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);

    useEffect(() => {
        const loadStatus = async () => {
            const value = await AsyncStorage.getItem('@hasSeenOnboarding');
            setHasSeenOnboarding(value === 'true');
        };
        loadStatus();
    }, []);

    // Function to mark onboarding as complete
    const completeOnboarding = async () => {
        try {
            await AsyncStorage.setItem('@hasSeenOnboarding', 'true');
            setHasSeenOnboarding(true);
        } catch (error) {
            //console.error('Error saving onboarding status:', error);

            // Even if storage fails, ensure the in-memory state is updated
            // so the user can continue using the app
            setHasSeenOnboarding(true);

            // Try a fallback method with a small delay
            setTimeout(async () => {
                try {
                    // Attempt to clear AsyncStorage first
                    await AsyncStorage.clear();
                    // Try saving again
                    await AsyncStorage.setItem('@hasSeenOnboarding', 'true');
                    //console.log('Successfully saved onboarding status after fallback');
                } catch (fallbackError) {
                    //console.error('Fallback save also failed:', fallbackError);
                }
            }, 500);
        }
    };

    return (
      <OnBoardingContext.Provider value={{ hasSeenOnboarding, setHasSeenOnboarding, completeOnboarding }}>
        {children}
      </OnBoardingContext.Provider>
    );
};
