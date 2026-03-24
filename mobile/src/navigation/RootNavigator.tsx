/**
 * ServiceFlow Mobile - Navigation Configuration
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../utils/constants';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';

// Technician Screens
import HomeScreen from '../screens/technician/HomeScreen';
import ProjectsScreen from '../screens/technician/ProjectsScreen';
import ProjectDetailScreen from '../screens/technician/ProjectDetailScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Bar Icon Component
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Projects: '📋',
    Profile: '👤',
  };
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Text style={styles.tabIconText}>{icons[name] || '📱'}</Text>
    </View>
  );
}

// Main Tab Navigator for Technicians
function TechnicianTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        headerStyle: styles.header,
        headerTintColor: COLORS.textPrimary,
        headerTitleStyle: styles.headerTitle,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ 
          title: 'Accueil',
          headerTitle: 'ServiceFlow',
        }}
      />
      <Tab.Screen 
        name="Projects" 
        component={ProjectsScreen}
        options={{ title: 'Projets' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfilePlaceholder}
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
}

// Placeholder for Profile screen
function ProfilePlaceholder() {
  const { user, logout } = useAuth();
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderIcon}>👤</Text>
      <Text style={styles.placeholderTitle}>{user?.full_name}</Text>
      <Text style={styles.placeholderSubtitle}>{user?.email}</Text>
      <View style={styles.logoutButton}>
        <Text style={styles.logoutText} onPress={logout}>
          Déconnexion
        </Text>
      </View>
    </View>
  );
}

// Auth Stack
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

// Main App Stack (authenticated)
function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: styles.header,
        headerTintColor: COLORS.textPrimary,
        headerTitleStyle: styles.headerTitle,
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen 
        name="MainTabs" 
        component={TechnicianTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ProjectDetail" 
        component={ProjectDetailScreen}
        options={{ title: 'Détail du projet' }}
      />
      <Stack.Screen 
        name="TodaySchedule" 
        component={TodaySchedulePlaceholder}
        options={{ title: "Aujourd'hui" }}
      />
      <Stack.Screen 
        name="ProjectPhotos" 
        component={PhotosPlaceholder}
        options={{ title: 'Photos' }}
      />
      <Stack.Screen 
        name="ProjectMessages" 
        component={MessagesPlaceholder}
        options={{ title: 'Messages' }}
      />
      <Stack.Screen 
        name="ProjectMaterials" 
        component={MaterialsPlaceholder}
        options={{ title: 'Matériaux' }}
      />
    </Stack.Navigator>
  );
}

// Placeholder screens
function TodaySchedulePlaceholder() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderIcon}>📅</Text>
      <Text style={styles.placeholderTitle}>Planning du jour</Text>
      <Text style={styles.placeholderSubtitle}>En développement...</Text>
    </View>
  );
}

function PhotosPlaceholder() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderIcon}>📷</Text>
      <Text style={styles.placeholderTitle}>Photos du projet</Text>
      <Text style={styles.placeholderSubtitle}>En développement...</Text>
    </View>
  );
}

function MessagesPlaceholder() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderIcon}>💬</Text>
      <Text style={styles.placeholderTitle}>Messages</Text>
      <Text style={styles.placeholderSubtitle}>En développement...</Text>
    </View>
  );
}

function MaterialsPlaceholder() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderIcon}>🧰</Text>
      <Text style={styles.placeholderTitle}>Matériaux utilisés</Text>
      <Text style={styles.placeholderSubtitle}>En développement...</Text>
    </View>
  );
}

// Root Navigator
export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>ServiceFlow</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 20,
    paddingTop: 10,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconActive: {
    backgroundColor: COLORS.primary + '20',
  },
  tabIconText: {
    fontSize: 18,
  },
  header: {
    backgroundColor: COLORS.background,
    shadowColor: 'transparent',
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: '700',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  placeholderSubtitle: {
    color: COLORS.textMuted,
  },
  logoutButton: {
    marginTop: 32,
    backgroundColor: COLORS.error + '20',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  logoutText: {
    color: COLORS.error,
    fontWeight: '600',
  },
});
