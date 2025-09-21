import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal, TextInput } from 'react-native';
import { ArrowLeft, Users, Star, Phone, Mail, MapPin, Award, Activity, TrendingUp, CircleCheck as CheckCircle, X, MessageSquare, Eye } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase, getCurrentUser, getUserProfile } from '../../lib/supabase';

export default function DepartmentContractors() {
  const router = useRouter();
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [contractorProjects, setContractorProjects] = useState([]);
  const [userDepartmentId, setUserDepartmentId] = useState(null);

  const filters = [
    { id: 'all', label: 'All Contractors', count: 0 },
    { id: 'active', label: 'Active Projects', count: 0 },
    { id: 'available', label: 'Available', count: 0 },
    { id: 'top_rated', label: 'Top Rated', count: 0 },
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

      // Load contractors with their project history
      const { data: contractorsData, error } = await supabase
        .from('profiles')
        .select(`
          *,
          contractor_bids:bids (
            id,
            amount,
            status,
            tender:tender_id (
              id,
              title,
              status,
              department_id,
              awarded_amount,
              created_at,
              completed_at
            )
          ),
          contractor_progress:work_progress (
            id,
            progress_type,
            status,
            tender_id
          )
        `)
        .eq('user_type', 'tender')
        .eq('is_verified', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter contractors based on department interaction
      const departmentContractors = contractorsData.filter(contractor => 
        contractor.contractor_bids.some(bid => 
          bid.tender?.department_id === profile?.assigned_department_id
        )
      );

      setContractors(departmentContractors || []);
    } catch (error) {
      console.error('Error loading contractors:', error);
      Alert.alert('Error', 'Failed to load contractors data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleViewContractor = async (contractor) => {
    try {
      setSelectedContractor(contractor);
      
      // Get detailed project history for this contractor with this department
      const departmentProjects = contractor.contractor_bids
        .filter(bid => bid.tender?.department_id === userDepartmentId)
        .map(bid => bid.tender)
        .filter(tender => tender);

      setContractorProjects(departmentProjects);
      setShowContractorModal(true);
    } catch (error) {
      console.error('Error loading contractor details:', error);
      Alert.alert('Error', 'Failed to load contractor details');
    }
  };

  const calculateContractorStats = (contractor) => {
    const departmentBids = contractor.contractor_bids.filter(bid => 
      bid.tender?.department_id === userDepartmentId
    );
    
    const totalProjects = departmentBids.filter(bid => bid.status === 'accepted').length;
    const completedProjects = departmentBids.filter(bid => 
      bid.status === 'accepted' && bid.tender?.status === 'completed'
    ).length;
    const activeProjects = departmentBids.filter(bid => 
      bid.status === 'accepted' && bid.tender?.status === 'awarded'
    ).length;
    const totalEarnings = departmentBids
      .filter(bid => bid.status === 'accepted')
      .reduce((sum, bid) => sum + (bid.tender?.awarded_amount || 0), 0);

    return {
      totalProjects,
      completedProjects,
      activeProjects,
      totalEarnings,
      completionRate: totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0,
      rating: 4.2 + Math.random() * 0.8 // Placeholder rating
    };
  };

  const getStatusColor = (status) => {
    const colors = {
      available: '#1E40AF',
      awarded: '#F59E0B',
      in_progress: '#8B5CF6',
      completed: '#10B981',
      active: '#F59E0B',
    };
    return colors[status] || '#6B7280';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Filter contractors
  const filteredContractors = contractors.filter(contractor => {
    const stats = calculateContractorStats(contractor);
    switch (selectedFilter) {
      case 'active': return stats.activeProjects > 0;
      case 'available': return stats.activeProjects === 0;
      case 'top_rated': return stats.rating >= 4.5;
      default: return true;
    }
  });

  // Update filter counts
  const updatedFilters = filters.map(filter => ({
    ...filter,
    count: filter.id === 'all' 
      ? contractors.length 
      : contractors.filter(contractor => {
          const stats = calculateContractorStats(contractor);
          switch (filter.id) {
            case 'active': return stats.activeProjects > 0;
            case 'available': return stats.activeProjects === 0;
            case 'top_rated': return stats.rating >= 4.5;
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
          <Text style={styles.title}>Department Contractors</Text>
          <Text style={styles.subtitle}>{contractors.length} registered contractors</Text>
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

      {/* Contractors List */}
      <ScrollView
        style={styles.contractorsList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading contractors...</Text>
          </View>
        ) : filteredContractors.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No contractors found</Text>
            <Text style={styles.emptyText}>
              No contractors match the selected filter
            </Text>
          </View>
        ) : (
          <View style={styles.contractorsContainer}>
            {filteredContractors.map((contractor) => {
              const stats = calculateContractorStats(contractor);
              return (
                <TouchableOpacity 
                  key={contractor.id} 
                  style={styles.contractorCard}
                  onPress={() => handleViewContractor(contractor)}
                >
                  {/* Contractor Header */}
                  <View style={styles.contractorHeader}>
                    <View style={styles.contractorInfo}>
                      <Text style={styles.contractorName}>
                        {contractor.full_name || contractor.first_name || 'Unnamed Contractor'}
                      </Text>
                      <View style={styles.ratingContainer}>
                        <Star size={14} color="#F59E0B" />
                        <Text style={styles.ratingText}>{stats.rating.toFixed(1)}</Text>
                        <Text style={styles.ratingCount}>({stats.totalProjects} projects)</Text>
                      </View>
                    </View>
                    <View style={styles.contractorStatus}>
                      <View style={[
                        styles.statusBadge, 
                        { backgroundColor: stats.activeProjects > 0 ? '#F59E0B' : '#10B981' }
                      ]}>
                        <Text style={styles.statusText}>
                          {stats.activeProjects > 0 ? 'Active' : 'Available'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Contact Info */}
                  <View style={styles.contactInfo}>
                    {contractor.email && (
                      <View style={styles.contactRow}>
                        <Mail size={12} color="#6B7280" />
                        <Text style={styles.contactText}>{contractor.email}</Text>
                      </View>
                    )}
                    {contractor.phone && (
                      <View style={styles.contactRow}>
                        <Phone size={12} color="#6B7280" />
                        <Text style={styles.contactText}>{contractor.phone}</Text>
                      </View>
                    )}
                  </View>

                  {/* Stats */}
                  <View style={styles.contractorStats}>
                    <View style={styles.statItem}>
                      <Activity size={14} color="#8B5CF6" />
                      <Text style={styles.statValue}>{stats.activeProjects}</Text>
                      <Text style={styles.statLabel}>Active</Text>
                    </View>
                    <View style={styles.statItem}>
                      <CheckCircle size={14} color="#10B981" />
                      <Text style={styles.statValue}>{stats.completedProjects}</Text>
                      <Text style={styles.statLabel}>Completed</Text>
                    </View>
                    <View style={styles.statItem}>
                      <TrendingUp size={14} color="#F59E0B" />
                      <Text style={styles.statValue}>{stats.completionRate}%</Text>
                      <Text style={styles.statLabel}>Success Rate</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Award size={14} color="#1E40AF" />
                      <Text style={styles.statValue}>{formatCurrency(stats.totalEarnings)}</Text>
                      <Text style={styles.statLabel}>Total Earned</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Contractor Details Modal */}
      <Modal visible={showContractorModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contractor Details</Text>
              <TouchableOpacity onPress={() => setShowContractorModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedContractor && (
              <>
                {/* Contractor Info */}
                <View style={styles.contractorDetails}>
                  <Text style={styles.contractorDetailName}>
                    {selectedContractor.full_name || selectedContractor.first_name}
                  </Text>
                  <Text style={styles.contractorDetailEmail}>{selectedContractor.email}</Text>
                  {selectedContractor.phone && (
                    <Text style={styles.contractorDetailPhone}>{selectedContractor.phone}</Text>
                  )}
                  
                  {(() => {
                    const stats = calculateContractorStats(selectedContractor);
                    return (
                      <View style={styles.contractorDetailStats}>
                        <View style={styles.detailStatItem}>
                          <Text style={styles.detailStatValue}>{stats.totalProjects}</Text>
                          <Text style={styles.detailStatLabel}>Total Projects</Text>
                        </View>
                        <View style={styles.detailStatItem}>
                          <Text style={styles.detailStatValue}>{stats.completionRate}%</Text>
                          <Text style={styles.detailStatLabel}>Success Rate</Text>
                        </View>
                        <View style={styles.detailStatItem}>
                          <Text style={styles.detailStatValue}>{stats.rating.toFixed(1)}</Text>
                          <Text style={styles.detailStatLabel}>Rating</Text>
                        </View>
                      </View>
                    );
                  })()}
                </View>

                {/* Project History */}
                <View style={styles.projectHistory}>
                  <Text style={styles.projectHistoryTitle}>Project History with Department</Text>
                  <ScrollView style={styles.projectsList}>
                    {contractorProjects.length === 0 ? (
                      <Text style={styles.noProjectsText}>No projects with this department yet</Text>
                    ) : (
                      contractorProjects.map((project) => (
                        <View key={project.id} style={styles.projectCard}>
                          <View style={styles.projectHeader}>
                            <Text style={styles.projectTitle}>{project.title}</Text>
                            <View style={[styles.projectStatusBadge, { backgroundColor: getStatusColor(project.status) + '20' }]}>
                              <Text style={[styles.projectStatusText, { color: getStatusColor(project.status) }]}>
                                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.projectAmount}>
                            Amount: {formatCurrency(project.awarded_amount || 0)}
                          </Text>
                          <Text style={styles.projectDate}>
                            Started: {formatDate(project.created_at)}
                          </Text>
                        </View>
                      ))
                    )}
                  </ScrollView>
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
  contractorsList: {
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
  contractorsContainer: {
    padding: 16,
    gap: 16,
  },
  contractorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contractorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  contractorInfo: {
    flex: 1,
  },
  contractorName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  ratingCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  contractorStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  contactInfo: {
    gap: 6,
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 12,
    color: '#6B7280',
  },
  contractorStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
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
  contractorDetails: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  contractorDetailName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  contractorDetailEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  contractorDetailPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  contractorDetailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
  },
  detailStatItem: {
    alignItems: 'center',
  },
  detailStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  detailStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  projectHistory: {
    flex: 1,
    padding: 20,
  },
  projectHistoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  projectsList: {
    maxHeight: 300,
  },
  noProjectsText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  projectCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  projectTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  projectStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  projectStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  projectAmount: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginBottom: 4,
  },
  projectDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
});