import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { authAPI } from '../services/authAPI';

interface User {
    _id?: string;
    username?: string;
    phone?: string;
    balance?: number;
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    register: (userData: { username: string; phone: string; password: string }) => Promise<{ success?: boolean; error?: string }>;
    login: (credentials: { phone: string; password: string }) => Promise<{ success?: boolean; error?: string }>;
    logout: () => void;
    updateBalance: () => Promise<void>;
    setBalance: (newBalance: number) => void;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isSuperAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in on mount
        const token = localStorage.getItem('token');
        if (token) {
            loadUser();
        } else {
            setLoading(false);
        }
    }, []);

    const loadUser = async () => {
        try {
            const userData = await authAPI.getProfile();
            if (!userData.error) {
                setUser(userData);
            } else {
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error('Error loading user:', error);
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    };

    const register = async (userData: { username: string; phone: string; password: string }) => {
        try {
            const response = await authAPI.register(userData);
            if (response.error) {
                return { error: response.error };
            }
            localStorage.setItem('token', response.token);
            setUser(response.user);
            return { success: true };
        } catch (error) {
            return { error: 'Registration failed' };
        }
    };

    const login = async (credentials: { phone: string; password: string }) => {
        try {
            const response = await authAPI.login(credentials);
            if (response.error) {
                return { error: response.error };
            }
            localStorage.setItem('token', response.token);
            setUser(response.user);
            return { success: true };
        } catch (error) {
            return { error: 'Login failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const updateBalance = async () => {
        try {
            const response = await authAPI.getBalance();
            if (!response.error) {
                setUser(prev => prev ? { ...prev, balance: response.balance } : null);
            }
        } catch (error) {
            console.error('Error updating balance:', error);
        }
    };

    // Update balance directly (called from socket events)
    const setBalance = (newBalance: number) => {
        setUser(prev => prev ? { ...prev, balance: newBalance } : null);
    };

    const value: AuthContextType = {
        user,
        loading,
        register,
        login,
        logout,
        updateBalance,
        setBalance,
        isAuthenticated: !!user,
        isAdmin: user?.isAdmin || user?.isSuperAdmin || false,
        isSuperAdmin: user?.isSuperAdmin || false
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};







