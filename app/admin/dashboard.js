import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl, Alert } from 'react-native';
import { 
  TriangleAlert as AlertTriangle, Users, TrendingUp, Clock, CircleCheck as CheckCircle, 
  MapPin, Building, FileText, Activity, ChartBar as BarChart3, UserCheck, Send
} from 'lucide-react-native';
import { 
  getAdminDashboardStats, 
  getIssues, 
  getAreas, 
  getDepartments,
  assignIssueToDepart,
  updateIssue,
  subscribeToIssueUpdates,
  subscribeToAssignmentUpdates
} from '../../lib/supabase';

const { width } = Dimensions.get('window');

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({});
  const [recentIssues, setRecentIssues] = useState([]);
  const [areas, setAreas] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time subscriptions
    const issueSubscription = subscribeToIssueUpdates(() => {
      loadDashboardData();
    });

    const assignmentSubscription = subscribeToAssignmentUpdates(() => {
      loadDashboardData();
    });

    return () => {
      issueSubscription.unsubscribe();
      assignmentSubscription.unsubscribe();
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [statsResult, issuesResult, areasResult, departmentsResult] = await Promise.all([
        getAdminDashboardStats(),
        getIssues(),
        getAreas(),
        getDepartments()
      ]);

      if (statsResult.data) setStats(statsResult.data);
      if (issuesResult.data) setRecentIssues(issuesResult.data.slice(0, 10));
      if (areasResult.data) setAreas(areasResult.data);
      if (departmentsResult.data) setDepartments(departmentsResult.data);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleAssignIssue = (issue) => {
    setSelectedIssue(issue);
    setSelectedDepartment('');
    setAssignmentNotes('');
    setShowAssignModal(true);
  };

  const submitAssignment = async () => {
    if (!selectedDepartment) {
      Alert.alert('Error', 'Please select a department');
      return;
    }

    try {
      setAssigning(true);
      
      const { error } = await assignIssueToDepart(
        selectedIssue.id,
        selectedDepartment,
        assignmentNotes
      );

      if (error) throw error;

      Alert.alert(
        'Success',
        'Issue has been assigned to the department successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowAssignModal(false);
              setSelectedIssue(null);
              loadDashboardData();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error assigning issue:', error);
      Alert.alert('Error', 'Failed to assign issue: ' + error.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusUpdate = async (issueId, newStatus) => {
    try {
      const { error } = await updateIssue(issueId, { 
        status: newStatus,
        resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null
      });

      if (error) throw error;

      Alert.alert('Success', 'Issue status updated successfully');
      await loadDashboardData();
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update issue status');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#F59E0B',
      acknowledged: '#3B82F6',
      in_progress: '#1E40AF',
      resolved: '#10B981',
    };
    return colors[status] || '#6B7280';
  };

  const getCategoryColor = (category) => {
    const colors = {
      roads: '#EF4444',
      utilities: '#F59E0B',
      environment: '#10B981',
      safety: '#8B5CF6',
      parks: '#06B6D4',
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
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Activity size={32} color="#1E40AF" />
        <Text style={styles.loadingText}>Loading admin dashboard...</Text>
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
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Comprehensive system overview and management</Text>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsSection}>
        <Text style={styles.sectionTitle}>System Overview</Text>
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
      </View>

      {/* Status Distribution */}
      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>Issue Status Distribution</Text>
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

      {/* Recent Issues Management */}
      <View style={styles.issuesSection}>
        <Text style={styles.sectionTitle}>Recent Issues - Assignment & Management</Text>
        <View style={styles.issuesList}>
          {recentIssues.map((issue) => (
            <View key={issue.id} style={styles.issueCard}>
              {/* Issue Header */}
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
                  <Text style={[styles.statusText, { color: getStatusColor(issue.status) }]}>
                    {issue.status.replace('_', ' ').charAt(0).toUpperCase() + issue.status.replace('_', ' ').slice(1)}
                  </Text>
                </View>
              </View>

              {/* Issue Content */}
              <Text style={styles.issueTitle}>{issue.title}</Text>
              <Text style={styles.issueDescription} numberOfLines={2}>
                {issue.description}
              </Text>

              {/* Location and Reporter */}
              <View style={styles.issueDetails}>
                {issue.location_name && (
                  <View style={styles.locationContainer}>
                    <MapPin size={14} color="#6B7280" />
                    <Text style={styles.locationText}>{issue.location_name}</Text>
                  </View>
                )}
                <Text style={styles.reporterText}>
                  Reported by {issue.profiles?.full_name || 'Anonymous'} • {formatDate(issue.created_at)}
                </Text>
              </View>

              {/* Current Assignment */}
              {issue.current_assignee && (
                <View style={styles.assignmentInfo}>
                  <Text style={styles.assignmentLabel}>Currently assigned to:</Text>
                  <Text style={styles.assignmentText}>
                    {issue.current_assignee.full_name} ({issue.current_assignee.user_type})
                  </Text>
                </View>
              )}

              {/* Admin Actions */}
              <View style={styles.issueActions}>
                {issue.workflow_stage === 'reported' && (
                  <TouchableOpacity
                    style={styles.assignButton}
                    onPress={() => handleAssignIssue(issue)}
                  >
                    <UserCheck size={16} color="#FFFFFF" />
                    <Text style={styles.assignButtonText}>Assign to Department</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.statusActions}>
                  {issue.status !== 'acknowledged' && (
                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: '#3B82F6' }]}
                      onPress={() => handleStatusUpdate(issue.id, 'acknowledged')}
                    >
                      <Text style={styles.statusButtonText}>Acknowledge</Text>
                    </TouchableOpacity>
                  )}
                  
                  {issue.status !== 'in_progress' && issue.status !== 'resolved' && (
                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: '#1E40AF' }]}
                      onPress={() => handleStatusUpdate(issue.id, 'in_progress')}
                    >
                      <Text style={styles.statusButtonText}>In Progress</Text>
                    </TouchableOpacity>
                  )}
                  
                  {issue.status !== 'resolved' && (
                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: '#10B981' }]}
                      onPress={() => handleStatusUpdate(issue.id, 'resolved')}
                    >
                      <Text style={styles.statusButtonText}>Mark Resolved</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Areas and Departments Overview */}
      <View style={styles.organizationSection}>
        <Text style={styles.sectionTitle}>Organization Structure</Text>
        
        <View style={styles.organizationGrid}>
          <View style={styles.organizationCard}>
            <MapPin size={20} color="#1E40AF" />
            <Text style={styles.organizationNumber}>{areas.length}</Text>
            <Text style={styles.organizationLabel}>Active Areas</Text>
          </View>
          
          <View style={styles.organizationCard}>
            <Building size={20} color="#8B5CF6" />
            <Text style={styles.organizationNumber}>{departments.length}</Text>
            <Text style={styles.organizationLabel}>Departments</Text>
          </View>
          
          <View style={styles.organizationCard}>
            <FileText size={20} color="#F59E0B" />
            <Text style={styles.organizationNumber}>{stats.active_tenders || 0}</Text>
            <Text style={styles.organizationLabel}>Active Tenders</Text>
          </View>
        </View>
      </View>

      {/* Assignment Modal */}
      {showAssignModal && selectedIssue && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign to Department</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>{selectedIssue.title}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Select Department *</Text>
              <View style={styles.departmentsList}>
                {departments.map((dept) => (
                  <TouchableOpacity
                    key={dept.id}
                    style={[
                      styles.departmentOption,
                      selectedDepartment === dept.id && styles.departmentOptionActive
                    ]}
                    onPress={() => setSelectedDepartment(dept.id)}
                  >
                    <Text style={[
                      styles.departmentOptionText,
                      selectedDepartment === dept.id && styles.departmentOptionTextActive
                    ]}>
                      {dept.name}
                    </Text>
                    <Text style={styles.departmentCategory}>
                      {dept.category.charAt(0).toUpperCase() + dept.category.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Assignment Notes</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Add any specific instructions or notes for the department..."
                value={assignmentNotes}
                onChangeText={setAssignmentNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAssignModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitButton, assigning && styles.modalSubmitButtonDisabled]}
                onPress={submitAssignment}
                disabled={assigning}
              >
                <Send size={16} color="#FFFFFF" />
                <Text style={styles.modalSubmitText}>
                  {assigning ? 'Assigning...' : 'Assign Issue'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
  metricsSection: {
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: (width - 80) / 2,
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  metricTrend: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  statusSection: {
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  issuesSection: {
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
  issuesList: {
    gap: 16,
  },
  issueCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    alignItems: 'flex-end',
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
  issueDetails: {
    gap: 6,
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
  },
  reporterText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  assignmentInfo: {
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  assignmentLabel: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
    marginBottom: 4,
  },
  assignmentText: {
    fontSize: 12,
    color: '#1E40AF',
  },
  issueActions: {
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E40AF',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  assignButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  organizationSection: {
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
  organizationGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  organizationCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  organizationNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  organizationLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalClose: {
    fontSize: 24,
    color: '#6B7280',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  departmentsList: {
    gap: 8,
  },
  departmentOption: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  departmentOptionActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  departmentOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  departmentOptionTextActive: {
    color: '#FFFFFF',
  },
  departmentCategory: {
    fontSize: 12,
    color: '#6B7280',
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  modalSubmitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1E40AF',
    gap: 6,
  },
  modalSubmitButtonDisabled: {
    opacity: 0.6,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});