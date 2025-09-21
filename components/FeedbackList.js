import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { MessageSquare, Clock, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, MessageCircle, Calendar } from 'lucide-react-native';
import { getUserFeedback, getCurrentUser } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

export default function FeedbackList() {
  const { t } = useTranslation();
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filters = [
    { id: 'all', label: 'All', count: 0 },
    { id: 'pending', label: 'Pending', count: 0 },
    { id: 'responded', label: 'Responded', count: 0 },
    { id: 'resolved', label: 'Resolved', count: 0 },
  ];

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      
      const { user, error: userError } = await getCurrentUser();
      if (userError) throw userError;
      
      if (!user) {
        Alert.alert('Error', 'Please sign in to view your feedback');
        return;
      }

      const { data, error } = await getUserFeedback();
      if (error) throw error;

      setFeedback(data || []);
    } catch (error) {
      console.error('Error loading feedback:', error);
      Alert.alert('Error', 'Failed to load feedback history');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeedback();
    setRefreshing(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} color="#F59E0B" />;
      case 'acknowledged':
        return <MessageCircle size={16} color="#3B82F6" />;
      case 'under_review':
        return <AlertTriangle size={16} color="#8B5CF6" />;
      case 'responded':
        return <MessageSquare size={16} color="#10B981" />;
      case 'resolved':
        return <CheckCircle size={16} color="#10B981" />;
      default:
        return <Clock size={16} color="#6B7280" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'acknowledged': return '#3B82F6';
      case 'under_review': return '#8B5CF6';
      case 'responded': return '#10B981';
      case 'resolved': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'complaint': return '#EF4444';
      case 'suggestion': return '#10B981';
      case 'compliment': return '#8B5CF6';
      case 'inquiry': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'complaint': return '⚠️';
      case 'suggestion': return '💡';
      case 'compliment': return '👍';
      case 'inquiry': return '❓';
      default: return '📝';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return formatDate(dateString);
  };

  // Update filter counts
  const updatedFilters = filters.map(filter => ({
    ...filter,
    count: filter.id === 'all' 
      ? feedback.length 
      : feedback.filter(item => item.status === filter.id).length
  }));

  const filteredFeedback = selectedFilter === 'all' 
    ? feedback 
    : feedback.filter(item => item.status === selectedFilter);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <MessageSquare size={32} color="#1E40AF" />
        <Text style={styles.loadingText}>Loading your feedback...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filtersSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filtersList}>
            {updatedFilters.map((filter) => (
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
                  <Text style={styles.filterChipBadgeText}>{filter.count}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Feedback List */}
      <ScrollView
        style={styles.feedbackList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredFeedback.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageSquare size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No feedback found</Text>
            <Text style={styles.emptyText}>
              {selectedFilter === 'all' 
                ? "You haven't submitted any feedback yet"
                : `No ${selectedFilter} feedback found`}
            </Text>
          </View>
        ) : (
          <View style={styles.feedbackItems}>
            {filteredFeedback.map((item) => (
              <TouchableOpacity key={item.id} style={styles.feedbackCard}>
                {/* Header */}
                <View style={styles.feedbackHeader}>
                  <View style={styles.feedbackMeta}>
                    <View style={styles.typeIndicator}>
                      <Text style={styles.typeIcon}>{getTypeIcon(item.type)}</Text>
                      <Text style={[styles.typeText, { color: getTypeColor(item.type) }]}>
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                      </Text>
                    </View>
                    <View style={styles.statusIndicator}>
                      {getStatusIcon(item.status)}
                      <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status.replace('_', ' ').charAt(0).toUpperCase() + item.status.replace('_', ' ').slice(1)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.feedbackDate}>{getTimeAgo(item.created_at)}</Text>
                </View>

                {/* Content */}
                <Text style={styles.feedbackSubject}>{item.subject}</Text>
                <Text style={styles.feedbackMessage} numberOfLines={3}>
                  {item.message}
                </Text>

                {/* Admin Response */}
                {item.admin_response && (
                  <View style={styles.responseSection}>
                    <View style={styles.responseHeader}>
                      <MessageSquare size={14} color="#10B981" />
                      <Text style={styles.responseTitle}>Admin Response</Text>
                    </View>
                    <Text style={styles.responseText}>{item.admin_response}</Text>
                    {item.responded_at && (
                      <Text style={styles.responseDate}>
                        Responded on {formatDate(item.responded_at)}
                      </Text>
                    )}
                  </View>
                )}

                {/* Footer */}
                <View style={styles.feedbackFooter}>
                  <View style={styles.feedbackInfo}>
                    <Calendar size={12} color="#9CA3AF" />
                    <Text style={styles.feedbackInfoText}>
                      Submitted {formatDate(item.created_at)}
                    </Text>
                  </View>
                  {item.satisfaction_rating && (
                    <View style={styles.ratingContainer}>
                      <Text style={styles.ratingText}>
                        Rating: {'⭐'.repeat(item.satisfaction_rating)}
                      </Text>
                    </View>
                  )}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  filtersSection: {
    marginBottom: 16,
  },
  filtersList: {
    flexDirection: 'row',
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
  feedbackList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
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
  feedbackItems: {
    gap: 16,
  },
  feedbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  feedbackMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeIcon: {
    fontSize: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  feedbackDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  feedbackSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  feedbackMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  responseSection: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  responseTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  responseText: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
    marginBottom: 6,
  },
  responseDate: {
    fontSize: 11,
    color: '#16A34A',
    fontStyle: 'italic',
  },
  feedbackFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  feedbackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedbackInfoText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
});