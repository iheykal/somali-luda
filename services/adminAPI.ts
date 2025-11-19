// Admin API Service
// Uses environment variables for API URL configuration

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

// Helper function to simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

// Mock data generators
const generateMockTransactions = () => {
    return [];
};

const generateMockUsers = () => {
    return [];
};

const generateMockGameStats = () => {
    return {
        totalGames: 0,
        totalRevenue: 0
    };
};

const generateMockMatchRevenue = () => {
    return {
        availableBalance: 0,
        totalRevenue: 0,
        allTimeRevenue: 0,
        totalWithdrawn: 0,
        totalMatches: 0,
        matches: []
    };
};

const generateMockLedger = () => {
    return {
        totalRevenue: 0,
        totalExpenses: 0,
        netBalance: 0,
        summary: {
            revenueCount: 0,
            expenseCount: 0
        },
        ledgerEntries: []
    };
};

const generateMockUserStats = () => {
    return {
        totalGames: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalWinnings: 0,
        totalLosses: 0,
        netProfit: 0,
        recentGames: []
    };
};

// Admin API
export const adminAPI = {
    getPendingTransactions: async () => {
        try {
            const response = await authenticatedFetch(`${API_URL}/admin/transactions/pending`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
                return errorData;
            }
            const data = await response.json();
            return data.transactions || [];
        } catch (error) {
            console.error('Get pending transactions error:', error);
            return [];
        }
    },
    
    getAllTransactions: async (filters: any = {}) => {
        try {
            const queryParams = new URLSearchParams();
            if (filters.type) queryParams.append('type', filters.type);
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.limit) queryParams.append('limit', filters.limit.toString());
            if (filters.skip) queryParams.append('skip', filters.skip.toString());

            const url = `${API_URL}/admin/transactions${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            const response = await authenticatedFetch(url);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
                return errorData;
            }
            const data = await response.json();
            return data.transactions || [];
        } catch (error) {
            console.error('Get all transactions error:', error);
            return [];
        }
    },
    
    approveTransaction: async (transactionId: string, adminNotes: string = '') => {
        try {
            const response = await authenticatedFetch(`${API_URL}/admin/transactions/${transactionId}/approve`, {
                method: 'POST',
                body: JSON.stringify({ adminNotes })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
                return errorData;
            }
            return await response.json();
        } catch (error) {
            console.error('Approve transaction error:', error);
            return { error: 'Failed to approve transaction' };
        }
    },
    
    rejectTransaction: async (transactionId: string, adminNotes: string = '') => {
        try {
            if (!adminNotes) {
                return { error: 'Rejection reason is required' };
            }
            
            const response = await authenticatedFetch(`${API_URL}/admin/transactions/${transactionId}/reject`, {
                method: 'POST',
                body: JSON.stringify({ adminNotes })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
                return errorData;
            }
            return await response.json();
        } catch (error) {
            console.error('Reject transaction error:', error);
            return { error: 'Failed to reject transaction' };
        }
    },
    
    getAllUsers: async () => {
        try {
            const url = `${API_URL}/admin/users`;
            console.log('Fetching users from:', url);
            const response = await authenticatedFetch(url);
            console.log('Users API response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
                console.error('Users API error:', errorData);
                return { users: [], total: 0 };
            }
            const data = await response.json();
            console.log('Users API data:', data);
            return {
                users: data.users || [],
                total: data.total || (data.users ? data.users.length : 0)
            };
        } catch (error) {
            console.error('Get all users error:', error);
            return { users: [], total: 0 };
        }
    },
    
    getUserMatchHistory: async (userId: string) => {
        try {
            const response = await authenticatedFetch(`${API_URL}/admin/users/${userId}/matches`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
                return { matches: [], error: errorData.error };
            }
            const data = await response.json();
            return {
                matches: data.matches || [],
                total: data.total || 0,
                wins: data.wins || 0,
                losses: data.losses || 0
            };
        } catch (error) {
            console.error('Get user match history error:', error);
            return { matches: [], total: 0, wins: 0, losses: 0 };
        }
    },
    
    getUserTransactions: async (userId: string) => {
        try {
            const response = await authenticatedFetch(`${API_URL}/admin/users/${userId}/transactions`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
                return { transactions: [], error: errorData.error };
            }
            const data = await response.json();
            return {
                transactions: data.transactions || []
            };
        } catch (error) {
            console.error('Get user transactions error:', error);
            return { transactions: [] };
        }
    },
    
    getGameStats: async () => {
        try {
            const response = await authenticatedFetch(`${API_URL}/admin/stats`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
                console.error('Get game stats error:', errorData);
                return generateMockGameStats();
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Get game stats error:', error);
            return generateMockGameStats();
        }
    },
    
    getGameHistory: async (limit: number = 50) => {
        await delay(500);
        return [];
    },
    
    getUserStats: async (userId: string) => {
        await delay(500);
        return generateMockUserStats();
    },
    
    getMatchRevenue: async (filter: string = 'all') => {
        try {
            const response = await authenticatedFetch(`${API_URL}/admin/revenue?filter=${filter}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
                return generateMockMatchRevenue();
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Get match revenue error:', error);
            return generateMockMatchRevenue();
        }
    },
    
    getMatchRevenueWithdrawals: async () => {
        await delay(500);
        return [];
    },
    
    withdrawMatchRevenue: async (withdrawalData: {
        amount: string;
        phoneNumber: string;
        recipientName: string;
        notes?: string;
    }) => {
        await delay(500);
        return { success: true };
    },
    
    getMatchRevenueLedger: async () => {
        await delay(500);
        return generateMockLedger();
    },
    
    diagnoseMatches: async () => {
        try {
            const response = await authenticatedFetch(`${API_URL}/admin/diagnose/matches`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
                return { error: errorData.error || 'Failed to diagnose matches' };
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Diagnose matches error:', error);
            return { error: 'Failed to diagnose matches' };
        }
    },
    
    resetUserPassword: async (userId: string) => {
        try {
            const response = await authenticatedFetch(`${API_URL}/admin/users/${userId}/reset-password`, {
                method: 'POST',
                body: JSON.stringify({})
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
                return errorData;
            }
            return await response.json();
        } catch (error) {
            console.error('Reset password error:', error);
            return { error: 'Failed to generate reset code' };
        }
    }
};

