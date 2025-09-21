import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal, TextInput } from 'react-native';
import {
  ArrowLeft, Filter, Search, MapPin, Clock, CircleCheck as CheckCircle,
  TriangleAlert as AlertTriangle, Building, Send, X, User
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import supabase, {
  getIssuesByWorkflowStage,
  getDepartments,
  assignIssueToDepart,
  getCurrentUser,
  getUserProfile
} from '../../lib/supabase';

export default function AreaSuperAdminIssues() {
  const router = useRouter();
  const [issues, setIssues] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('area_review');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [userAreaId, setUserAreaId] = useState(null);

  const filters = [
    { id: 'reported', label: 'New Reports', color: '#F59E0B' },
    { id: 'area_review', label: 'Under Review', color: '#8B5CF6' },
    { id: 'department_assigned', label: 'Assigned to Departments', color: '#8B5CF6' },
    { id: 'contractor_assigned', label: 'With Contractors', color: '#06B6D4' },
    { id: 'department_review', label: 'Department Review', color: '#1E40AF' },
    { id: 'resolved', label: 'Resolved', color: '#10B981' },
    { id: 'all', label: 'All Issues', color: '#6B7280' },
  ];

  useEffect(() => {
    loadData();
  }, [selectedFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get current user's area
      const { user } = await getCurrentUser();
      const { data: profile } = await getUserProfile(user.id);
      setUserAreaId(profile?.assigned_area_id);

      // Load issues for area super admin
      let query = supabase
        .from('issues')
        .select(`
          *,
          profiles:user_id (
            full_name,
            first_name,
            user_type,
            email
          ),
          current_assignee:current_assignee_id (
            full_name,
            user_type
          ),
          assigned_area:assigned_area_id (
            name,
            code
          ),
          assigned_department:assigned_department_id (
            name,
            code,
            category
          ),
          assignments:issue_assignments (
            id,
            assignment_type,
            assignment_notes,
            status,
            created_at,
            assigned_by_profile:assigned_by (
              full_name,
              user_type
            )
          )
        `)
        .or(`area.eq.${profile?.assigned_area?.name},assigned_area_id.eq.${profile?.assigned_area_id}`)
        .order('created_at', { ascending: false });

      if (selectedFilter !== 'all') {
        query = query.eq('workflow_stage', selectedFilter);
      }

      const { data: issuesData, error: issuesError } = await query;
      if (issuesError) throw issuesError;

      // Load departments for assignment
      const { data: departmentsData, error: deptError } = await getDepartments();
      if (deptError) throw deptError;

      setIssues(issuesData || []);
      setDepartments(departmentsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load issues data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAssignToDepartment = (issue) => {
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
              loadData();
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1E40AF" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.title}>Issue Management</Text>
          <Text style={styles.subtitle}>{issues.length} issues in current view</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Search size={20} color="#1E40AF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Filter size={20} color="#1E40AF" />
          </TouchableOpacity>

          {/* 👉 If you need a button only for certain stages, uncomment this block
        {(issue?.workflow_stage === 'reported' || issue?.workflow_stage === 'area_review') && (
          <TouchableOpacity style={styles.headerButton} onPress={() => handleReview(issue)}>
            <Text style={{ color: '#1E40AF', fontWeight: '600' }}>Review</Text>
          </TouchableOpacity>
        )}
        */}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filtersList}>
            {filters.map((filter) => {
              const count = issues.filter((i) => i.workflow_stage === filter.id).length;
              return (
                <TouchableOpacity
                  key={filter.id}
                  style={[
                    styles.filterChip,
                    selectedFilter === filter.id && styles.filterChipActive,
                    { borderColor: filter.color },
                  ]}
                  onPress={() => setSelectedFilter(filter.id)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === filter.id && { color: filter.color },
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading issues...</Text>
          </View>
        ) : issues.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AlertTriangle size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No issues found</Text>
            <Text style={styles.emptyText}>
              No issues in {filters.find((f) => f.id === selectedFilter)?.label.toLowerCase()} stage
            </Text>
          </View>
        ) : (
          <View style={styles.issuesContainer}>
            {issues.map((issue) => (
              <View key={issue.id} style={styles.issueCard}>
                {/* Issue Header */}
                <View style={styles.issueHeader}>
                  <View style={styles.issueMeta}>
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: getCategoryColor(issue.category) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          { color: getCategoryColor(issue.category) },
                        ]}
                      >
                        {issue.category.charAt(0).toUpperCase() + issue.category.slice(1)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.priorityBadge,
                        { backgroundColor: getStatusColor(issue.priority) },
                      ]}
                    >
                      <Text style={styles.priorityText}>{issue.priority.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={styles.statusContainer}>
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(issue.status) },
                      ]}
                    >
                      {issue.status.replace('_', ' ').charAt(0).toUpperCase() +
                        issue.status.replace('_', ' ').slice(1)}
                    </Text>
                  </View>
                </View>

                {/* Issue Content */}
                <Text style={styles.issueTitle}>{issue.title}</Text>
                <Text style={styles.issueDescription} numberOfLines={3}>
                  {issue.description}
                </Text>

                {/* Reporter Info */}
                <View style={styles.reporterInfo}>
                  <User size={14} color="#6B7280" />
                  <Text style={styles.reporterText}>
                    Reported by {issue.profiles?.full_name || 'Anonymous'}
                  </Text>
                  <Text style={styles.reportDate}>{formatDate(issue.created_at)}</Text>
                </View>

                {/* Location */}
                {issue.location_name && (
                  <View style={styles.locationContainer}>
                    <MapPin size={14} color="#6B7280" />
                    <Text style={styles.locationText}>{issue.location_name}</Text>
                  </View>
                )}

                {/* Current Assignment */}
                {issue.current_assignee && (
                  <View style={styles.assignmentInfo}>
                    <Text style={styles.assignmentLabel}>Currently assigned to:</Text>
                    <Text style={styles.assignmentText}>
                      {issue.current_assignee.full_name} ({issue.current_assignee.user_type})
                    </Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.issueActions}>
                  {issue.workflow_stage === 'area_review' && (
                    <TouchableOpacity
                      style={styles.assignButton}
                      onPress={() => handleAssignToDepartment(issue)}
                    >
                      <Building size={16} color="#FFFFFF" />
                      <Text style={styles.assignButtonText}>Assign to Department</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => router.push(`/area-super-admin/issue-${issue.id}`)}
                  >
                    <Text style={styles.viewButtonText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

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
                    {departments.map((dept) => (
                      <TouchableOpacity
                        key={dept.id}
                        style={[
                          styles.departmentOption,
                          selectedDepartment === dept.id && styles.departmentOptionActive,
                        ]}
                        onPress={() => setSelectedDepartment(dept.id)}
                      >
                        <Text
                          style={[
                            styles.departmentOptionText,
                            selectedDepartment === dept.id && styles.departmentOptionTextActive,
                          ]}
                        >
                          {dept.name}
                        </Text>
                        <Text style={styles.departmentCategory}>{dept.category}</Text>
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
                    style={[
                      styles.modalSubmitButton,
                      assigning && styles.modalSubmitButtonDisabled,
                    ]}
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    backgroundColor: '#F0F9FF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
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
    backgroundColor: '#F0F9FF',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
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
  reporterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  reporterText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  reportDate: {
    fontSize: 12,
    color: '#9CA3AF',
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
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  assignButton: {
    flex: 1,
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
  viewButton: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  viewButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
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