import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';
import { MessageSquare, Send, X } from 'lucide-react-native';
import { createFeedback, getCurrentUser } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { showSuccessToast, showErrorToast } from './Toast';

export default function FeedbackForm({ visible, onClose, issueId = null }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    type: 'complaint',
    subject: '',
    message: '',
    contactEmail: '',
    contactPhone: '',
  });
  const [loading, setLoading] = useState(false);

  const feedbackTypes = [
    { id: 'complaint', label: 'Complaint', color: '#EF4444' },
    { id: 'suggestion', label: 'Suggestion', color: '#10B981' },
    { id: 'compliment', label: 'Compliment', color: '#8B5CF6' },
    { id: 'inquiry', label: 'General Inquiry', color: '#F59E0B' },
  ];

  const handleSubmit = async () => {
    if (!formData.subject || !formData.message) {
      showErrorToast('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      // Get current user (optional for feedback)
      const { user } = await getCurrentUser();

      const feedbackData = {
        user_id: user?.id || null,
        issue_id: issueId,
        type: formData.type,
        subject: formData.subject,
        message: formData.message,
        contact_email: formData.contactEmail || user?.email,
        contact_phone: formData.contactPhone,
        status: 'pending',
      };

      const { error } = await createFeedback(feedbackData);
      if (error) throw error;

      showSuccessToast(
        'Feedback Submitted',
        'Your feedback has been submitted successfully! We will review it and respond if necessary.'
      );

      // Reset form and close
      setFormData({
        type: 'complaint',
        subject: '',
        message: '',
        contactEmail: '',
        contactPhone: '',
      });
      onClose();

    } catch (error) {
      console.error('Error submitting feedback:', error);
      showErrorToast('Submission Error', 'Failed to submit feedback: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Submit Feedback</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Feedback Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Feedback Type</Text>
            <View style={styles.typeContainer}>
              {feedbackTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeButton,
                    formData.type === type.id && styles.typeButtonActive,
                    { borderColor: type.color },
                  ]}
                  onPress={() => setFormData({ ...formData, type: type.id })}
                >
                  <Text
                    style={[
                      styles.typeText,
                      formData.type === type.id && { color: type.color },
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Subject */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subject *</Text>
            <TextInput
              style={styles.input}
              placeholder="Brief subject of your feedback"
              value={formData.subject}
              onChangeText={(text) => setFormData({ ...formData, subject: text })}
            />
          </View>

          {/* Message */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Message *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Detailed message about your feedback..."
              value={formData.message}
              onChangeText={(text) => setFormData({ ...formData, message: text })}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Contact Information */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your.email@example.com"
              value={formData.contactEmail}
              onChangeText={(text) => setFormData({ ...formData, contactEmail: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="+1 (555) 123-4567"
              value={formData.contactPhone}
              onChangeText={(text) => setFormData({ ...formData, contactPhone: text })}
              keyboardType="phone-pad"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Send size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>
              {loading ? t('common.loading') : 'Submit Feedback'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: '90%',
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
  closeButton: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderRadius: 16,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  typeButtonActive: {
    backgroundColor: '#F0F9FF',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  input: {
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
  submitButton: {
    backgroundColor: '#1E40AF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});