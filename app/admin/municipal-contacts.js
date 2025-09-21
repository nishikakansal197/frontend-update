import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { Plus, CreditCard as Edit, Trash2, Phone, Mail, MapPin, Clock, Save, X } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

export default function MunicipalContactsManagement() {
  const [officials, setOfficials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOfficial, setEditingOfficial] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    department: '',
    sub_department: '',
    email: '',
    phone: '',
    whatsapp_number: '',
    office_address: '',
    office_hours: '',
    bio: '',
    is_active: true,
    is_featured: false
  });

  const departments = [
    'Administration',
    'Public Works',
    'Parks & Recreation',
    'Environment',
    'Public Safety',
    'Transportation',
    'Utilities',
    'Planning & Development',
    'Finance',
    'Human Resources'
  ];

  useEffect(() => {
    loadOfficials();
  }, []);

  const loadOfficials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('municipal_officials')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOfficials(data || []);
    } catch (error) {
      console.error('Error loading officials:', error);
      Alert.alert('Error', 'Failed to load municipal contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOfficial = () => {
    setEditingOfficial(null);
    setFormData({
      name: '',
      title: '',
      department: '',
      sub_department: '',
      email: '',
      phone: '',
      whatsapp_number: '',
      office_address: '',
      office_hours: '',
      bio: '',
      is_active: true,
      is_featured: false
    });
    setShowModal(true);
  };

  const handleEditOfficial = (official) => {
    setEditingOfficial(official);
    setFormData({
      name: official.name || '',
      title: official.title || '',
      department: official.department || '',
      sub_department: official.sub_department || '',
      email: official.email || '',
      phone: official.phone || '',
      whatsapp_number: official.whatsapp_number || '',
      office_address: official.office_address || '',
      office_hours: official.office_hours || '',
      bio: official.bio || '',
      is_active: official.is_active !== false,
      is_featured: official.is_featured || false
    });
    setShowModal(true);
  };

  const handleSaveOfficial = async () => {
    if (!formData.name || !formData.title || !formData.department) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Title, Department)');
      return;
    }

    try {
      const officialData = {
        ...formData,
        responsibilities: [], // Can be enhanced later
        specializations: [], // Can be enhanced later
        languages_spoken: ['English'], // Default
        updated_at: new Date().toISOString()
      };

      if (editingOfficial) {
        // Update existing official
        const { error } = await supabase
          .from('municipal_officials')
          .update(officialData)
          .eq('id', editingOfficial.id);

        if (error) throw error;
        Alert.alert('Success', 'Official updated successfully');
      } else {
        // Create new official
        const { error } = await supabase
          .from('municipal_officials')
          .insert([officialData]);

        if (error) throw error;
        Alert.alert('Success', 'Official added successfully');
      }

      setShowModal(false);
      setEditingOfficial(null);
      await loadOfficials();
    } catch (error) {
      console.error('Error saving official:', error);
      Alert.alert('Error', 'Failed to save official');
    }
  };

  const handleDeleteOfficial = (official) => {
    Alert.alert(
      'Delete Official',
      `Are you sure you want to delete ${official.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('municipal_officials')
                .delete()
                .eq('id', official.id);

              if (error) throw error;
              Alert.alert('Success', 'Official deleted successfully');
              await loadOfficials();
            } catch (error) {
              console.error('Error deleting official:', error);
              Alert.alert('Error', 'Failed to delete official');
            }
          }
        }
      ]
    );
  };

  const toggleOfficialStatus = async (official) => {
    try {
      const { error } = await supabase
        .from('municipal_officials')
        .update({ 
          is_active: !official.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', official.id);

      if (error) throw error;
      await loadOfficials();
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading municipal contacts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Municipal Contacts</Text>
          <Text style={styles.subtitle}>Manage public official contact information</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddOfficial}>
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Official</Text>
        </TouchableOpacity>
      </View>

      {/* Officials List */}
      <ScrollView style={styles.officialsList}>
        {officials.map(official => (
          <View key={official.id} style={styles.officialCard}>
            {/* Official Header */}
            <View style={styles.officialHeader}>
              <View style={styles.officialInfo}>
                <View style={styles.officialNameRow}>
                  <Text style={styles.officialName}>{official.name}</Text>
                  <View style={styles.statusIndicators}>
                    {official.is_featured && (
                      <View style={styles.featuredBadge}>
                        <Text style={styles.featuredText}>Featured</Text>
                      </View>
                    )}
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: official.is_active ? '#10B981' : '#EF4444' }
                    ]}>
                      <Text style={styles.statusText}>
                        {official.is_active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.officialTitle}>{official.title}</Text>
                <View style={styles.departmentBadge}>
                  <Text style={styles.departmentText}>{official.department}</Text>
                  {official.sub_department && (
                    <Text style={styles.subDepartmentText}> • {official.sub_department}</Text>
                  )}
                </View>
              </View>
              
              <View style={styles.officialActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditOfficial(official)}
                >
                  <Edit size={16} color="#1E40AF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.statusActionButton]}
                  onPress={() => toggleOfficialStatus(official)}
                >
                  <Text style={styles.statusActionText}>
                    {official.is_active ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteOfficial(official)}
                >
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Contact Information */}
            <View style={styles.contactInfo}>
              {official.email && (
                <View style={styles.contactRow}>
                  <Mail size={14} color="#6B7280" />
                  <Text style={styles.contactText}>{official.email}</Text>
                </View>
              )}
              {official.phone && (
                <View style={styles.contactRow}>
                  <Phone size={14} color="#6B7280" />
                  <Text style={styles.contactText}>{official.phone}</Text>
                </View>
              )}
              {official.office_address && (
                <View style={styles.contactRow}>
                  <MapPin size={14} color="#6B7280" />
                  <Text style={styles.contactText}>{official.office_address}</Text>
                </View>
              )}
              {official.office_hours && (
                <View style={styles.contactRow}>
                  <Clock size={14} color="#6B7280" />
                  <Text style={styles.contactText}>{official.office_hours}</Text>
                </View>
              )}
            </View>

            {/* Bio */}
            {official.bio && (
              <View style={styles.bioSection}>
                <Text style={styles.bioText} numberOfLines={2}>{official.bio}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingOfficial ? 'Edit Official' : 'Add New Official'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              {/* Basic Information */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Basic Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.name}
                    onChangeText={(text) => setFormData({...formData, name: text})}
                    placeholder="Full name"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Title *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.title}
                    onChangeText={(text) => setFormData({...formData, title: text})}
                    placeholder="Job title"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Department *</Text>
                  <View style={styles.pickerContainer}>
                    {departments.map(dept => (
                      <TouchableOpacity
                        key={dept}
                        style={[
                          styles.pickerOption,
                          formData.department === dept && styles.pickerOptionActive
                        ]}
                        onPress={() => setFormData({...formData, department: dept})}
                      >
                        <Text style={[
                          styles.pickerOptionText,
                          formData.department === dept && styles.pickerOptionTextActive
                        ]}>
                          {dept}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Sub-Department</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.sub_department}
                    onChangeText={(text) => setFormData({...formData, sub_department: text})}
                    placeholder="Sub-department (optional)"
                  />
                </View>
              </View>

              {/* Contact Information */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Contact Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.email}
                    onChangeText={(text) => setFormData({...formData, email: text})}
                    placeholder="email@city.gov"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.phone}
                    onChangeText={(text) => setFormData({...formData, phone: text})}
                    placeholder="+1 (555) 123-4567"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>WhatsApp Number</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.whatsapp_number}
                    onChangeText={(text) => setFormData({...formData, whatsapp_number: text})}
                    placeholder="+1 (555) 123-4567"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Office Address</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.office_address}
                    onChangeText={(text) => setFormData({...formData, office_address: text})}
                    placeholder="Office address"
                    multiline
                    numberOfLines={2}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Office Hours</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.office_hours}
                    onChangeText={(text) => setFormData({...formData, office_hours: text})}
                    placeholder="Mon-Fri 9AM-5PM"
                  />
                </View>
              </View>

              {/* Additional Information */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Additional Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Bio</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.bio}
                    onChangeText={(text) => setFormData({...formData, bio: text})}
                    placeholder="Brief biography or description"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.checkboxGroup}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setFormData({...formData, is_active: !formData.is_active})}
                  >
                    <View style={[
                      styles.checkboxBox,
                      formData.is_active && styles.checkboxBoxActive
                    ]}>
                      {formData.is_active && <Text style={styles.checkboxCheck}>✓</Text>}
                      }
                    </View>
                    <Text style={styles.checkboxLabel}>Active (visible to public)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setFormData({...formData, is_featured: !formData.is_featured})}
                  >
                    <View style={[
                      styles.checkboxBox,
                      formData.is_featured && styles.checkboxBoxActive
                    ]}>
                      {formData.is_featured && <Text style={styles.checkboxCheck}>✓</Text>}
                      }
                    </View>
                    <Text style={styles.checkboxLabel}>Featured (highlighted in app)</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveOfficial}
              >
                <Save size={16} color="#FFFFFF" />
                <Text style={styles.modalSaveText}>
                  {editingOfficial ? 'Update' : 'Save'}
                </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E40AF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  officialsList: {
    flex: 1,
    padding: 20,
  },
  officialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  officialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  officialInfo: {
    flex: 1,
  },
  officialNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  officialName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  statusIndicators: {
    flexDirection: 'row',
    gap: 8,
  },
  featuredBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featuredText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  officialTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  departmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  departmentText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
  },
  subDepartmentText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  officialActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  statusActionButton: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  statusActionText: {
    fontSize: 10,
    color: '#374151',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  contactInfo: {
    gap: 8,
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#374151',
  },
  bioSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  bioText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
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
  formSection: {
    marginBottom: 24,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
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
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pickerOptionActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  pickerOptionText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  pickerOptionTextActive: {
    color: '#FFFFFF',
  },
  checkboxGroup: {
    gap: 12,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
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
  modalSaveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1E40AF',
    gap: 6,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});