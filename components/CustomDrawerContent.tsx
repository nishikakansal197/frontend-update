// components/CustomDrawerContent.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
} from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useRouter, useSegments } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Home,
  MapPin,
  Users,
  Trophy,
  User,
  Settings,
  LogOut,
  BarChart3,
  FileText,
  Briefcase,
  Globe,
  Shield,
  UserCog,
  Building,
  ClipboardList,
} from 'lucide-react-native';

interface MenuItem {
  icon: any;
  label: string;
  route: string;
  roles?: string[];
}

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const segments = useSegments();
  
  // Mock user data - replace with your actual user context/auth
  const user = {
    name: 'John Doe',
    role: 'user', // user, admin, department-admin, area-super-admin, tender
    avatar: 'https://via.placeholder.com/80',
  };

  const menuItems: MenuItem[] = [
    // Common items for all users
    { 
      icon: Home, 
      label: t('navigation.home'), 
      route: '/(tabs)' 
    },
    
    // User-specific items
    { 
      icon: FileText, 
      label: t('navigation.report'), 
      route: '/(tabs)/report',
      roles: ['user'] 
    },
    { 
      icon: Users, 
      label: t('navigation.community'), 
      route: '/(tabs)/community' 
    },
    { 
      icon: MapPin, 
      label: 'Issue Map', 
      route: '/(tabs)/heatmap' 
    },
    { 
      icon: Trophy, 
      label: t('navigation.leaderboard'), 
      route: '/(tabs)/leaderboard' 
    },
    
    // Admin items
    { 
      icon: BarChart3, 
      label: 'Admin Dashboard', 
      route: '/admin',
      roles: ['admin'] 
    },
    
    // Department Admin items
    { 
      icon: Building, 
      label: 'Department Dashboard', 
      route: '/department-admin',
      roles: ['department-admin'] 
    },
    { 
      icon: UserCog, 
      label: 'Manage Contractors', 
      route: '/department-admin/contractors',
      roles: ['department-admin'] 
    },
    { 
      icon: ClipboardList, 
      label: 'Department Issues', 
      route: '/department-admin/issues',
      roles: ['department-admin'] 
    },
    
    // Area Super Admin items
    { 
      icon: Shield, 
      label: 'Area Dashboard', 
      route: '/area-super-admin',
      roles: ['area-super-admin'] 
    },
    
    // Tender items
    { 
      icon: Briefcase, 
      label: 'Tender Dashboard', 
      route: '/tender-dashboard',
      roles: ['tender'] 
    },
    
    // Common bottom items
    { 
      icon: User, 
      label: 'Profile', 
      route: '/(tabs)/profile' 
    },
    { 
      icon: FileText, 
      label: 'User Reports', 
      route: '/user-reports' 
    },
  ];

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => 
    !item.roles || item.roles.includes(user.role)
  );

  const handleNavigation = (route: string) => {
    router.push(route as any);
    props.navigation.closeDrawer();
  };

  const handleSignOut = () => {
    // Implement your sign out logic
    router.replace('/');
  };

  const getCurrentRouteName = () => {
    const currentRoute = segments.join('/');
    return currentRoute;
  };

  const isRouteActive = (route: string) => {
    const currentRoute = getCurrentRouteName();
    return currentRoute.startsWith(route.replace('/', ''));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image 
          source={{ uri: user.avatar }} 
          style={styles.avatar}
          defaultSource={require('../assets/images/favicon.png')} // Add a default avatar
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userRole}>{user.role.replace('-', ' ')}</Text>
        </View>
      </View>

      {/* Navigation Items */}
      <ScrollView 
        style={styles.navigation} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.navigationContent}
      >
        {filteredMenuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = isRouteActive(item.route);
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.navItem,
                isActive && styles.navItemActive
              ]}
              onPress={() => handleNavigation(item.route)}
              activeOpacity={0.7}
            >
              <Icon 
                size={20} 
                color={isActive ? '#1E40AF' : '#374151'} 
              />
              <Text style={[
                styles.navLabel,
                isActive && styles.navLabelActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.footerItem}
          onPress={() => {/* Implement language toggle */}}
        >
          <Globe size={20} color="#374151" />
          <Text style={styles.footerLabel}>Language</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.footerItem}
          onPress={() => handleNavigation('/settings')}
        >
          <Settings size={20} color="#374151" />
          <Text style={styles.footerLabel}>Settings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.signOutItem} 
          onPress={handleSignOut}
        >
          <LogOut size={20} color="#DC2626" />
          <Text style={styles.signOutLabel}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  userRole: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  navigation: {
    flex: 1,
  },
  navigationContent: {
    paddingVertical: 16,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: '#eff6ff',
  },
  navLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 16,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  footerLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: '#374151',
  },
  signOutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  signOutLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '500',
  },
});