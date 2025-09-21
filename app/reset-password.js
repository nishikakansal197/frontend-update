import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react-native';
import { updatePassword } from '../lib/supabase';
import { showSuccessToast, showErrorToast } from '../components/Toast';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      showErrorToast('Validation Error', 'Please fill in both password fields');
      return;
    }

    if (password !== confirmPassword) {
      showErrorToast('Validation Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      showErrorToast('Validation Error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      const { error } = await updatePassword(password);
      
      if (error) {
        showErrorToast('Reset Error', error.message || 'Failed to reset password');
        return;
      }

      showSuccessToast('Password Reset', 'Your password has been updated successfully');
      
      // Navigate to login after 2 seconds
      setTimeout(() => {
        router.replace('/auth');
      }, 2000);

    } catch (error) {
      console.error('Password reset error:', error);
      showErrorToast('Error', 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <CheckCircle size={48} color="#10B981" />
        <Text style={styles.title}>Reset Your Password</Text>
        <Text style={styles.subtitle}>Enter your new password below</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Lock size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="New Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="new-password"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff size={20} color="#6B7280" />
            ) : (
              <Eye size={20} color="#6B7280" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Lock size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            autoComplete="new-password"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <EyeOff size={20} color="#6B7280" />
            ) : (
              <Eye size={20} color="#6B7280" />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.passwordHint}>
          Password must be at least 6 characters long
        </Text>

        <TouchableOpacity
          style={[styles.resetButton, loading && styles.resetButtonDisabled]}
          onPress={handleResetPassword}
          disabled={loading}
        >
          <Text style={styles.resetButtonText}>
            {loading ? 'Updating Password...' : 'Update Password'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backToLoginButton}
          onPress={() => router.replace('/auth')}
        >
          <Text style={styles.backToLoginText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#111827',
  },
  eyeIcon: {
    padding: 4,
  },
  passwordHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: -8,
    paddingHorizontal: 4,
  },
  resetButton: {
    backgroundColor: '#1E40AF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  resetButtonDisabled: {
    opacity: 0.6,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backToLoginButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backToLoginText: {
    color: '#1E40AF',
    fontSize: 14,
    fontWeight: '500',
  },
});