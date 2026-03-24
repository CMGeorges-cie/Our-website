/**
 * ServiceFlow Mobile - Projects List Screen
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api, Project } from '../../services/api';
import { COLORS, PROJECT_STATUS } from '../../utils/constants';

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
}

function ProjectCard({ project, onPress }: ProjectCardProps) {
  const status = PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS];
  
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: status?.color + '20' }]}>
          <Text style={[styles.statusText, { color: status?.color }]}>
            {status?.label || project.status}
          </Text>
        </View>
        <Text style={styles.progress}>{project.progress}%</Text>
      </View>
      
      <Text style={styles.cardTitle} numberOfLines={2}>{project.title}</Text>
      
      {project.client && (
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>👤 {project.client.full_name}</Text>
          {project.client.phone && (
            <Text style={styles.clientPhone}>📞 {project.client.phone}</Text>
          )}
        </View>
      )}
      
      {(project.address || project.client?.address) && (
        <Text style={styles.address} numberOfLines={1}>
          📍 {project.address || project.client?.address}
        </Text>
      )}
      
      {project.scheduled_date && (
        <Text style={styles.date}>
          🗓️ {new Date(project.scheduled_date).toLocaleDateString('fr-CA')}
        </Text>
      )}
      
      <View style={styles.cardFooter}>
        <Text style={styles.taskCount}>
          {project.tasks?.filter(t => t.status === 'completed').length || 0}/
          {project.tasks?.length || 0} tâches
        </Text>
        <Text style={styles.viewMore}>Voir →</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ProjectsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialStatus = route.params?.status;
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(initialStatus || null);

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.getMyAssignments(selectedStatus || undefined);
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
  };

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const statusFilters = [
    { key: null, label: 'Tous' },
    { key: 'pending', label: 'En attente' },
    { key: 'in_progress', label: 'En cours' },
    { key: 'completed', label: 'Terminés' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statusFilters}
          keyExtractor={(item) => String(item.key)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedStatus === item.key && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedStatus(item.key)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedStatus === item.key && styles.filterButtonTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Projects List */}
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => navigation.navigate('ProjectDetail', { projectId: item.id })}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Aucun projet</Text>
            <Text style={styles.emptyText}>
              {selectedStatus 
                ? `Aucun projet ${PROJECT_STATUS[selectedStatus as keyof typeof PROJECT_STATUS]?.label.toLowerCase()}`
                : "Vous n'avez pas de projets assignés"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterList: {
    padding: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: COLORS.secondary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progress: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  clientInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  clientName: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  clientPhone: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  address: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 4,
  },
  date: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  taskCount: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  viewMore: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
