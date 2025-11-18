// Wallet API Service
// Handles deposits, withdrawals, and transaction history

// Helper function to get the API URL, automatically detecting hostname for mobile devices
function getApiUrl(): string {
  // First, check if environment variable is explicitly set (highest priority)
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
  if (envUrl && envUrl.trim() !== '' && envUrl !== 'http://localhost:3001/api') {
    // Ensure it ends with /api if it doesn't already
    const cleanUrl = envUrl.trim();
    if (cleanUrl.endsWith('/api')) {
      return cleanUrl;
    } else if (!cleanUrl.endsWith('/api/')) {
      return `${cleanUrl}/api`;
    }
    return cleanUrl;
  }
  
  // If we're in the browser, detect the hostname dynamically
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol; // 'http:' or 'https:'
    const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1';
    
    // In production (deployed), use relative URL if backend is on same domain
    // This works when frontend and backend are deployed together
    if (isProduction) {
      // Use relative URL - works when frontend and backend are on same domain
      return '/api';
    }
    
    // Development: use localhost with port 3001
    return 'http://localhost:3001/api';
  }
  
  // Default fallback for development
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
    deposit: async (amount: number, paymentReference?: string, paymentGateway?: string) => {
        try {
            const response = await authenticatedFetch(`${API_URL}/wallet/deposit`, {
                method: 'POST',
                body: JSON.stringify({ amount, paymentReference, paymentGateway })
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

