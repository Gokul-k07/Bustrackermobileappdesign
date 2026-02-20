import { projectId, publicAnonKey } from './supabase/info';

export const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-8b08beda`;

export interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  data?: T;
}

class ApiClient {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE_URL}${normalizedEndpoint}`;
    const prefixedEndpoint = normalizedEndpoint.startsWith('/make-server-8b08beda/')
      ? normalizedEndpoint
      : `/make-server-8b08beda${normalizedEndpoint}`;
    const prefixedUrl = `${API_BASE_URL}${prefixedEndpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken || publicAnonKey}`,
      ...options.headers,
    };

    try {
      let response = await fetch(url, {
        ...options,
        headers,
      });

      // Some Supabase edge gateways forward with an extra function slug segment.
      // Retry once with '/make-server-8b08beda' prefix if the first path 404s.
      if (!response.ok && response.status === 404 && prefixedUrl !== url) {
        console.warn(`API 404 for ${url}. Retrying with ${prefixedUrl}`);
        response = await fetch(prefixedUrl, {
          ...options,
          headers,
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error: any) {
      // Only log meaningful errors, not auth errors during initial load
      if (error.message && !error.message.includes('Invalid or expired token')) {
        console.error(`API request failed for ${endpoint}:`, error.message);
      }
      throw error;
    }
  }

  // User management
  async register(userData: {
    name: string;
    email: string;
    password: string;
    role: 'driver' | 'passenger';
  }) {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getProfile() {
    return this.request('/profile');
  }

  async updateCoins(amount: number, operation: 'add' | 'subtract') {
    return this.request('/update-coins', {
      method: 'POST',
      body: JSON.stringify({ amount, operation }),
    });
  }

  // Driver functions
  async updateDriverStatus(
    isOnline: boolean,
    location?: { lat: number; lng: number },
    route?: string,
    busName?: string
  ) {
    return this.request('/driver/status', {
      method: 'POST',
      body: JSON.stringify({ isOnline, location, route, busName }),
    });
  }

  async generateOTP() {
    return this.request('/driver/generate-otp', {
      method: 'POST',
    });
  }

  async getDriverOTPs() {
    return this.request('/driver/otps');
  }

  async getLocationShares() {
    return this.request('/driver/location-shares');
  }

  async getAllLocationShares() {
    return this.request('/location-shares');
  }

  // Passenger functions
  async startLocationSharing(otpCode: string, location: { lat: number; lng: number }, busName: string) {
    return this.request('/passenger/share-location', {
      method: 'POST',
      body: JSON.stringify({ otpCode, location, busName }),
    });
  }

  async stopLocationSharing(shareId?: string) {
    return this.request('/passenger/stop-sharing', {
      method: 'POST',
      body: JSON.stringify({ shareId }),
    });
  }

  async pauseLocationSharing() {
    return this.request('/passenger/pause-sharing', {
      method: 'POST'
    })
  }

  async stopOTP(otpId: string) {
    return this.request('/driver/stop-otp', {
      method: 'POST',
      body: JSON.stringify({ otpId }),
    });
  }

  async updateLocation(location: { lat: number; lng: number }) {
    return this.request('/passenger/update-location', {
      method: 'POST',
      body: JSON.stringify({ location }),
    });
  }

  async getBuses() {
    return this.request('/buses');
  }

  async getAvailableBuses() {
    return this.request('/buses/available');
  }

  async addNewBus(busName: string) {
    return this.request('/buses/add', {
      method: 'POST',
      body: JSON.stringify({ busName }),
    });
  }

  // Bus stops
  async getBusStops(busId: string) {
    return this.request(`/bus/${busId}/stops`);
  }

  async updateBusStop(busId: string, stopId: string, passed: boolean) {
    return this.request('/driver/update-stop', {
      method: 'POST',
      body: JSON.stringify({ busId, stopId, passed }),
    });
  }

  async updateBusStops(busId: string, busStops: any[]) {
    return this.request('/driver/update-stops', {
      method: 'POST',
      body: JSON.stringify({ busId, busStops }),
    });
  }

  async addRoute(busId: string, routeName: string) {
    return this.request('/driver/add-route', {
      method: 'POST',
      body: JSON.stringify({ busId, routeName }),
    });
  }

  // Health check
  async health() {
    return this.request('/health');
  }
}

export const apiClient = new ApiClient();

// Convenience functions
export async function getAvailableBuses(): Promise<string[]> {
  const response = await apiClient.getAvailableBuses();
  return response.buses || [];
}

export async function addNewBus(busName: string): Promise<string[]> {
  const response = await apiClient.addNewBus(busName);
  return response.buses || [];
}
