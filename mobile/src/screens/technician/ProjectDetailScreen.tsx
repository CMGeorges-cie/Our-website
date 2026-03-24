/**
 * ServiceFlow Mobile - Project Detail Screen
 * Full project view with tasks, check-in/out, photos
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api, Project, Task } from '../../services/api';
import { COLORS, PROJECT_STATUS, TASK_STATUS } from '../../utils/constants';

export default function ProjectDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { projectId } = route.params;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const loadProject = useCallback(async () => {
    try {
      const data = await api.getProject(projectId);
      setProject(data);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger le projet');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProject();
    setRefreshing(false);
  };

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      // Get current location (simplified - in real app use geolocation)
      await api.checkIn(projectId);
      Alert.alert('Check-in', 'Arrivée enregistrée!');
      await loadProject();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de faire le check-in');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    Alert.alert(
      'Check-out',
      'Confirmer le départ du site?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setCheckingIn(true);
            try {
              const result = await api.checkOut(projectId);
              Alert.alert(
                'Check-out',
                `Départ enregistré! ${result.hours_worked ? `Temps: ${result.hours_worked.toFixed(1)}h` : ''}`
              );
              await loadProject();
            } catch (err: any) {
              Alert.alert('Erreur', err.message || 'Impossible de faire le check-out');
            } finally {
              setCheckingIn(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleTask = async (task: Task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await api.toggleTask(projectId, task.id, newStatus);
      await loadProject();
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de mettre à jour la tâche');
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      await api.updateProjectStatus(projectId, newStatus);
      Alert.alert('Succès', 'Statut mis à jour');
      await loadProject();
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
    }
  };

  const handleCallClient = () => {
    const phone = project?.client?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleOpenMaps = () => {
    const address = project?.address || project?.client?.address;
    if (address) {
      const encodedAddress = encodeURIComponent(address);
      Linking.openURL(`https://maps.google.com/?q=${encodedAddress}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Projet non trouvé</Text>
      </View>
    );
  }

  const status = PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: status?.color + '20' }]}>
          <Text style={[styles.statusText, { color: status?.color }]}>
            {status?.label}
          </Text>
        </View>
        <Text style={styles.title}>{project.title}</Text>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[styles.progressFill, { width: `${project.progress}%` }]} 
            />
          </View>
          <Text style={styles.progressText}>{project.progress}%</Text>
        </View>
      </View>

      {/* Client Info */}
      {project.client && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <View style={styles.clientCard}>
            <Text style={styles.clientName}>{project.client.full_name}</Text>
            
            <View style={styles.clientActions}>
              {project.client.phone && (
                <TouchableOpacity style={styles.actionButton} onPress={handleCallClient}>
                  <Text style={styles.actionButtonIcon}>📞</Text>
                  <Text style={styles.actionButtonText}>Appeler</Text>
                </TouchableOpacity>
              )}
              {(project.address || project.client.address) && (
                <TouchableOpacity style={styles.actionButton} onPress={handleOpenMaps}>
                  <Text style={styles.actionButtonIcon}>🗺️</Text>
                  <Text style={styles.actionButtonText}>Itinéraire</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {(project.address || project.client.address) && (
              <Text style={styles.clientAddress}>
                📍 {project.address || project.client.address}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Check-in/out Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Présence</Text>
        <View style={styles.checkActions}>
          <TouchableOpacity
            style={[styles.checkButton, styles.checkInButton]}
            onPress={handleCheckIn}
            disabled={checkingIn}
          >
            {checkingIn ? (
              <ActivityIndicator color={COLORS.secondary} />
            ) : (
              <>
                <Text style={styles.checkButtonIcon}>📍</Text>
                <Text style={styles.checkButtonText}>Check-in</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.checkButton, styles.checkOutButton]}
            onPress={handleCheckOut}
            disabled={checkingIn}
          >
            <Text style={styles.checkButtonIcon}>🏁</Text>
            <Text style={[styles.checkButtonText, { color: COLORS.textPrimary }]}>Check-out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tasks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Tâches ({project.tasks?.filter(t => t.status === 'completed').length || 0}/
          {project.tasks?.length || 0})
        </Text>
        
        {project.tasks && project.tasks.length > 0 ? (
          project.tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskItem}
              onPress={() => handleToggleTask(task)}
            >
              <View 
                style={[
                  styles.taskCheckbox,
                  task.status === 'completed' && styles.taskCheckboxChecked,
                ]}
              >
                {task.status === 'completed' && (
                  <Text style={styles.taskCheckmark}>✓</Text>
                )}
              </View>
              <View style={styles.taskContent}>
                <Text 
                  style={[
                    styles.taskTitle,
                    task.status === 'completed' && styles.taskTitleCompleted,
                  ]}
                >
                  {task.title}
                </Text>
                {task.description && (
                  <Text style={styles.taskDescription}>{task.description}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noTasks}>Aucune tâche définie</Text>
        )}
      </View>

      {/* Quick Status Update */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Changer le statut</Text>
        <View style={styles.statusButtons}>
          {['in_progress', 'completed', 'on_hold'].map((s) => {
            const statusInfo = PROJECT_STATUS[s as keyof typeof PROJECT_STATUS];
            const isActive = project.status === s;
            return (
              <TouchableOpacity
                key={s}
                style={[
                  styles.statusButton,
                  isActive && { backgroundColor: statusInfo?.color },
                ]}
                onPress={() => handleUpdateStatus(s)}
                disabled={isActive}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    isActive && { color: '#fff' },
                  ]}
                >
                  {statusInfo?.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* More Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.moreActions}>
          <TouchableOpacity 
            style={styles.moreAction}
            onPress={() => navigation.navigate('ProjectPhotos', { projectId })}
          >
            <Text style={styles.moreActionIcon}>📷</Text>
            <Text style={styles.moreActionText}>Photos</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.moreAction}
            onPress={() => navigation.navigate('ProjectMessages', { projectId })}
          >
            <Text style={styles.moreActionIcon}>💬</Text>
            <Text style={styles.moreActionText}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.moreAction}
            onPress={() => navigation.navigate('ProjectMaterials', { projectId })}
          >
            <Text style={styles.moreActionIcon}>🧰</Text>
            <Text style={styles.moreActionText}>Matériaux</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
  },
  header: {
    marginBottom: 24,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  clientCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  clientActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '20',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonIcon: {
    fontSize: 16,
  },
  actionButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  clientAddress: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  checkActions: {
    flexDirection: 'row',
    gap: 12,
  },
  checkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  checkInButton: {
    backgroundColor: COLORS.primary,
  },
  checkOutButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checkButtonIcon: {
    fontSize: 20,
  },
  checkButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckboxChecked: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  taskCheckmark: {
    color: '#fff',
    fontWeight: '700',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  taskDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  noTasks: {
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  moreActions: {
    flexDirection: 'row',
    gap: 12,
  },
  moreAction: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  moreActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  moreActionText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
});
