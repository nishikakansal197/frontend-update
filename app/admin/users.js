import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl, Modal } from 'react-native';
import { 
  Users, Search, Filter, Shield, MapPin, Building, Mail, Phone, 
  CircleCheck as CheckCircle, X as XIcon, CreditCard as Edit, Trash2, UserCheck, UserX
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [areas, setAreas] = useState([]);
  const [departments, setDepartments] = useState([]);

  const userTypeFilters = [
    { id: 'all', label: 'All Users', count: 0 },
    { id: 'user', label: 'Citizens', count: 0 },
    { id: 'area_super_admin', label: 'Area Admins', count: 0 },
    { id: 'department_admin', label: 'Dept Admins', count: 0 },
    { id: 'tender', label: 'Contractors', count: 0 },
    { id: 'admin', label: 'System Admins', count: 0 },
  ];

  useEffect(() => {
    loadUsers();
    loadLocationData();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          assigned_area:assigned_area_id (
            name,
            code
          ),
          assigned_department:assigned_department_id (
            name,
            code,
            category
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadLocationData = async () => {
    try {
      const [areasResult, departmentsResult] = await Promise.all([
        supabase.from('areas').select('*').eq('is_active', true),
        supabase.from('departments').select('*').eq('is_active', true)
      ]);
      
      if (areasResult.data) setAreas(areasResult.data);
      if (departmentsResult.data) setDepartments(departmentsResult.data);
    } catch (error) {
      console.error('Error loading location data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleVerifyUser = async (userId, isVerified) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_verified: !isVerified,
          verified_at: !isVerified ? new Date().toISOString() : null
        })
        .eq('id', userId);

      if (error) throw error;
      
      Alert.alert('Success', `User ${!isVerified ? 'verified' : 'unverified'} successfully`);
      await loadUsers();
    } catch (error) {
      console.error('Error updating verification:', error);
      Alert.alert('Error', 'Failed to update user verification');
    }
  };

  const handleDeleteUser = (user) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.full_name || user.email}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.admin.deleteUser(user.id);
              if (error) throw error;
              
              Alert.alert('Success', 'User deleted successfully');
              await loadUsers();
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: selectedUser.full_name,
          first_name: selectedUser.first_name,
          last_name: selectedUser.last_name,
          phone: selectedUser.phone,
          user_type: selectedUser.user_type,
          assigned_area_id: selectedUser.assigned_area_id,
          assigned_department_id: selectedUser.assigned_department_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (error) throw error;
      
      Alert.alert('Success', 'User updated successfully');
      setShowUserModal(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('Error', 'Failed to update user');
    }
  };

  const getUserTypeColor = (userType) => {
    const colors = {
      user: '#1E40AF',
      admin: '#EF4444',
      area_super_admin: '#10B981',
      department_admin: '#8B5CF6',
      tender: '#F59E0B',
    };
    return colors[userType] || '#6B7280';
  };

  const getUserTypeIcon = (userType) => {
    const icons = {
      user: '👤',
      admin: '⚙️',
      area_super_admin: '👨‍💼',
      department_admin: '🏛️',
      tender: '🏗️',
    };
    return icons[userType] || '👤';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || user.user_type === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  // Update filter counts
  const updatedFilters = userTypeFilters.map(filter => ({
    ...filter,
    count: filter.id === 'all' 
      ? users.length 
      : users.filter(user => user.user_type === filter.id).length
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>User Management</Text>
        <Text style={styles.subtitle}>Manage users, roles, and permissions</Text>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* User Type Filters */}
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

      {/* Users List */}
      <ScrollView
        style={styles.usersList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading users...</Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try adjusting your search criteria' : 'No users match the selected filter'}
            </Text>
          </View>
        ) : (
          <View style={styles.usersContainer}>
            {filteredUsers.map((user) => (
              <View key={user.id} style={styles.userCard}>
                {/* User Header */}
                <View style={styles.userHeader}>
                  <View style={styles.userInfo}>
                    <View style={styles.userNameRow}>
                      <Text style={styles.userName}>
                        {user.full_name || user.first_name || 'Unnamed User'}
                      </Text>
                      <View style={styles.userBadges}>
                        <View style={[styles.userTypeBadge, { backgroundColor: getUserTypeColor(user.user_type) + '20' }]}>
                          <Text style={styles.userTypeIcon}>{getUserTypeIcon(user.user_type)}</Text>
                          <Text style={[styles.userTypeText, { color: getUserTypeColor(user.user_type) }]}>
                            {user.user_type.replace('_', ' ').charAt(0).toUpperCase() + user.user_type.replace('_', ' ').slice(1)}
                          </Text>
                        </View>
                        {user.is_verified && (
                          <View style={styles.verifiedBadge}>
                            <CheckCircle size={12} color="#10B981" />
                            <Text style={styles.verifiedText}>Verified</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <Text style={styles.userJoined}>Joined {formatDate(user.created_at)}</Text>
                  </View>
                  
                  <View style={styles.userActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditUser(user)}
                    >
                      <Edit size={16} color="#1E40AF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.verifyButton]}
                      onPress={() => handleVerifyUser(user.id, user.is_verified)}
                    >
                      {user.is_verified ? (
                        <UserX size={16} color="#F59E0B" />
                      ) : (
                        <UserCheck size={16} color="#10B981" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteUser(user)}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* User Details */}
                <View style={styles.userDetails}>
                  {user.phone && (
                    <View style={styles.detailRow}>
                      <Phone size={14} color="#6B7280" />
                      <Text style={styles.detailText}>{user.phone}</Text>
                    </View>
                  )}
                  
                  {user.assigned_area && (
                    <View style={styles.detailRow}>
                      <MapPin size={14} color="#6B7280" />
                      <Text style={styles.detailText}>Area: {user.assigned_area.name}</Text>
                    </View>
                  )}
                  
                  {user.assigned_department && (
                    <View style={styles.detailRow}>
                      <Building size={14} color="#6B7280" />
                      <Text style={styles.detailText}>Department: {user.assigned_department.name}</Text>
                    </View>
                  )}

                  <View style={styles.userStats}>
                    <Text style={styles.statText}>Points: {user.points || 0}</Text>
                    {user.last_login_at && (
                      <Text style={styles.statText}>Last login: {formatDate(user.last_login_at)}</Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Edit User Modal */}
      <Modal visible={showUserModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <XIcon size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <ScrollView style={styles.modalForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={selectedUser.full_name || ''}
                    onChangeText={(text) => setSelectedUser({...selectedUser, full_name: text})}
                    placeholder="Full name"
                  />
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputGroupHalf}>
                    <Text style={styles.inputLabel}>First Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={selectedUser.first_name || ''}
                      onChangeText={(text) => setSelectedUser({...selectedUser, first_name: text})}
                      placeholder="First name"
                    />
                  </View>
                  <View style={styles.inputGroupHalf}>
                    <Text style={styles.inputLabel}>Last Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={selectedUser.last_name || ''}
                      onChangeText={(text) => setSelectedUser({...selectedUser, last_name: text})}
                      placeholder="Last name"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone</Text>
                  <TextInput
                    style={styles.textInput}
                    value={selectedUser.phone || ''}
                    onChangeText={(text) => setSelectedUser({...selectedUser, phone: text})}
                    placeholder="Phone number"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>User Type</Text>
                  <View style={styles.userTypeOptions}>
                    {['user', 'area_super_admin', 'department_admin', 'tender', 'admin'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.userTypeOption,
                          selectedUser.user_type === type && styles.userTypeOptionActive
                        ]}
                        onPress={() => setSelectedUser({...selectedUser, user_type: type})}
                      >
                        <Text style={styles.userTypeOptionIcon}>{getUserTypeIcon(type)}</Text>
                        <Text
                          style={[
                            styles.userTypeOptionText,
                            selectedUser.user_type === type && styles.userTypeOptionTextActive
                          ]}
                        >
                          {type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {(selectedUser.user_type === 'area_super_admin' || selectedUser.user_type === 'department_admin') && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Assigned Area</Text>
                    <View style={styles.optionsContainer}>
                      {areas.map((area) => (
                        <TouchableOpacity
                          key={area.id}
                          style={[
                            styles.optionButton,
                            selectedUser.assigned_area_id === area.id && styles.optionButtonActive
                          ]}
                          onPress={() => setSelectedUser({...selectedUser, assigned_area_id: area.id})}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              selectedUser.assigned_area_id === area.id && styles.optionTextActive
                            ]}
                          >
                            {area.name} ({area.code})
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {selectedUser.user_type === 'department_admin' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Assigned Department</Text>
                    <View style={styles.optionsContainer}>
                      {departments.map((dept) => (
                        <TouchableOpacity
                          key={dept.id}
                          style={[
                            styles.optionButton,
                            selectedUser.assigned_department_id === dept.id && styles.optionButtonActive
                          ]}
                          onPress={() => setSelectedUser({...selectedUser, assigned_department_id: dept.id})}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              selectedUser.assigned_department_id === dept.id && styles.optionTextActive
                            ]}
                          >
                            {dept.name}
                          </Text>
                          <Text style={styles.optionSubtext}>
                            {dept.category.charAt(0).toUpperCase() + dept.category.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowUserModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleUpdateUser}
              >
                <Text style={styles.modalSaveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
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
  searchSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
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
  usersList: {
    flex: 1,
    padding: 20,
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
  usersContainer: {
    gap: 16,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  userBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  userTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  userTypeIcon: {
    fontSize: 12,
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  verifiedText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  userJoined: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  verifyButton: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  userDetails: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statText: {
    fontSize: 12,
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
  userTypeOptions: {
    gap: 8,
  },
  userTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  userTypeOptionActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  userTypeOptionIcon: {
    fontSize: 16,
  },
  userTypeOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  userTypeOptionTextActive: {
    color: '#FFFFFF',
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionButtonActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  optionSubtext: {
    fontSize: 12,
    color: '#6B7280',
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
  modalSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});