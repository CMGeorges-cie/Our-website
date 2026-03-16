/**
 * ServiceFlow Mobile - API Service
 * Handles all API calls to the backend v2 endpoints
 */

// Configuration - Replace with your actual backend URL
const API_BASE_URL = process.env.API_BASE_URL || 'https://tech-workflow-app.preview.emergentagent.com/api/v2';

// Token storage interface (implement with AsyncStorage in React Native)
interface TokenStorage {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  setTokens(access: string, refresh: string): Promise<void>;
  clearTokens(): Promise<void>;
}

// Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  tenant_id: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  scheduled_date?: string;
  address?: string;
  client?: {
    full_name: string;
    phone: string;
    address: string;
  };
  tasks: Task[];
  progress: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to?: string;
  due_date?: string;
}

export interface DashboardStats {
  todays_projects: number;
  active_projects: number;
  completed_this_week: number;
  hours_this_week: number;
  unread_messages: number;
  user_name: string;
}

// API Client Class
class ApiService {
  private tokenStorage: TokenStorage | null = null;

  setTokenStorage(storage: TokenStorage) {
    this.tokenStorage = storage;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.tokenStorage) {
      const token = await this.tokenStorage.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getHeaders();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Try to refresh token
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry request with new token
        const newHeaders = await this.getHeaders();
        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            ...newHeaders,
            ...options.headers,
          },
        });
        
        if (!retryResponse.ok) {
          throw new Error(`API Error: ${retryResponse.status}`);
        }
        return retryResponse.json();
      }
      throw new Error('Session expired');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string): Promise<{ user: User; access_token: string; refresh_token: string }> {
    const response = await this.request<{
      user: User;
      access_token: string;
      refresh_token: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (this.tokenStorage) {
      await this.tokenStorage.setTokens(response.access_token, response.refresh_token);
    }

    return response;
  }

  async refreshToken(): Promise<boolean> {
    if (!this.tokenStorage) return false;

    const refreshToken = await this.tokenStorage.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      await this.tokenStorage.setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    if (this.tokenStorage) {
      await this.tokenStorage.clearTokens();
    }
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Mobile Dashboard
  async getDashboard(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/mobile/dashboard');
  }

  // Projects
  async getTodaySchedule(): Promise<{ date: string; projects: Project[]; total: number }> {
    return this.request('/mobile/sync/today');
  }

  async getMyAssignments(status?: string): Promise<Project[]> {
    const query = status ? `?status=${status}` : '';
    return this.request<Project[]>(`/projects/my-assignments${query}`);
  }

  async getProject(projectId: string): Promise<Project> {
    return this.request<Project>(`/projects/${projectId}`);
  }

  async updateProjectStatus(projectId: string, status: string): Promise<void> {
    await this.request(`/mobile/projects/${projectId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Tasks
  async toggleTask(projectId: string, taskId: string, status: string): Promise<void> {
    await this.request(`/projects/${projectId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Check-in/Check-out
  async checkIn(projectId: string, latitude?: number, longitude?: number, notes?: string): Promise<void> {
    await this.request('/mobile/checkin', {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, latitude, longitude, notes }),
    });
  }

  async checkOut(
    projectId: string,
    latitude?: number,
    longitude?: number,
    notes?: string,
    signatureBase64?: string
  ): Promise<{ hours_worked: number }> {
    return this.request('/mobile/checkout', {
      method: 'POST',
      body: JSON.stringify({
        project_id: projectId,
        latitude,
        longitude,
        notes,
        signature_base64: signatureBase64,
      }),
    });
  }

  // Photos
  async uploadPhoto(
    projectId: string,
    photoBase64: string,
    caption: string = '',
    photoType: 'before' | 'during' | 'after' | 'issue' = 'progress'
  ): Promise<{ photo_id: string }> {
    return this.request('/mobile/photos', {
      method: 'POST',
      body: JSON.stringify({
        project_id: projectId,
        photo_base64: photoBase64,
        caption,
        photo_type: photoType,
      }),
    });
  }

  async getProjectPhotos(projectId: string): Promise<any[]> {
    return this.request(`/mobile/photos/${projectId}`);
  }

  // Messages
  async getProjectMessages(projectId: string): Promise<any[]> {
    return this.request(`/projects/${projectId}/messages`);
  }

  async sendMessage(projectId: string, content: string): Promise<void> {
    await this.request(`/projects/${projectId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // Time tracking
  async logTime(
    projectId: string,
    startTime: string,
    endTime: string,
    breakMinutes: number = 0,
    notes: string = ''
  ): Promise<void> {
    await this.request('/mobile/time', {
      method: 'POST',
      body: JSON.stringify({
        project_id: projectId,
        start_time: startTime,
        end_time: endTime,
        break_minutes: breakMinutes,
        notes,
      }),
    });
  }

  // Materials
  async logMaterial(
    projectId: string,
    materialName: string,
    quantity: number,
    unit: string = 'unité',
    notes: string = ''
  ): Promise<void> {
    await this.request('/mobile/materials', {
      method: 'POST',
      body: JSON.stringify({
        project_id: projectId,
        material_name: materialName,
        quantity,
        unit,
        notes,
      }),
    });
  }

  // Push notifications
  async registerDeviceToken(deviceToken: string, platform: 'ios' | 'android'): Promise<void> {
    await this.request('/auth/mobile/device-token', {
      method: 'POST',
      body: JSON.stringify({ device_token: deviceToken, platform }),
    });
  }
}

// Export singleton instance
export const api = new ApiService();
export default api;
