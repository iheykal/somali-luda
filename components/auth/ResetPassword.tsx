import React, { useState } from 'react';
import styles from './Auth.module.css';

interface ResetPasswordProps {
    onSuccess?: () => void;
    onSwitchToLogin?: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onSuccess, onSwitchToLogin }) => {
    const [formData, setFormData] = useState({
        phone: '',
        resetCode: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.phone || !formData.resetCode || !formData.newPassword) {
            setError('Phone number, reset code, and new password are required');
            return;
        }

        if (formData.newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        
        try {
            // Get API URL
            const getApiUrl = () => {
                if (typeof window !== 'undefined') {
                    const hostname = window.location.hostname;
                    const protocol = window.location.protocol;
                    const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
                    
                    if (envUrl && envUrl.trim() !== '') {
                        const cleanUrl = envUrl.trim();
                        if (cleanUrl.startsWith('/')) {
                            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                                return 'http://localhost:3001/api';
                            } else if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
                                return `${protocol}//${hostname}:3001/api`;
                            }
                            return cleanUrl;
                        }
                        if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
                            return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
                        }
                        return cleanUrl;
                    }
                    
                    if (hostname === 'localhost' || hostname === '127.0.0.1') {
                        return 'http://localhost:3001/api';
                    } else if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
                        return `${protocol}//${hostname}:3001/api`;
                    }
                    return '/api';
                }
                return 'http://localhost:3001/api';
            };

            const API_URL = getApiUrl();
            const response = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phone: formData.phone,
                    resetCode: formData.resetCode,
                    newPassword: formData.newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to reset password');
                return;
            }

            setSuccess(true);
            setTimeout(() => {
                if (onSuccess) {
                    onSuccess();
                } else if (onSwitchToLogin) {
                    onSwitchToLogin();
                }
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className={styles.authContainer}>
                <div className={styles.authCard}>
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{ 
                            fontSize: '64px', 
                            marginBottom: '20px',
                            animation: 'scaleIn 0.5s ease-out'
                        }}>✅</div>
                        <div style={{
                            padding: '20px',
                            background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                            borderRadius: '12px',
                            border: '2px solid #10b981',
                            marginBottom: '24px'
                        }}>
                            <h2 style={{ 
                                margin: '0 0 12px 0', 
                                color: '#065f46', 
                                fontSize: '24px', 
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px'
                            }}>
                                <span>✅</span>
                                <span>Password Reset Successful!</span>
                            </h2>
                            <p style={{ margin: '0', color: '#047857', fontSize: '16px', fontWeight: '500' }}>
                                Your password has been reset successfully. You can now login with your new password.
                            </p>
                        </div>
                        {onSwitchToLogin && (
                            <button
                                onClick={onSwitchToLogin}
                                className={styles.submitButton}
                                style={{ width: '100%' }}
                            >
                                Go to Login
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard}>
                <h2 style={{ margin: '0 0 8px 0', color: '#111827', fontSize: '28px', fontWeight: '700', textAlign: 'center' }}>
                    🔑 Reset Password
                </h2>
                <p style={{ margin: '0 0 32px 0', color: '#6b7280', fontSize: '14px', textAlign: 'center' }}>
                    Enter your phone number and reset code to set a new password
                </p>

                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="phone">Phone Number</label>
                        <input
                            type="text"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="Enter your phone number"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="resetCode">Reset Code</label>
                        <input
                            type="text"
                            id="resetCode"
                            name="resetCode"
                            value={formData.resetCode}
                            onChange={handleChange}
                            placeholder="Enter the 6-digit reset code"
                            maxLength={6}
                            required
                            disabled={loading}
                            style={{ fontFamily: 'monospace', letterSpacing: '4px', fontSize: '20px', textAlign: 'center' }}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="newPassword">New Password</label>
                        <input
                            type="password"
                            id="newPassword"
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleChange}
                            placeholder="Enter new password (min 6 characters)"
                            required
                            disabled={loading}
                            minLength={6}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Confirm new password"
                            required
                            disabled={loading}
                            minLength={6}
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding: '16px',
                            background: '#fee2e2',
                            border: '2px solid #ef4444',
                            borderRadius: '8px',
                            color: '#991b1b',
                            marginBottom: '20px',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <span style={{ fontSize: '20px', flexShrink: 0 }}>❌</span>
                            <span><strong>Error:</strong> {error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={loading}
                    >
                        {loading ? 'Resetting Password...' : 'Reset Password'}
                    </button>

                    {onSwitchToLogin && (
                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                            <button
                                type="button"
                                onClick={onSwitchToLogin}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#3b82f6',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    textDecoration: 'underline'
                                }}
                            >
                                Back to Login
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;

