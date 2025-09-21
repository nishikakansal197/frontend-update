import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react-native';
import { getMunicipalOfficials } from '../lib/supabase';
import { openWhatsAppWithOfficial } from '../lib/whatsapp';
import { useTranslation } from 'react-i18next';

export default function ContactSection() {
  const { t } = useTranslation();
  const [officials, setOfficials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  useEffect(() => {
    loadOfficials();
  }, []);

  const loadOfficials = async () => {
    try {
      const { data, error } = await getMunicipalOfficials();
      if (error) throw error;
      setOfficials(data || []);
    } catch (error) {
      console.error('Error loading officials:', error);
      Alert.alert(t('common.error'), 'Failed to load contact information');
    } finally {
      setLoading(false);
    }
  };

  const departments = [
    { id: 'all', label: 'All Departments' },
    { id: 'Administration', label: 'Administration' },
    { id: 'Public Works', label: 'Public Works' },
    { id: 'Water & Utilities', label: 'Water & Utilities' },
    { id: 'Parks & Recreation', label: 'Parks & Recreation' },
    { id: 'Environmental Services', label: 'Environmental Services' },
    { id: 'Public Safety', label: 'Public Safety' },
    { id: 'Urban Planning', label: 'Urban Planning' },
  ];

  const filteredOfficials = selectedDepartment === 'all'
    ? officials
    : officials.filter(official => official.department === selectedDepartment);

  const handleCall = (phoneNumber) => {
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Phone calls are not supported on this device');
        }
      })
      .catch((err) => console.error('Error making call:', err));
  };

  const handleEmail = (email) => {
    const url = `mailto:${email}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Email is not supported on this device');
        }
      })
      .catch((err) => console.error('Error opening email:', err));
  };

  const handleWhatsApp = (official) => {
    if (official.whatsapp_number) {
      openWhatsAppWithOfficial(official);
    } else {
      Alert.alert('WhatsApp Not Available', 'This official does not have WhatsApp contact available');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Municipal Contacts</Text>
        <Text style={styles.subtitle}>Get in touch with city officials</Text>
      </View>

      {/* Department Filter */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterButtons}>
            {departments.map((dept) => (
              <TouchableOpacity
                key={dept.id}
                style={[
                  styles.filterButton,
                  selectedDepartment === dept.id && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedDepartment(dept.id)}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedDepartment === dept.id && styles.filterTextActive,
                  ]}
                >
                  {dept.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Officials List */}
      <View style={styles.officialsSection}>
        {filteredOfficials.map((official) => (
          <View key={official.id} style={styles.officialCard}>
            <View style={styles.officialHeader}>
              <View style={styles.officialInfo}>
                <Text style={styles.officialName}>{official.name}</Text>
                <Text style={styles.officialTitle}>{official.title}</Text>
                <View style={styles.departmentBadge}>
                  <Text style={styles.departmentText}>{official.department}</Text>
                </View>
              </View>
            </View>

            {/* Contact Methods */}
            <View style={styles.contactMethods}>
              {official.phone && (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleCall(official.phone)}
                >
                  <Phone size={18} color="#10B981" />
                  <Text style={styles.contactText}>{official.phone}</Text>
                </TouchableOpacity>
              )}

              {official.email && (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleEmail(official.email)}
                >
                  <Mail size={18} color="#1E40AF" />
                  <Text style={styles.contactText}>{official.email}</Text>
                </TouchableOpacity>
              )}

              {official.whatsapp_number && (
                <TouchableOpacity
                  style={[styles.contactButton, styles.whatsappButton]}
                  onPress={() => handleWhatsApp(official)}
                >
                  <MessageCircle size={18} color="#25D366" />
                  <Text style={[styles.contactText, { color: '#25D366' }]}>
                    WhatsApp Chat
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Office Information */}
            {(official.office_address || official.office_hours) && (
              <View style={styles.officeInfo}>
                {official.office_address && (
                  <View style={styles.officeDetail}>
                    <MapPin size={16} color="#6B7280" />
                    <Text style={styles.officeText}>{official.office_address}</Text>
                  </View>
                )}

                {official.office_hours && (
                  <View style={styles.officeDetail}>
                    <Clock size={16} color="#6B7280" />
                    <Text style={styles.officeText}>{official.office_hours}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Responsibilities */}
            {official.responsibilities && official.responsibilities.length > 0 && (
              <View style={styles.responsibilitiesSection}>
                <Text style={styles.responsibilitiesTitle}>Responsibilities:</Text>
                {official.responsibilities.map((responsibility, index) => (
                  <Text key={index} style={styles.responsibility}>
                    • {responsibility}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>

      {filteredOfficials.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No officials found for this department</Text>
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
    backgroundColor: '#F8FAFC',
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
  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  officialsSection: {
    padding: 20,
    gap: 16,
  },
  officialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 10, // spacing between multiple cards
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },

  officialHeader: {
    marginBottom: 16,
  },
  officialInfo: {
    gap: 4,
  },
  officialName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  officialTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  departmentBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  departmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
  },
  contactMethods: {
    gap: 12,
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  whatsappButton: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  contactText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  officeInfo: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  officeDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  officeText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  responsibilitiesSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  responsibilitiesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  responsibility: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});