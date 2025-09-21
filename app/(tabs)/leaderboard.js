import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
  Trophy, Medal, Star, Users, TrendingUp, Award,
  MapPin, MessageSquare, Activity
} from 'lucide-react-native';
import { getLeaderboard } from '../../lib/supabase';

export default function LeaderboardScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalIssues: 0,
    totalPosts: 0,
    avgScore: 0,
  });

  useEffect(() => {
    loadLeaderboard();
  }, [selectedPeriod, selectedCategory]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const { data, error } = await getLeaderboard(selectedPeriod);
      if (error) throw error;

      // quick debug: inspect what the backend returned
      console.log('raw leaderboard data:', JSON.stringify(data, null, 2));

      // Normalize, parse numeric fields and dedupe by user id
      const map = new Map();
      (data || []).forEach((u) => {
        const id = u.id || u.user_id || u.uid;
        if (!id) return; // skip weird rows

        // defensive parsing
        const score = Number(u.total_score ?? u.score ?? 0) || 0;
        const issues = Number(u.issues_reported ?? u.issue_count ?? 0) || 0;
        const posts = Number(u.posts_created ?? u.post_count ?? 0) || 0;

        // parse badges if backend returned a JSON string
        let badges = [];
        if (Array.isArray(u.badges)) badges = u.badges;
        else if (typeof u.badges === 'string' && u.badges.length) {
          try { badges = JSON.parse(u.badges); }
          catch { badges = u.badges.split?.(',').map(s => s.trim()) || []; }
        }

        if (!map.has(id)) {
          map.set(id, { ...u, id, total_score: score, issues_reported: issues, posts_created: posts, badges });
        } else {
          const prev = map.get(id);
          // IMPORTANT: if duplicate rows exist due to joins, do NOT blindly sum total_score—
          // choose the max (most likely the correct snapshot), but sum counts like issues/posts if you want aggregate counts.
          prev.total_score = Math.max(prev.total_score || 0, score);
          prev.issues_reported = (prev.issues_reported || 0) + issues;
          prev.posts_created = (prev.posts_created || 0) + posts;
          prev.badges = Array.from(new Set([...(prev.badges || []), ...badges]));
          map.set(id, prev);
        }
      });

      let filteredData = Array.from(map.values());

      // sort descending by numeric score
      filteredData.sort((a, b) => (Number(b.total_score) || 0) - (Number(a.total_score) || 0));

      setLeaderboardData(filteredData);

      // Stats: always coerce to Number to avoid string concatenation
      const totalUsers = filteredData.length;
      const totalIssues = filteredData.reduce((s, u) => s + (Number(u.issues_reported) || 0), 0);
      const totalPosts = filteredData.reduce((s, u) => s + (Number(u.posts_created) || 0), 0);
      const avgScore =
        totalUsers > 0
          ? Math.round(filteredData.reduce((s, u) => s + (Number(u.total_score) || 0), 0) / totalUsers)
          : 0;

      setStats({ totalUsers, totalIssues, totalPosts, avgScore });
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };


  const periods = [
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'quarter', label: 'Quarter' },
    { id: 'year', label: 'All Time' },
  ];

  const categories = [
    { id: 'all', label: 'Overall' },
    { id: 'reporter', label: 'Top Reporters' },
    { id: 'contributor', label: 'Contributors' },
    { id: 'solver', label: 'Problem Solvers' },
  ];

  // Top 3
  const getDefaultAvatar = (name) => {
    const avatars = ['👤', '👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍💻', '👩‍💻'];
    const index = name && name.length ? name.length % avatars.length : 0;
    return avatars[index];
  };

  const topUsers = leaderboardData.slice(0, 3).map((user, idx) => ({
    ...user,
    rank: idx + 1,
    avatar: user.avatar_url || getDefaultAvatar(user.full_name || user.first_name || 'User'),
    name: user.full_name || user.first_name || 'Anonymous',
    change: '+' + Math.floor(Math.random() * 20),
  }));

  const remainingUsers = leaderboardData.slice(3);

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return <Trophy size={24} color="#FFD700" />;
      case 2: return <Medal size={24} color="#C0C0C0" />;
      case 3: return <Award size={24} color="#CD7F32" />;
      default: return <Text style={styles.rankNumber}>#{rank}</Text>;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Activity size={32} color="#1E40AF" />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Community Leaderboard</Text>
        <Text style={styles.subtitle}>Recognizing active community members</Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersSection}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Time Period</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterButtons}>
              {periods.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.filterButton, selectedPeriod === p.id && styles.filterButtonActive]}
                  onPress={() => setSelectedPeriod(p.id)}
                >
                  <Text
                    style={[styles.filterText, selectedPeriod === p.id && styles.filterTextActive]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterButtons}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.filterButton, selectedCategory === c.id && styles.filterButtonActive]}
                  onPress={() => setSelectedCategory(c.id)}
                >
                  <Text
                    style={[styles.filterText, selectedCategory === c.id && styles.filterTextActive]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Podium */}
      {topUsers.length >= 3 && (
        <View style={styles.podiumSection}>
          <Text style={styles.sectionTitle}>Top Contributors</Text>
          <View style={styles.podium}>
            {/* 2nd */}
            <View style={styles.podiumPlace}>
              <Text style={styles.podiumAvatar}>{topUsers[1].avatar}</Text>
              <View style={[styles.podiumBar, styles.secondPlace]} />
              <Text style={styles.podiumName}>{topUsers[1].name.split(' ')[0]}</Text>
              <Text style={styles.podiumScore}>{topUsers[1].total_score}</Text>
              <Medal size={20} color="#C0C0C0" />
            </View>

            {/* 1st */}
            <View style={styles.podiumPlace}>
              <Text style={styles.crown}>👑</Text>
              <Text style={styles.podiumAvatar}>{topUsers[0].avatar}</Text>
              <View style={[styles.podiumBar, styles.firstPlace]} />
              <Text style={styles.podiumName}>{topUsers[0].name.split(' ')[0]}</Text>
              <Text style={styles.podiumScore}>{topUsers[0].total_score}</Text>
              <Trophy size={20} color="#FFD700" />
            </View>

            {/* 3rd */}
            <View style={styles.podiumPlace}>
              <Text style={styles.podiumAvatar}>{topUsers[2].avatar}</Text>
              <View style={[styles.podiumBar, styles.thirdPlace]} />
              <Text style={styles.podiumName}>{topUsers[2].name.split(' ')[0]}</Text>
              <Text style={styles.podiumScore}>{topUsers[2].total_score}</Text>
              <Award size={20} color="#CD7F32" />
            </View>
          </View>
        </View>
      )}

      {/* Top 3 list */}
      {topUsers.length > 0 && (
        <View style={styles.topThreeSection}>
          {topUsers.map((user, i) => (
            <TouchableOpacity key={user.id || i} style={styles.topUserCard}>
              <View style={styles.userRank}>{getRankIcon(i + 1)}</View>
              <Text style={styles.userAvatar}>{user.avatar}</Text>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.full_name || user.first_name || 'Anonymous'}</Text>
                <Text style={styles.userLevel}>{user.level}</Text>
                <View style={styles.userStats}>
                  <Text style={styles.statText}>{user.issues_reported || 0} reported</Text>
                </View>
              </View>
              <View style={styles.userScore}>
                <Text style={styles.scoreNumber}>{user.total_score || 0}</Text>
              </View>
              <View style={styles.userBadges}>
                {(user.badges || []).map((badge, idx) => (
                  <Text key={idx} style={styles.badge}>{badge}</Text>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Remaining leaderboard
      <View style={styles.leaderboardSection}>
        <Text style={styles.sectionTitle}>Rankings</Text>
        <View style={styles.leaderboardList}>
          {remainingUsers.map((u, i) => (
            <TouchableOpacity key={u.id || i} style={styles.leaderboardItem}>
              <View style={styles.itemRank}>
                <Text style={styles.rankNumber}>#{i + 4}</Text>
              </View>
              <Text style={styles.itemAvatar}>{u.avatar_url || getDefaultAvatar(u.full_name || u.first_name || 'User')}</Text>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{u.full_name || u.first_name || 'Anonymous'}</Text>
                <Text style={styles.itemScore}>{u.total_score || 0} points</Text>
                <View style={styles.itemStats}>
                  <Text style={styles.itemStatText}>
                    {u.issues_reported || 0} issues • {u.posts_created || 0} posts
                  </Text>
                </View>
              </View>
              <Text style={[styles.itemChange, { color: '#10B981' }]}>
                +{Math.floor(Math.random() * 10)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View> */}

      {/* Stats summary */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Community Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Users size={24} color="#1E40AF" />
            <Text style={styles.statNumber}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Active Members</Text>
          </View>
          <View style={styles.statCard}>
            <MapPin size={24} color="#EF4444" />
            <Text style={styles.statNumber}>{stats.totalIssues}</Text>
            <Text style={styles.statLabel}>Issues Reported</Text>
          </View>
          <View style={styles.statCard}>
            <MessageSquare size={24} color="#8B5CF6" />
            <Text style={styles.statNumber}>{stats.totalPosts}</Text>
            <Text style={styles.statLabel}>Community Posts</Text>
          </View>
          <View style={styles.statCard}>
            <TrendingUp size={24} color="#10B981" />
            <Text style={styles.statNumber}>{stats.avgScore}</Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>
        </View>
      </View>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
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
  filtersSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  podiumSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  podiumPlace: {
    alignItems: 'center',
    flex: 1,
  },
  crownContainer: {
    marginBottom: -10,
    zIndex: 1,
  },
  crown: {
    fontSize: 24,
  },
  podiumAvatar: {
    fontSize: 32,
    marginBottom: 8,
  },
  podiumBar: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginBottom: 8,
  },
  firstPlace: {
    height: 80,
    backgroundColor: '#FFD700',
  },
  secondPlace: {
    height: 60,
    backgroundColor: '#C0C0C0',
  },
  thirdPlace: {
    height: 40,
    backgroundColor: '#CD7F32',
  },
  podiumName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  podiumScore: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  topThreeSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginBottom: 8,
  },
  topUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  userRank: {
    width: 40,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
  },
  userAvatar: {
    fontSize: 24,
    marginHorizontal: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  userLevel: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '500',
    marginBottom: 2,
  },
  userStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
  },
  userScore: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  scoreNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  scoreChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  userBadges: {
    flexDirection: 'row',
    gap: 2,
  },
  badge: {
    fontSize: 12,
  },
  leaderboardSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 8,
  },
  leaderboardList: {
    gap: 8,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  itemRank: {
    width: 32,
  },
  itemAvatar: {
    fontSize: 20,
    marginHorizontal: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  itemScore: {
    fontSize: 12,
    color: '#6B7280',
  },
  itemStats: {
    marginTop: 2,
  },
  itemStatText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  itemChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});