import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { ChevronDown, Check, X } from 'lucide-react-native';

export default function DropdownSelector({
  label,
  placeholder = "Select an option",
  options = [],
  selectedValue,
  onSelect,
  loading = false,
  error = null,
  required = false,
  disabled = false,
  renderOption = null,
  style
}) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find(option => option.id === selectedValue);

  const handleSelect = (option) => {
    onSelect(option);
    setModalVisible(false);
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.selector,
          disabled && styles.selectorDisabled,
          error && styles.selectorError
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        <Text style={[
          styles.selectorText,
          !selectedOption && styles.placeholderText
        ]}>
          {selectedOption ? selectedOption.name : placeholder}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color="#6B7280" />
        ) : (
          <ChevronDown size={20} color="#6B7280" />
        )}
      </TouchableOpacity>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || 'Select Option'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.optionsList}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionItem,
                    selectedValue === option.id && styles.optionItemSelected
                  ]}
                  onPress={() => handleSelect(option)}
                >
                  <View style={styles.optionContent}>
                    {renderOption ? renderOption(option) : (
                      <>
                        <Text style={[
                          styles.optionName,
                          selectedValue === option.id && styles.optionNameSelected
                        ]}>
                          {option.name}
                        </Text>
                        {option.code && (
                          <Text style={styles.optionCode}>({option.code})</Text>
                        )}
                        {option.description && (
                          <Text style={styles.optionDescription}>{option.description}</Text>
                        )}
                      </>
                    )}
                  </View>
                  {selectedValue === option.id && (
                    <Check size={20} color="#1E40AF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  required: {
    color: '#EF4444',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  selectorDisabled: {
    backgroundColor: '#F3F4F6',
    opacity: 0.6,
  },
  selectorError: {
    borderColor: '#EF4444',
  },
  selectorText: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  optionsList: {
    maxHeight: 400,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionItemSelected: {
    backgroundColor: '#F0F9FF',
  },
  optionContent: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  optionNameSelected: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  optionCode: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
  },
});