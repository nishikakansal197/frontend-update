import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, Image, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Mail, Lock, User, Phone, MapPin, CircleCheck as CheckCircle } from 'lucide-react-native';
import { signIn, signUp, sendVerificationEmail, getUserProfile, resetPassword, getAreas, getDepartments, getStates, getDistrictsByState, getAreasByDistrict } from '../lib/supabase';
import { showSuccessToast, showErrorToast, showInfoToast } from '../components/Toast';
import DropdownSelector from '../components/DropdownSelector';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [verificationSent, setVerificationSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [locationData, setLocationData] = useState({
    states: [],
    districts: [],
    areas: [],
    departments: [],
    loadingStates: false,
    loadingDistricts: false,
    loadingAreas: false,
    loadingDepartments: false,
  });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    password: '',
    confirmPassword: '',
    userType: 'user',
    stateId: '',
    districtId: '',
    areaId: '',
    departmentId: '',
  });
  const router = useRouter();

  const userTypes = [
    { id: 'user', label: 'Citizen', icon: '👤', color: '#1E40AF', description: 'Report issues and engage with community' },
    { id: 'area_super_admin', label: 'Area Super Admin', icon: '👨‍💼', color: '#10B981', description: 'Manage area-wide operations and assign to departments' },
    { id: 'department_admin', label: 'Department Admin', icon: '🏛️', color: '#8B5CF6', description: 'Manage department issues and create tenders' },
    { id: 'tender', label: 'Contractor', icon: '🏗️', color: '#F59E0B', description: 'Bid on municipal projects and tenders' },
  ];

  // Load states when admin type is selected and we reach step 2
  useEffect(() => {
    if (!isLogin && currentStep === 2 && (formData.userType === 'area_super_admin' || formData.userType === 'department_admin')) {
      loadStates();
    }
  }, [formData.userType, isLogin, currentStep]);

  const loadStates = async () => {
    try {
      setLocationData(prev => ({ ...prev, loadingStates: true }));
      const result = await getStates();

      if (result.error) {
        console.error('Error loading states:', result.error);
        showErrorToast('Error', 'Failed to load states');
        return;
      }

      setLocationData(prev => ({ ...prev, states: result.data || [] }));
    } catch (error) {
      console.error('Error loading states:', error);
      showErrorToast('Error', 'Failed to load states');
    } finally {
      setLocationData(prev => ({ ...prev, loadingStates: false }));
    }
  };

  const handleStateSelect = async (state) => {
    try {
      setFormData(prev => ({ ...prev, stateId: state.id, districtId: '', areaId: '' }));
      setLocationData(prev => ({ ...prev, loadingDistricts: true, districts: [], areas: [] }));

      const result = await getDistrictsByState(state.id);

      if (result.error) {
        console.error('Error loading districts:', result.error);
        showErrorToast('Error', 'Failed to load districts');
        return;
      }

      setLocationData(prev => ({ ...prev, districts: result.data || [] }));
    } catch (error) {
      console.error('Error loading districts:', error);
      showErrorToast('Error', 'Failed to load districts');
    } finally {
      setLocationData(prev => ({ ...prev, loadingDistricts: false }));
    }
  };

  const handleDistrictSelect = async (district) => {
    try {
      setFormData(prev => ({ ...prev, districtId: district.id, areaId: '' }));
      setLocationData(prev => ({ ...prev, loadingAreas: true, areas: [] }));

      const result = await getAreasByDistrict(district.id);

      if (result.error) {
        console.error('Error loading areas:', result.error);
        showErrorToast('Error', 'Failed to load areas');
        return;
      }

      setLocationData(prev => ({ ...prev, areas: result.data || [] }));
    } catch (error) {
      console.error('Error loading areas:', error);
      showErrorToast('Error', 'Failed to load areas');
    } finally {
      setLocationData(prev => ({ ...prev, loadingAreas: false }));
    }
  };

  const handleAreaSelect = (area) => {
    setFormData(prev => ({ ...prev, areaId: area.id }));
  };

  const loadDepartments = async () => {
    try {
      setLocationData(prev => ({ ...prev, loadingDepartments: true }));
      const result = await getDepartments();

      if (result.error) {
        console.error('Error loading departments:', result.error);
        showErrorToast('Error', 'Failed to load departments');
        return;
      }

      setLocationData(prev => ({ ...prev, departments: result.data || [] }));
    } catch (error) {
      console.error('Error loading departments:', error);
      showErrorToast('Error', 'Failed to load departments');
    } finally {
      setLocationData(prev => ({ ...prev, loadingDepartments: false }));
    }
  };

  const handleDepartmentSelect = (department) => {
    setFormData(prev => ({ ...prev, departmentId: department.id }));
  };

  // Load departments when department admin is selected
  useEffect(() => {
    if (formData.userType === 'department_admin') {
      loadDepartments();
    }
  }, [formData.userType]);

  const handleAuthButtonPress = async () => {
    if (loading) return;

    if (!isLogin && currentStep === 1) {
      if (
        !formData.firstName?.trim() ||
        !formData.lastName?.trim() ||
        !formData.email?.trim() ||
        !formData.phone?.trim()
      ) {
        showErrorToast('Validation Error', 'Please fill in all required fields (marked with *)');
        return;
      }
      if (!isValidEmail(formData.email)) {
        showErrorToast('Validation Error', 'Please enter a valid email address');
        return;
      }
      if (!isValidPhone(formData.phone)) {
        showErrorToast('Validation Error', 'Please enter a valid phone number');
        return;
      }

      setCurrentStep(2);
      return;
    }

    await handleAuth();
  };

  const handleAuth = async () => {
    setLoading(true);

    try {
      // LOGIN FLOW
      if (isLogin) {
        if (!formData.email?.trim() || !formData.password) {
          Alert.alert('Error', 'Please fill in email and password');
          return;
        }

        console.log('Attempting sign in for email:', formData.email.trim());
        const result = await signIn(formData.email.trim(), formData.password);

        if (result.error) {
          console.error('Sign in error:', result.error);
          showErrorToast('Authentication Error', result.error.message || 'Failed to sign in');
          return;
        }

        const user = result.data?.user;
        if (!user) {
          console.error('No user data returned:', result);
          showErrorToast('Error', 'No user returned from authentication');
          return;
        }

        console.log('User signed in successfully:', user.id);

        // Get user type from profile or auth metadata
        let userType = 'citizen';
        if (result.data.profile?.user_type) {
          userType = result.data.profile.user_type;
        } else if (user.user_metadata?.user_type) {
          userType = user.user_metadata.user_type;
        }

        console.log('User type determined:', userType);

        // Navigate based on user type
        switch (userType) {
          case 'admin':
            console.log('Navigating to /admin');
            router.replace('/admin');
            break;

          case 'area_super_admin':
            console.log('Navigating to /area-super-admin');
            router.replace('/area-super-admin');
            break;

          case 'department_admin':
            console.log('Navigating to /department-admin');
            router.replace('/department-admin');
            break;

          case 'tender':
            console.log('Navigating to /tender-dashboard');
            router.replace('/tender-dashboard');
            break;

          default:
            console.log('Navigating to /(tabs)');
            router.replace('/(tabs)');
            break;
        }
      }
      // SIGNUP FLOW
      else if (currentStep === 2) {
        // Validation checks
        if (!formData.password || !formData.confirmPassword) {
          Alert.alert('Error', 'Please fill in password fields');
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          showErrorToast('Validation Error', 'Passwords do not match');
          return;
        }

        if (formData.password.length < 8) {
          showErrorToast('Validation Error', 'Password must be at least 8 characters long');
          return;
        }

        // Validate admin selections
        if (formData.userType === 'area_super_admin' && !formData.areaId) {
          Alert.alert('Error', 'Please select an area to manage');
          return;
        }

        if (formData.userType === 'department_admin' && !formData.departmentId) {
          Alert.alert('Error', 'Please select a department to manage');
          return;
        }

        // Prepare profile data
        const profileData = {
          fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
          phone: formData.phone.trim(),
          ...(formData.address?.trim() && { address: formData.address.trim() }),
          ...(formData.city?.trim() && { city: formData.city.trim() }),
          ...(formData.state?.trim() && { state: formData.state.trim() }),
          ...(formData.postalCode?.trim() && { postalCode: formData.postalCode.trim() }),
        };

        const locationData = {
          areaId: formData.areaId || null,
          departmentId: formData.departmentId || null,
        };

        const result = await signUp(
          formData.email.trim(),
          formData.password,
          formData.userType,
          profileData,
          locationData
        );

        if (result.error) {
          let errorMessage = result.error.message || 'Failed to create account';

          if (result.error.message?.includes('User already registered')) {
            errorMessage = 'This email is already registered. Please try signing in instead.';
          } else if (result.error.message?.includes('Email not confirmed')) {
            errorMessage = 'Please check your email and click the confirmation link before signing in.';
          } else if (result.error.message?.includes('invalid email')) {
            errorMessage = 'Please enter a valid email address.';
          } else if (result.error.message?.includes('Password')) {
            errorMessage = 'Password must be at least 8 characters long.';
          } else if (result.error.message?.includes('duplicate key')) {
            errorMessage = 'This email is already in use. Please try a different email.';
          } else if (result.error.message?.includes('violates check constraint')) {
            errorMessage = 'Invalid user type selected. Please try again.';
          }

          showErrorToast('Registration Error', errorMessage);
          return;
        }

        // Handle successful signup
        if (result.data) {
          setVerificationSent(true);
          showSuccessToast(
            'Account Created Successfully!',
            `Welcome to जनConnect! Please check your email (${formData.email}) to verify your account before signing in.`
          );

          // Reset form and switch to login after delay
          setTimeout(() => {
            setIsLogin(true);
            setCurrentStep(1);
            setVerificationSent(false);
            resetForm();
          }, 4000);
        } else {
          showErrorToast('Error', 'Account may have been created, but there was an issue. Please try signing in.');
          setTimeout(() => {
            setIsLogin(true);
            setCurrentStep(1);
            resetForm();
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Auth error:', error);

      let errorMessage = 'An unexpected error occurred';

      if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      showErrorToast('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail?.trim()) {
      showErrorToast('Validation Error', 'Please enter your email address');
      return;
    }

    if (!isValidEmail(resetEmail)) {
      showErrorToast('Validation Error', 'Please enter a valid email address');
      return;
    }

    try {
      setResetLoading(true);
      const result = await resetPassword(resetEmail.trim());

      if (result.error) {
        showErrorToast('Reset Error', result.error.message || 'Failed to send reset email');
        return;
      }

      showSuccessToast(
        'Reset Email Sent',
        `Password reset instructions have been sent to ${resetEmail}`
      );
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error) {
      console.error('Password reset error:', error);
      showErrorToast('Error', 'Failed to send password reset email');
    } finally {
      setResetLoading(false);
    }
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email?.trim() || '');
  };

  const isValidPhone = (phone) => {
    const cleanPhone = (phone || '').replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^[\+]?[1-9][\d]{7,15}$/;
    return phoneRegex.test(cleanPhone);
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      password: '',
      confirmPassword: '',
      userType: 'user',
      stateId: '',
      districtId: '',
      areaId: '',
      departmentId: '',
    });
    setLocationData({
      states: [],
      districts: [],
      areas: [],
      departments: [],
      loadingStates: false,
      loadingDistricts: false,
      loadingAreas: false,
      loadingDepartments: false,
    });
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const resendVerification = async () => {
    if (!formData.email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      const result = await sendVerificationEmail(formData.email);

      if (result.error) {
        showErrorToast('Error', result.error.message || 'Failed to send verification email');
      } else {
        showSuccessToast('Success', 'Verification email sent! Please check your inbox.');
      }
    } catch (error) {
      showErrorToast('Error', 'Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    if (isLogin) return null;

    return (
      <View style={styles.stepIndicator}>
        <View style={styles.stepContainer}>
          <View style={[styles.step, currentStep >= 1 && styles.stepActive]}>
            <Text style={[styles.stepText, currentStep >= 1 && styles.stepTextActive]}>1</Text>
          </View>
          <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />
          <View style={[styles.step, currentStep >= 2 && styles.stepActive]}>
            <Text style={[styles.stepText, currentStep >= 2 && styles.stepTextActive]}>2</Text>
          </View>
        </View>
        <View style={styles.stepLabels}>
          <Text style={styles.stepLabel}>Personal Info</Text>
          <Text style={styles.stepLabel}>Account Setup</Text>
        </View>
      </View>
    );
  };

  const renderUserTypeSelection = () => {
    if (isLogin) return null;

    return (
      <View style={styles.userTypeContainer}>
        <Text style={styles.userTypeLabel}>Select User Type</Text>
        <View style={styles.userTypeButtons}>
          {userTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.userTypeButton,
                formData.userType === type.id && styles.userTypeButtonActive,
                { borderColor: formData.userType === type.id ? type.color : '#E5E7EB' },
              ]}
              onPress={() => setFormData({ ...formData, userType: type.id })}
            >
              <View style={styles.userTypeContent}>
                <View style={styles.userTypeHeader}>
                  <Text style={styles.userTypeIcon}>{type.icon}</Text>
                  <Text
                    style={[
                      styles.userTypeText,
                      formData.userType === type.id && { color: type.color },
                    ]}
                  >
                    {type.label}
                  </Text>
                </View>
                <Text style={styles.userTypeDescription}>{type.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image
            source={require('../assets/images/favicon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>जनConnect</Text>
          <Text style={styles.subtitle}>
            {isLogin
              ? 'Welcome back to your civic platform!'
              : currentStep === 1
                ? 'Join your civic community'
                : 'Secure your account'}
          </Text>
        </View>

        {renderStepIndicator()}

        <View style={styles.form}>
          {renderUserTypeSelection()}

          {/* Step 1: Personal Information (Sign up only) */}
          {!isLogin && currentStep === 1 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                <Text style={styles.sectionSubtitle}>Fields marked with * are required</Text>
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <User size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="First Name *"
                    value={formData.firstName}
                    onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                    autoCapitalize="words"
                    autoComplete="given-name"
                  />
                </View>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <User size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Last Name *"
                    value={formData.lastName}
                    onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                    autoCapitalize="words"
                    autoComplete="family-name"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Mail size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address *"
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text.toLowerCase() })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              <View style={styles.inputContainer}>
                <Phone size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number * (e.g., +91 9876543210)"
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                />
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Address (Optional)</Text>
                <Text style={styles.sectionSubtitle}>Help us serve your area better</Text>
              </View>

              <View style={styles.inputContainer}>
                <MapPin size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Address"
                  value={formData.address}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
                  multiline
                  autoComplete="street-address"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <TextInput
                    style={styles.input}
                    placeholder="City"
                    value={formData.city}
                    onChangeText={(text) => setFormData({ ...formData, city: text })}
                    autoCapitalize="words"
                    autoComplete="address-level2"
                  />
                </View>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <TextInput
                    style={styles.input}
                    placeholder="State"
                    value={formData.state}
                    onChangeText={(text) => setFormData({ ...formData, state: text })}
                    autoCapitalize="words"
                    autoComplete="address-level1"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Postal Code"
                  value={formData.postalCode}
                  onChangeText={(text) => setFormData({ ...formData, postalCode: text })}
                  keyboardType="numeric"
                  autoComplete="postal-code"
                />
              </View>
            </>
          )}

          {/* Step 2: Password Setup and Admin Location Selection */}
          {(isLogin || (!isLogin && currentStep === 2)) && (
            <>
              {!isLogin && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Account Security</Text>
                  <Text style={styles.sectionSubtitle}>Create a strong password to protect your account</Text>
                </View>
              )}

              {isLogin && (
                <>
                  <View style={styles.inputContainer}>
                    <Mail size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email Address"
                      value={formData.email}
                      onChangeText={(text) => setFormData({ ...formData, email: text.toLowerCase() })}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </View>

                  <TouchableOpacity style={styles.linkButton} onPress={resendVerification}>
                    <Text style={styles.linkText}>Need to verify your email? Tap here</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.inputContainer}>
                <Lock size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={isLogin ? "Password" : "Create Password *"}
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  secureTextEntry={!showPassword}
                  autoComplete={isLogin ? "current-password" : "new-password"}
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

              {isLogin && (
                <TouchableOpacity
                  style={styles.forgotPasswordButton}
                  onPress={() => setShowForgotPassword(true)}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              {!isLogin && (
                <>
                  <View style={styles.inputContainer}>
                    <Lock size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm Password *"
                      value={formData.confirmPassword}
                      onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
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
                    Password must be at least 8 characters long
                  </Text>

                  {/* Location Selection for Admin Roles */}
                  {(formData.userType === 'area_super_admin' || formData.userType === 'department_admin') && (
                    <View style={styles.locationSection}>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Administrative Assignment</Text>
                        <Text style={styles.sectionSubtitle}>Select your assigned location and department</Text>
                      </View>

                      <DropdownSelector
                        label="State"
                        placeholder="Select a state"
                        options={locationData.states}
                        selectedValue={formData.stateId}
                        onSelect={handleStateSelect}
                        loading={locationData.loadingStates}
                        required
                      />

                      {formData.stateId && (
                        <DropdownSelector
                          label="District"
                          placeholder="Select a district"
                          options={locationData.districts}
                          selectedValue={formData.districtId}
                          onSelect={handleDistrictSelect}
                          loading={locationData.loadingDistricts}
                          required
                        />
                      )}

                      {formData.userType === 'area_super_admin' && formData.districtId && (
                        <DropdownSelector
                          label="Area to Manage"
                          placeholder="Select an area"
                          options={locationData.areas}
                          selectedValue={formData.areaId}
                          onSelect={handleAreaSelect}
                          loading={locationData.loadingAreas}
                          required
                        />
                      )}

                      {formData.userType === 'department_admin' && (
                        <DropdownSelector
                          label="Department to Manage"
                          placeholder="Select a department"
                          options={locationData.departments}
                          selectedValue={formData.departmentId}
                          onSelect={handleDepartmentSelect}
                          loading={locationData.loadingDepartments}
                          required
                          renderOption={(dept) => (
                            <View>
                              <Text style={styles.optionName}>{dept.name}</Text>
                              <Text style={styles.optionCode}>({dept.code})</Text>
                              <Text style={styles.optionCategory}>
                                {dept.category.charAt(0).toUpperCase() + dept.category.slice(1)}
                              </Text>
                              {dept.description && (
                                <Text style={styles.optionDescription}>{dept.description}</Text>
                              )}
                            </View>
                          )}
                        />
                      )}
                    </View>
                  )}
                </>
              )}
            </>
          )}

          <View style={styles.buttonContainer}>
            {!isLogin && currentStep === 2 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={goBack}
                disabled={loading}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.authButton,
                loading && styles.authButtonDisabled,
                !isLogin && currentStep === 2 && styles.authButtonHalf
              ]}
              onPress={handleAuthButtonPress}
              disabled={loading}
            >
              <Text style={styles.authButtonText}>
                {loading
                  ? (isLogin ? 'Signing In...' : currentStep === 1 ? 'Continue' : 'Creating Account...')
                  : (isLogin ? 'Sign In' : currentStep === 1 ? 'Continue' : 'Create Account')
                }
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setIsLogin(!isLogin);
                setCurrentStep(1);
                resetForm();
                setLoading(false);
              }}
              disabled={loading}
            >
              <Text style={[styles.switchLink, loading && styles.switchLinkDisabled]}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Terms and Privacy Notice */}
          {!isLogin && (
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By creating an account, you agree to our Terms of Service and Privacy Policy.
                Your data helps us serve your community better.
              </Text>
            </View>
          )}
        </View>

        {/* Forgot Password Modal */}
        <Modal visible={showForgotPassword} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <Text style={styles.modalSubtitle}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>

              <View style={styles.inputContainer}>
                <Mail size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowForgotPassword(false);
                    setResetEmail('');
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSubmitButton, resetLoading && styles.modalSubmitButtonDisabled]}
                  onPress={handleForgotPassword}
                  disabled={resetLoading}
                >
                  <Text style={styles.modalSubmitText}>
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 60,
  },
  logoImage: {
    width: 50,
    height: 50,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  stepIndicator: {
    paddingHorizontal: 40,
    marginBottom: 30,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  step: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActive: {
    backgroundColor: '#1E40AF',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  stepTextActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 10,
  },
  stepLineActive: {
    backgroundColor: '#1E40AF',
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  form: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginBottom: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  userTypeContainer: {
    marginBottom: 30,
  },
  userTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  userTypeButtons: {
    gap: 12,
  },
  userTypeButton: {
    padding: 16,
    borderWidth: 2,
    borderRadius: 12,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  userTypeButtonActive: {
    backgroundColor: '#F0F9FF',
  },
  userTypeContent: {
    gap: 8,
  },
  userTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userTypeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  userTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  userTypeDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 36,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
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
    marginTop: -12,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  linkButton: {
    alignSelf: 'flex-end',
    marginTop: -12,
    marginBottom: 16,
  },
  linkText: {
    fontSize: 14,
    color: '#1E40AF',
    textDecorationLine: 'underline',
  },
  locationSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  optionCode: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  optionCategory: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
    lineHeight: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  authButton: {
    flex: 1,
    backgroundColor: '#1E40AF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    elevation: 8,
  },
  authButtonHalf: {
    flex: 2,
  },
  authButtonDisabled: {
    backgroundColor: '#9CA3AF',
    elevation: 0,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  switchText: {
    color: '#6B7280',
    fontSize: 14,
  },
  switchLink: {
    color: '#1E40AF',
    fontSize: 14,
    fontWeight: '600',
  },
  switchLinkDisabled: {
    color: '#9CA3AF',
  },
  termsContainer: {
    marginTop: 20,
    paddingHorizontal: 8,
  },
  termsText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
    textDecorationLine: 'underline',
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
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
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
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
  },
  modalSubmitButtonDisabled: {
    opacity: 0.6,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});