import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Globe, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
];

export default function LanguageSelector({ style }) {
  const { i18n } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);

  const changeLanguage = (languageCode) => {
    i18n.changeLanguage(languageCode);
    setModalVisible(false);
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <>
      <TouchableOpacity
        style={[styles.button, style]}
        onPress={() => setModalVisible(true)}
      >
        <Globe size={20} color="#1E40AF" />
        <Text style={styles.buttonText}>{currentLanguage.flag}</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Language</Text>

            {languages.map((language) => (
              <TouchableOpacity
                key={language.code}
                style={styles.languageOption}
                onPress={() => changeLanguage(language.code)}
              >
                <View style={styles.languageInfo}>
                  <Text style={styles.languageFlag}>{language.flag}</Text>
                  <Text style={styles.languageName}>{language.name}</Text>
                </View>
                {i18n.language === language.code && (
                  <Check size={20} color="#10B981" />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 6,
  },
  buttonText: {
    fontSize: 16,
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
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  languageFlag: {
    fontSize: 20,
  },
  languageName: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: '#1E40AF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});