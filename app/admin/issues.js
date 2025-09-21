import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getIssues } from '../../lib/supabase';

export default function AdminIssues() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [issues, setIssues] = useState([]);

  const load = async () => {
    setLoading(true);
    const { data } = await getIssues();
    setIssues(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.item} onPress={() => router.push(`/admin/issue-${item.id}`)}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle}>{item.title || 'Untitled'}</Text>
        <Text style={styles.meta}>{item.category || 'general'} • {item.priority || 'low'} • {item.status}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Issues</Text>
      {loading ? (
        <ActivityIndicator color="#1E40AF" />
      ) : (
        <FlatList
          data={issues}
          keyExtractor={(i) => String(i.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  meta: { fontSize: 12, color: '#6B7280' },
  sep: { height: 1, backgroundColor: '#F3F4F6' },
  chevron: { fontSize: 28, color: '#9CA3AF', paddingHorizontal: 8 },
}); 