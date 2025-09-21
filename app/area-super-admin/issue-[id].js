import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Building, Send, X, MapPin, Clock, User, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { getIssueById, assignIssueToDepartment, updateIssue, getDepartments } from '../../lib/supabase';

export default function AreaSuperAdminIssueDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [issue, setIssue] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [assignmentNotes, setAssignmentNotes] = useState('');
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        loadIssueDetails();
        loadDepartments();
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

    const loadDepartments = async () => {
        try {
            const { data, error } = await getDepartments();
            if (error) throw error;
            setDepartments(data || []);
        } catch (error) {
            console.error('Error loading departments:', error);
        }
    };

    const handleAssignToDepartment = () => {
        setSelectedDepartment('');
        setAssignmentNotes('');
        setShowAssignModal(true);
    };

    const submitAssignment = async () => {
        if (!selectedDepartment) {
            Alert.alert('Error', 'Please select a department');
            return;
        }

        try {
            setAssigning(true);

            const { error } = await assignIssueToDepartment(
                issue.id,
                selectedDepartment,
                assignmentNotes
            );

            if (error) throw error;

            Alert.alert(
                'Success',
                'Issue has been assigned to the department successfully',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setShowAssignModal(false);
                            loadIssueDetails(); // Reload to see updated status
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error assigning issue:', error);
            Alert.alert('Error', 'Failed to assign issue: ' + error.message);
        } finally {
            setAssigning(false);
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        try {
            const { error } = await updateIssue(issue.id, {
                status: newStatus,
                resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null
            });

            if (error) throw error;

            Alert.alert('Success', 'Issue status updated successfully');
            await loadIssueDetails();
        } catch (error) {
            console.error('Error updating status:', error);
            Alert.alert('Error', 'Failed to update issue status');
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
                    <Text style={styles.title}>Issue Details</Text>
                    <Text style={styles.subtitle}>Area Super Admin Review</Text>
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

                    {/* Reporter Info */}
                    <View style={styles.reporterSection}>
                        <Text style={styles.sectionTitle}>Reporter Information</Text>
                        <View style={styles.reporterInfo}>
                            <User size={16} color="#6B7280" />
                            <View style={styles.reporterDetails}>
                                <Text style={styles.reporterName}>
                                    {issue.profiles?.full_name || 'Anonymous User'}
                                </Text>
                                <Text style={styles.reporterEmail}>{issue.profiles?.email}</Text>
                                <Text style={styles.reportDate}>Reported on {formatDate(issue.created_at)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Location Info */}
                    {issue.location_name && (
                        <View style={styles.locationSection}>
                            <Text style={styles.sectionTitle}>Location</Text>
                            <View style={styles.locationInfo}>
                                <MapPin size={16} color="#6B7280" />
                                <View style={styles.locationDetails}>
                                    <Text style={styles.locationName}>{issue.location_name}</Text>

                                    {issue.address && (
                                        <Text style={styles.locationAddress}>{issue.address}</Text>
                                    )}

                                    {(issue.area || issue.ward) && (
                                        <Text style={styles.locationMeta}>
                                            {issue.area && `Area: ${issue.area}`}
                                            {issue.area && issue.ward && ' • '}
                                            {issue.ward && `Ward: ${issue.ward}`}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Assignment History */}
                    {issue.assignments && issue.assignments.length > 0 && (
                        <View style={styles.assignmentSection}>
                            <Text style={styles.sectionTitle}>Assignment History</Text>
                            {issue.assignments.map((assignment, index) => (
                                <View key={assignment.id} style={styles.assignmentItem}>
                                    <View style={styles.assignmentHeader}>
                                        <Text style={styles.assignmentType}>
                                            {assignment.assignment_type.replace('_', ' ').charAt(0).toUpperCase() + assignment.assignment_type.replace('_', ' ').slice(1)}
                                        </Text>
                                        <Text style={styles.assignmentDate}>{formatDate(assignment.created_at)}</Text>
                                    </View>
                                    <Text style={styles.assignmentDetails}>
                                        Assigned by {assignment.assigned_by_profile?.full_name} to {assignment.assigned_to_profile?.full_name}
                                    </Text>
                                    {assignment.assignment_notes && (
                                        <Text style={styles.assignmentNotes}>{assignment.assignment_notes}</Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Actions */}
                <View style={styles.actionsSection}>
                    {(issue.workflow_stage === 'reported' || issue.workflow_stage === 'area_review') && (
                        <TouchableOpacity
                            style={styles.assignButton}
                            onPress={handleAssignToDepartment}
                        >
                            <Building size={20} color="#FFFFFF" />
                            <Text style={styles.assignButtonText}>Assign to Department</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.statusActions}>
                        {issue.status !== 'acknowledged' && (
                            <TouchableOpacity
                                style={[styles.statusButton, { backgroundColor: '#3B82F6' }]}
                                onPress={() => handleStatusUpdate('acknowledged')}
                            >
                                <Text style={styles.statusButtonText}>Acknowledge</Text>
                            </TouchableOpacity>
                        )}

                        {issue.status !== 'in_progress' && issue.status !== 'resolved' && (
                            <TouchableOpacity
                                style={[styles.statusButton, { backgroundColor: '#1E40AF' }]}
                                onPress={() => handleStatusUpdate('in_progress')}
                            >
                                <Text style={styles.statusButtonText}>In Progress</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Assignment Modal */}
            <Modal visible={showAssignModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Assign to Department</Text>
                            <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>{issue.title}</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Select Department *</Text>
                            <View style={styles.departmentsList}>
                                {departments.map((dept) => (
                                    <TouchableOpacity
                                        key={dept.id}
                                        style={[
                                            styles.departmentOption,
                                            selectedDepartment === dept.id && styles.departmentOptionActive
                                        ]}
                                        onPress={() => setSelectedDepartment(dept.id)}
                                    >
                                        <Text style={[
                                            styles.departmentOptionText,
                                            selectedDepartment === dept.id && styles.departmentOptionTextActive
                                        ]}>
                                            {dept.name}
                                        </Text>
                                        <Text style={styles.departmentCategory}>
                                            {dept.category}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Assignment Notes</Text>
                            <TextInput
                                style={styles.textArea}
                                placeholder="Add any specific instructions or notes for the department..."
                                value={assignmentNotes}
                                onChangeText={setAssignmentNotes}
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={() => setShowAssignModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalSubmitButton, assigning && styles.modalSubmitButtonDisabled]}
                                onPress={submitAssignment}
                                disabled={assigning}
                            >
                                <Send size={16} color="#FFFFFF" />
                                <Text style={styles.modalSubmitText}>
                                    {assigning ? 'Assigning...' : 'Assign Issue'}
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
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 12,
    },
    reporterSection: {
        marginBottom: 20,
    },
    reporterInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    reporterDetails: {
        flex: 1,
    },
    reporterName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    reporterEmail: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    reportDate: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
    },
    locationSection: {
        marginBottom: 20,
    },
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
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
    locationMeta: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
    },
    assignmentSection: {
        marginBottom: 20,
    },
    assignmentItem: {
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    assignmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    assignmentType: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E40AF',
    },
    assignmentDate: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    assignmentDetails: {
        fontSize: 14,
        color: '#374151',
        marginBottom: 4,
    },
    assignmentNotes: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
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
    },
    assignButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1E40AF',
        paddingVertical: 16,
        borderRadius: 12,
        marginBottom: 16,
        gap: 8,
    },
    assignButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    statusActions: {
        flexDirection: 'row',
        gap: 8,
    },
    statusButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    statusButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
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
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 20,
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
    departmentsList: {
        gap: 8,
    },
    departmentOption: {
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    departmentOptionActive: {
        backgroundColor: '#1E40AF',
        borderColor: '#1E40AF',
    },
    departmentOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    departmentOptionTextActive: {
        color: '#FFFFFF',
    },
    departmentCategory: {
        fontSize: 12,
        color: '#6B7280',
    },
    textArea: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#111827',
        textAlignVertical: 'top',
        minHeight: 80,
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