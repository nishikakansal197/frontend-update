import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch, Modal } from 'react-native';
import { Settings, Users, MapPin, Building, Bell, Shield, Database, Activity, Save, Plus, CreditCard as Edit, Trash2, X, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Clock, FileText, MessageSquare } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('general');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});
  
  // Settings data
  const [systemSettings, setSystemSettings] = useState({
    siteName: 'जनConnect',
    maintenanceMode: false,
    registrationEnabled: true,
    emailVerificationRequired: true,
    autoAssignIssues: false,
    defaultResponseTime: 7,
    maxFileSize: 10,
    allowAnonymousReports: true,
  });

  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [areas, setAreas] = useState([]);
  const [wards, setWards] = useState([]);

  const sections = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'issues', label: 'Issue Management', icon: AlertTriangle },
    { id: 'tenders', label: 'Tender Settings', icon: FileText },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'locations', label: 'Locations', icon: MapPin },
    { id: 'departments', label: 'Departments', icon: Building },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'system', label: 'System Health', icon: Database },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Load categories
      const { data: categoriesData } = await supabase
        .from('issues')
        .select('category')
        .not('category', 'is', null);
      
      const uniqueCategories = [...new Set(categoriesData?.map(item => item.category))];
      setCategories(uniqueCategories.map(cat => ({ id: cat, name: cat, active: true })));

      // Load departments
      const { data: departmentsData } = await supabase
        .from('issues')
        .select('assigned_department')
        .not('assigned_department', 'is', null);
      
      const uniqueDepartments = [...new Set(departmentsData?.map(item => item.assigned_department))];
      setDepartments(uniqueDepartments.map(dept => ({ id: dept, name: dept, active: true })));

      // Load areas and wards
      const [areasResult, wardsResult] = await Promise.all([
        supabase.from('issues').select('area').not('area', 'is', null),
        supabase.from('issues').select('ward').not('ward', 'is', null)
      ]);

      const uniqueAreas = [...new Set(areasResult.data?.map(item => item.area))];
      const uniqueWards = [...new Set(wardsResult.data?.map(item => item.ward))];
      
      setAreas(uniqueAreas.map(area => ({ id: area, name: area, active: true })));
      setWards(uniqueWards.map(ward => ({ id: ward, name: ward, active: true })));

    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = (type) => {
    setModalType(type);
    setFormData({ name: '', description: '', active: true });
    setShowModal(true);
  };

  const handleEditItem = (type, item) => {
    setModalType(type);
    setFormData(item);
    setShowModal(true);
  };

  const handleSaveItem = async () => {
    if (!formData.name?.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    try {
      switch (modalType) {
        case 'category':
          setCategories(prev => [...prev, { id: formData.name, name: formData.name, active: true }]);
          break;
        case 'department':
          setDepartments(prev => [...prev, { id: formData.name, name: formData.name, active: true }]);
          break;
        case 'area':
          setAreas(prev => [...prev, { id: formData.name, name: formData.name, active: true }]);
          break;
        case 'ward':
          setWards(prev => [...prev, { id: formData.name, name: formData.name, active: true }]);
          break;
      }

      Alert.alert('Success', `${modalType} added successfully`);
      setShowModal(false);
      setFormData({});
    } catch (error) {
      Alert.alert('Error', `Failed to add ${modalType}`);
    }
  };

  const handleDeleteItem = (type, itemId) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete this ${type}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            switch (type) {
              case 'category':
                setCategories(prev => prev.filter(item => item.id !== itemId));
                break;
              case 'department':
                setDepartments(prev => prev.filter(item => item.id !== itemId));
                break;
              case 'area':
                setAreas(prev => prev.filter(item => item.id !== itemId));
                break;
              case 'ward':
                setWards(prev => prev.filter(item => item.id !== itemId));
                break;
            }
            Alert.alert('Success', `${type} deleted successfully`);
          }
        }
      ]
    );
  };

  const renderGeneralSettings = () => (
    <View style={styles.settingsContent}>
      <View style={styles.settingGroup}>
        <Text style={styles.groupTitle}>Application Settings</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Site Name</Text>
            <Text style={styles.settingDescription}>Application display name</Text>
          </View>
          <TextInput
            style={styles.settingInput}
            value={systemSettings.siteName}
            onChangeText={(text) => setSystemSettings({...systemSettings, siteName: text})}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Maintenance Mode</Text>
            <Text style={styles.settingDescription}>Temporarily disable public access</Text>
          </View>
          <Switch
            value={systemSettings.maintenanceMode}
            onValueChange={(value) => setSystemSettings({...systemSettings, maintenanceMode: value})}
            trackColor={{ false: '#E5E7EB', true: '#FECACA' }}
            thumbColor={systemSettings.maintenanceMode ? '#EF4444' : '#9CA3AF'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>User Registration</Text>
            <Text style={styles.settingDescription}>Allow new user registrations</Text>
          </View>
          <Switch
            value={systemSettings.registrationEnabled}
            onValueChange={(value) => setSystemSettings({...systemSettings, registrationEnabled: value})}
            trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
            thumbColor={systemSettings.registrationEnabled ? '#1E40AF' : '#9CA3AF'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Email Verification Required</Text>
            <Text style={styles.settingDescription}>Require email verification for new accounts</Text>
          </View>
          <Switch
            value={systemSettings.emailVerificationRequired}
            onValueChange={(value) => setSystemSettings({...systemSettings, emailVerificationRequired: value})}
            trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
            thumbColor={systemSettings.emailVerificationRequired ? '#1E40AF' : '#9CA3AF'}
          />
        </View>
      </View>
    </View>
  );

  const renderIssueSettings = () => (
    <View style={styles.settingsContent}>
      <View style={styles.settingGroup}>
        <Text style={styles.groupTitle}>Issue Management Configuration</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Auto-assign Issues</Text>
            <Text style={styles.settingDescription}>Automatically assign issues to departments</Text>
          </View>
          <Switch
            value={systemSettings.autoAssignIssues}
            onValueChange={(value) => setSystemSettings({...systemSettings, autoAssignIssues: value})}
            trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
            thumbColor={systemSettings.autoAssignIssues ? '#1E40AF' : '#9CA3AF'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Default Response Time (days)</Text>
            <Text style={styles.settingDescription}>Expected response time for issues</Text>
          </View>
          <TextInput
            style={styles.numberInput}
            value={String(systemSettings.defaultResponseTime)}
            onChangeText={(text) => setSystemSettings({...systemSettings, defaultResponseTime: parseInt(text) || 7})}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Allow Anonymous Reports</Text>
            <Text style={styles.settingDescription}>Allow users to report issues without signing in</Text>
          </View>
          <Switch
            value={systemSettings.allowAnonymousReports}
            onValueChange={(value) => setSystemSettings({...systemSettings, allowAnonymousReports: value})}
            trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
            thumbColor={systemSettings.allowAnonymousReports ? '#1E40AF' : '#9CA3AF'}
          />
        </View>
      </View>

      {/* Issue Categories */}
      <View style={styles.settingGroup}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupTitle}>Issue Categories</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddItem('category')}
          >
            <Plus size={16} color="#1E40AF" />
            <Text style={styles.addButtonText}>Add Category</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.itemsList}>
          {categories.map(category => (
            <View key={category.id} style={styles.listItem}>
              <Text style={styles.itemName}>{category.name}</Text>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={styles.itemActionButton}
                  onPress={() => handleEditItem('category', category)}
                >
                  <Edit size={14} color="#1E40AF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.itemActionButton, styles.deleteActionButton]}
                  onPress={() => handleDeleteItem('category', category.id)}
                >
                  <Trash2 size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderLocationSettings = () => (
    <View style={styles.settingsContent}>
      {/* Areas */}
      <View style={styles.settingGroup}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupTitle}>Areas</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddItem('area')}
          >
            <Plus size={16} color="#1E40AF" />
            <Text style={styles.addButtonText}>Add Area</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.itemsList}>
          {areas.map(area => (
            <View key={area.id} style={styles.listItem}>
              <Text style={styles.itemName}>{area.name}</Text>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={styles.itemActionButton}
                  onPress={() => handleEditItem('area', area)}
                >
                  <Edit size={14} color="#1E40AF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.itemActionButton, styles.deleteActionButton]}
                  onPress={() => handleDeleteItem('area', area.id)}
                >
                  <Trash2 size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Wards */}
      <View style={styles.settingGroup}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupTitle}>Wards</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddItem('ward')}
          >
            <Plus size={16} color="#1E40AF" />
            <Text style={styles.addButtonText}>Add Ward</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.itemsList}>
          {wards.map(ward => (
            <View key={ward.id} style={styles.listItem}>
              <Text style={styles.itemName}>{ward.name}</Text>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={styles.itemActionButton}
                  onPress={() => handleEditItem('ward', ward)}
                >
                  <Edit size={14} color="#1E40AF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.itemActionButton, styles.deleteActionButton]}
                  onPress={() => handleDeleteItem('ward', ward.id)}
                >
                  <Trash2 size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderDepartmentSettings = () => (
    <View style={styles.settingsContent}>
      <View style={styles.settingGroup}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupTitle}>Departments</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddItem('department')}
          >
            <Plus size={16} color="#1E40AF" />
            <Text style={styles.addButtonText}>Add Department</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.itemsList}>
          {departments.map(department => (
            <View key={department.id} style={styles.listItem}>
              <Text style={styles.itemName}>{department.name}</Text>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={styles.itemActionButton}
                  onPress={() => handleEditItem('department', department)}
                >
                  <Edit size={14} color="#1E40AF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.itemActionButton, styles.deleteActionButton]}
                  onPress={() => handleDeleteItem('department', department.id)}
                >
                  <Trash2 size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderSystemHealth = () => (
    <View style={styles.settingsContent}>
      <View style={styles.settingGroup}>
        <Text style={styles.groupTitle}>System Status</Text>
        
        <View style={styles.healthGrid}>
          <View style={styles.healthCard}>
            <CheckCircle size={24} color="#10B981" />
            <Text style={styles.healthValue}>Online</Text>
            <Text style={styles.healthLabel}>Database</Text>
          </View>
          
          <View style={styles.healthCard}>
            <Activity size={24} color="#10B981" />
            <Text style={styles.healthValue}>99.9%</Text>
            <Text style={styles.healthLabel}>Uptime</Text>
          </View>
          
          <View style={styles.healthCard}>
            <Clock size={24} color="#F59E0B" />
            <Text style={styles.healthValue}>1.2s</Text>
            <Text style={styles.healthLabel}>Response Time</Text>
          </View>
          
          <View style={styles.healthCard}>
            <Database size={24} color="#8B5CF6" />
            <Text style={styles.healthValue}>2.1GB</Text>
            <Text style={styles.healthLabel}>Storage Used</Text>
          </View>
        </View>
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.groupTitle}>Maintenance Actions</Text>
        
        <TouchableOpacity style={styles.maintenanceButton}>
          <Database size={20} color="#1E40AF" />
          <Text style={styles.maintenanceButtonText}>Backup Database</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.maintenanceButton}>
          <Activity size={20} color="#10B981" />
          <Text style={styles.maintenanceButtonText}>Clear Cache</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.maintenanceButton}>
          <FileText size={20} color="#F59E0B" />
          <Text style={styles.maintenanceButtonText}>Export Logs</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'general': return renderGeneralSettings();
      case 'issues': return renderIssueSettings();
      case 'locations': return renderLocationSettings();
      case 'departments': return renderDepartmentSettings();
      case 'system': return renderSystemHealth();
      default:
        return (
          <View style={styles.settingsContent}>
            <Text style={styles.comingSoon}>{activeSection} Settings - Coming Soon</Text>
          </View>
        );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Activity size={32} color="#1E40AF" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>System Settings</Text>
        <Text style={styles.subtitle}>Configure system preferences and manage data</Text>
      </View>

      <View style={styles.mainContent}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {sections.map(section => {
              const IconComponent = section.icon;
              return (
                <TouchableOpacity
                  key={section.id}
                  style={[
                    styles.sidebarItem,
                    activeSection === section.id && styles.sidebarItemActive
                  ]}
                  onPress={() => setActiveSection(section.id)}
                >
                  <IconComponent 
                    size={18} 
                    color={activeSection === section.id ? '#1E40AF' : '#6B7280'} 
                  />
                  <Text style={[
                    styles.sidebarText,
                    activeSection === section.id && styles.sidebarTextActive
                  ]}>
                    {section.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Content */}
        <ScrollView style={styles.contentArea}>
          {renderContent()}
        </ScrollView>
      </View>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {formData.id ? 'Edit' : 'Add'} {modalType}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.name || ''}
                onChangeText={(text) => setFormData({...formData, name: text})}
                placeholder={`Enter ${modalType} name`}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveItem}
              >
                <Save size={16} color="#FFFFFF" />
                <Text style={styles.modalSaveText}>Save</Text>
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
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    padding: 16,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    gap: 8,
  },
  sidebarItemActive: {
    backgroundColor: '#F0F9FF',
  },
  sidebarText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  sidebarTextActive: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  contentArea: {
    flex: 1,
    padding: 20,
  },
  settingsContent: {
    gap: 20,
  },
  settingGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    minWidth: 120,
  },
  numberInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    width: 80,
    textAlign: 'center',
  },
  itemsList: {
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  itemActionButton: {
    padding: 6,
    backgroundColor: '#F0F9FF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  deleteActionButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  healthCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  healthValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  healthLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  maintenanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  maintenanceButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  comingSoon: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 60,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
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