import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal, TextInput, Image } from 'react-native';
import { ArrowLeft, Activity, CircleCheck as CheckCircle, X, Eye, Calendar, User, FileText, Camera, MapPin, Clock, Award, TrendingUp } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { 
  getTendersByDepartment,
  getWorkProgressByTender,
  verifyWorkProgress,
  getCurrentUser,
  getUserProfile
} from '../../lib/supabase';

export default function DepartmentWorkProgress() {
  const router = useRouter();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('in_progress');
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedTender, setSelectedTender] = useState(null);
  const [workProgressList, setWorkProgressList] = useState([]);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [userDepartmentId, setUserDepartmentId] = useState(null);

  const filters = [
    { id: 'in_progress', label: 'Work in Progress', count: 0 },
    { id: 'pending_review', label: 'Pending Review', count: 0 },
    { id: 'completed', label: 'Completed', count: 0 },
    { id: 'all', label: 'All Projects', count: 0 },
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

      // Load tenders with work progress
      const { data: tendersData, error } = await getTendersByDepartment(profile?.assigned_department_id);
      if (error) throw error;

      // Filter tenders that have been awarded (have contractors working)
      const workTenders = (tendersData || []).filter(tender => 
        tender.status === 'awarded' || 
        tender.workflow_stage === 'work_in_progress' || 
        tender.workflow_stage === 'work_completed' ||
        tender.status === 'completed'
      );

      setTenders(workTenders);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load work progress data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleViewProgress = async (tender) => {
    try {
      setSelectedTender(tender);
      const { data, error } = await getWorkProgressByTender(tender.id);
      if (error) throw error;
      
      setWorkProgressList(data || []);
      setShowProgressModal(true);
    } catch (error) {
      console.error('Error loading work progress:', error);
      Alert.alert('Error', 'Failed to load work progress');
    }
  };

  const handleVerifyWork = async (progressId, approved) => {
    try {
      setVerifying(true);
      const { error } = await verifyWorkProgress(progressId, verificationNotes, approved);
      if (error) throw error;
      
      Alert.alert(
        'Success', 
        approved ? 'Work has been verified and approved' : 'Work verification rejected'
      );
      
      // Reload progress data
      const { data } = await getWorkProgressByTender(selectedTender.id);
      setWorkProgressList(data || []);
      setVerificationNotes('');
      
      await loadData(); // Refresh main data
    } catch (error) {
      console.error('Error verifying work:', error);
      Alert.alert('Error', 'Failed to verify work');
    } finally {
      setVerifying(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      awarded: '#F59E0B',
      work_in_progress: '#8B5CF6',
      work_completed: '#10B981',
      completed: '#6B7280',
      submitted: '#8B5CF6',
      approved: '#10B981',
      rejected: '#EF4444',
    };
    return colors[status] || '#6B7280';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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

  // Filter tenders
  const filteredTenders = tenders.filter(tender => {
    switch (selectedFilter) {
      case 'in_progress': return tender.workflow_stage === 'work_in_progress';
      case 'pending_review': return tender.workflow_stage === 'work_completed';
      case 'completed': return tender.status === 'completed';
      default: return true;
    }
  });

  // Update filter counts
  const updatedFilters = filters.map(filter => ({
    ...filter,
    count: filter.id === 'all' 
      ? tenders.length 
      : tenders.filter(tender => {
          switch (filter.id) {
            case 'in_progress': return tender.workflow_stage === 'work_in_progress';
            case 'pending_review': return tender.workflow_stage === 'work_completed';
            case 'completed': return tender.status === 'completed';
            default: return true;
          }
        }).length
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1E40AF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Work Progress Tracking</Text>
          <Text style={styles.subtitle}>Monitor contractor work progress</Text>
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

      {/* Projects List */}
      <ScrollView
        style={styles.projectsList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading work progress...</Text>
          </View>
        ) : filteredTenders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Activity size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No projects found</Text>
            <Text style={styles.emptyText}>
              No projects in {filters.find(f => f.id === selectedFilter)?.label.toLowerCase()} status
            </Text>
          </View>
        ) : (
          <View style={styles.projectsContainer}>
            {filteredTenders.map((tender) => (
              <View key={tender.id} style={styles.projectCard}>
                {/* Project Header */}
                <View style={styles.projectHeader}>
                  <View style={styles.projectMeta}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tender.workflow_stage || tender.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(tender.workflow_stage || tender.status) }]}>
                        {(tender.workflow_stage || tender.status).replace('_', ' ').charAt(0).toUpperCase() + (tender.workflow_stage || tender.status).replace('_', ' ').slice(1)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.projectDate}>{formatDate(tender.created_at)}</Text>
                </View>

                <Text style={styles.projectTitle}>{tender.title}</Text>
                
                {/* Contractor Info */}
                <View style={styles.contractorInfo}>
                  <User size={14} color="#8B5CF6" />
                  <Text style={styles.contractorText}>
                    Contractor: {tender.awarded_contractor?.full_name || 'Not assigned'}
                  </Text>
                </View>

                {/* Project Details */}
                <View style={styles.projectDetails}>
                  <View style={styles.projectDetailRow}>
                    <Award size={14} color="#10B981" />
                    <Text style={styles.projectDetailText}>
                      Contract Value: {formatCurrency(tender.awarded_amount || 0)}
                    </Text>
                  </View>
                  <View style={styles.projectDetailRow}>
                    <Calendar size={14} color="#F59E0B" />
                    <Text style={styles.projectDetailText}>
                      Deadline: {formatDate(tender.deadline_date)}
                    </Text>
                  </View>
                  {tender.work_started_at && (
                    <View style={styles.projectDetailRow}>
                      <Clock size={14} color="#8B5CF6" />
                      <Text style={styles.projectDetailText}>
                        Started: {formatDate(tender.work_started_at)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Progress Summary */}
                {tender.work_progress && tender.work_progress.length > 0 && (
                  <View style={styles.progressSummary}>
                    <Text style={styles.progressSummaryTitle}>Latest Update:</Text>
                    <Text style={styles.progressSummaryText}>
                      {tender.work_progress[0].progress_type} - {tender.work_progress[0].progress_percentage}%
                    </Text>
                    <Text style={styles.progressSummaryDate}>
                      {formatDate(tender.work_progress[0].created_at)}
                    </Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.projectActions}>
                  <TouchableOpacity
                    style={styles.viewProgressButton}
                    onPress={() => handleViewProgress(tender)}
                  >
                    <Eye size={16} color="#FFFFFF" />
                    <Text style={styles.viewProgressButtonText}>
                      View Progress ({tender.work_progress?.length || 0})
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Work Progress Modal */}
      <Modal visible={showProgressModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Work Progress Details</Text>
              <TouchableOpacity onPress={() => setShowProgressModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedTender && (
              <View style={styles.tenderInfo}>
                <Text style={styles.tenderInfoTitle}>{selectedTender.title}</Text>
                <Text style={styles.tenderInfoContractor}>
                  Contractor: {selectedTender.awarded_contractor?.full_name}
                </Text>
                <Text style={styles.tenderInfoAmount}>
                  Contract: {formatCurrency(selectedTender.awarded_amount || 0)}
                </Text>
              </View>
            )}

            <ScrollView style={styles.progressContainer}>
              {workProgressList.length === 0 ? (
                <View style={styles.emptyState}>
                  <Activity size={32} color="#9CA3AF" />
                  <Text style={styles.emptyText}>No progress updates submitted yet</Text>
                </View>
              ) : (
                <View style={styles.progressDetailsList}>
                  {workProgressList.map((progress) => (
                    <View key={progress.id} style={styles.progressDetailCard}>
                      {/* Progress Header */}
                      <View style={styles.progressDetailHeader}>
                        <View style={styles.progressDetailMeta}>
                          <Text style={styles.progressDetailType}>
                            {progress.progress_type.charAt(0).toUpperCase() + progress.progress_type.slice(1)}
                          </Text>
                          <View style={[styles.progressDetailStatusBadge, { backgroundColor: getStatusColor(progress.status) + '20' }]}>
                            <Text style={[styles.progressDetailStatusText, { color: getStatusColor(progress.status) }]}>
                              {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.progressDetailDate}>{formatDate(progress.created_at)}</Text>
                      </View>

                      <Text style={styles.progressDetailTitle}>{progress.title}</Text>
                      <Text style={styles.progressDetailDescription}>{progress.description}</Text>

                      {/* Progress Bar */}
                      {progress.progress_percentage !== null && (
                        <View style={styles.progressBar}>
                          <View style={styles.progressBarHeader}>
                            <Text style={styles.progressPercentage}>{progress.progress_percentage}% Complete</Text>
                            <Text style={styles.progressStatus}>
                              {progress.progress_type === 'completion' ? 'Final Submission' : 'Progress Update'}
                            </Text>
                          </View>
                          <View style={styles.progressBarContainer}>
                            <View 
                              style={[
                                styles.progressBarFill, 
                                { width: `${progress.progress_percentage}%` }
                              ]} 
                            />
                          </View>
                        </View>
                      )}

                      {/* Additional Details */}
                      {progress.materials_used && progress.materials_used.length > 0 && (
                        <View style={styles.materialsSection}>
                          <Text style={styles.materialsSectionTitle}>Materials Used:</Text>
                          {progress.materials_used.map((material, index) => (
                            <Text key={index} style={styles.materialItem}>• {material}</Text>
                          ))}
                        </View>
                      )}

                      {progress.challenges_faced && (
                        <View style={styles.challengesSection}>
                          <Text style={styles.challengesSectionTitle}>Challenges Faced:</Text>
                          <Text style={styles.challengesText}>{progress.challenges_faced}</Text>
                        </View>
                      )}

                      {/* Images */}
                      {progress.images && progress.images.length > 0 && (
                        <View style={styles.imagesSection}>
                          <Text style={styles.imagesSectionTitle}>Progress Photos:</Text>
                          <ScrollView horizontal style={styles.progressImages} showsHorizontalScrollIndicator={false}>
                            {progress.images.map((imageUrl, index) => (
                              <Image key={index} source={{ uri: imageUrl }} style={styles.progressImage} />
                            ))}
                          </ScrollView>
                        </View>
                      )}

                      {/* Verification Section */}
                      {progress.progress_type === 'completion' && progress.status === 'submitted' && (
                        <View style={styles.verificationSection}>
                          <Text style={styles.verificationTitle}>Department Verification Required</Text>
                          <Text style={styles.verificationSubtitle}>
                            Review the submitted work and provide verification
                          </Text>
                          <TextInput
                            style={styles.verificationInput}
                            placeholder="Add verification notes and feedback..."
                            value={verificationNotes}
                            onChangeText={setVerificationNotes}
                            multiline
                            numberOfLines={3}
                          />
                          <View style={styles.verificationActions}>
                            <TouchableOpacity
                              style={[styles.verificationButton, styles.rejectVerificationButton]}
                              onPress={() => handleVerifyWork(progress.id, false)}
                              disabled={verifying}
                            >
                              <X size={14} color="#FFFFFF" />
                              <Text style={styles.verificationButtonText}>
                                Request Changes
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.verificationButton, styles.approveVerificationButton]}
                              onPress={() => handleVerifyWork(progress.id, true)}
                              disabled={verifying}
                            >
                              <CheckCircle size={14} color="#FFFFFF" />
                              <Text style={styles.verificationButtonText}>
                                {verifying ? 'Verifying...' : 'Approve & Complete'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {/* Verification Status */}
                      {progress.verified_at && (
                        <View style={styles.verifiedInfo}>
                          <CheckCircle size={14} color="#10B981" />
                          <Text style={styles.verifiedText}>
                            Verified by {progress.verified_by_profile?.full_name} on {formatDate(progress.verified_at)}
                          </Text>
                          {progress.verification_notes && (
                            <Text style={styles.verificationNotesText}>
                              Notes: {progress.verification_notes}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  ))}
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
  projectsList: {
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
  projectsContainer: {
    padding: 16,
    gap: 16,
  },
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  projectMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  projectDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  contractorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  contractorText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  projectDetails: {
    gap: 6,
    marginBottom: 12,
  },
  projectDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  projectDetailText: {
    fontSize: 12,
    color: '#374151',
  },
  progressSummary: {
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  progressSummaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  progressSummaryText: {
    fontSize: 12,
    color: '#1E40AF',
    marginBottom: 2,
  },
  progressSummaryDate: {
    fontSize: 11,
    color: '#6B7280',
  },
  projectActions: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  viewProgressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E40AF',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  viewProgressButtonText: {
    color: '#FFFFFF',
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
    marginBottom: 4,
  },
  tenderInfoContractor: {
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 2,
  },
  tenderInfoAmount: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '600',
  },
  progressContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  progressDetailsList: {
    gap: 16,
  },
  progressDetailCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  progressDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  progressDetailMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDetailType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  progressDetailStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressDetailStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressDetailDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  progressDetailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  progressDetailDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  progressBar: {
    marginBottom: 12,
  },
  progressBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  progressStatus: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  materialsSection: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  materialsSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  materialItem: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  challengesSection: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  challengesSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 6,
  },
  challengesText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  imagesSection: {
    marginBottom: 12,
  },
  imagesSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  progressImages: {
    marginBottom: 8,
  },
  progressImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  verificationSection: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  verificationSubtitle: {
    fontSize: 12,
    color: '#1E40AF',
    marginBottom: 12,
  },
  verificationInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 12,
  },
  verificationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  verificationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  rejectVerificationButton: {
    backgroundColor: '#F59E0B',
  },
  approveVerificationButton: {
    backgroundColor: '#10B981',
  },
  verificationButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  verifiedInfo: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  verifiedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
    marginBottom: 4,
  },
  verificationNotesText: {
    fontSize: 11,
    color: '#166534',
    fontStyle: 'italic',
  },
});