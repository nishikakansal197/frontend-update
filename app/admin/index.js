import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  MessageSquare,
  Building,
  LogOut,
  Shield,
  Activity,
  TrendingUp,
  FileText,
  Settings,
  Users,
  ListIcon,
  BarChart3,
} from 'lucide-react-native';
import {
  getIssues,
  getCurrentUser,
  getUserProfile,
  signOut,
} from '../../lib/supabase';

export default function AdminHome() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [issueCounts, setIssueCounts] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { user: currentUser, error: userError } = await getCurrentUser();
      if (userError || !currentUser) {
        Alert.alert('Access Denied', 'Please sign in to access admin panel');
        router.replace('/auth');
        return;
      }

      const { data: profileData, error: profileError } = await getUserProfile(
        currentUser.id
      );
      if (profileError || !profileData || profileData.user_type !== 'admin') {
        Alert.alert('Access Denied', 'You do not have admin privileges');
        router.replace('/(tabs)');
        return;
      }

      setUser(currentUser);
      setProfile(profileData);
      await loadDashboardData();
    } catch (error) {
      console.error('Error checking admin access:', error);
      router.replace('/auth');
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const { data } = await getIssues();
      const counts = { total: 0, pending: 0, inProgress: 0, resolved: 0 };
      if (data) {
        counts.total = data.length;
        counts.pending = data.filter((i) => i.status === 'pending').length;
        counts.inProgress = data.filter(
          (i) => i.status === 'in-progress'
        ).length;
        counts.resolved = data.filter((i) => i.status === 'resolved').length;
      }
      setIssueCounts(counts);
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/auth');
          } catch (error) {
            Alert.alert('Error', 'Failed to logout');
          }
        },
      },
    ]);
  };

  const adminMenuItems = [
    {
      id: 'dashboard',
      title: 'Enhanced Dashboard',
      description: 'Comprehensive admin overview',
      icon: BarChart3,
      color: '#1E40AF',
      route: '/admin/dashboard',
    },
    {
      id: 'issues',
      title: 'Issue Management',
      description: 'View and manage all reported issues',
      icon: ListIcon,
      color: '#EF4444',
      route: '/admin/issues',
    },
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage users and permissions',
      icon: Users,
      color: '#10B981',
      route: '/admin/users',
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      description: 'Data insights and performance metrics',
      icon: TrendingUp,
      color: '#8B5CF6',
      route: '/admin/analytics',
    },
    {
      id: 'feedback',
      title: 'Feedback Management',
      description: 'Handle user feedback and responses',
      icon: MessageSquare,
      color: '#F59E0B',
      route: '/admin/feedback-management',
    },
    {
      id: 'contacts',
      title: 'Municipal Contacts',
      description: 'Manage official contact information',
      icon: Building,
      color: '#06B6D4',
      route: '/admin/municipal-contacts',
    },
    {
      id: 'settings',
      title: 'System Settings',
      description: 'Configure system preferences',
      icon: Settings,
      color: '#6B7280',
      route: '/admin/settings',
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#1E40AF" size="large" />
        <Text style={styles.loadingText}>Loading admin panel...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.adminBadge}>
            <Shield size={16} color="#FFFFFF" />
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
          <Text style={styles.title}>Admin Control Panel</Text>
          <Text style={styles.subtitle}>
            Welcome,{' '}
            {profile?.full_name || profile?.first_name || 'Administrator'}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Quick Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Activity size={24} color="#EF4444" />
            <Text style={styles.statNumber}>{issueCounts.total}</Text>
            <Text style={styles.statLabel}>Total Issues</Text>
          </View>
          <View style={styles.statCard}>
            <Activity size={24} color="#F59E0B" />
            <Text style={styles.statNumber}>{issueCounts.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Activity size={24} color="#1E40AF" />
            <Text style={styles.statNumber}>{issueCounts.inProgress}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={styles.statCard}>
            <Activity size={24} color="#10B981" />
            <Text style={styles.statNumber}>{issueCounts.resolved}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
        </View>
      </View>

      {/* Admin Menu */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Administration Tools</Text>
        <View style={styles.menuGrid}>
          {adminMenuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => router.push(item.route)}
              >
                <View
                  style={[
                    styles.menuIcon,
                    { backgroundColor: item.color + '20' },
                  ]}
                >
                  <IconComponent size={24} color={item.color} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuDescription}>{item.description}</Text>
                </View>
                <View style={styles.menuArrow}>
                  <Text style={styles.arrowText}>›</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerContent: {
    flex: 1,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 4,
  },
  adminBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  logoutButton: {
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  statsSection: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuGrid: {
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  menuArrow: {
    marginLeft: 12,
  },
  arrowText: {
    fontSize: 24,
    color: '#9CA3AF',
  },
});
