import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './Auth.module.css';

interface LoginProps {
    onSuccess?: () => void;
    onSwitchToRegister?: () => void;
}

const Login: React.FC<LoginProps> = ({ onSuccess, onSwitchToRegister }) => {
    const [formData, setFormData] = useState({
        phone: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

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

        if (!formData.phone || !formData.password) {
            setError('Phone and password are required');
            return;
        }

        console.log('Attempting login with:', { phone: formData.phone, hasPassword: !!formData.password });

        setLoading(true);
        
        try {
            const result = await login(formData);
            console.log('Login result:', result);

            if (result.error) {
                setError(result.error);
            } else {
                // Success - call onSuccess callback
                if (onSuccess) {
                    onSuccess();
                }
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard}>
                <h1 className={styles.title}>Welcome Back</h1>
                <p className={styles.subtitle}>Login to continue playing</p>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="phone">Phone Number</label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="610251014"
                            pattern="[0-9]*"
                            inputMode="numeric"
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        className={styles.submitButton}
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                {onSwitchToRegister && (
                    <p className={styles.switchAuth}>
                        Don't have an account? <button type="button" onClick={onSwitchToRegister} className={styles.linkButton}>Register here</button>
                    </p>
                )}
            </div>
        </div>
    );
};

export default Login;








