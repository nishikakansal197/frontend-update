import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl, Image, Dimensions } from 'react-native';
import { MessageSquare, Filter, Search, MapPin, Clock, AlertTriangle, CheckCircle, Share } from 'lucide-react-native';
import { getCommunityFeed, getCurrentUser, voteOnIssue, getUserVote } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { Platform, Share as RNShare } from "react-native";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

const handleShare = async (item) => {
  try {
    const deepLink = `http://localhost:8081/community/${item.id}`;
    const webLink = `http://localhost:8081/community/${item.id}`; 

    if (Platform.OS === "web") {
      // 🌐 Web → share text + link only
      if (navigator.share) {
        await navigator.share({
          title: item.title || "Check this out",
          text: item.description || "",
          url: webLink,
        });
      } else {
        alert("Sharing is not supported in this browser.");
      }
      return;
    }

    // 📱 Native → share link + optional image
    if (item.imageUrl && item.imageUrl.startsWith("http")) {
      if (!(await Sharing.isAvailableAsync())) {
        alert("Sharing is not available on this device");
        return;
      }

      // download image first
      const filename = item.imageUrl.split("/").pop() || "shared-image.jpg";
      const localPath = FileSystem.cacheDirectory + filename;

      const downloadResumable = FileSystem.createDownloadResumable(
        item.imageUrl,
        localPath
      );

      const { uri } = await downloadResumable.downloadAsync();

      // share image + link
      await Sharing.shareAsync(uri, {
        dialogTitle: item.title || "Check this out!",
        mimeType: "image/jpeg",
        UTI: "public.jpeg", // iOS
      });

      // also share text with deep link
      await RNShare.share({
        message: `${item.title || "Update"}\n\n${item.description || ""}\n\nOpen: ${deepLink}\nOr view in browser: ${webLink}`,
      });
    } else {
      // fallback → only text + link
      await RNShare.share({
        message: `${item.title || "Update"}\n\n${item.description || ""}\n\nOpen: ${deepLink}\nOr view in browser: ${webLink}`,
      });
    }
  } catch (error) {
    console.error("❌ Error sharing:", error.message);
  }
};


const { width } = Dimensions.get('window');

