// app/(tabs)/_layout.js
import { Tabs } from 'expo-router';
import { TouchableOpacity, Platform } from 'react-native';
import { Chrome as Home, MapPin, User, Trophy, MessageSquare, Phone, MessageCircle, Menu } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';

export default function TabLayout() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  
  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerLeft: () => (
          <TouchableOpacity 
            onPress={openDrawer}
            style={{ 
              marginLeft: Platform.OS === 'ios' ? 16 : 16,
              padding: 4,
            }}
          >
            <Menu size={24} color="#fff" />
          </TouchableOpacity>
        ),
        headerStyle: {
          backgroundColor: '#1E40AF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
        tabBarActiveTintColor: '#1E40AF',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          height: Platform.OS === 'ios' ? 85 : 65,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: Platform.OS === 'ios' ? -5 : 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('navigation.home'),
          headerTitle: 'Dashboard',
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: t('navigation.report'),
          headerTitle: 'Report Issue',
          tabBarIcon: ({ size, color }) => (
            <MapPin size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="heatmap"
        options={{
          title: t('navigation.heatmap'),
          headerTitle: 'Issue Map',
          tabBarIcon: ({ size, color }) => (
            <MapPin size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: t('navigation.leaderboard'),
          headerTitle: 'Leaderboard',
          tabBarIcon: ({ size, color }) => (
            <Trophy size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: t('navigation.community'),
          headerTitle: 'Community',
          tabBarIcon: ({ size, color }) => (
            <MessageSquare size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contact"
        options={{
          title: 'Contact',
          headerTitle: 'Contact Support',
          tabBarIcon: ({ size, color }) => (
            <Phone size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="feedback"
        options={{
          title: 'Feedback',
          headerTitle: 'Feedback',
          tabBarIcon: ({ size, color }) => (
            <MessageCircle size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'My Profile',
          tabBarIcon: ({ size, color }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}