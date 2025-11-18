import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './Auth.module.css';

interface RegisterProps {
    onSuccess?: () => void;
    onSwitchToLogin?: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSuccess, onSwitchToLogin }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();

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

        console.log('Register form data:', formData);

        // Validation
        if (!formData.fullName || !formData.phone || !formData.password || !formData.confirmPassword) {
            console.log('Validation failed: Missing fields');
            setError('All fields are required');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            console.log('Validation failed: Passwords do not match');
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            console.log('Validation failed: Password too short');
            setError('Password must be at least 6 characters');
            return;
        }

        console.log('Validation passed, attempting registration...');

        setLoading(true);
        const result = await register({
            username: formData.fullName,
            phone: formData.phone,
            password: formData.password
        });

        setLoading(false);

        console.log('Registration result:', result);

        if (result.error) {
            setError(result.error);
        } else {
            // Success - call onSuccess callback
            if (onSuccess) {
                onSuccess();
            }
        }
    };

    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard}>
                <h1 className={styles.title}>Create Account</h1>
                <p className={styles.subtitle}>Register to start playing Ludo</p>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="fullName">Full Name</label>
                        <input
                            type="text"
                            id="fullName"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            placeholder="Enter your full name"
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="phone">Phone Number</label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="610251014"
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
                            placeholder="Enter password"
                            required
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
                            placeholder="Confirm password"
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        className={styles.submitButton}
                        disabled={loading}
                    >
                        {loading ? 'Creating Account...' : 'Register'}
                    </button>
                </form>

                {onSwitchToLogin && (
                    <p className={styles.switchAuth}>
                        Already have an account? <button type="button" onClick={onSwitchToLogin} className={styles.linkButton}>Login here</button>
                    </p>
                )}
            </div>
        </div>
    );
};

export default Register;







