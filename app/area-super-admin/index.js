import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Shield, MapPin, Users, TrendingUp, Clock, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Building, FileText, LogOut, Settings, Activity, ChartBar as BarChart3, UserCheck } from 'lucide-react-native';
import { 
  getCurrentUser, 
  getUserProfile, 
  getAreaSuperAdminDashboard,
  signOut 
} from '../../lib/supabase';

export default function AreaSuperAdminHome() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    issues: [],
    departments: [],
    areaId: null
  });
  const [stats, setStats] = useState({
    totalIssues: 0,
    pendingReview: 0,
    assignedToDepartments: 0,
    resolved: 0,
    avgResolutionTime: '0 days'
  });

  useEffect(() => {
    checkSuperAdminAccess();
  }, []);

  const checkSuperAdminAccess = async () => {
    try {
      const { user: currentUser, error: userError } = await getCurrentUser();
      if (userError || !currentUser) {
        Alert.alert('Access Denied', 'Please sign in to access area super admin panel');
        router.replace('/auth');
        return;
      }

      const { data: profileData, error: profileError } = await getUserProfile(currentUser.id);
      if (profileError || !profileData || profileData.user_type !== 'area_super_admin') {
        Alert.alert('Access Denied', 'You do not have area super admin privileges');
        router.replace('/(tabs)');
        return;
      }

      setUser(currentUser);
      setProfile(profileData);
      await loadDashboardData();
    } catch (error) {
      console.error('Error checking super admin access:', error);
      router.replace('/auth');
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await getAreaSuperAdminDashboard();
      if (error) throw error;

      setDashboardData(data);

      // Calculate stats
      const issues = data.issues || [];
      const totalIssues = issues.length;
      const pendingReview = issues.filter(i => i.workflow_stage === 'area_review').length;
      const assignedToDepartments = issues.filter(i => i.workflow_stage === 'department_assigned').length;
      const resolved = issues.filter(i => i.status === 'resolved').length;

      setStats({
        totalIssues,
        pendingReview,
        assignedToDepartments,
        resolved,
        avgResolutionTime: calculateAvgResolutionTime(issues)
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAvgResolutionTime = (issues) => {
    const resolvedIssues = issues.filter(i => i.status === 'resolved' && i.resolved_at);
    if (resolvedIssues.length === 0) return '0 days';

    const totalDays = resolvedIssues.reduce((sum, issue) => {
      const created = new Date(issue.created_at);
      const resolved = new Date(issue.resolved_at);
      return sum + Math.ceil((resolved - created) / (1000 * 60 * 60 * 24));
    }, 0);

    return `${Math.round(totalDays / resolvedIssues.length)} days`;
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
      title: 'Enhanced Dashboard',
      description: 'Comprehensive area overview and analytics',
      icon: BarChart3,
      color: '#1E40AF',
      route: '/area-super-admin/dashboard',
    },
    {
      id: 'issues',
      title: 'Issue Management',
      description: 'Review and assign issues to departments',
      icon: AlertTriangle,
      color: '#EF4444',
      route: '/area-super-admin/issues',
      badge: stats.pendingReview
    },
    {
      id: 'departments',
      title: 'Department Management',
      description: 'Manage departments and their admins',
      icon: Building,
      color: '#8B5CF6',
      route: '/area-super-admin/departments',
    },
    {
      id: 'assignments',
      title: 'Assignment Tracking',
      description: 'Track issue assignments and progress',
      icon: UserCheck,
      color: '#10B981',
      route: '/area-super-admin/assignments',
    },
    {
      id: 'analytics',
      title: 'Area Analytics',
      description: 'Performance metrics and insights',
      icon: TrendingUp,
      color: '#F59E0B',
      route: '/area-super-admin/analytics',
    },
    {
      id: 'settings',
      title: 'Area Settings',
      description: 'Configure area preferences',
      icon: Settings,
      color: '#6B7280',
      route: '/area-super-admin/settings',
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Activity size={32} color="#1E40AF" />
        <Text style={styles.loadingText}>Loading area super admin panel...</Text>
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
            <Shield size={16} color="#FFFFFF" />
            <Text style={styles.adminBadgeText}>AREA SUPER ADMIN</Text>
          </View>
          <Text style={styles.title}>Area Control Panel</Text>
          <Text style={styles.subtitle}>
            Welcome, {profile?.full_name || profile?.first_name || 'Super Administrator'}
          </Text>
          {profile?.assigned_area_id && (
            <View style={styles.areaBadge}>
              <MapPin size={14} color="#1E40AF" />
              <Text style={styles.areaText}>Managing Area Zone</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Area Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <AlertTriangle size={24} color="#EF4444" />
            <Text style={styles.statNumber}>{stats.totalIssues}</Text>
            <Text style={styles.statLabel}>Total Issues</Text>
          </View>
          <View style={styles.statCard}>
            <Clock size={24} color="#F59E0B" />
            <Text style={styles.statNumber}>{stats.pendingReview}</Text>
            <Text style={styles.statLabel}>Pending Review</Text>
          </View>
          <View style={styles.statCard}>
            <Building size={24} color="#8B5CF6" />
            <Text style={styles.statNumber}>{stats.assignedToDepartments}</Text>
            <Text style={styles.statLabel}>Assigned</Text>
          </View>
          <View style={styles.statCard}>
            <CheckCircle size={24} color="#10B981" />
            <Text style={styles.statNumber}>{stats.resolved}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
        </View>
      </View>

      {/* Performance Metrics */}
      <View style={styles.performanceSection}>
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        <View style={styles.performanceGrid}>
          <View style={styles.performanceCard}>
            <TrendingUp size={20} color="#10B981" />
            <Text style={styles.performanceValue}>{stats.avgResolutionTime}</Text>
            <Text style={styles.performanceLabel}>Avg Resolution Time</Text>
          </View>
          <View style={styles.performanceCard}>
            <Users size={20} color="#8B5CF6" />
            <Text style={styles.performanceValue}>{dashboardData.departments.length}</Text>
            <Text style={styles.performanceLabel}>Active Departments</Text>
          </View>
        </View>
      </View>

      {/* Admin Menu */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Administration Tools</Text>
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
    marginBottom: 8,
  },
  areaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  areaText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
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