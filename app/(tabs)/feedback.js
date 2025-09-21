import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MessageSquare, Send, CircleCheck as CheckCircle } from 'lucide-react-native';
import FeedbackForm from '../../components/FeedbackForm';
import FeedbackList from '../../components/FeedbackList';
import LanguageSelector from '../../components/LanguageSelector';
import { useTranslation } from 'react-i18next';

export default function FeedbackScreen() {
  const { t } = useTranslation();
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [activeTab, setActiveTab] = useState('submit');

  const tabs = [
    { id: 'submit', label: 'Submit Feedback', icon: Send },
    { id: 'history', label: 'My Feedback', icon: CheckCircle },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Feedback & Support</Text>
          <Text style={styles.subtitle}>Help us improve our services</Text>
        </View>
        <LanguageSelector />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                activeTab === tab.id && styles.tabActive,
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <IconComponent 
                size={16} 
                color={activeTab === tab.id ? '#1E40AF' : '#6B7280'} 
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.content}>
        {activeTab === 'submit' ? (
          <>
            <View style={styles.feedbackCard}>
              <MessageSquare size={48} color="#1E40AF" />
              <Text style={styles.cardTitle}>Share Your Feedback</Text>
              <Text style={styles.cardDescription}>
                Have suggestions, complaints, or compliments? We'd love to hear from you.
                Your feedback helps us improve our community services.
              </Text>
              
              <TouchableOpacity
                style={styles.feedbackButton}
                onPress={() => setShowFeedbackForm(true)}
              >
                <MessageSquare size={20} color="#FFFFFF" />
                <Text style={styles.feedbackButtonText}>Submit Feedback</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>How We Use Your Feedback</Text>
              <View style={styles.infoList}>
                <Text style={styles.infoItem}>• Improve our services and processes</Text>
                <Text style={styles.infoItem}>• Address community concerns quickly</Text>
                <Text style={styles.infoItem}>• Recognize outstanding service</Text>
                <Text style={styles.infoItem}>• Plan future improvements</Text>
              </View>
            </View>
          </>
        ) : (
          <FeedbackList />
        )}
          </View>

      <FeedbackForm
        visible={showFeedbackForm}
        onClose={() => setShowFeedbackForm(false)}
      />
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#F0F9FF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  feedbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  feedbackButton: {
    backgroundColor: '#1E40AF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  feedbackButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});