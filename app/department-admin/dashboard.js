import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl, Alert, Modal, TextInput, Image } from 'react-native';
import { 
  TriangleAlert as AlertTriangle, FileText, Users, Clock, CircleCheck as CheckCircle, 
  TrendingUp, Send, X, Camera, Upload, MapPin, User, Building, Hammer,
  Activity, DollarSign, Calendar, Award, Eye
} from 'lucide-react-native';
import { 
  getDepartmentAdminDashboard, 
  getIssuesByWorkflowStage,
  createTender,
  assignTenderToContractor,
  getWorkProgressByTender,
  verifyWorkProgress,
  updateIssue,
  subscribeToIssueUpdates,
  subscribeToTenderUpdates,
  getCurrentUser,
  getUserProfile,
  getTendersByDepartment,
  getBidsByTender,
  acceptBid,
  rejectBid
} from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { uploadMultipleImages } from '../../lib/cloudinary';

const { width } = Dimensions.get('window');

export default function DepartmentAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    issues: [],
    tenders: [],
    contractors: [],
    departmentId: null
  });
  const [stats, setStats] = useState({
    assignedIssues: 0,
    activeTenders: 0,
    activeContractors: 0,
    completedProjects: 0,
    avgCompletionTime: '0 days',
    pendingBids: 0,
    tendersCreated: 0
  });
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedTender, setSelectedTender] = useState(null);
  const [tenderData, setTenderData] = useState({
    title: '',
    description: '',
    estimatedBudgetMin: '',
    estimatedBudgetMax: '',
    deadlineDate: '',
    requirements: ''
  });
  const [workProgressData, setWorkProgressData] = useState({
    title: '',
    description: '',
    images: [],
    status: 'completed'
  });
  const [showTenderModal, setShowTenderModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showBidsModal, setShowBidsModal] = useState(false);
  const [tenderBids, setTenderBids] = useState([]);
  const [creating, setCreating] = useState(false);
  const [submittingProgress, setSubmittingProgress] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [processingBid, setProcessingBid] = useState(false);
  const [showWorkProgressModal, setShowWorkProgressModal] = useState(false);
  const [selectedTenderProgress, setSelectedTenderProgress] = useState(null);
  const [workProgressList, setWorkProgressList] = useState([]);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time subscriptions
    const issueSubscription = subscribeToIssueUpdates(() => {
      loadDashboardData();
    });

    const tenderSubscription = subscribeToTenderUpdates(() => {
      loadDashboardData();
    });

    return () => {
      issueSubscription.unsubscribe();
      tenderSubscription.unsubscribe();
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await getDepartmentAdminDashboard();
      if (error) throw error;

      setDashboardData(data);

      // Calculate stats
      const issues = data.issues || [];
      const tenders = data.tenders || [];
      const contractors = data.contractors || [];

      const assignedIssues = issues.filter(i => i.workflow_stage === 'department_assigned').length;
      const activeTenders = tenders.filter(t => t.status === 'available').length;
      const activeContractors = contractors.length;
      const completedProjects = tenders.filter(t => t.status === 'completed').length;
      const tendersCreated = tenders.length;
      const pendingBids = tenders.reduce((sum, tender) => sum + (tender.bids?.filter(b => b.status === 'submitted').length || 0), 0);
      const workCompletionsToReview = tenders.filter(t => t.workflow_stage === 'work_completed').length;

      setStats({
        assignedIssues,
        activeTenders,
        activeContractors,
        completedProjects,
        avgCompletionTime: calculateAvgCompletionTime(tenders),
        tendersCreated,
        pendingBids,
        workCompletionsToReview
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAvgCompletionTime = (tenders) => {
    const completedTenders = tenders.filter(t => t.status === 'completed' && t.awarded_at);
    if (completedTenders.length === 0) return '0 days';

    const totalDays = completedTenders.reduce((sum, tender) => {
      const started = new Date(tender.awarded_at);
      const completed = new Date(tender.completion_date || tender.updated_at);
      return sum + Math.ceil((completed - started) / (1000 * 60 * 60 * 24));
    }, 0);

    return `${Math.round(totalDays / completedTenders.length)} days`;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
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
        department_id: dashboardData.departmentId,
        metadata: {
          source_issue_id: selectedIssue.id,
          created_by_department: dashboardData.departmentId
        }
      };

      const { error } = await createTender(tender);
      if (error) throw error;

      // Update issue workflow stage
      const { error: updateError } = await updateIssue(selectedIssue.id, {
        workflow_stage: 'contractor_assigned',
        status: 'in_progress'
      });

      if (updateError) console.error('Error updating issue workflow:', updateError);

      Alert.alert(
        'Success',
        'Tender has been created successfully and is now available for contractors to bid',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowTenderModal(false);
              setSelectedIssue(null);
              loadDashboardData();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error creating tender:', error);
      Alert.alert('Error', 'Failed to create tender: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleViewBids = async (tender) => {
    try {
      setLoadingBids(true);
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
    Alert.alert(
      'Accept Bid',
      'Are you sure you want to accept this bid? This will reject all other bids for this tender.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setProcessingBid(true);
              const { error } = await acceptBid(bidId, tenderId);
              if (error) throw error;
              
              Alert.alert('Success', 'Bid accepted successfully');
              setShowBidsModal(false);
              await loadDashboardData();
            } catch (error) {
              console.error('Error accepting bid:', error);
              Alert.alert('Error', 'Failed to accept bid');
            } finally {
              setProcessingBid(false);
            }
          }
        }
      ]
    );
  };

  const handleRejectBid = async (bidId) => {
    Alert.alert(
      'Reject Bid',
      'Are you sure you want to reject this bid?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingBid(true);
              const { error } = await rejectBid(bidId);
              if (error) throw error;
              
              Alert.alert('Success', 'Bid rejected');
              // Reload bids
              const { data: updatedBids } = await getBidsByTender(selectedTender.id);
              setTenderBids(updatedBids || []);
            } catch (error) {
              console.error('Error rejecting bid:', error);
              Alert.alert('Error', 'Failed to reject bid');
            } finally {
              setProcessingBid(false);
            }
          }
        }
      ]
    );
  };

  const handleViewWorkProgress = async (tender) => {
    try {
      setSelectedTenderProgress(tender);
      const { data, error } = await getWorkProgressByTender(tender.id);
      if (error) throw error;
      
      setWorkProgressList(data || []);
      setShowWorkProgressModal(true);
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
      setShowWorkProgressModal(false);
      setVerificationNotes('');
      await loadDashboardData();
    } catch (error) {
      console.error('Error verifying work:', error);
      Alert.alert('Error', 'Failed to verify work');
    } finally {
      setVerifying(false);
    }
  };

  const handleWorkCompleted = (assignment) => {
    setSelectedAssignment(assignment);
    setWorkProgressData({
      title: 'Work Completion Report',
      description: '',
      images: [],
      status: 'completed'
    });
    setSelectedImages([]);
    setShowProgressModal(true);
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImages([...selectedImages, ...result.assets]);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImages([...selectedImages, ...result.assets]);
    }
  };

  const removeImage = (index) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const submitWorkCompletion = async () => {
    if (!workProgressData.description) {
      Alert.alert('Error', 'Please provide completion details');
      return;
    }

    try {
      setSubmittingProgress(true);

      // Upload images if any
      let imageUrls = [];
      if (selectedImages.length > 0) {
        const imageUris = selectedImages.map(img => img.uri);
        const uploadResult = await uploadMultipleImages(imageUris);
        
        if (uploadResult.successful.length > 0) {
          imageUrls = uploadResult.successful.map(result => result.url);
        }
      }

      // Update issue status to resolved
      const { error: updateError } = await updateIssue(selectedAssignment.issue_id, {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        final_resolution_notes: workProgressData.description,
        workflow_stage: 'resolved'
      });

      if (updateError) throw updateError;

      Alert.alert(
        'Success',
        'Work completion has been submitted and issue marked as resolved',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowProgressModal(false);
              setSelectedAssignment(null);
              loadDashboardData();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting work completion:', error);
      Alert.alert('Error', 'Failed to submit work completion: ' + error.message);
    } finally {
      setSubmittingProgress(false);
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

  // Check if issue already has a tender created
  const hasExistingTender = (issueId) => {
    return dashboardData.tenders.some(tender => tender.source_issue_id === issueId);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Activity size={32} color="#1E40AF" />
        <Text style={styles.loadingText}>Loading department dashboard...</Text>
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
        <Text style={styles.title}>Department Dashboard</Text>
        <Text style={styles.subtitle}>Manage assigned issues and coordinate with contractors</Text>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsSection}>
        <Text style={styles.sectionTitle}>Department Overview</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <AlertTriangle size={24} color="#EF4444" />
            <Text style={styles.metricNumber}>{stats.assignedIssues}</Text>
            <Text style={styles.metricLabel}>Assigned Issues</Text>
          </View>

          <View style={styles.metricCard}>
            <FileText size={24} color="#F59E0B" />
            <Text style={styles.metricNumber}>{stats.tendersCreated}</Text>
            <Text style={styles.metricLabel}>Tenders Created</Text>
          </View>

          <View style={styles.metricCard}>
            <Clock size={24} color="#8B5CF6" />
            <Text style={styles.metricNumber}>{stats.pendingBids}</Text>
            <Text style={styles.metricLabel}>Pending Bids</Text>
          </View>

          <View style={styles.metricCard}>
            <CheckCircle size={24} color="#10B981" />
            <Text style={styles.metricNumber}>{stats.completedProjects}</Text>
            <Text style={styles.metricLabel}>Completed</Text>
          </View>
        </View>
      </View>

      {/* Assigned Issues - Create Tenders */}
      <View style={styles.issuesSection}>
        <Text style={styles.sectionTitle}>Assigned Issues - Pending Tender Creation</Text>
        <View style={styles.issuesList}>
          {dashboardData.issues
            .filter(issue => issue.workflow_stage === 'department_assigned' && !hasExistingTender(issue.id))
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
              <Text style={styles.issueDescription} numberOfLines={2}>
                {issue.description}
              </Text>

              {/* Reporter and Location */}
              <View style={styles.issueDetails}>
                <View style={styles.reporterInfo}>
                  <User size={14} color="#6B7280" />
                  <Text style={styles.reporterText}>
                    Reported by {issue.profiles?.full_name || 'Anonymous'}
                  </Text>
                  <Text style={styles.reportDate}>{formatDate(issue.created_at)}</Text>
                </View>
                
                {issue.location_name && (
                  <View style={styles.locationContainer}>
                    <MapPin size={14} color="#6B7280" />
                    <Text style={styles.locationText}>{issue.location_name}</Text>
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={styles.issueActions}>
                <TouchableOpacity
                  style={styles.tenderButton}
                  onPress={() => handleCreateTender(issue)}
                >
                  <FileText size={16} color="#FFFFFF" />
                  <Text style={styles.tenderButtonText}>Create Tender</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={() => handleWorkCompleted({ issue_id: issue.id })}
                >
                  <CheckCircle size={16} color="#FFFFFF" />
                  <Text style={styles.completeButtonText}>Mark Complete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          
          {dashboardData.issues.filter(issue => issue.workflow_stage === 'department_assigned' && !hasExistingTender(issue.id)).length === 0 && (
            <View style={styles.emptyState}>
              <AlertTriangle size={32} color="#9CA3AF" />
              <Text style={styles.emptyText}>No issues pending tender creation</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tenders Created Section */}
      <View style={styles.tendersSection}>
        <Text style={styles.sectionTitle}>Tenders Created ({stats.tendersCreated})</Text>
        <View style={styles.tendersList}>
          {dashboardData.tenders.map((tender) => (
            <View key={tender.id} style={styles.tenderCard}>
              {/* Tender Header */}
              <View style={styles.tenderHeader}>
                <View style={styles.tenderMeta}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tender.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(tender.status) }]}>
                      {tender.status.replace('_', ' ').charAt(0).toUpperCase() + tender.status.replace('_', ' ').slice(1)}
                    </Text>
                  </View>
                  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(tender.category) + '20' }]}>
                    <Text style={[styles.categoryText, { color: getCategoryColor(tender.category) }]}>
                      {tender.category}
                    </Text>
                  </View>
                </View>
                <Text style={styles.tenderDate}>{formatDate(tender.created_at)}</Text>
              </View>

              <Text style={styles.tenderTitle}>{tender.title}</Text>
              <Text style={styles.tenderDescription} numberOfLines={2}>
                {tender.description}
              </Text>
              
              <View style={styles.tenderDetails}>
                <View style={styles.tenderDetailRow}>
                  <DollarSign size={14} color="#10B981" />
                  <Text style={styles.tenderDetailText}>
                    Budget: {formatCurrency(tender.estimated_budget_min)} - {formatCurrency(tender.estimated_budget_max)}
                  </Text>
                </View>
                <View style={styles.tenderDetailRow}>
                  <Calendar size={14} color="#F59E0B" />
                  <Text style={styles.tenderDetailText}>
                    Deadline: {formatDate(tender.deadline_date)}
                  </Text>
                </View>
                <View style={styles.tenderDetailRow}>
                  <Users size={14} color="#8B5CF6" />
                  <Text style={styles.tenderDetailText}>
                    {tender.bids?.length || 0} bids received
                  </Text>
                </View>
              </View>

              {/* Tender Actions */}
              <View style={styles.tenderActions}>
                <TouchableOpacity
                  style={styles.viewBidsButton}
                  onPress={() => handleViewBids(tender)}
                >
                  <Eye size={16} color="#1E40AF" />
                  <Text style={styles.viewBidsButtonText}>
                    View Bids ({tender.bids?.length || 0})
                  </Text>
                </TouchableOpacity>

                {/* View Work Progress Button */}
                {(tender.workflow_stage === 'work_in_progress' || tender.workflow_stage === 'work_completed') && (
                  <TouchableOpacity
                    style={styles.workProgressButton}
                    onPress={() => handleViewWorkProgress(tender)}
                  >
                    <Activity size={16} color="#FFFFFF" />
                    <Text style={styles.workProgressButtonText}>
                      View Progress ({tender.work_progress?.length || 0})
                    </Text>
                  </TouchableOpacity>
                )}

                {tender.status === 'awarded' && (
                  <View style={styles.awardedInfo}>
                    <Award size={14} color="#10B981" />
                    <Text style={styles.awardedText}>
                      Awarded to {tender.awarded_contractor?.full_name || 'Contractor'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}

          {dashboardData.tenders.length === 0 && (
            <View style={styles.emptyState}>
              <FileText size={32} color="#9CA3AF" />
              <Text style={styles.emptyText}>No tenders created yet</Text>
            </View>
          )}
        </View>
      </View>

      {/* Performance Metrics */}
      <View style={styles.performanceSection}>
        <Text style={styles.sectionTitle}>Department Performance</Text>
        <View style={styles.performanceGrid}>
          <View style={styles.performanceCard}>
            <TrendingUp size={20} color="#10B981" />
            <Text style={styles.performanceValue}>{stats.avgCompletionTime}</Text>
            <Text style={styles.performanceLabel}>Avg Completion Time</Text>
          </View>
          <View style={styles.performanceCard}>
            <Hammer size={20} color="#8B5CF6" />
            <Text style={styles.performanceValue}>94%</Text>
            <Text style={styles.performanceLabel}>Success Rate</Text>
          </View>
        </View>
      </View>

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
                  onChangeText={(text) => setTenderData({...tenderData, title: text})}
                  placeholder="Enter tender title"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={tenderData.description}
                  onChangeText={(text) => setTenderData({...tenderData, description: text})}
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
                    onChangeText={(text) => setTenderData({...tenderData, estimatedBudgetMin: text})}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputGroupHalf}>
                  <Text style={styles.inputLabel}>Max Budget ($)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={tenderData.estimatedBudgetMax}
                    onChangeText={(text) => setTenderData({...tenderData, estimatedBudgetMax: text})}
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
                  onChangeText={(text) => setTenderData({...tenderData, deadlineDate: text})}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Requirements</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={tenderData.requirements}
                  onChangeText={(text) => setTenderData({...tenderData, requirements: text})}
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
                <Text style={styles.tenderInfoBudget}>
                  Budget: {formatCurrency(selectedTender.estimated_budget_min)} - {formatCurrency(selectedTender.estimated_budget_max)}
                </Text>
              </View>
            )}

            <ScrollView style={styles.bidsContainer}>
              {loadingBids ? (
                <View style={styles.loadingContainer}>
                  <Activity size={24} color="#1E40AF" />
                  <Text style={styles.loadingText}>Loading bids...</Text>
                </View>
              ) : tenderBids.length === 0 ? (
                <View style={styles.emptyState}>
                  <Users size={32} color="#9CA3AF" />
                  <Text style={styles.emptyText}>No bids received yet</Text>
                </View>
              ) : (
                <View style={styles.bidsList}>
                  {tenderBids.map((bid) => (
                    <View key={bid.id} style={styles.bidCard}>
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
                        <Calendar size={12} color="#6B7280" />
                        <Text style={styles.bidMetaText}>Submitted: {formatDate(bid.submitted_at)}</Text>
                      </View>

                      {/* Bid Actions */}
                      {bid.status === 'submitted' && selectedTender.status === 'available' && (
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
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Work Progress Modal */}
      <Modal visible={showWorkProgressModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Work Progress Review</Text>
              <TouchableOpacity onPress={() => setShowWorkProgressModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedTenderProgress && (
              <View style={styles.tenderInfo}>
                <Text style={styles.tenderInfoTitle}>{selectedTenderProgress.title}</Text>
                <Text style={styles.tenderInfoContractor}>
                  Contractor: {selectedTenderProgress.awarded_contractor?.full_name}
                </Text>
              </View>
            )}

            <ScrollView style={styles.progressContainer}>
              {workProgressList.length === 0 ? (
                <View style={styles.emptyState}>
                  <Activity size={32} color="#9CA3AF" />
                  <Text style={styles.emptyText}>No work progress submitted yet</Text>
                </View>
              ) : (
                <View style={styles.progressList}>
                  {workProgressList.map((progress) => (
                    <View key={progress.id} style={styles.progressCard}>
                      {/* Progress Header */}
                      <View style={styles.progressHeader}>
                        <View style={styles.progressMeta}>
                          <Text style={styles.progressType}>
                            {progress.progress_type.charAt(0).toUpperCase() + progress.progress_type.slice(1)}
                          </Text>
                          <View style={[styles.progressStatusBadge, { backgroundColor: getStatusColor(progress.status) + '20' }]}>
                            <Text style={[styles.progressStatusText, { color: getStatusColor(progress.status) }]}>
                              {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.progressDate}>{formatDate(progress.created_at)}</Text>
                      </View>

                      <Text style={styles.progressTitle}>{progress.title}</Text>
                      <Text style={styles.progressDescription}>{progress.description}</Text>

                      {progress.progress_percentage !== null && (
                        <View style={styles.progressBar}>
                          <Text style={styles.progressPercentage}>{progress.progress_percentage}% Complete</Text>
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

                      {/* Images */}
                      {progress.images && progress.images.length > 0 && (
                        <ScrollView horizontal style={styles.progressImages} showsHorizontalScrollIndicator={false}>
                          {progress.images.map((imageUrl, index) => (
                            <Image key={index} source={{ uri: imageUrl }} style={styles.progressImage} />
                          ))}
                        </ScrollView>
                      )}

                      {/* Verification Section */}
                      {progress.progress_type === 'completion' && progress.status === 'submitted' && (
                        <View style={styles.verificationSection}>
                          <Text style={styles.verificationTitle}>Department Verification</Text>
                          <TextInput
                            style={styles.verificationInput}
                            placeholder="Add verification notes..."
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
                              <Text style={styles.verificationButtonText}>Reject</Text>
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

      {/* Work Completion Modal */}
      <Modal visible={showProgressModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Work Completion</Text>
              <TouchableOpacity onPress={() => setShowProgressModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Completion Details *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={workProgressData.description}
                  onChangeText={(text) => setWorkProgressData({...workProgressData, description: text})}
                  placeholder="Describe the completed work, materials used, and final results..."
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Photo Upload */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Completion Photos</Text>
                <Text style={styles.mediaHint}>Upload photos showing the completed work</Text>
                <View style={styles.mediaContainer}>
                  <TouchableOpacity style={styles.mediaButton} onPress={takePhoto}>
                    <Camera size={20} color="#1E40AF" />
                    <Text style={styles.mediaButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.mediaButton} onPress={pickImages}>
                    <Upload size={20} color="#1E40AF" />
                    <Text style={styles.mediaButtonText}>Upload Photos</Text>
                  </TouchableOpacity>
                </View>

                {selectedImages.length > 0 && (
                  <ScrollView horizontal style={styles.imagePreview} showsHorizontalScrollIndicator={false}>
                    {selectedImages.map((image, index) => (
                      <View key={index} style={styles.imageContainer}>
                        <Image source={{ uri: image.uri }} style={styles.previewImage} />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => removeImage(index)}
                        >
                          <X size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowProgressModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitButton, submittingProgress && styles.modalSubmitButtonDisabled]}
                onPress={submitWorkCompletion}
                disabled={submittingProgress}
              >
                <CheckCircle size={16} color="#FFFFFF" />
                <Text style={styles.modalSubmitText}>
                  {submittingProgress ? 'Submitting...' : 'Mark Complete'}
                </Text>
              </TouchableOpacity>
            </View>
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
  reporterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
  },
  issueActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
  completeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tendersSection: {
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
  tendersList: {
    gap: 16,
  },
  tenderCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tenderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tenderMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tenderDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  tenderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  tenderDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  tenderDetails: {
    gap: 6,
    marginBottom: 12,
  },
  tenderDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tenderDetailText: {
    fontSize: 12,
    color: '#374151',
  },
  tenderActions: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  viewBidsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E40AF',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginBottom: 8,
  },
  viewBidsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  awardedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  awardedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  performanceSection: {
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
  performanceGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  performanceCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  performanceLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
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
  mediaHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  mediaContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  mediaButton: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    borderWidth: 2,
    borderColor: '#1E40AF',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
  },
  mediaButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1E40AF',
  },
  imagePreview: {
    marginTop: 12,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
  tenderInfoBudget: {
    fontSize: 14,
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
  workProgressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginBottom: 8,
  },
  workProgressButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tenderInfoContractor: {
    fontSize: 14,
    color: '#1E40AF',
  },
  progressContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  progressList: {
    gap: 16,
  },
  progressCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  progressMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  progressType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  progressStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  progressDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  progressBar: {
    marginBottom: 12,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
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
  progressImages: {
    marginBottom: 12,
  },
  progressImage: {
    width: 80,
    height: 80,
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
    marginBottom: 8,
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
    backgroundColor: '#EF4444',
  },
  approveVerificationButton: {
    backgroundColor: '#10B981',
  },
  verificationButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  verifiedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginTop: 12,
  },
  verifiedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
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