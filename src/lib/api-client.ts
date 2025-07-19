/**
 * API client for communicating with the FastAPI backend
 */

export interface User {
  id: number;
  email: string;
  name?: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: {
    access_token: string;
    token_type: string;
    expires_in: number;
  };
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface FavoriteRequest {
  entity_type: 'venue' | 'artist';
  entity_id: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details: Record<string, any>;
    request_id?: string;
  };
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl;
    this.loadTokenFromStorage();
  }

  private loadTokenFromStorage() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('access_token');
    }
  }

  private saveTokenToStorage(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
      this.token = token;
    }
  }

  private removeTokenFromStorage() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      this.token = null;
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error.message || 'API request failed');
    }
    return response.json();
  }

  // Authentication methods
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    const result = await this.handleResponse<AuthResponse>(response);
    this.saveTokenToStorage(result.token.access_token);
    return result;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    const result = await this.handleResponse<AuthResponse>(response);
    this.saveTokenToStorage(result.token.access_token);
    return result;
  }

  async logout() {
    this.removeTokenFromStorage();
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${this.baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<User>(response);
  }

  async refreshToken(): Promise<{ access_token: string; token_type: string; expires_in: number }> {
    const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    const result = await this.handleResponse<{ access_token: string; token_type: string; expires_in: number }>(response);
    this.saveTokenToStorage(result.access_token);
    return result;
  }

  // Favorites methods
  async addFavorite(data: FavoriteRequest): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/api/auth/favorites`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<{ message: string }>(response);
  }

  async removeFavorite(entityType: string, entityId: number): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/api/auth/favorites/${entityType}/${entityId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<{ message: string }>(response);
  }

  async getFavorites(): Promise<{ venues: number[]; artists: number[]; total: number }> {
    const response = await fetch(`${this.baseUrl}/api/auth/favorites`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<{ venues: number[]; artists: number[]; total: number }>(response);
  }

  // Profile methods
  async updateProfile(name?: string): Promise<User> {
    const params = new URLSearchParams();
    if (name) params.append('name', name);

    const response = await fetch(`${this.baseUrl}/api/auth/profile?${params}`, {
      method: 'PUT',
      headers: this.getHeaders(),
    });

    return this.handleResponse<User>(response);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const params = new URLSearchParams();
    params.append('current_password', currentPassword);
    params.append('new_password', newPassword);

    const response = await fetch(`${this.baseUrl}/api/auth/change-password?${params}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    return this.handleResponse<{ message: string }>(response);
  }

  // Venue methods
  async getVenues(page: number = 1, limit: number = 20) {
    const response = await fetch(`${this.baseUrl}/api/venues?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async getVenue(id: number) {
    const response = await fetch(`${this.baseUrl}/api/venues/${id}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  // Search methods
  async search(query: string, page: number = 1, limit: number = 20) {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await fetch(`${this.baseUrl}/api/search?${params}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.token !== null;
  }

  // Get current token
  getToken(): string | null {
    return this.token;
  }
}

// Create singleton instance
export const apiClient = new ApiClient();
export default ApiClient;
