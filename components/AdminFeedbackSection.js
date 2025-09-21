import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { MessageSquare, Clock, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, MessageCircle, Send, Filter, Search } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

export default function AdminFeedbackSection() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [responding, setResponding] = useState(false);

  const filters = [
    { id: 'all', label: 'All', count: 0 },
    { id: 'pending', label: 'Pending', count: 0 },
    { id: 'under_review', label: 'Under Review', count: 0 },
    { id: 'responded', label: 'Responded', count: 0 },
    { id: 'resolved', label: 'Resolved', count: 0 },
  ];

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('feedback')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            user_type
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedback(data || []);
    } catch (error) {
      console.error('Error loading feedback:', error);
      Alert.alert('Error', 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeedback();
    setRefreshing(false);
  };

  const handleUpdateStatus = async (feedbackId, newStatus) => {
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', feedbackId);

      if (error) throw error;
      
      Alert.alert('Success', 'Feedback status updated');
      await loadFeedback();
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleRespond = async (feedbackId) => {
    if (!responseText.trim()) {
      Alert.alert('Error', 'Please enter a response');
      return;
    }

    try {
      setResponding(true);
      
      const { error } = await supabase
        .from('feedback')
        .update({
          admin_response: responseText,
          status: 'responded',
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', feedbackId);

      if (error) throw error;

      Alert.alert('Success', 'Response sent successfully');
      setSelectedFeedback(null);
      setResponseText('');
      await loadFeedback();
    } catch (error) {
      console.error('Error sending response:', error);
      Alert.alert('Error', 'Failed to send response');
    } finally {
      setResponding(false);
    }
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Feedback Management</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Search size={16} color="#1E40AF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Filter size={16} color="#1E40AF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{feedback.length}</Text>
          <Text style={styles.statLabel}>Total Feedback</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {feedback.filter(f => f.status === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {feedback.filter(f => f.status === 'responded').length}
          </Text>
          <Text style={styles.statLabel}>Responded</Text>
        </View>
      </View>

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
                ? "No feedback has been submitted yet"
                : `No ${selectedFilter} feedback found`}
            </Text>
          </View>
        ) : (
          <View style={styles.feedbackItems}>
            {filteredFeedback.map((item) => (
              <View key={item.id} style={styles.feedbackCard}>
                {/* Header */}
                <View style={styles.feedbackHeader}>
                  <View style={styles.feedbackMeta}>
                    <View style={[styles.typeIndicator, { backgroundColor: getTypeColor(item.type) + '20' }]}>
                      <Text style={[styles.typeText, { color: getTypeColor(item.type) }]}>
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                      </Text>
                    </View>
                    <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
                      <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                        {item.priority?.charAt(0).toUpperCase() + item.priority?.slice(1) || 'Medium'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statusContainer}>
                    {getStatusIcon(item.status)}
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                      {item.status.replace('_', ' ').charAt(0).toUpperCase() + item.status.replace('_', ' ').slice(1)}
                    </Text>
                  </View>
                </View>

                {/* User Info */}
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {item.profiles?.full_name || 'Anonymous User'}
                  </Text>
                  <Text style={styles.userEmail}>
                    {item.contact_email || item.profiles?.email || 'No email provided'}
                  </Text>
                  <Text style={styles.submissionDate}>
                    Submitted {formatDate(item.created_at)}
                  </Text>
                </View>

                {/* Content */}
                <Text style={styles.feedbackSubject}>{item.subject}</Text>
                <Text style={styles.feedbackMessage}>{item.message}</Text>

                {/* Admin Response */}
                {item.admin_response && (
                  <View style={styles.responseSection}>
                    <Text style={styles.responseTitle}>Admin Response:</Text>
                    <Text style={styles.responseText}>{item.admin_response}</Text>
                    <Text style={styles.responseDate}>
                      Responded on {formatDate(item.responded_at)}
                    </Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.actionsSection}>
                  <View style={styles.statusActions}>
                    {item.status === 'pending' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.acknowledgeButton]}
                        onPress={() => handleUpdateStatus(item.id, 'acknowledged')}
                      >
                        <Text style={styles.actionButtonText}>Acknowledge</Text>
                      </TouchableOpacity>
                    )}
                    
                    {(item.status === 'pending' || item.status === 'acknowledged') && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.reviewButton]}
                        onPress={() => handleUpdateStatus(item.id, 'under_review')}
                      >
                        <Text style={styles.actionButtonText}>Under Review</Text>
                      </TouchableOpacity>
                    )}

                    {!item.admin_response && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.respondButton]}
                        onPress={() => setSelectedFeedback(item.id)}
                      >
                        <MessageSquare size={14} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Respond</Text>
                      </TouchableOpacity>
                    )}

                    {item.admin_response && item.status !== 'resolved' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.resolveButton]}
                        onPress={() => handleUpdateStatus(item.id, 'resolved')}
                      >
                        <CheckCircle size={14} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Mark Resolved</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Response Form */}
                {selectedFeedback === item.id && (
                  <View style={styles.responseForm}>
                    <Text style={styles.responseFormTitle}>Admin Response</Text>
                    <TextInput
                      style={styles.responseInput}
                      placeholder="Type your response here..."
                      value={responseText}
                      onChangeText={setResponseText}
                      multiline
                      numberOfLines={4}
                    />
                    <View style={styles.responseFormActions}>
                      <TouchableOpacity
                        style={styles.cancelResponseButton}
                        onPress={() => {
                          setSelectedFeedback(null);
                          setResponseText('');
                        }}
                      >
                        <Text style={styles.cancelResponseText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.sendResponseButton, responding && styles.sendResponseButtonDisabled]}
                        onPress={() => handleRespond(item.id)}
                        disabled={responding}
                      >
                        <Send size={14} color="#FFFFFF" />
                        <Text style={styles.sendResponseText}>
                          {responding ? 'Sending...' : 'Send Response'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 32,
    height: 32,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  filtersSection: {
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  feedbackList: {
    flex: 1,
    padding: 20,
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
    padding: 20,
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
    gap: 8,
  },
  typeIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
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
  userInfo: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  submissionDate: {
    fontSize: 11,
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
    marginBottom: 16,
  },
  responseSection: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  responseTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 6,
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
  actionsSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  statusActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  acknowledgeButton: {
    backgroundColor: '#3B82F6',
  },
  reviewButton: {
    backgroundColor: '#8B5CF6',
  },
  respondButton: {
    backgroundColor: '#10B981',
  },
  resolveButton: {
    backgroundColor: '#059669',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  responseForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  responseFormTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  responseInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 12,
  },
  responseFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelResponseButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelResponseText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  sendResponseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E40AF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  sendResponseButtonDisabled: {
    opacity: 0.6,
  },
  sendResponseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});