export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = process.env.REACT_APP_API_URL || 'http://localhost:5001') {
    this.baseURL = baseURL;
    console.log('🚀 ApiClient initialized with baseURL:', baseURL);
  }

  setToken(token: string) {
    console.log('🔑 ApiClient: Setting token:', token ? token.substring(0, 30) + '...' : 'Empty token');
    if (token) {
      localStorage.setItem('token', token);
      console.log('✅ Token stored in localStorage');
    } else {
      localStorage.removeItem('token');
      console.log('🗑️ Token removed from localStorage');
    }
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('🔐 Adding Authorization header with token:', token.substring(0, 30) + '...');
    } else {
      console.log('⚠️ No token found in localStorage');
    }
    
    return headers;
  }

  async get(endpoint: string): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;
    console.log('🔗 GET request to:', url);
    
    const headers = this.getAuthHeaders();
    console.log('📋 GET headers:', headers);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Required for CORS with credentials
    });

    console.log('📡 GET response status:', response.status);
    return response;
  }

  async post(endpoint: string, data: any): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;
    console.log('🔗 POST request to:', url);
    
    const headers = this.getAuthHeaders();
    console.log('📋 POST headers:', headers);

    // Handle FormData differently
    if (data instanceof FormData) {
      console.log('📎 Sending FormData');
      // Don't set Content-Type for FormData, let browser set it with boundary
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: data,
        credentials: 'include', // Required for CORS with credentials
      });
      
      console.log('📡 POST FormData response status:', response.status);
      return response;
    }

    console.log('📄 Sending JSON data:', data);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include', // Required for CORS with credentials
    });

    console.log('📡 POST JSON response status:', response.status);
    return response;
  }

  async put(endpoint: string, data: any): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;
    console.log('🔗 PUT request to:', url);
    
    const headers = this.getAuthHeaders();
    console.log('📋 PUT headers:', headers);

    // Handle FormData differently
    if (data instanceof FormData) {
      console.log('📎 Sending FormData via PUT');
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: data,
        credentials: 'include', // Required for CORS with credentials
      });
      
      console.log('📡 PUT FormData response status:', response.status);
      return response;
    }

    console.log('📄 Sending JSON data via PUT:', data);
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include', // Required for CORS with credentials
    });

    console.log('📡 PUT JSON response status:', response.status);
    return response;
  }

  async delete(endpoint: string): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;
    console.log('🔗 DELETE request to:', url);
    
    const headers = this.getAuthHeaders();
    console.log('📋 DELETE headers:', headers);
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Required for CORS with credentials
    });

    console.log('📡 DELETE response status:', response.status);
    return response;
  }
}

export const apiClient = new ApiClient();
