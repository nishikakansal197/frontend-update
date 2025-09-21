import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal, TextInput } from 'react-native';
import {
  ArrowLeft, Filter, Search, MapPin, Clock, CircleCheck as CheckCircle,
  TriangleAlert as AlertTriangle, FileText, Hammer, Send, X, User, Eye, Award
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import supabase, {
  getIssuesByWorkflowStage,
  createTender,
  assignTenderToContractor,
  getCurrentUser,
  getUserProfile,
  getBidsByTender,
  acceptBid,
  rejectBid,
  updateIssue
} from '../../lib/supabase';

export default function DepartmentAdminIssues() {
  const router = useRouter();
  const [issues, setIssues] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('department_assigned');
  const [showTenderModal, setShowTenderModal] = useState(false);
  const [showBidsModal, setShowBidsModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [selectedTender, setSelectedTender] = useState(null);
  const [tenderBids, setTenderBids] = useState([]);
  const [tenderData, setTenderData] = useState({
    title: '',
    description: '',
    estimatedBudgetMin: '',
    estimatedBudgetMax: '',
    deadlineDate: '',
    requirements: ''
  });
  const [creating, setCreating] = useState(false);
  const [loadingBids, setLoadingBids] = useState(false);
  const [processingBid, setProcessingBid] = useState(false);
  const [userDepartmentId, setUserDepartmentId] = useState(null);

  const filters = [
    { id: 'department_assigned', label: 'Assigned to Department', color: '#8B5CF6' },
    { id: 'contractor_assigned', label: 'With Contractors', color: '#06B6D4' },
    { id: 'in_progress', label: 'In Progress', color: '#1E40AF' },
    { id: 'department_review', label: 'Pending Review', color: '#F59E0B' },
    { id: 'resolved', label: 'Completed', color: '#10B981' },
  ];

  useEffect(() => {
    loadData();
  }, [selectedFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get current user's department
      const { user } = await getCurrentUser();
      const { data: profile } = await getUserProfile(user.id);
      setUserDepartmentId(profile?.assigned_department_id);

      // Load issues by workflow stage for this department with tender data
      const { data: issuesData, error: issuesError } = await loadIssuesWithTenders(
        selectedFilter,
        profile?.assigned_department_id
      );
      if (issuesError) throw issuesError;

      console.log('Loaded issues with tenders:', issuesData?.length);
      setIssues(issuesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load issues data');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced function to load issues with tender relationships
  const loadIssuesWithTenders = async (workflowStage, departmentId) => {
    try {
      let query = supabase
        .from('issues')
        .select(`
          *,
          profiles:reporter_id(full_name),
          tender:tenders!source_issue_id(
            id,
            title,
            status,
            created_at,
            bids:tender_bids(
              id,
              status,
              amount,
              contractor:profiles!contractor_id(full_name)
            )
          ),
          assignments:issue_assignments(
            created_at,
            assigned_by_profile:profiles!assigned_by(full_name)
          )
        `);

      // Filter by workflow stage
      if (workflowStage) {
        query = query.eq('workflow_stage', workflowStage);
      }

      // Filter by department if provided
      if (departmentId) {
        query = query.eq('assigned_department_id', departmentId);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      return { data, error };
    } catch (error) {
      console.error('Error in loadIssuesWithTenders:', error);
      return { data: null, error };
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateTender = (issue) => {
    setSelectedIssue(issue);
    setTenderData({
      title: `Tender for: ${issue.title}`,
      description: `${issue.description}\n\nLocation: ${issue.location_name || issue.address}`,
      estimatedBudgetMin: '',
      estimatedBudgetMax: '',
      deadlineDate: '',
      requirements: ''
    });
    setShowTenderModal(true);
  };

  const submitTender = async () => {
    if (!tenderData.title || !tenderData.description || !tenderData.deadlineDate) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);

      const tender = {
        title: tenderData.title,
        description: tenderData.description,
        category: selectedIssue.category,
        location: selectedIssue.location_name || selectedIssue.address,
        area: selectedIssue.area,
        ward: selectedIssue.ward,
        estimated_budget_min: parseFloat(tenderData.estimatedBudgetMin) || 0,
        estimated_budget_max: parseFloat(tenderData.estimatedBudgetMax) || 0,
        deadline_date: tenderData.deadlineDate,
        submission_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: selectedIssue.priority,
        requirements: tenderData.requirements.split('\n').filter(r => r.trim()),
        status: 'available',
        source_issue_id: selectedIssue.id,
        department_id: userDepartmentId,
        metadata: {
          source_issue_id: selectedIssue.id,
          created_by_department: userDepartmentId
        }
      };

      const { data: newTender, error } = await createTender(tender);
      if (error) throw error;

      // Update issue workflow stage in database
      const { error: updateError } = await supabase
        .from('issues')
        .update({
          workflow_stage: 'contractor_assigned',
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedIssue.id);

      if (updateError) {
        console.error('Error updating issue workflow:', updateError);
        throw updateError;
      }

      // Immediately update the local state to reflect changes
      setIssues(prevIssues =>
        prevIssues.map(issue =>
          issue.id === selectedIssue.id
            ? {
              ...issue,
              workflow_stage: 'contractor_assigned',
              status: 'in_progress',
              tender: [{
                id: newTender?.id || 'new',
                title: tenderData.title,
                status: 'available',
                created_at: new Date().toISOString(),
                bids: []
              }]
            }
            : issue
        )
      );

      // Close modal and reset state
      setShowTenderModal(false);
      setSelectedIssue(null);

      // Show success message
      Alert.alert('Success', 'Tender has been created successfully and is now available for contractors to bid');

      // Force refresh after a short delay to ensure data consistency
      setTimeout(() => {
        loadData();
      }, 1000);

    } catch (error) {
      console.error('Error creating tender:', error);
      Alert.alert('Error', 'Failed to create tender: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleViewBids = async (issue) => {
    try {
      setLoadingBids(true);

      // Find the tender for this issue
      const tender = issue.tender?.[0] || { id: issue.id, title: issue.title };
      setSelectedTender(tender);

      const { data: bids, error } = await getBidsByTender(tender.id);
      if (error) throw error;

      setTenderBids(bids || []);
      setShowBidsModal(true);
    } catch (error) {
      console.error('Error loading bids:', error);
      Alert.alert('Error', 'Failed to load bids');
    } finally {
      setLoadingBids(false);
    }
  };

  const handleAcceptBid = async (bidId, tenderId) => {
    try {
      setProcessingBid(true);

      // Use the imported acceptBid function from supabase
      const { error } = await acceptBid(bidId);
      if (error) throw error;

      // Update the bids list in state - accept this bid and reject others
      setTenderBids(prevBids =>
        prevBids.map(bid =>
          bid.id === bidId
            ? { ...bid, status: 'accepted' }
            : { ...bid, status: bid.status === 'submitted' ? 'rejected' : bid.status }
        )
      );

      // Update tender status to 'awarded'
      const { error: tenderError } = await supabase
        .from('tenders')
        .update({ status: 'awarded' })
        .eq('id', tenderId);

      if (tenderError) {
        console.error('Error updating tender status:', tenderError);
      }

      // Update the issue workflow stage to 'in_progress'
      const { error: issueError } = await supabase
        .from('issues')
        .update({ 
          workflow_stage: 'in_progress',
          status: 'in_progress'
        })
        .eq('id', selectedTender?.source_issue_id || tenderId);

      if (issueError) {
        console.error('Error updating issue status:', issueError);
      }

      // Update local issues state to reflect changes
      setIssues(prevIssues =>
        prevIssues.map(issue => {
          if (issue.tender && issue.tender[0]?.id === tenderId) {
            return {
              ...issue,
              workflow_stage: 'in_progress',
              status: 'in_progress',
              tender: [{
                ...issue.tender[0],
                status: 'awarded'
              }]
            };
          }
          return issue;
        })
      );

      Alert.alert('Success', 'Bid accepted successfully!');

    } catch (error) {
      console.error('Error accepting bid:', error);
      Alert.alert('Error', 'Failed to accept bid: ' + error.message);
    } finally {
      setProcessingBid(false);
    }
  };

  const handleRejectBid = async (bidId) => {
    try {
      setProcessingBid(true);

      // Show confirmation dialog
      Alert.alert(
        'Reject Bid',
        'Are you sure you want to reject this bid?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setProcessingBid(false),
          },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: async () => {
              try {
                // Use the imported rejectBid function from supabase
                const { error } = await rejectBid(bidId);
                if (error) throw error;

                // Update the bids list in state
                setTenderBids(prevBids =>
                  prevBids.map(bid =>
                    bid.id === bidId
                      ? { ...bid, status: 'rejected' }
                      : bid
                  )
                );

                Alert.alert('Success', 'Bid rejected successfully!');
              } catch (error) {
                console.error('Error rejecting bid:', error);
                Alert.alert('Error', 'Failed to reject bid: ' + error.message);
              } finally {
                setProcessingBid(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error in reject bid flow:', error);
      setProcessingBid(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#F59E0B',
      acknowledged: '#3B82F6',
      in_progress: '#1E40AF',
      resolved: '#10B981',
      submitted: '#8B5CF6',
      accepted: '#10B981',
      rejected: '#EF4444',
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Enhanced function to check if issue has existing tender
  const hasExistingTender = (issue) => {
    return issue.workflow_stage === 'contractor_assigned' ||
      (issue.tender && issue.tender.length > 0);
  };

  const getTenderBidsCount = (issue) => {
    if (issue.tender && issue.tender.length > 0) {
      return issue.tender[0].bids?.length || 0;
    }
    return 0;
  };

  const renderBidCard = (bid) => (
    <View key={bid.id} style={[
      styles.bidCard,
      bid.status === 'rejected' && styles.rejectedBidCard
    ]}>
      {/* Bid Header */}
      <View style={styles.bidHeader}>
        <View style={styles.bidderInfo}>
          <Text style={styles.bidderName}>
            {bid.contractor?.full_name || 'Anonymous Contractor'}
          </Text>
          <Text style={styles.bidAmount}>{formatCurrency(bid.amount)}</Text>
        </View>
        <View style={[styles.bidStatusBadge, { backgroundColor: getStatusColor(bid.status) + '20' }]}>
          <Text style={[styles.bidStatusText, { color: getStatusColor(bid.status) }]}>
            {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Bid Details */}
      <Text style={styles.bidDetails}>{bid.details}</Text>

      {bid.timeline && (
        <View style={styles.bidMetaRow}>
          <Clock size={12} color="#6B7280" />
          <Text style={styles.bidMetaText}>Timeline: {bid.timeline}</Text>
        </View>
      )}

      <View style={styles.bidMetaRow}>
        <Text style={styles.bidMetaText}>Submitted: {formatDate(bid.submitted_at)}</Text>
      </View>

      {/* Bid Actions */}
      {bid.status === 'submitted' && (
        <View style={styles.bidActions}>
          <TouchableOpacity
            style={[styles.bidActionButton, styles.acceptButton]}
            onPress={() => handleAcceptBid(bid.id, selectedTender.id)}
            disabled={processingBid}
          >
            <CheckCircle size={14} color="#FFFFFF" />
            <Text style={styles.bidActionText}>Accept</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bidActionButton, styles.rejectButton]}
            onPress={() => handleRejectBid(bid.id)}
            disabled={processingBid}
          >
            <X size={14} color="#FFFFFF" />
            <Text style={styles.bidActionText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {bid.status === 'accepted' && (
        <View style={styles.acceptedInfo}>
          <Award size={14} color="#10B981" />
          <Text style={styles.acceptedText}>Bid Accepted</Text>
        </View>
      )}

      {bid.status === 'rejected' && (
        <View style={styles.rejectedInfo}>
          <X size={14} color="#EF4444" />
          <Text style={styles.rejectedText}>Bid Rejected</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1E40AF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Department Issues</Text>
          <Text style={styles.subtitle}>{issues.length} issues in current view</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Search size={20} color="#1E40AF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Filter size={20} color="#1E40AF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filtersList}>
            {filters.map((filter) => {
              const count = issues.filter(i => i.workflow_stage === filter.id).length;
              return (
                <TouchableOpacity
                  key={filter.id}
                  style={[
                    styles.filterChip,
                    selectedFilter === filter.id && styles.filterChipActive,
                    { borderColor: filter.color }
                  ]}
                  onPress={() => setSelectedFilter(filter.id)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === filter.id && { color: filter.color }
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
              No issues in {filters.find(f => f.id === selectedFilter)?.label.toLowerCase()} stage
            </Text>
          </View>
        ) : (
          <View style={styles.issuesContainer}>
            {issues.map((issue) => (
              <View key={issue.id} style={styles.issueCard}>
                {/* Issue Header */}
                <View style={styles.issueHeader}>
                  <View style={styles.issueMeta}>
                    <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(issue.category) + '20' }]}>
                      <Text style={[styles.categoryText, { color: getCategoryColor(issue.category) }]}>
                        {issue.category.charAt(0).toUpperCase() + issue.category.slice(1)}
                      </Text>
                    </View>
                    <View style={[styles.priorityBadge, { backgroundColor: getStatusColor(issue.priority) }]}>
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

                {/* Tender Status */}
                {hasExistingTender(issue) && (
                  <View style={styles.tenderStatus}>
                    <FileText size={14} color="#F59E0B" />
                    <Text style={styles.tenderStatusText}>
                      Tender: {issue.workflow_stage?.replace('_', ' ')} • {getTenderBidsCount(issue)} bids
                    </Text>
                  </View>
                )}

                {/* Assignment History */}
                {issue.assignments && issue.assignments.length > 0 && (
                  <View style={styles.assignmentHistory}>
                    <Text style={styles.assignmentHistoryTitle}>Assignment History:</Text>
                    {issue.assignments.slice(0, 2).map((assignment, index) => (
                      <Text key={index} style={styles.assignmentHistoryText}>
                        • Assigned by {assignment.assigned_by_profile?.full_name} on {formatDate(assignment.created_at)}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Actions */}
                <View style={styles.issueActions}>
                  {issue.workflow_stage === 'department_assigned' && !hasExistingTender(issue) && (
                    <TouchableOpacity
                      style={styles.tenderButton}
                      onPress={() => handleCreateTender(issue)}
                    >
                      <FileText size={16} color="#FFFFFF" />
                      <Text style={styles.tenderButtonText}>Create Tender</Text>
                    </TouchableOpacity>
                  )}

                  {hasExistingTender(issue) && (
                    <TouchableOpacity
                      style={styles.viewBidsButton}
                      onPress={() => handleViewBids(issue)}
                    >
                      <Eye size={16} color="#1E40AF" />
                      <Text style={styles.viewBidsButtonText}>
                        View Bids ({getTenderBidsCount(issue)})
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => router.push(`/department-admin/issue-${issue.id}`)}
                  >
                    <Text style={styles.viewButtonText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create Tender Modal */}
      <Modal visible={showTenderModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Tender</Text>
              <TouchableOpacity onPress={() => setShowTenderModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tender Title *</Text>
                <TextInput
                  style={styles.textInput}
                  value={tenderData.title}
                  onChangeText={(text) => setTenderData({ ...tenderData, title: text })}
                  placeholder="Enter tender title"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={tenderData.description}
                  onChangeText={(text) => setTenderData({ ...tenderData, description: text })}
                  placeholder="Detailed tender description"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroupHalf}>
                  <Text style={styles.inputLabel}>Min Budget ($)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={tenderData.estimatedBudgetMin}
                    onChangeText={(text) => setTenderData({ ...tenderData, estimatedBudgetMin: text })}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputGroupHalf}>
                  <Text style={styles.inputLabel}>Max Budget ($)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={tenderData.estimatedBudgetMax}
                    onChangeText={(text) => setTenderData({ ...tenderData, estimatedBudgetMax: text })}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Deadline Date *</Text>
                <TextInput
                  style={styles.textInput}
                  value={tenderData.deadlineDate}
                  onChangeText={(text) => setTenderData({ ...tenderData, deadlineDate: text })}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Requirements</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={tenderData.requirements}
                  onChangeText={(text) => setTenderData({ ...tenderData, requirements: text })}
                  placeholder="List requirements (one per line)"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowTenderModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitButton, creating && styles.modalSubmitButtonDisabled]}
                onPress={submitTender}
                disabled={creating}
              >
                <Send size={16} color="#FFFFFF" />
                <Text style={styles.modalSubmitText}>
                  {creating ? 'Creating...' : 'Create Tender'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bids Modal */}
      <Modal visible={showBidsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tender Bids</Text>
              <TouchableOpacity onPress={() => setShowBidsModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedTender && (
              <View style={styles.tenderInfo}>
                <Text style={styles.tenderInfoTitle}>{selectedTender.title}</Text>
              </View>
            )}

            <ScrollView style={styles.bidsContainer}>
              {loadingBids ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading bids...</Text>
                </View>
              ) : tenderBids.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No bids received yet</Text>
                </View>
              ) : (
                <View style={styles.bidsList}>
                  {tenderBids.map((bid) => renderBidCard(bid))}
                </View>
              )}
            </ScrollView>
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
  tenderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginBottom: 12,
  },
  tenderStatusText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  assignmentHistory: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  assignmentHistoryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  assignmentHistoryText: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  issueActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  tenderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tenderButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  viewBidsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E40AF',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  viewBidsButtonText: {
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
    width: '100%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalForm: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroupHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  tenderInfo: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  tenderInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  },
  bidsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bidsList: {
    gap: 12,
  },
  bidCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bidderInfo: {
    flex: 1,
  },
  bidderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  bidAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  bidStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bidStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bidDetails: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  bidMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  bidMetaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  bidActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  bidActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  bidActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  acceptedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginTop: 12,
  },
  acceptedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  rejectedBidCard: {
    opacity: 0.6,
    backgroundColor: '#FEF2F2',
  },
  rejectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
  },
  rejectedText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
    backgroundColor: '#F59E0B',
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