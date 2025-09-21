import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, FileText, CircleCheck as CheckCircle, Send, X, MapPin, Clock, User, Camera, Upload } from 'lucide-react-native';
import { getIssueById, createTender, updateIssue } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { uploadMultipleImages } from '../../lib/cloudinary';

export default function DepartmentAdminIssueDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [issue, setIssue] = useState(null);
    const [showTenderModal, setShowTenderModal] = useState(false);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [tenderData, setTenderData] = useState({
        title: '',
        description: '',
        estimatedBudgetMin: '',
        estimatedBudgetMax: '',
        deadlineDate: '',
        requirements: ''
    });
    const [completionData, setCompletionData] = useState({
        description: '',
        images: []
    });
    const [creating, setCreating] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [selectedImages, setSelectedImages] = useState([]);

    useEffect(() => {
        loadIssueDetails();
    }, [id]);

    const loadIssueDetails = async () => {
        try {
            setLoading(true);
            const { data, error } = await getIssueById(id);
            if (error) throw error;
            setIssue(data);
        } catch (error) {
            console.error('Error loading issue:', error);
            Alert.alert('Error', 'Failed to load issue details');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTender = () => {
        setTenderData({
            title: `Tender for: ${issue.title}`,
            description: `${issue.description}\n\nLocation: ${issue.location_name || issue.address}`,
            estimatedBudgetMin: '',
            estimatedBudgetMax: '',
            deadlineDate: '',
            requirements: ''
        });
        setShowTenderModal(true);
    };

    const submitTender = async () => {
        if (!tenderData.title || !tenderData.description || !tenderData.deadlineDate) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        try {
            setCreating(true);

            const tender = {
                title: tenderData.title,
                description: tenderData.description,
                category: issue.category,
                location: issue.location_name || issue.address,
                area: issue.area,
                ward: issue.ward,
                estimated_budget_min: parseFloat(tenderData.estimatedBudgetMin) || 0,
                estimated_budget_max: parseFloat(tenderData.estimatedBudgetMax) || 0,
                deadline_date: tenderData.deadlineDate,
                submission_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                priority: issue.priority,
                requirements: tenderData.requirements.split('\n').filter(r => r.trim()),
                status: 'available',
                source_issue_id: issue.id,
                department_id: issue.assigned_department_id,
            };

            const { error } = await createTender(tender);
            if (error) throw error;

            // Update issue workflow stage
            const { error: updateError } = await updateIssue(issue.id, {
                workflow_stage: 'contractor_assigned',
                status: 'in_progress'
            });

            if (updateError) console.error('Error updating issue workflow:', updateError);

            Alert.alert(
                'Success',
                'Tender has been created successfully and is now available for contractors to bid',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setShowTenderModal(false);
                            loadIssueDetails();
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error creating tender:', error);
            Alert.alert('Error', 'Failed to create tender: ' + error.message);
        } finally {
            setCreating(false);
        }
    };

    const handleMarkComplete = () => {
        setCompletionData({
            description: '',
            images: []
        });
        setSelectedImages([]);
        setShowCompletionModal(true);
    };

    const pickImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setSelectedImages([...selectedImages, ...result.assets]);
        }
    };

    const takePhoto = async () => {
        const result = await ImagePicker.launchCameraAsync({
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setSelectedImages([...selectedImages, ...result.assets]);
        }
    };

    const removeImage = (index) => {
        setSelectedImages(selectedImages.filter((_, i) => i !== index));
    };

    const submitCompletion = async () => {
        if (!completionData.description) {
            Alert.alert('Error', 'Please provide completion details');
            return;
        }

        try {
            setCompleting(true);

            // Upload images if any
            let imageUrls = [];
            if (selectedImages.length > 0) {
                const imageUris = selectedImages.map(img => img.uri);
                const uploadResult = await uploadMultipleImages(imageUris);

                if (uploadResult.successful.length > 0) {
                    imageUrls = uploadResult.successful.map(result => result.url);
                }
            }

            // Update issue status to resolved
            const { error: updateError } = await updateIssue(issue.id, {
                status: 'resolved',
                workflow_stage: 'resolved',
                resolved_at: new Date().toISOString(),
                final_resolution_notes: completionData.description,
            });

            if (updateError) throw updateError;

            Alert.alert(
                'Success',
                'Issue has been marked as completed and resolved',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setShowCompletionModal(false);
                            loadIssueDetails();
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error marking completion:', error);
            Alert.alert('Error', 'Failed to mark issue as complete: ' + error.message);
        } finally {
            setCompleting(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: '#F59E0B',
            acknowledged: '#3B82F6',
            in_progress: '#1E40AF',
            resolved: '#10B981',
        };
        return colors[status] || '#6B7280';
    };

    const getCategoryColor = (category) => {
        const colors = {
            roads: '#EF4444',
            utilities: '#F59E0B',
            environment: '#10B981',
            safety: '#8B5CF6',
            parks: '#06B6D4',
        };
        return colors[category] || '#6B7280';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading issue details...</Text>
            </View>
        );
    }

    if (!issue) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Issue not found</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
                    <ArrowLeft size={24} color="#1E40AF" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>Issue Management</Text>
                    <Text style={styles.subtitle}>Department Admin Actions</Text>
                </View>
            </View>

            <ScrollView style={styles.content}>
                {/* Issue Overview */}
                <View style={styles.section}>
                    <View style={styles.issueHeader}>
                        <View style={styles.issueMeta}>
                            <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(issue.category) + '20' }]}>
                                <Text style={[styles.categoryText, { color: getCategoryColor(issue.category) }]}>
                                    {issue.category.charAt(0).toUpperCase() + issue.category.slice(1)}
                                </Text>
                            </View>
                            <View style={[styles.priorityBadge, { backgroundColor: getStatusColor(issue.priority) }]}>
                                <Text style={styles.priorityText}>
                                    {issue.priority.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.statusContainer}>
                            <Text style={[styles.statusText, { color: getStatusColor(issue.status) }]}>
                                {issue.status.replace('_', ' ').charAt(0).toUpperCase() + issue.status.replace('_', ' ').slice(1)}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.issueTitle}>{issue.title}</Text>
                    <Text style={styles.issueDescription}>{issue.description}</Text>

                    {/* Location Info */}
                    {issue.location_name && (
                        <View style={styles.locationInfo}>
                            <MapPin size={16} color="#6B7280" />
                            <View style={styles.locationDetails}>
                                <Text style={styles.locationName}>{issue.location_name}</Text>
                                {issue.address && <Text style={styles.locationAddress}>{issue.address}</Text>}
                }
                            </View>
                        </View>
                    )}
                </View>

                {/* Actions */}
                <View style={styles.actionsSection}>
                    {issue.workflow_stage === 'department_assigned' && (
                        <>
                            <TouchableOpacity
                                style={styles.tenderButton}
                                onPress={handleCreateTender}
                            >
                                <FileText size={20} color="#FFFFFF" />
                                <Text style={styles.tenderButtonText}>Create Tender</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.completeButton}
                                onPress={handleMarkComplete}
                            >
                                <CheckCircle size={20} color="#FFFFFF" />
                                <Text style={styles.completeButtonText}>Mark as Complete</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Create Tender Modal */}
            <Modal visible={showTenderModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Create Tender</Text>
                            <TouchableOpacity onPress={() => setShowTenderModal(false)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalForm}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Tender Title *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={tenderData.title}
                                    onChangeText={(text) => setTenderData({ ...tenderData, title: text })}
                                    placeholder="Enter tender title"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Description *</Text>
                                <TextInput
                                    style={[styles.textInput, styles.textArea]}
                                    value={tenderData.description}
                                    onChangeText={(text) => setTenderData({ ...tenderData, description: text })}
                                    placeholder="Detailed tender description"
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>

                            <View style={styles.inputRow}>
                                <View style={styles.inputGroupHalf}>
                                    <Text style={styles.inputLabel}>Min Budget ($)</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={tenderData.estimatedBudgetMin}
                                        onChangeText={(text) => setTenderData({ ...tenderData, estimatedBudgetMin: text })}
                                        placeholder="0"
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.inputGroupHalf}>
                                    <Text style={styles.inputLabel}>Max Budget ($)</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={tenderData.estimatedBudgetMax}
                                        onChangeText={(text) => setTenderData({ ...tenderData, estimatedBudgetMax: text })}
                                        placeholder="0"
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Deadline Date *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={tenderData.deadlineDate}
                                    onChangeText={(text) => setTenderData({ ...tenderData, deadlineDate: text })}
                                    placeholder="YYYY-MM-DD"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Requirements</Text>
                                <TextInput
                                    style={[styles.textInput, styles.textArea]}
                                    value={tenderData.requirements}
                                    onChangeText={(text) => setTenderData({ ...tenderData, requirements: text })}
                                    placeholder="List requirements (one per line)"
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={() => setShowTenderModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalSubmitButton, creating && styles.modalSubmitButtonDisabled]}
                                onPress={submitTender}
                                disabled={creating}
                            >
                                <Send size={16} color="#FFFFFF" />
                                <Text style={styles.modalSubmitText}>
                                    {creating ? 'Creating...' : 'Create Tender'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Completion Modal */}
            <Modal visible={showCompletionModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Mark Issue Complete</Text>
                            <TouchableOpacity onPress={() => setShowCompletionModal(false)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalForm}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Completion Details *</Text>
                                <TextInput
                                    style={[styles.textInput, styles.textArea]}
                                    value={completionData.description}
                                    onChangeText={(text) => setCompletionData({ ...completionData, description: text })}
                                    placeholder="Describe how the issue was resolved..."
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>

                            {/* Photo Upload */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Completion Photos</Text>
                                <View style={styles.mediaContainer}>
                                    <TouchableOpacity style={styles.mediaButton} onPress={takePhoto}>
                                        <Camera size={20} color="#1E40AF" />
                                        <Text style={styles.mediaButtonText}>Take Photo</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.mediaButton} onPress={pickImages}>
                                        <Upload size={20} color="#1E40AF" />
                                        <Text style={styles.mediaButtonText}>Upload Photos</Text>
                                    </TouchableOpacity>
                                </View>

                                {selectedImages.length > 0 && (
                                    <ScrollView horizontal style={styles.imagePreview} showsHorizontalScrollIndicator={false}>
                                        {selectedImages.map((image, index) => (
                                            <View key={index} style={styles.imageContainer}>
                                                <Image source={{ uri: image.uri }} style={styles.previewImage} />
                                                <TouchableOpacity
                                                    style={styles.removeImageButton}
                                                    onPress={() => removeImage(index)}
                                                >
                                                    <X size={16} color="#FFFFFF" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </ScrollView>
                                )}
                            </View>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={() => setShowCompletionModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalSubmitButton, completing && styles.modalSubmitButtonDisabled]}
                                onPress={submitCompletion}
                                disabled={completing}
                            >
                                <CheckCircle size={16} color="#FFFFFF" />
                                <Text style={styles.modalSubmitText}>
                                    {completing ? 'Completing...' : 'Mark Complete'}
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: '#EF4444',
        marginBottom: 20,
    },
    backButton: {
        backgroundColor: '#1E40AF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    backButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    header: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    headerBackButton: {
        width: 40,
        height: 40,
        backgroundColor: '#F0F9FF',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    headerContent: {
        flex: 1,
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
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
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
    issueHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    issueMeta: {
        flexDirection: 'row',
        gap: 8,
    },
    categoryBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '600',
    },
    priorityBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    priorityText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    statusContainer: {
        alignItems: 'flex-end',
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
    },
    issueTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
    },
    issueDescription: {
        fontSize: 16,
        color: '#6B7280',
        lineHeight: 24,
        marginBottom: 20,
    },
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginTop: 16,
    },
    locationDetails: {
        flex: 1,
    },
    locationName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    locationAddress: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    actionsSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        gap: 12,
    },
    tenderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F59E0B',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    tenderButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    completeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10B981',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    completeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
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
    inputGroup: {
        marginBottom: 16,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
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
    mediaContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    mediaButton: {
        flex: 1,
        backgroundColor: '#F0F9FF',
        borderWidth: 2,
        borderColor: '#1E40AF',
        borderStyle: 'dashed',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        gap: 6,
    },
    mediaButtonText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#1E40AF',
    },
    imagePreview: {
        marginTop: 12,
    },
    imageContainer: {
        position: 'relative',
        marginRight: 12,
    },
    previewImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    removeImageButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#EF4444',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
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
    modalSubmitButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#1E40AF',
        gap: 6,
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