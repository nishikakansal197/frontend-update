import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function SplashScreen() {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const router = useRouter();

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate after 10 seconds
    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <Image
            source={require('../assets/images/favicon.png')}
            style={styles.iconImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.appName}>जनConnect</Text>
        <Text style={styles.tagline}>Building Better Communities Together</Text>
      </Animated.View>

      <View style={styles.loadingContainer}>
        <View style={styles.loadingBar}>
          <Animated.View
            style={[
              styles.loadingFill,
              {
                width: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  iconImage: {
    width: 90,
    height: 90,
  },
  container: {
    flex: 1,
    backgroundColor: '#1E40AF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 100,
  },
  iconContainer: {
    width: 120,
    height: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,

    // ✅ new shadow API
    boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.3)",

    // ✅ keep elevation for Android
    elevation: 15,
  },

  iconText: {
    fontSize: 48,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: '#BFDBFE',
    textAlign: 'center',
    fontWeight: '400',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  loadingBar: {
    width: 200,
    height: 4,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
    marginBottom: 15,
  },
  loadingFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  loadingText: {
    color: '#BFDBFE',
    fontSize: 14,
    fontWeight: '500',
  },
});