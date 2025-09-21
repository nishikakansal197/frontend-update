import { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, SkipForward } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Report Issues',
    description: 'Easily report civic issues in your community with photos and location data',
    icon: '📍',
    color: '#EF4444',
  },
  {
    id: '2',
    title: 'Track Progress',
    description: 'Monitor the status of reported issues and see how they are being resolved',
    icon: '📊',
    color: '#10B981',
  },
  {
    id: '3',
    title: 'Community Engagement',
    description: 'Connect with neighbors and participate in community discussions',
    icon: '🤝',
    color: '#8B5CF6',
  },
  {
    id: '4',
    title: 'Transparent Governance',
    description: 'View tender information and participate in local governance decisions',
    icon: '🏛️',
    color: '#F59E0B',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  const viewableItemsChanged = useRef(({ viewableItems }) => {
    setCurrentIndex(viewableItems[0].index);
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollToNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.replace('/auth');
    }
  };

  const skipOnboarding = () => {
    router.replace('/auth');
  };

  const renderSlide = ({ item, index }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.4, 1, 0.4],
      extrapolate: 'clamp',
    });
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.slide}>
        <Animated.View style={[styles.slideContent, { opacity, transform: [{ scale }] }]}>
          <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
            <Text style={styles.icon}>{item.icon}</Text>
          </View>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.skipButton} onPress={skipOnboarding}>
          <Text style={styles.skipText}>Skip</Text>
          <SkipForward size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={32}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => {
            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 20, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity,
                  },
                ]}
              />
            );
          })}
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={scrollToNext}>
          <Text style={styles.nextText}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <ArrowRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  skipText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  slideContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    gap: 8,
  },
  dot: {
    height: 8,
    backgroundColor: '#1E40AF',
    borderRadius: 4,
  },
  nextButton: {
    backgroundColor: '#1E40AF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,

    // ✅ new shadow API
    boxShadow: "0px 4px 8px rgba(30, 64, 175, 0.3)",

    // ✅ keep elevation for Android
    elevation: 8,
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});