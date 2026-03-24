/**
 * ServiceFlow Mobile - Home/Dashboard Screen for Technicians
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { api, DashboardStats } from '../../services/api';
import { COLORS } from '../../utils/constants';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
  color?: string;
  onPress?: () => void;
}

function StatCard({ title, value, icon, color = COLORS.primary, onPress }: StatCardProps) {
  return (
    <TouchableOpacity 
      style={styles.statCard} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Text style={[styles.statIconText, { color }]}>{icon}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      setError(null);
      const data = await api.getDashboard();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

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
        <Text style={styles.greeting}>{getGreeting()},</Text>
        <Text style={styles.userName}>{user?.full_name || 'Technicien'}</Text>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadDashboard}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => navigation.navigate('Projects')}
        >
          <Text style={styles.quickActionIcon}>📋</Text>
          <Text style={styles.quickActionText}>Mes Projets</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => navigation.navigate('TodaySchedule')}
        >
          <Text style={styles.quickActionIcon}>📅</Text>
          <Text style={styles.quickActionText}>Aujourd'hui</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <Text style={styles.sectionTitle}>Aperçu</Text>
      
      <View style={styles.statsGrid}>
        <StatCard
          title="Aujourd'hui"
          value={stats?.todays_projects || 0}
          icon="📍"
          color={COLORS.info}
          onPress={() => navigation.navigate('TodaySchedule')}
        />
        <StatCard
          title="En cours"
          value={stats?.active_projects || 0}
          icon="🔧"
          color={COLORS.warning}
          onPress={() => navigation.navigate('Projects', { status: 'in_progress' })}
        />
        <StatCard
          title="Cette semaine"
          value={stats?.completed_this_week || 0}
          icon="✅"
          color={COLORS.success}
        />
        <StatCard
          title="Heures"
          value={`${stats?.hours_this_week || 0}h`}
          icon="⏱️"
          color={COLORS.primary}
        />
      </View>

      {/* Messages Badge */}
      {stats?.unread_messages && stats.unread_messages > 0 && (
        <TouchableOpacity 
          style={styles.messagesBadge}
          onPress={() => navigation.navigate('Messages')}
        >
          <Text style={styles.messagesBadgeIcon}>💬</Text>
          <Text style={styles.messagesBadgeText}>
            {stats.unread_messages} message{stats.unread_messages > 1 ? 's' : ''} non lu{stats.unread_messages > 1 ? 's' : ''}
          </Text>
          <Text style={styles.messagesBadgeArrow}>→</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: COLORS.error + '20',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.error,
    flex: 1,
  },
  retryText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  quickActionText: {
    color: COLORS.secondary,
    fontWeight: '700',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    width: '48%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconText: {
    fontSize: 18,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  messagesBadge: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  messagesBadgeIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  messagesBadgeText: {
    color: COLORS.textPrimary,
    flex: 1,
    fontWeight: '500',
  },
  messagesBadgeArrow: {
    color: COLORS.primary,
    fontSize: 18,
  },
});
