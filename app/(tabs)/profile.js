import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Mail, Phone, MapPin, Settings, Bell, Shield, LogOut, CreditCard as Edit3, Save, X, Camera, Star, Trophy, Activity, Image as ImageIcon } from 'lucide-react-native';
import { getCurrentUser, getUserProfile, updateUserProfile, signOut, getLeaderboard, uploadAvatar, updateNotificationSettings } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { showSuccessToast, showErrorToast } from '../../components/Toast';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
  });
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      // 1️⃣ Get current user
      const { user: currentUser, error: userError } = await getCurrentUser();
      if (userError) throw userError;
      if (!currentUser) throw new Error('User not signed in');

      setUser(currentUser);

      // 2️⃣ Get user profile
      const { data: profileData, error: profileError } = await getUserProfile(currentUser.id);
      if (profileError) throw profileError;

      setProfile(profileData);

      // 3️⃣ Initialize form
      if (profileData) {
        setFormData({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          phone: profileData.phone || '',
          address: profileData.address || '',
          city: profileData.city || '',
          state: profileData.state || '',
          postal_code: profileData.postal_code || '',
        });

        setNotifications(profileData.notification_settings || {
          email: true,
          push: true,
          sms: false,
        });
      }

      // 4️⃣ Fetch leaderboard to compute points, rank, and issues
      const { data: leaderboardData, error: leaderboardError } = await getLeaderboard('month'); // adjust period if needed
      if (leaderboardError) throw leaderboardError;

      // Normalize leaderboard data
      const usersMap = new Map();
      (leaderboardData || []).forEach(u => {
        const id = u.id || u.user_id || u.uid;
        if (!id) return;

        const score = Number(u.total_score ?? 0);
        const issues = Number(u.issues_reported ?? 0);

        if (!usersMap.has(id)) {
          usersMap.set(id, { ...u, total_score: score, issues_reported: issues });
        } else {
          const prev = usersMap.get(id);
          prev.total_score = Math.max(prev.total_score, score);
          prev.issues_reported += issues;
          usersMap.set(id, prev);
        }
      });

      const sortedLeaderboard = Array.from(usersMap.values())
        .sort((a, b) => b.total_score - a.total_score);

      // Find current user's stats
      const currentUserStats = sortedLeaderboard.find(u => u.id === currentUser.id);
      let rank = '-';
      let points = 0;
      let issues = 0;
      if (currentUserStats) {
        points = currentUserStats.total_score;
        issues = currentUserStats.issues_reported;
        rank = sortedLeaderboard.findIndex(u => u.id === currentUser.id) + 1;
      }

      // Merge computed stats into profile
      setProfile(prev => ({
        ...prev,
        total_score: points,
        issues_reported: issues,
        rank,
      }));

    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingAvatar(true);
        const { data, error } = await uploadAvatar(result.assets[0].uri, user.id);

        if (error) {
          showErrorToast('Upload Failed', 'Failed to upload avatar');
          return;
        }

        showSuccessToast('Success', 'Avatar updated successfully');
        await loadProfile(); // Reload to get updated avatar
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      showErrorToast('Error', 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingAvatar(true);
        const { data, error } = await uploadAvatar(result.assets[0].uri, user.id);

        if (error) {
          showErrorToast('Upload Failed', 'Failed to upload avatar');
          return;
        }

        showSuccessToast('Success', 'Avatar updated successfully');
        await loadProfile(); // Reload to get updated avatar
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      showErrorToast('Error', 'Failed to take photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const showAvatarOptions = () => {
    Alert.alert(
      'Update Avatar',
      'Choose how to update your profile picture:',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Gallery', onPress: handleAvatarUpload },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleNotificationChange = async (type, value) => {
    const newSettings = { ...notifications, [type]: value };
    setNotifications(newSettings);

    try {
      const { error } = await updateNotificationSettings(user.id, newSettings);
      if (error) {
        // Revert on error
        setNotifications(notifications);
        showErrorToast('Error', 'Failed to update notification settings');
        return;
      }
      showSuccessToast('Success', 'Notification settings updated');
    } catch (error) {
      console.error('Error updating notifications:', error);
      setNotifications(notifications);
      showErrorToast('Error', 'Failed to update notification settings');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const updates = {
        ...formData,
        full_name: `${formData.first_name} ${formData.last_name}`.trim(),
        notification_settings: notifications,
        updated_at: new Date().toISOString(),
      };

      const { error } = await updateUserProfile(user.id, updates);
      if (error) throw error;

      showSuccessToast('Success', 'Profile updated successfully');
      setEditing(false);
      await loadProfile(); // Reload to get updated data
    } catch (error) {
      console.error('Error updating profile:', error);
      showErrorToast('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await signOut();
              if (error) throw error;
              router.replace('/auth');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const getUserTypeDisplay = (userType) => {
    const types = {
      user: { label: 'Citizen', icon: '👤', color: '#1E40AF' },
      admin: { label: 'Administrator', icon: '👨‍💼', color: '#10B981' },
      area_super_admin: { label: 'Area Super Admin', icon: '👨‍💼', color: '#10B981' },
      department_admin: { label: 'Department Admin', icon: '🏛️', color: '#8B5CF6' },
      tender: { label: 'Contractor', icon: '🏗️', color: '#F59E0B' },
    };
    return types[userType] || types.user;
  };

  const getVerificationStatus = () => {
    if (profile?.is_verified) {
      return { text: 'Verified', color: '#10B981', icon: '✅' };
    }
    return { text: 'Unverified', color: '#F59E0B', icon: '⚠️' };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Activity size={32} color="#1E40AF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const userTypeInfo = getUserTypeDisplay(profile?.user_type);
  const verificationStatus = getVerificationStatus();

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.first_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </Text>
            </View>
            <TouchableOpacity style={styles.cameraButton}>
              <Camera size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {profile?.full_name || user?.email?.split('@')[0] || 'User'}
            </Text>
            <View style={styles.userMeta}>
              <View style={[styles.userTypeBadge, { backgroundColor: userTypeInfo.color + '20' }]}>
                <Text style={styles.userTypeIcon}>{userTypeInfo.icon}</Text>
                <Text style={[styles.userTypeText, { color: userTypeInfo.color }]}>
                  {userTypeInfo.label}
                </Text>
              </View>
              <View style={[styles.verificationBadge, { backgroundColor: verificationStatus.color + '20' }]}>
                <Text style={styles.verificationIcon}>{verificationStatus.icon}</Text>
                <Text style={[styles.verificationText, { color: verificationStatus.color }]}>
                  {verificationStatus.text}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => editing ? setEditing(false) : setEditing(true)}
        >
          {editing ? <X size={20} color="#6B7280" /> : <Edit3 size={20} color="#1E40AF" />}
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        {/* Points */}
        <View style={styles.statCard}>
          <Star size={20} color="#F59E0B" />
          <Text style={styles.statValue}>{profile?.total_score || 0}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>

        {/* Rank */}
        <View style={styles.statCard}>
          <Trophy size={20} color="#10B981" />
          <Text style={styles.statValue}>#{profile?.rank || '-'}</Text>
          <Text style={styles.statLabel}>Rank</Text>
        </View>

        {/* Issues */}
        <View style={styles.statCard}>
          <Activity size={20} color="#8B5CF6" />
          <Text style={styles.statValue}>{profile?.issues_reported || 0}</Text>
          <Text style={styles.statLabel}>Issues</Text>
        </View>
      </View>
      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email</Text>
          <View style={styles.inputContainer}>
            <Mail size={16} color="#6B7280" />
            <Text style={styles.emailText}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.inputRow}>
          <View style={styles.inputGroupHalf}>
            <Text style={styles.inputLabel}>First Name</Text>
            <View style={styles.inputContainer}>
              <User size={16} color="#6B7280" />
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.first_name}
                  onChangeText={(text) => setFormData({ ...formData, first_name: text })}
                  placeholder="First name"
                />
              ) : (
                <Text style={styles.inputText}>{formData.first_name || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.inputGroupHalf}>
            <Text style={styles.inputLabel}>Last Name</Text>
            <View style={styles.inputContainer}>
              <User size={16} color="#6B7280" />
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.last_name}
                  onChangeText={(text) => setFormData({ ...formData, last_name: text })}
                  placeholder="Last name"
                />
              ) : (
                <Text style={styles.inputText}>{formData.last_name || 'Not set'}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone</Text>
          <View style={styles.inputContainer}>
            <Phone size={16} color="#6B7280" />
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="Phone number"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.inputText}>{formData.phone || 'Not set'}</Text>
            )}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Address</Text>
          <View style={styles.inputContainer}>
            <MapPin size={16} color="#6B7280" />
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Street address"
                multiline
              />
            ) : (
              <Text style={styles.inputText}>{formData.address || 'Not set'}</Text>
            )}
          </View>
        </View>

        <View style={styles.inputRow}>
          <View style={styles.inputGroupHalf}>
            <Text style={styles.inputLabel}>City</Text>
            <View style={styles.inputContainer}>
              {editing ? (
                <TextInput
                  style={[styles.input, { paddingLeft: 12 }]}
                  value={formData.city}
                  onChangeText={(text) => setFormData({ ...formData, city: text })}
                  placeholder="City"
                />
              ) : (
                <Text style={[styles.inputText, { paddingLeft: 12 }]}>{formData.city || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.inputGroupHalf}>
            <Text style={styles.inputLabel}>State</Text>
            <View style={styles.inputContainer}>
              {editing ? (
                <TextInput
                  style={[styles.input, { paddingLeft: 12 }]}
                  value={formData.state}
                  onChangeText={(text) => setFormData({ ...formData, state: text })}
                  placeholder="State"
                />
              ) : (
                <Text style={[styles.inputText, { paddingLeft: 12 }]}>{formData.state || 'Not set'}</Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Notification Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Settings</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Bell size={20} color="#1E40AF" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Email Notifications</Text>
              <Text style={styles.settingDescription}>Receive updates via email</Text>
            </View>
          </View>
          <Switch
            value={notifications.email}
            onValueChange={(value) => handleNotificationChange('email', value)}
            trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
            thumbColor={notifications.email ? '#1E40AF' : '#9CA3AF'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Bell size={20} color="#10B981" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingDescription}>Receive push notifications</Text>
            </View>
          </View>
          <Switch
            value={notifications.push}
            onValueChange={(value) => handleNotificationChange('push', value)}
            trackColor={{ false: '#E5E7EB', true: '#BBF7D0' }}
            thumbColor={notifications.push ? '#10B981' : '#9CA3AF'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Phone size={20} color="#F59E0B" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>SMS Notifications</Text>
              <Text style={styles.settingDescription}>Receive SMS updates</Text>
            </View>
          </View>
          <Switch
            value={notifications.sms}
            onValueChange={(value) => handleNotificationChange('sms', value)}
            trackColor={{ false: '#E5E7EB', true: '#FDE68A' }}
            thumbColor={notifications.sms ? '#F59E0B' : '#9CA3AF'}
          />
        </View>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity style={styles.actionItem}>
          <Shield size={20} color="#8B5CF6" />
          <Text style={styles.actionText}>Privacy & Security</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <Settings size={20} color="#6B7280" />
          <Text style={styles.actionText}>App Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionItem, styles.logoutItem]} onPress={handleLogout}>
          <LogOut size={20} color="#EF4444" />
          <Text style={[styles.actionText, { color: '#EF4444' }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Save Button */}
      {editing && (
        <View style={styles.saveSection}>
          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Save size={16} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
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
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    backgroundColor: '#1E40AF',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  cameraButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    backgroundColor: '#10B981',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cameraButtonDisabled: {
    opacity: 0.6,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  userMeta: {
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
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verificationIcon: {
    fontSize: 12,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    width: 40,
    height: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statsSection: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
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
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  inputText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  emailText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  saveSection: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  saveButton: {
    backgroundColor: '#1E40AF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});