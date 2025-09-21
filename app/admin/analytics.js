import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { ChartBar as BarChart3, TrendingUp, MapPin, Calendar, Users, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Clock } from 'lucide-react-native';
import { getAdminDashboardStats, getIssuesWithLocation } from '../../lib/supabase';

const { width } = Dimensions.get('window');

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedView, setSelectedView] = useState('overview');
  const [stats, setStats] = useState({});
  const [issues, setIssues] = useState([]);

  const periods = [
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'quarter', label: 'Quarter' },
    { id: 'year', label: 'Year' }
  ];

  const views = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
    { id: 'locations', label: 'Locations', icon: MapPin },
    { id: 'performance', label: 'Performance', icon: CheckCircle }
  ];

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      const [statsResult, issuesResult] = await Promise.all([
        getAdminDashboardStats(),
        getIssuesWithLocation()
      ]);

      if (statsResult.data) setStats(statsResult.data);
      if (issuesResult.data) setIssues(issuesResult.data);

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCategoryStats = () => {
    const categoryStats = {};
    issues.forEach(issue => {
      if (!categoryStats[issue.category]) {
        categoryStats[issue.category] = {
          total: 0,
          resolved: 0,
          pending: 0,
          in_progress: 0
        };
      }
      categoryStats[issue.category].total++;
      categoryStats[issue.category][issue.status]++;
    });
    return categoryStats;
  };

  const calculateLocationStats = () => {
    const locationStats = {};
    issues.forEach(issue => {
      const location = issue.area || issue.ward || 'Unknown';
      if (!locationStats[location]) {
        locationStats[location] = {
          total: 0,
          resolved: 0,
          avgResponseTime: 0
        };
      }
      locationStats[location].total++;
      if (issue.status === 'resolved') {
        locationStats[location].resolved++;
      }
    });
    return locationStats;
  };

  const renderOverview = () => {
    const categoryStats = calculateCategoryStats();
    
    return (
      <View style={styles.analyticsContent}>
        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <AlertTriangle size={24} color="#EF4444" />
            <Text style={styles.metricNumber}>{stats.total_issues || 0}</Text>
            <Text style={styles.metricLabel}>Total Issues</Text>
            <Text style={styles.metricTrend}>+{stats.recent_issues || 0} this week</Text>
          </View>

          <View style={styles.metricCard}>
            <CheckCircle size={24} color="#10B981" />
            <Text style={styles.metricNumber}>{stats.resolution_rate || 0}%</Text>
            <Text style={styles.metricLabel}>Resolution Rate</Text>
            <Text style={styles.metricTrend}>+5% vs last month</Text>
          </View>

          <View style={styles.metricCard}>
            <Clock size={24} color="#F59E0B" />
            <Text style={styles.metricNumber}>{stats.response_time || '0 days'}</Text>
            <Text style={styles.metricLabel}>Avg Response</Text>
            <Text style={styles.metricTrend}>-2 days improvement</Text>
          </View>

          <View style={styles.metricCard}>
            <Users size={24} color="#8B5CF6" />
            <Text style={styles.metricNumber}>{stats.active_users || 0}</Text>
            <Text style={styles.metricLabel}>Active Users</Text>
            <Text style={styles.metricTrend}>+12% growth</Text>
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Issues by Category</Text>
          <View style={styles.categoryList}>
            {Object.entries(categoryStats).map(([category, data]) => (
              <View key={category} style={styles.categoryItem}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName}>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
                  <Text style={styles.categoryTotal}>{data.total}</Text>
                </View>
                <View style={styles.categoryProgress}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${data.total > 0 ? (data.resolved / data.total) * 100 : 0}%`,
                          backgroundColor: '#10B981'
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.categoryResolved}>
                    {data.resolved} resolved ({data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0}%)
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Status Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Distribution</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusCard}>
              <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.statusNumber}>{stats.pending_issues || 0}</Text>
              <Text style={styles.statusLabel}>Pending</Text>
            </View>
            <View style={styles.statusCard}>
              <View style={[styles.statusDot, { backgroundColor: '#1E40AF' }]} />
              <Text style={styles.statusNumber}>{stats.in_progress_issues || 0}</Text>
              <Text style={styles.statusLabel}>In Progress</Text>
            </View>
            <View style={styles.statusCard}>
              <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.statusNumber}>{stats.resolved_issues || 0}</Text>
              <Text style={styles.statusLabel}>Resolved</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderLocationAnalytics = () => {
    const locationStats = calculateLocationStats();
    const sortedLocations = Object.entries(locationStats)
      .sort(([,a], [,b]) => b.total - a.total)
      .slice(0, 10);

    return (
      <View style={styles.analyticsContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Issue Locations</Text>
          <View style={styles.locationList}>
            {sortedLocations.map(([location, data], index) => (
              <View key={location} style={styles.locationItem}>
                <View style={styles.locationRank}>
                  <Text style={styles.rankNumber}>#{index + 1}</Text>
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationName}>{location}</Text>
                  <Text style={styles.locationStats}>
                    {data.total} issues • {data.resolved} resolved
                  </Text>
                </View>
                <View style={styles.locationMetrics}>
                  <Text style={styles.resolutionRate}>
                    {data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderPerformanceMetrics = () => (
    <View style={styles.analyticsContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        
        <View style={styles.performanceGrid}>
          <View style={styles.performanceCard}>
            <Text style={styles.performanceTitle}>Response Time</Text>
            <Text style={styles.performanceValue}>{stats.response_time || '0 days'}</Text>
            <Text style={styles.performanceChange}>-15% from last month</Text>
          </View>

          <View style={styles.performanceCard}>
            <Text style={styles.performanceTitle}>First Response</Text>
            <Text style={styles.performanceValue}>2.3 hours</Text>
            <Text style={styles.performanceChange}>-30 min improvement</Text>
          </View>

          <View style={styles.performanceCard}>
            <Text style={styles.performanceTitle}>User Satisfaction</Text>
            <Text style={styles.performanceValue}>4.2/5</Text>
            <Text style={styles.performanceChange}>+0.3 improvement</Text>
          </View>

          <View style={styles.performanceCard}>
            <Text style={styles.performanceTitle}>Reopened Issues</Text>
            <Text style={styles.performanceValue}>3.2%</Text>
            <Text style={styles.performanceChange}>-1.1% reduction</Text>
          </View>
        </View>
      </View>

      {/* Department Performance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Department Performance</Text>
        <View style={styles.departmentList}>
          {[
            { name: 'Public Works', resolved: 85, total: 120, avgTime: '3.2 days' },
            { name: 'Parks & Recreation', resolved: 42, total: 48, avgTime: '2.1 days' },
            { name: 'Environment', resolved: 28, total: 35, avgTime: '4.5 days' },
            { name: 'Public Safety', resolved: 67, total: 72, avgTime: '1.8 days' }
          ].map(dept => (
            <View key={dept.name} style={styles.departmentItem}>
              <Text style={styles.departmentName}>{dept.name}</Text>
              <View style={styles.departmentStats}>
                <Text style={styles.departmentResolved}>
                  {dept.resolved}/{dept.total} resolved
                </Text>
                <Text style={styles.departmentRate}>
                  {Math.round((dept.resolved / dept.total) * 100)}%
                </Text>
              </View>
              <Text style={styles.departmentTime}>Avg: {dept.avgTime}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Analytics Dashboard</Text>
        <Text style={styles.subtitle}>Data-driven insights for better governance</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.periodButtons}>
            {periods.map(period => (
              <TouchableOpacity
                key={period.id}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.id && styles.periodButtonActive
                ]}
                onPress={() => setSelectedPeriod(period.id)}
              >
                <Text style={[
                  styles.periodText,
                  selectedPeriod === period.id && styles.periodTextActive
                ]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* View Selector */}
      <View style={styles.viewSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.viewButtons}>
            {views.map(view => {
              const IconComponent = view.icon;
              return (
                <TouchableOpacity
                  key={view.id}
                  style={[
                    styles.viewButton,
                    selectedView === view.id && styles.viewButtonActive
                  ]}
                  onPress={() => setSelectedView(view.id)}
                >
                  <IconComponent 
                    size={16} 
                    color={selectedView === view.id ? '#1E40AF' : '#6B7280'} 
                  />
                  <Text style={[
                    styles.viewText,
                    selectedView === view.id && styles.viewTextActive
                  ]}>
                    {view.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {selectedView === 'overview' && renderOverview()}
        {selectedView === 'locations' && renderLocationAnalytics()}
        {selectedView === 'performance' && renderPerformanceMetrics()}
        {selectedView === 'trends' && (
          <View style={styles.analyticsContent}>
            <Text style={styles.comingSoon}>Trends Analysis - Coming Soon</Text>
          </View>
        )}
      </ScrollView>
    </View>
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
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  periodSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  periodButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  periodButtonActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  periodTextActive: {
    color: '#FFFFFF',
  },
  viewSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  viewButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  viewButtonActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BFDBFE',
  },
  viewText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  viewTextActive: {
    color: '#1E40AF',
  },
  content: {
    flex: 1,
  },
  analyticsContent: {
    padding: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    minWidth: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  metricTrend: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
  categoryList: {
    gap: 16,
  },
  categoryItem: {
    gap: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  categoryTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
  },
  categoryProgress: {
    gap: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryResolved: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statusCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  statusNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  locationList: {
    gap: 12,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    gap: 12,
  },
  locationRank: {
    width: 32,
    height: 32,
    backgroundColor: '#1E40AF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  locationStats: {
    fontSize: 12,
    color: '#6B7280',
  },
  locationMetrics: {
    alignItems: 'flex-end',
  },
  resolutionRate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  performanceCard: {
    flex: 1,
    minWidth: (width - 80) / 2,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  performanceTitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  performanceChange: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  departmentList: {
    gap: 12,
  },
  departmentItem: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  departmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  departmentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  departmentResolved: {
    fontSize: 14,
    color: '#6B7280',
  },
  departmentRate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  departmentTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  comingSoon: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 60,
  },
});