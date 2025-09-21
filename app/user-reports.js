import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Clock, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Eye, MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { getUserIssues } from '../lib/supabase';
import { showErrorToast } from '../components/Toast';

export default function UserReportsScreen() {
  const router = useRouter();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filters = [
    { id: 'all', label: 'All Reports' },
    { id: 'pending', label: 'Pending' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'resolved', label: 'Resolved' },
  ];

  useEffect(() => {
    loadUserIssues();
  }, []);

  const loadUserIssues = async () => {
    try {
      setLoading(true);
      const { data, error } = await getUserIssues();
      if (error) throw error;
      setIssues(data || []);
    } catch (error) {
      console.error('Error loading user issues:', error);
      showErrorToast('Error', 'Failed to load your reports');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserIssues();
    setRefreshing(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock size={16} color="#F59E0B" />;
      case 'acknowledged': return <MessageSquare size={16} color="#3B82F6" />;
      case 'in_progress': return <AlertTriangle size={16} color="#1E40AF" />;
      case 'resolved': return <CheckCircle size={16} color="#10B981" />;
      default: return <Clock size={16} color="#6B7280" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'acknowledged': return '#3B82F6';
      case 'in_progress': return '#1E40AF';
      case 'resolved': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      roads: '#EF4444',
      utilities: '#F59E0B',
      environment: '#10B981',
      safety: '#8B5CF6',
      parks: '#06B6D4',
      other: '#6B7280',
    };
    return colors[category] || '#6B7280';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#DC2626';
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filteredIssues = selectedFilter === 'all' 
    ? issues 
    : issues.filter(issue => issue.status === selectedFilter);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1E40AF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>My Reports</Text>
          <Text style={styles.subtitle}>{issues.length} total reports</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filtersList}>
            {filters.map((filter) => {
              const count = filter.id === 'all' 
                ? issues.length 
                : issues.filter(issue => issue.status === filter.id).length;
              
              return (
                <TouchableOpacity
                  key={filter.id}
                  style={[
                    styles.filterChip,
                    selectedFilter === filter.id && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedFilter(filter.id)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === filter.id && styles.filterChipTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                  <View style={styles.filterChipBadge}>
                    <Text style={styles.filterChipBadgeText}>{count}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Issues List */}
      <ScrollView
        style={styles.issuesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading your reports...</Text>
          </View>
        ) : filteredIssues.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MapPin size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No reports found</Text>
            <Text style={styles.emptyText}>
              {selectedFilter === 'all' 
                ? "You haven't reported any issues yet"
                : `No ${selectedFilter} reports found`}
            </Text>
          </View>
        ) : (
          <View style={styles.issuesContainer}>
            {filteredIssues.map((issue) => (
              <TouchableOpacity key={issue.id} style={styles.issueCard}>
                {/* Header */}
                <View style={styles.issueHeader}>
                  <View style={styles.issueMeta}>
                    <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(issue.category) + '20' }]}>
                      <Text style={[styles.categoryText, { color: getCategoryColor(issue.category) }]}>
                        {issue.category.charAt(0).toUpperCase() + issue.category.slice(1)}
                      </Text>
                    </View>
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(issue.priority) }]}>
                      <Text style={styles.priorityText}>
                        {issue.priority.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statusContainer}>
                    {getStatusIcon(issue.status)}
                    <Text style={[styles.statusText, { color: getStatusColor(issue.status) }]}>
                      {issue.status.replace('_', ' ').charAt(0).toUpperCase() + issue.status.replace('_', ' ').slice(1)}
                    </Text>
                  </View>
                </View>

                {/* Content */}
                <Text style={styles.issueTitle}>{issue.title}</Text>
                <Text style={styles.issueDescription} numberOfLines={3}>
                  {issue.description}
                </Text>

                {/* Location */}
                {issue.location_name && (
                  <View style={styles.locationContainer}>
                    <MapPin size={14} color="#6B7280" />
                    <Text style={styles.locationText}>{issue.location_name}</Text>
                  </View>
                )}

                {/* Images */}
                {issue.images && issue.images.length > 0 && (
                  <ScrollView horizontal style={styles.imagesContainer} showsHorizontalScrollIndicator={false}>
                    {issue.images.slice(0, 3).map((imageUrl, index) => (
                      <Image key={index} source={{ uri: imageUrl }} style={styles.issueImage} />
                    ))}
                    {issue.images.length > 3 && (
                      <View style={styles.moreImagesIndicator}>
                        <Text style={styles.moreImagesText}>+{issue.images.length - 3}</Text>
                      </View>
                    )}
                  </ScrollView>
                )}

                {/* Stats */}
                <View style={styles.issueStats}>
                  <View style={styles.statItem}>
                    <Eye size={12} color="#6B7280" />
                    <Text style={styles.statText}>{issue.views_count || 0}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <ThumbsUp size={12} color="#10B981" />
                    <Text style={styles.statText}>{issue.upvotes || 0}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <MessageSquare size={12} color="#8B5CF6" />
                    <Text style={styles.statText}>{issue.comments_count || 0}</Text>
                  </View>
                  <Text style={styles.issueDate}>{formatDate(issue.created_at)}</Text>
                </View>
              </TouchableOpacity>
            ))}
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
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: '#F0F9FF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  headerContent: {
    flex: 1,
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
  filtersSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    marginBottom: 8,
  },
  filtersList: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 16,
    alignItems: 'center',
  },
  filterChipBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  issuesList: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  issuesContainer: {
    padding: 16,
    gap: 16,
  },
  issueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  issueMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  issueDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  imagesContainer: {
    marginBottom: 12,
  },
  issueImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  moreImagesIndicator: {
    width: 60,
    height: 60,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  issueStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  issueDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 'auto',
  },
});