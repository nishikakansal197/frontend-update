import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getIssueById, updateIssue } from '../../lib/supabase';

export default function AdminIssueDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [issue, setIssue] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await getIssueById(id);
    if (error) {
      Alert.alert('Error', error.message || 'Failed to load issue');
    }
    setIssue(data || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  const changeStatus = async (status) => {
    const { error } = await updateIssue(id, { status });
    if (error) {
      Alert.alert('Error', error.message || 'Failed to update status');
      return;
    }
    await load();
  };

  if (loading) {
    return (
      <View style={styles.center}> 
        <ActivityIndicator color="#1E40AF" />
      </View>
    );
  }

  if (!issue) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#6B7280' }}>Issue not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{issue.title || 'Issue'}</Text>
      <Text style={styles.meta}>Status: {issue.status} • Priority: {issue.priority || 'low'}</Text>
      <Text style={styles.meta}>Category: {issue.category || 'general'}</Text>
      {issue.description ? <Text style={styles.desc}>{issue.description}</Text> : null}

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#F59E0B' }]} onPress={() => changeStatus('in-progress')}>
          <Text style={styles.btnText}>Mark In Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#10B981' }]} onPress={() => changeStatus('resolved')}>
          <Text style={styles.btnText}>Mark Resolved</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.back()} style={[styles.btn, { backgroundColor: '#111827', marginTop: 8 }]}>
        <Text style={styles.btnText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  desc: { fontSize: 14, color: '#1F2937', marginTop: 12, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  btnText: { color: 'white', fontWeight: '700' },
}); 