export default function CommunityScreen() {
  const { t } = useTranslation();
  const [feedData, setFeedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [userVotes, setUserVotes] = useState({});
  const [user, setUser] = useState(null);

  const typeFilters = [
    { id: 'all', label: 'All Posts', icon: '📋' },
    { id: 'issue', label: 'Issues', icon: '🚨' },
    { id: 'post', label: 'Community', icon: '💬' },
  ];

  const categoryFilters = [
    { id: 'all', label: 'All Categories' },
    { id: 'roads', label: 'Roads', color: '#EF4444' },
    { id: 'utilities', label: 'Utilities', color: '#F59E0B' },
    { id: 'environment', label: 'Environment', color: '#10B981' },
    { id: 'safety', label: 'Safety', color: '#8B5CF6' },
    { id: 'parks', label: 'Parks', color: '#06B6D4' },
    { id: 'discussions', label: 'Discussions', color: '#6366F1' },
    { id: 'announcements', label: 'Announcements', color: '#EF4444' },
    { id: 'suggestions', label: 'Suggestions', color: '#10B981' },
    { id: 'events', label: 'Events', color: '#F59E0B' },
  ];

  const statusFilters = [
    { id: 'all', label: 'All Status' },
    { id: 'pending', label: 'Pending', color: '#F59E0B' },
    { id: 'acknowledged', label: 'Acknowledged', color: '#3B82F6' },
    { id: 'in_progress', label: 'In Progress', color: '#1E40AF' },
    { id: 'resolved', label: 'Resolved', color: '#10B981' },
  ];

  useEffect(() => {
    loadUser();
    loadFeed();
  }, [selectedFilter, selectedType, selectedStatus, searchQuery]);

  const loadUser = async () => {
    try {
      const { user: currentUser } = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadFeed = async () => {
    try {
      setLoading(true);

      const filters = {
        category: selectedFilter,
        status: selectedStatus,
        location: searchQuery
      };

      const { data, error } = await getCommunityFeed(filters);
      if (error) throw error;

      let filteredData = data || [];

      // Filter by type
      if (selectedType !== 'all') {
        filteredData = filteredData.filter(item => item.type === selectedType);
      }

      setFeedData(filteredData);

      // Load user votes for issues
      if (user) {
        const votes = {};
        const issueIds = filteredData.filter(item => item.type === 'issue').map(item => item.id);

        for (const issueId of issueIds) {
          const { data: voteData } = await getUserVote(issueId);
          if (voteData) {
            votes[issueId] = voteData.vote_type;
          }
        }
        setUserVotes(votes);
      }
    } catch (error) {
      console.error('Error loading feed:', error);
      Alert.alert('Error', 'Failed to load community feed');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  const handleVote = async (issueId, voteType) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to vote on issues');
      return;
    }

    try {
      const { error } = await voteOnIssue(issueId, voteType);
      if (error) throw error;

      // Update local state
      setUserVotes(prev => ({
        ...prev,
        [issueId]: prev[issueId] === voteType ? null : voteType
      }));

      // Refresh feed to get updated vote counts
      await loadFeed();
    } catch (error) {
      console.error('Error voting:', error);
      Alert.alert('Error', 'Failed to vote on issue');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock size={14} color="#F59E0B" />;
      case 'acknowledged': return <MessageSquare size={14} color="#3B82F6" />;
      case 'in_progress': return <AlertTriangle size={14} color="#1E40AF" />;
      case 'resolved': return <CheckCircle size={14} color="#10B981" />;
      default: return <Clock size={14} color="#6B7280" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'acknowledged': return '#3B82F6';
      case 'in_progress': return '#1E40AF';
      case 'resolved': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getCategoryColor = (category) => {
    const categoryFilter = categoryFilters.find(f => f.id === category);
    return categoryFilter?.color || '#6B7280';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      case 'urgent': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
    return date.toLocaleDateString();
  };

  const renderFeedItem = (item) => {
    const isIssue = item.type === 'issue';
    const userVote = userVotes[item.id];

    return (
      <View key={`${item.type}-${item.id}`} style={styles.feedCard}>
        {/* Header */}
        <View style={styles.feedHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.profiles?.first_name?.charAt(0) || item.profiles?.full_name?.charAt(0) || 'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>
                  {item.profiles?.full_name || item.profiles?.first_name || 'Anonymous User'}
                </Text>
                {item.profiles?.user_type === 'admin' && (
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>Admin</Text>
                  </View>
                )}
                {item.is_official && (
                  <View style={styles.officialBadge}>
                    <Text style={styles.officialBadgeText}>Official</Text>
                  </View>
                )}
              </View>
              <Text style={styles.postTime}>{formatTimeAgo(item.created_at)}</Text>
            </View>
          </View>

          <View style={styles.postMeta}>
            <View style={[styles.typeBadge, { backgroundColor: isIssue ? '#FEF3C7' : '#E0F2FE' }]}>
              <Text style={[styles.typeBadgeText, { color: isIssue ? '#92400E' : '#0369A1' }]}>
                {isIssue ? '🚨 Issue' : '💬 Post'}
              </Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.feedContent}>
          {item.title && (
            <Text style={styles.feedTitle}>{item.title}</Text>
          )}
          <Text style={styles.feedDescription}>
            {item.content || item.description}
          </Text>

          {/* Category and Status for Issues */}
          {isIssue && (
            <View style={styles.issueMeta}>
              <View style={styles.issueMetaRow}>
                <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
                  <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>
                    {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                  </Text>
                </View>

                <View style={styles.statusContainer}>
                  {getStatusIcon(item.status)}
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {item.status.replace('_', ' ').charAt(0).toUpperCase() + item.status.replace('_', ' ').slice(1)}
                  </Text>
                </View>

                {item.priority && (
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                    <Text style={styles.priorityText}>
                      {item.priority.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Location */}
          {item.location && (
            <View style={styles.locationContainer}>
              <MapPin size={14} color="#6B7280" />
              <Text style={styles.locationText}>{item.location}</Text>
            </View>
          )}

          {/* Images */}
          {item.images && item.images.length > 0 && (
            <ScrollView horizontal style={styles.imagesContainer} showsHorizontalScrollIndicator={false}>
              {item.images.map((imageUrl, index) => (
                <TouchableOpacity key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: imageUrl }} style={styles.feedImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.feedActions}>
          {isIssue ? (
            <>
              <View style={styles.feedActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleShare(item)}
                >
                  <Share size={18} color="#6B7280" />
                  <Text style={styles.actionText}>Share</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.feedActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleShare(item)}
                >
                  <Share size={18} color="#6B7280" />
                  <Text style={styles.actionText}>Share</Text>
                </TouchableOpacity>
              </View>


            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Community Feed</Text>
        <Text style={styles.subtitle}>Stay connected with your community</Text>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by location..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color="#1E40AF" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          {/* Type Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filtersList}>
                {typeFilters.map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={[
                      styles.filterChip,
                      selectedType === filter.id && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedType(filter.id)}
                  >
                    <Text style={styles.filterIcon}>{filter.icon}</Text>
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedType === filter.id && styles.filterChipTextActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Category Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filtersList}>
                {categoryFilters.map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={[
                      styles.filterChip,
                      selectedFilter === filter.id && styles.filterChipActive,
                      filter.color && { borderColor: filter.color },
                    ]}
                    onPress={() => setSelectedFilter(filter.id)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedFilter === filter.id && styles.filterChipTextActive,
                        selectedFilter === filter.id && filter.color && { color: filter.color },
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Status Filter (for issues) */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filtersList}>
                {statusFilters.map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={[
                      styles.filterChip,
                      selectedStatus === filter.id && styles.filterChipActive,
                      filter.color && { borderColor: filter.color },
                    ]}
                    onPress={() => setSelectedStatus(filter.id)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedStatus === filter.id && styles.filterChipTextActive,
                        selectedStatus === filter.id && filter.color && { color: filter.color },
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Feed */}
      <ScrollView
        style={styles.feedContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading community feed...</Text>
          </View>
        ) : feedData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MessageSquare size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No posts found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your filters or check back later for new content.
            </Text>
          </View>
        ) : (
          <View style={styles.feedList}>
            {feedData.map(renderFeedItem)}
          </View>
        )}
      </ScrollView>
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
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  filterButton: {
    width: 40,
    height: 40,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    marginBottom: 8,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  filtersList: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#1E40AF',
  },
  filterIcon: {
    fontSize: 12,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  feedContainer: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  feedList: {
    padding: 16,
    gap: 16,
  },
  feedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    backgroundColor: '#1E40AF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  adminBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  officialBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  officialBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  postTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  postMeta: {
    alignItems: 'flex-end',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  feedContent: {
    marginBottom: 16,
  },
  feedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  feedDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  issueMeta: {
    marginBottom: 12,
  },
  issueMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
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
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  imagesContainer: {
    marginBottom: 12,
  },
  imageWrapper: {
    marginRight: 8,
  },
  feedImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
  },
  feedActions: {
    flexDirection: 'row',
    gap: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonActive: {
    opacity: 1,
  },
  actionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});