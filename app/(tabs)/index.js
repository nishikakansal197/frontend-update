import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl, Alert } from 'react-native';
import { Bell, MapPin, Users, TrendingUp, CircleCheck as CheckCircle, Trophy, MessageSquare, Star, Activity } from 'lucide-react-native';
import { getCurrentUser, getUserProfile, getIssues, getPosts, getTenders, getUserBids, getUserNotifications, getLeaderboard, getUserIssues } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    totalIssues: 0,
    resolvedIssues: 0,
    pendingIssues: 0,
    myIssues: 0,
    communityPosts: 0,
    activeTenders: 0,
    myBids: 0,
    points: 0,
    rank: '-',
    responseTime: '0 days',
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const { user: currentUser, error: userError } = await getCurrentUser();
      if (userError) throw userError;
      if (!currentUser) throw new Error('User not signed in');
      setUser(currentUser);

      const { data: profileData, error: profileError } = await getUserProfile(currentUser.id);
      if (profileError) throw profileError;
      setProfile(profileData);

      await Promise.all([
        loadIssuesData(currentUser.id),
        loadCommunityData(),
        loadTendersData(currentUser.id, profileData?.user_type),
        loadNotifications(currentUser.id),
        loadLeaderboardStats(currentUser.id)
      ]);

    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Compute user's points, rank, and total issues from leaderboard
  const loadLeaderboardStats = async (userId) => {
    try {
      const { data: leaderboardData, error } = await getLeaderboard('month');
      if (error) throw error;

      const sorted = (leaderboardData || []).sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0));
      const currentUserStats = sorted.find(u => u.id === userId) || {};
      const rank = sorted.findIndex(u => u.id === userId) + 1 || '-';
      const points = currentUserStats.total_score || 0;
      const myIssues = currentUserStats.issues_reported || 0;

      setStats(prev => ({ ...prev, points, rank, myIssues }));
    } catch (error) {
      console.error('Error loading leaderboard stats:', error);
    }
  };

  const loadIssuesData = async (userId) => {
    try {
      const { data: allIssues, error } = await getIssues();
      if (error) throw error;

      const totalIssues = allIssues?.length || 0;
      const resolvedIssues = allIssues?.filter(i => i.status === 'resolved').length || 0;
      const pendingIssues = allIssues?.filter(i => i.status === 'pending').length || 0;

      // Calculate average response time
      const resolvedWithDates = allIssues?.filter(i => i.status === 'resolved' && i.resolved_at && i.created_at) || [];
      let avgResponseTime = '0 days';
      if (resolvedWithDates.length > 0) {
        const totalDays = resolvedWithDates.reduce((sum, issue) => {
          const created = new Date(issue.created_at);
          const resolved = new Date(issue.resolved_at);
          return sum + Math.ceil((resolved - created) / (1000 * 60 * 60 * 24));
        }, 0);
        avgResponseTime = `${Math.round(totalDays / resolvedWithDates.length)} days`;
      }

      setStats(prev => ({
        ...prev,
        totalIssues,
        resolvedIssues,
        pendingIssues,
        responseTime: avgResponseTime,
      }));

      // Recent activity
      const recentIssues = allIssues?.slice(0, 5).map(issue => ({
        id: issue.id,
        type: 'issue',
        title: issue.title,
        status: issue.status,
        time: getTimeAgo(issue.created_at),
        icon: getIssueIcon(issue.category),
        color: getStatusColor(issue.status),
      })) || [];
      setRecentActivity(prev => [...prev, ...recentIssues]);

    } catch (error) {
      console.error('Error loading issues data:', error);
    }
  };

  const loadCommunityData = async () => {
    try {
      const { data: posts, error } = await getPosts();
      if (error) throw error;
      setStats(prev => ({ ...prev, communityPosts: posts?.length || 0 }));

      const recentPosts = posts?.slice(0, 3).map(post => ({
        id: post.id,
        type: 'post',
        title: post.content.substring(0, 50) + '...',
        status: 'active',
        time: getTimeAgo(post.created_at),
        icon: '💬',
        color: '#8B5CF6',
      })) || [];
      setRecentActivity(prev => [...prev, ...recentPosts]);
    } catch (error) {
      console.error('Error loading community data:', error);
    }
  };

  const loadTendersData = async (userId, userType) => {
    try {
      const { data: tenders, error } = await getTenders();
      if (error) throw error;

      setStats(prev => ({ ...prev, activeTenders: tenders?.filter(t => t.status === 'available').length || 0 }));

      if (userType === 'tender') {
        const { data: bids, error: bidsError } = await getUserBids();
        if (!bidsError) {
          const activeBids = bids?.filter(b => b.status === 'submitted').length || 0;
          const wonBids = bids?.filter(b => b.status === 'accepted').length || 0;
          setStats(prev => ({ 
            ...prev, 
            myBids: activeBids,
            wonContracts: wonBids
          }));
        }
      }
    } catch (error) {
      console.error('Error loading tenders data:', error);
    }
  };

  const loadNotifications = async (userId) => {
    try {
      const { data, error } = await getUserNotifications();
      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return `${Math.floor(diffInDays / 7)}w ago`;
  };

  const getIssueIcon = (category) => {
    const icons = { roads: '🛣️', utilities: '⚡', environment: '🌱', safety: '🚨', parks: '🌳', other: '📋' };
    return icons[category] || '📋';
  };

  const getStatusColor = (status) => {
    const colors = { pending: '#F59E0B', acknowledged: '#3B82F6', in_progress: '#1E40AF', resolved: '#10B981', closed: '#6B7280', rejected: '#EF4444' };
    return colors[status] || '#6B7280';
  };

  const unreadNotifications = notifications.filter(n => !n.is_read).length;

  const quickStatsData = [
    { id: 'issues', title: 'My Issues', value: stats.myIssues, icon: MapPin, color: '#EF4444', change: '+2' },
    { id: 'resolved', title: 'Resolved', value: stats.resolvedIssues, icon: CheckCircle, color: '#10B981', change: '+12' },
    { 
      id: 'community', 
      title: profile?.user_type === 'tender' ? 'Won Contracts' : 'Posts', 
      value: profile?.user_type === 'tender' ? stats.wonContracts : stats.communityPosts, 
      icon: profile?.user_type === 'tender' ? Trophy : MessageSquare, 
      color: '#8B5CF6', 
      change: '+5' 
    },
    { 
      id: 'rank', 
      title: profile?.user_type === 'tender' ? 'Active Bids' : 'Rank', 
      value: profile?.user_type === 'tender' ? stats.myBids : stats.rank, 
      icon: profile?.user_type === 'tender' ? Activity : Trophy, 
      color: '#F59E0B', 
      change: '+3' 
    },
  ];

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Activity size={32} color="#1E40AF" />
        <Text>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Good {getGreeting()}</Text>
            <Text style={styles.userName}>
              {profile?.full_name || user?.email?.split('@')[0] || 'User'}
            </Text>
            <View style={styles.userBadge}>
              <Text style={styles.userType}>
                {profile?.user_type === 'admin' ? '👨‍💼 Admin' :
                  profile?.user_type === 'area_super_admin' ? '👨‍💼 Area Admin' :
                  profile?.user_type === 'department_admin' ? '🏛️ Dept Admin' :
                  profile?.user_type === 'tender' ? '🏗️ Contractor' : '👤 Citizen'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Bell size={20} color="#1E40AF" />
            {unreadNotifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>{unreadNotifications}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStatsSection}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.quickStatsGrid}>
          {quickStatsData.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <View key={stat.id} style={styles.quickStatCard}>
                <View style={styles.statIconContainer}>
                  <IconComponent size={16} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statTitle}>{stat.title}</Text>
                <Text style={[styles.statChange, { color: stat.color }]}>
                  {stat.change}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsSection}>
        <Text style={styles.sectionTitle}>Community Impact</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <TrendingUp size={18} color="#10B981" />
              <Text style={styles.metricValue}>{stats.totalIssues}</Text>
            </View>
            <Text style={styles.metricLabel}>Total Issues</Text>
            <Text style={styles.metricSubtext}>Community wide</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <CheckCircle size={18} color="#10B981" />
              <Text style={styles.metricValue}>
                {stats.totalIssues > 0 ? Math.round((stats.resolvedIssues / stats.totalIssues) * 100) : 0}%
              </Text>
            </View>
            <Text style={styles.metricLabel}>Resolution Rate</Text>
            <Text style={styles.metricSubtext}>This month</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Activity size={18} color="#F59E0B" />
              <Text style={styles.metricValue}>{stats.responseTime}</Text>
            </View>
            <Text style={styles.metricLabel}>Avg Response</Text>
            <Text style={styles.metricSubtext}>Time to resolve</Text>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.activitySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => router.push('/user-reports')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.activityList}>
          {recentActivity.slice(0, 6).map((activity, index) => (
            <TouchableOpacity key={`${activity.type}-${activity.id}-${index}`} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Text style={styles.activityEmoji}>{activity.icon}</Text>
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle} numberOfLines={1}>
                  {activity.title}
                </Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
              <View style={[styles.activityStatus, { backgroundColor: activity.color }]}>
                <Text style={styles.activityStatusText}>
                  {activity.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quick Actions
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionCard}>
            <MapPin size={20} color="#EF4444" />
            <Text style={styles.quickActionText}>Report Issue</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionCard}>
            <TrendingUp size={20} color="#F59E0B" />
            <Text style={styles.quickActionText}>View Heatmap</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionCard}>
            <Users size={20} color="#10B981" />
            <Text style={styles.quickActionText}>Leaderboard</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionCard}>
            <MessageSquare size={20} color="#8B5CF6" />
            <Text style={styles.quickActionText}>Community</Text>
          </TouchableOpacity>
        </View>
      </View> */}

      {/* User-specific sections */}
      {profile?.user_type === 'tender' && (
        <View style={styles.tenderSection}>
          <Text style={styles.sectionTitle}>Contractor Dashboard</Text>
          <View style={styles.tenderStats}>
            <View style={styles.tenderStatCard}>
              <Text style={styles.tenderStatValue}>{stats.activeTenders}</Text>
              <Text style={styles.tenderStatLabel}>Active Tenders</Text>
            </View>
            <View style={styles.tenderStatCard}>
              <Text style={styles.tenderStatValue}>{stats.myBids}</Text>
              <Text style={styles.tenderStatLabel}>My Bids</Text>
            </View>
          </View>
        </View>
      )}

      {/* Performance Insights
      <View style={styles.insightsSection}>
        <Text style={styles.sectionTitle}>Insights</Text>
        <View style={styles.insightsList}>
          <View style={styles.insightCard}>
            <Star size={16} color="#F59E0B" />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Community Engagement Up</Text>
              <Text style={styles.insightText}>15% increase in community posts this week</Text>
            </View>
          </View>
          
          <View style={styles.insightCard}>
            <TrendingUp size={16} color="#10B981" />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Faster Response Times</Text>
              <Text style={styles.insightText}>Issues resolved 20% faster than last month</Text>
            </View>
          </View>
        </View>
      </View> */}
    </ScrollView>
  );
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
};

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
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
    marginBottom: 6,
  },
  userBadge: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  userType: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  quickStatsSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statIconContainer: {
    width: 28,
    height: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 2,
  },
  statChange: {
    fontSize: 9,
    fontWeight: '600',
  },
  metricsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  metricSubtext: {
    fontSize: 10,
    color: '#6B7280',
  },
  activitySection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
  },
  activityList: {
    gap: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activityIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityEmoji: {
    fontSize: 14,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 10,
    color: '#6B7280',
  },
  activityStatus: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activityStatusText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  quickActionsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: (width - 80) / 2,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  tenderSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tenderStats: {
    flexDirection: 'row',
    gap: 12,
  },
  tenderStatCard: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  tenderStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  tenderStatLabel: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
    textAlign: 'center',
  },
  insightsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  insightsList: {
    gap: 12,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  insightText: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
  },
});