import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl, Alert, Modal, TextInput } from 'react-native';
import { 
  TriangleAlert as AlertTriangle, Users, TrendingUp, Clock, CircleCheck as CheckCircle, 
  MapPin, Building, FileText, Activity, ChartBar as BarChart3, UserCheck, Send, X
} from 'lucide-react-native';
import { 
  getAreaSuperAdminDashboard, 
  getIssuesByWorkflowStage, 
  getDepartments,
  assignIssueToDepartment,
  updateIssue,
  subscribeToIssueUpdates,
  subscribeToAssignmentUpdates,
  getCurrentUser,
  getUserProfile
} from '../../lib/supabase';

const { width } = Dimensions.get('window');

export default function AreaSuperAdminDashboard() {
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
      
      const { data, error } = await getAreaSuperAdminDashboard();
      if (error) throw error;

      setDashboardData(data);

      // Calculate stats
      const issues = data.issues || [];
      const totalIssues = issues.length;
      const pendingReview = issues.filter(i => i.workflow_stage === 'reported' || i.workflow_stage === 'area_review').length;
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
      
      const { error } = await assignIssueToDepartment(
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
        <Text style={styles.loadingText}>Loading area dashboard...</Text>
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
        <Text style={styles.title}>Area Dashboard</Text>
        <Text style={styles.subtitle}>Comprehensive area overview and issue management</Text>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsSection}>
        <Text style={styles.sectionTitle}>Area Overview</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <AlertTriangle size={24} color="#EF4444" />
            <Text style={styles.metricNumber}>{stats.totalIssues}</Text>
            <Text style={styles.metricLabel}>Total Issues</Text>
          </View>

          <View style={styles.metricCard}>
            <Clock size={24} color="#F59E0B" />
            <Text style={styles.metricNumber}>{stats.pendingReview}</Text>
            <Text style={styles.metricLabel}>Pending Review</Text>
          </View>

          <View style={styles.metricCard}>
            <Building size={24} color="#8B5CF6" />
            <Text style={styles.metricNumber}>{stats.assignedToDepartments}</Text>
            <Text style={styles.metricLabel}>Assigned</Text>
          </View>

          <View style={styles.metricCard}>
            <CheckCircle size={24} color="#10B981" />
            <Text style={styles.metricNumber}>{stats.resolved}</Text>
            <Text style={styles.metricLabel}>Resolved</Text>
          </View>
        </View>
      </View>

      {/* Recent Issues Requiring Action */}
      <View style={styles.issuesSection}>
        <Text style={styles.sectionTitle}>Issues Requiring Action</Text>
        <View style={styles.issuesList}>
          {dashboardData.issues
            .filter(issue => issue.workflow_stage === 'reported' || issue.workflow_stage === 'area_review')
            .slice(0, 5)
            .map((issue) => (
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

              {/* Actions */}
              <View style={styles.issueActions}>
                <TouchableOpacity
                  style={styles.assignButton}
                  onPress={() => handleAssignIssue(issue)}
                >
                  <UserCheck size={16} color="#FFFFFF" />
                  <Text style={styles.assignButtonText}>Assign to Department</Text>
                </TouchableOpacity>

                <View style={styles.statusActions}>
                  {issue.status !== 'acknowledged' && (
                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: '#3B82F6' }]}
                      onPress={() => handleStatusUpdate(issue.id, 'acknowledged')}
                    >
                      <Text style={styles.statusButtonText}>Acknowledge</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Departments Overview */}
      <View style={styles.departmentsSection}>
        <Text style={styles.sectionTitle}>Departments in Area</Text>
        <View style={styles.departmentsList}>
          {dashboardData.departments.map((dept) => (
            <View key={dept.id} style={styles.departmentCard}>
              <View style={styles.departmentHeader}>
                <Text style={styles.departmentName}>{dept.name}</Text>
                <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(dept.category) + '20' }]}>
                  <Text style={[styles.categoryText, { color: getCategoryColor(dept.category) }]}>
                    {dept.category}
                  </Text>
                </View>
              </View>
              <Text style={styles.departmentDescription}>{dept.description}</Text>
              <Text style={styles.departmentStats}>
                {dashboardData.issues.filter(i => i.assigned_department_id === dept.id).length} assigned issues
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Assignment Modal */}
      <Modal visible={showAssignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign to Department</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedIssue && (
              <>
                <Text style={styles.modalSubtitle}>{selectedIssue.title}</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Select Department *</Text>
                  <View style={styles.departmentsList}>
                    {dashboardData.departments.map((dept) => (
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
              </>
            )}
          </View>
        </View>
      </Modal>
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
  departmentsSection: {
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
  departmentsList: {
    gap: 12,
  },
  departmentCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  departmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  departmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  departmentDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  departmentStats: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
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