import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Building, TriangleAlert as AlertTriangle, FileText, Users, TrendingUp, Clock, CircleCheck as CheckCircle, Activity, LogOut, Settings, ChartBar as BarChart3, Hammer, UserCheck } from 'lucide-react-native';
import {
  getCurrentUser,
  getUserProfile,
  getDepartmentAdminDashboard,
  signOut
} from '../../lib/supabase';

export default function DepartmentAdminHome() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    issues: [],
    contractors: [],
    tenders: [],
    departmentId: null
  });
  const [stats, setStats] = useState({
    assignedIssues: 0,
    activeTenders: 0,
    activeContractors: 0,
    completedProjects: 0,
    avgCompletionTime: '0 days'
  });

  useEffect(() => {
    checkDepartmentAdminAccess();
  }, []);

  const checkDepartmentAdminAccess = async () => {
    try {
      const { user: currentUser, error: userError } = await getCurrentUser();
      if (userError || !currentUser) {
        Alert.alert('Access Denied', 'Please sign in to access department admin panel');
        router.replace('/auth');
        return;
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await getUserProfile(currentUser.id);

      console.log('Raw profile query result:', profileData);

      if (profileError || !profileData || profileData.length === 0) {
        Alert.alert('Access Denied', 'Profile not found');
        router.replace('/(tabs)');
        return;
      }

      // Handle profile data (should be a single object, not array)
      const profile = profileData;

      console.log('Resolved profile:', profile);
      console.log('User type determined:', profile.user_type);

      if (profile.user_type !== 'department_admin') {
        Alert.alert('Access Denied', 'You do not have department admin privileges');
        router.replace('/(tabs)');
        return;
      }

      setUser(currentUser);
      setProfile(profile);
      await loadDashboardData();

    } catch (error) {
      console.error('Error checking department admin access:', error);
      router.replace('/auth');
    }
  };


  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const { data, error } = await getDepartmentAdminDashboard();
      if (error) throw error;

      setDashboardData(data);

      // Calculate stats
      const issues = data.issues || [];
      const tenders = data.tenders || [];
      const contractors = data.contractors || [];

      const assignedIssues = issues.filter(i => i.workflow_stage === 'department_assigned').length;
      const activeTenders = tenders.filter(t => t.status === 'available').length;
      const activeContractors = contractors.length;
      const completedProjects = tenders.filter(t => t.status === 'completed').length;

      setStats({
        assignedIssues,
        activeTenders,
        activeContractors,
        completedProjects,
        avgCompletionTime: calculateAvgCompletionTime(tenders)
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAvgCompletionTime = (tenders) => {
    const completedTenders = tenders.filter(t => t.status === 'completed' && t.awarded_at);
    if (completedTenders.length === 0) return '0 days';

    const totalDays = completedTenders.reduce((sum, tender) => {
      const started = new Date(tender.awarded_at);
      const completed = new Date(tender.completion_date || tender.updated_at);
      return sum + Math.ceil((completed - started) / (1000 * 60 * 60 * 24));
    }, 0);

    return `${Math.round(totalDays / completedTenders.length)} days`;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
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
          }
        }
      ]
    );
  };

  const menuItems = [
    {
      id: 'dashboard',
      title: 'Department Dashboard',
      description: 'Comprehensive department overview',
      icon: BarChart3,
      color: '#1E40AF',
      route: '/department-admin/dashboard',
    },
    {
      id: 'issues',
      title: 'Assigned Issues',
      description: 'Manage issues assigned to your department',
      icon: AlertTriangle,
      color: '#EF4444',
      route: '/department-admin/issues',
      badge: stats.assignedIssues
    },
    {
      id: 'tenders',
      title: 'Tender Management',
      description: 'Create and manage tenders for contractors',
      icon: FileText,
      color: '#F59E0B',
      route: '/department-admin/tenders',
    },
    {
      id: 'contractors',
      title: 'Contractor Management',
      description: 'Manage contractors and assignments',
      icon: Hammer,
      color: '#8B5CF6',
      route: '/department-admin/contractors',
    },
    {
      id: 'progress',
      title: 'Work Progress',
      description: 'Track contractor work progress',
      icon: UserCheck,
      color: '#10B981',
      route: '/department-admin/progress',
    },
    {
      id: 'analytics',
      title: 'Department Analytics',
      description: 'Performance metrics and reports',
      icon: TrendingUp,
      color: '#06B6D4',
      route: '/department-admin/analytics',
    },
    {
      id: 'settings',
      title: 'Department Settings',
      description: 'Configure department preferences',
      icon: Settings,
      color: '#6B7280',
      route: '/department-admin/settings',
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Activity size={32} color="#1E40AF" />
        <Text style={styles.loadingText}>Loading department admin panel...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.adminBadge}>
            <Building size={16} color="#FFFFFF" />
            <Text style={styles.adminBadgeText}>DEPARTMENT ADMIN</Text>
          </View>
          <Text style={styles.title}>Department Control Panel</Text>
          <Text style={styles.subtitle}>
            Welcome, {profile?.full_name || profile?.first_name || 'Department Administrator'}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Department Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <AlertTriangle size={24} color="#EF4444" />
            <Text style={styles.statNumber}>{stats.assignedIssues}</Text>
            <Text style={styles.statLabel}>Assigned Issues</Text>
          </View>
          <View style={styles.statCard}>
            <FileText size={24} color="#F59E0B" />
            <Text style={styles.statNumber}>{stats.activeTenders}</Text>
            <Text style={styles.statLabel}>Active Tenders</Text>
          </View>
          <View style={styles.statCard}>
            <Users size={24} color="#8B5CF6" />
            <Text style={styles.statNumber}>{stats.activeContractors}</Text>
            <Text style={styles.statLabel}>Contractors</Text>
          </View>
          <View style={styles.statCard}>
            <CheckCircle size={24} color="#10B981" />
            <Text style={styles.statNumber}>{stats.completedProjects}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      </View>

      {/* Performance Metrics */}
      <View style={styles.performanceSection}>
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        <View style={styles.performanceGrid}>
          <View style={styles.performanceCard}>
            <Clock size={20} color="#10B981" />
            <Text style={styles.performanceValue}>{stats.avgCompletionTime}</Text>
            <Text style={styles.performanceLabel}>Avg Completion Time</Text>
          </View>
          <View style={styles.performanceCard}>
            <TrendingUp size={20} color="#8B5CF6" />
            <Text style={styles.performanceValue}>94%</Text>
            <Text style={styles.performanceLabel}>Success Rate</Text>
          </View>
        </View>
      </View>

      {/* Admin Menu */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Department Tools</Text>
        <View style={styles.menuGrid}>
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => router.push(item.route)}
              >
                <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                  <IconComponent size={24} color={item.color} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuDescription}>{item.description}</Text>
                </View>
                {item.badge > 0 && (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{item.badge}</Text>
                  </View>
                )}
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
    backgroundColor: '#8B5CF6',
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
  performanceSection: {
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
  performanceGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  performanceCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  performanceLabel: {
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
  menuBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  menuBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  menuArrow: {
    marginLeft: 12,
  },
  arrowText: {
    fontSize: 24,
    color: '#9CA3AF',
  },
});