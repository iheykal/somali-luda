// Wallet API Service
// Handles deposits, withdrawals, and transaction history

// Helper function to get the API URL, automatically detecting hostname for mobile devices
function getApiUrl(): string {
  // If we're in the browser, detect the hostname dynamically
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol; // 'http:' or 'https:'
    const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '192.168.' && !hostname.startsWith('192.168.');
    
    // Check if environment variable is explicitly set (highest priority)
    const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
    if (envUrl && envUrl.trim() !== '') {
      const cleanUrl = envUrl.trim();
      
      // If it's a relative URL (/api), check if we're on localhost or network IP
      // If on localhost or network IP, always use full URL (frontend and backend are on different ports)
      if (cleanUrl.startsWith('/')) {
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          // Local development: use localhost with port 3001
          return 'http://localhost:3001/api';
        } else if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
          // Network IP: use the same hostname with port 3001
          return `${protocol}//${hostname}:3001/api`;
        } else {
          // Production/deployed: use relative URL (frontend and backend on same domain)
          return cleanUrl;
        }
      }
      
      // If it's already a full URL, use it as-is
      if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
        // Ensure it ends with /api if it doesn't already
        if (cleanUrl.endsWith('/api')) {
          return cleanUrl;
        } else if (!cleanUrl.endsWith('/api/')) {
          return `${cleanUrl}/api`;
        }
        return cleanUrl;
      }
      
      // Otherwise, ensure it ends with /api
      if (cleanUrl.endsWith('/api')) {
        return cleanUrl;
      } else if (!cleanUrl.endsWith('/api/')) {
        return `${cleanUrl}/api`;
      }
      return cleanUrl;
    }
    
    // In production (deployed), use relative URL if backend is on same domain
    // This works when frontend and backend are deployed together
    if (isProduction) {
      // Use relative URL - works when frontend and backend are on same domain
      return '/api';
    }
    
    // Development: use the same hostname as frontend with port 3001
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001/api';
    } else if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
      // Network IP: use the same hostname with port 3001
      return `${protocol}//${hostname}:3001/api`;
    }
    
    // Fallback to localhost
    return 'http://localhost:3001/api';
  }
  
  // Default fallback - try to detect hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
      return `${protocol}//${hostname}:3001/api`;
    }
  }
  return 'http://localhost:3001/api';
}

const API_URL = getApiUrl();

// Helper function to get auth token
const getAuthToken = () => {
    return localStorage.getItem('token');
};

// Helper function to make authenticated requests
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    return fetch(url, {
        ...options,
        headers
    });
};

export const walletAPI = {
    // Deposit money
    deposit: async (amount: number, phoneNumber?: string) => {
        try {
            const response = await authenticatedFetch(`${API_URL}/wallet/deposit`, {
                method: 'POST',
                body: JSON.stringify({ amount, phoneNumber })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
                return errorData;
            }

            return await response.json();
        } catch (error) {
            console.error('Deposit error:', error);
            return { error: 'Network error. Please check your connection and ensure the server is running.' };
        }
    },

    // Request withdrawal
    withdraw: async (withdrawalData: {
        amount: number;
        withdrawalMethod: string;
        phoneNumber?: string;
        recipientName?: string;
        accountNumber?: string;
        bankName?: string;
    }) => {
        try {
            const response = await authenticatedFetch(`${API_URL}/wallet/withdraw`, {
                method: 'POST',
                body: JSON.stringify(withdrawalData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
                return errorData;
            }

            return await response.json();
        } catch (error) {
            console.error('Withdrawal error:', error);
            return { error: 'Network error. Please check your connection and ensure the server is running.' };
        }
    },

    // Get transaction history
    getTransactions: async (filters?: { type?: string; status?: string; limit?: number; skip?: number }) => {
        try {
            const queryParams = new URLSearchParams();
            if (filters?.type) queryParams.append('type', filters.type);
            if (filters?.status) queryParams.append('status', filters.status);
            if (filters?.limit) queryParams.append('limit', filters.limit.toString());
            if (filters?.skip) queryParams.append('skip', filters.skip.toString());

            const url = `${API_URL}/wallet/transactions${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            const response = await authenticatedFetch(url);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
                return errorData;
            }

            return await response.json();
        } catch (error) {
            console.error('Get transactions error:', error);
            return { error: 'Failed to fetch transactions' };
        }
    }
};

