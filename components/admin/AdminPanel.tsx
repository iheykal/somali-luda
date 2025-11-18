import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/adminAPI';
import { useAuth } from '../../context/AuthContext';
import styles from './Admin.module.css';

interface AdminPanelProps {
    onExit: () => void;
}

type Tab = 'transactions' | 'users' | 'stats' | 'revenue' | 'ledger';

const AdminPanel: React.FC<AdminPanelProps> = ({ onExit }) => {
    const { isAdmin, isSuperAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('transactions');
    const [transactionSubTab, setTransactionSubTab] = useState<'pending' | 'all'>('pending');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    
    // Redirect if not admin
    useEffect(() => {
        if (!isAdmin && !isSuperAdmin) {
            onExit();
        }
    }, [isAdmin, isSuperAdmin, onExit]);
    
    // Don't render if not admin
    if (!isAdmin && !isSuperAdmin) {
        return null;
    }

    // Transactions state
    const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
    const [allTransactions, setAllTransactions] = useState<any[]>([]);

    // Users state
    const [users, setUsers] = useState<any[]>([]);
    const [totalUsers, setTotalUsers] = useState<number>(0);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [userMatchHistory, setUserMatchHistory] = useState<any[]>([]);
    const [userTransactions, setUserTransactions] = useState<any[]>([]);
    const [loadingMatchHistory, setLoadingMatchHistory] = useState(false);
    const [loadingTransactions, setLoadingTransactions] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState<string>('');
    const [userDetailTab, setUserDetailTab] = useState<'matches' | 'transactions'>('matches');
    const [userSortBy, setUserSortBy] = useState<'default' | 'profit' | 'balance' | 'matches'>('default');

    // Stats state
    const [gameStats, setGameStats] = useState<any>(null);

    // Revenue state
    const [revenue, setRevenue] = useState<any>(null);
    const [revenueFilter, setRevenueFilter] = useState<string>('all');

    // Ledger state
    const [ledger, setLedger] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, [activeTab, revenueFilter, transactionSubTab]);

    const loadData = async () => {
        setLoading(true);
        setError('');

        try {
            switch (activeTab) {
                case 'transactions':
                    const pending = await adminAPI.getPendingTransactions();
                    const all = await adminAPI.getAllTransactions();
                    // Ensure we always have arrays, even if API returns error or null
                    setPendingTransactions(Array.isArray(pending) ? pending : (pending?.error ? [] : []));
                    setAllTransactions(Array.isArray(all) ? all : (all?.error ? [] : []));
                    break;
                case 'users':
                    const usersData = await adminAPI.getAllUsers();
                    console.log('Users data received:', usersData);
                    if (usersData && typeof usersData === 'object' && 'users' in usersData) {
                        setUsers(usersData.users || []);
                        setTotalUsers(usersData.total || 0);
                        console.log('Set users:', usersData.users?.length, 'Total:', usersData.total);
                    } else {
                        // Fallback for old API format
                        setUsers(Array.isArray(usersData) ? usersData : []);
                        setTotalUsers(Array.isArray(usersData) ? usersData.length : 0);
                        console.log('Using fallback - users array length:', Array.isArray(usersData) ? usersData.length : 0);
                    }
                    break;
                case 'stats':
                    const stats = await adminAPI.getGameStats();
                    setGameStats(stats);
                    break;
                case 'revenue':
                    const revenueData = await adminAPI.getMatchRevenue(revenueFilter);
                    setRevenue(revenueData);
                    break;
                case 'ledger':
                    const ledgerData = await adminAPI.getMatchRevenueLedger();
                    setLedger(ledgerData);
                    break;
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveTransaction = async (transactionId: string) => {
        try {
            await adminAPI.approveTransaction(transactionId);
            setShowSuccessModal(true);
            loadData();
            // Auto-close modal after 3 seconds
            setTimeout(() => {
                setShowSuccessModal(false);
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to approve transaction');
        }
    };

    const handleUserClick = async (user: any) => {
        setSelectedUser(user);
        setUserDetailTab('matches');
        setLoadingMatchHistory(true);
        setLoadingTransactions(true);
        try {
            const [history, transactions] = await Promise.all([
                adminAPI.getUserMatchHistory(user._id || user.id),
                adminAPI.getUserTransactions(user._id || user.id)
            ]);
            setUserMatchHistory(history.matches || []);
            setUserTransactions(transactions.transactions || []);
        } catch (error) {
            console.error('Failed to load user data:', error);
            setUserMatchHistory([]);
            setUserTransactions([]);
        } finally {
            setLoadingMatchHistory(false);
            setLoadingTransactions(false);
        }
    };

    const handleCloseMatchHistory = () => {
        setSelectedUser(null);
        setUserMatchHistory([]);
        setUserTransactions([]);
        setUserDetailTab('matches');
    };

    const handleRejectTransaction = async (transactionId: string) => {
        try {
            const reason = prompt('Please provide a reason for rejection:');
            if (!reason || reason.trim() === '') {
                alert('Rejection reason is required');
                return;
            }
            const result = await adminAPI.rejectTransaction(transactionId, reason);
            if (result.error) {
                setError(result.error);
            } else {
                loadData();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to reject transaction');
        }
    };

    const renderTransactions = () => {
        const transactions = transactionSubTab === 'pending' ? pendingTransactions : allTransactions;
        
        if (loading) {
            return <div className={styles.loading}>Loading transactions...</div>;
        }

        if (error) {
            return <div className={styles.error}>{error}</div>;
        }

        if (!transactions || transactions.length === 0) {
            return (
                <div className={styles.emptyState}>
                    <div style={{ 
                        fontSize: '64px', 
                        marginBottom: '24px',
                        opacity: 0.5
                    }}>📭</div>
                    <div style={{ 
                        fontSize: '26px', 
                        fontWeight: '700',
                        color: '#111827',
                        marginBottom: '12px',
                        letterSpacing: '-0.5px'
                    }}>
                        No transactions found
                    </div>
                    <div style={{ 
                        fontSize: '16px', 
                        color: '#4b5563',
                        fontWeight: '400',
                        lineHeight: '1.6',
                        maxWidth: '500px',
                        margin: '0 auto'
                    }}>
                        {transactionSubTab === 'pending' 
                            ? 'No pending transactions at the moment. New transactions will appear here once users make deposit or withdrawal requests.' 
                            : 'Transaction history will appear here once transactions are processed.'}
                    </div>
                </div>
            );
        }

        return (
            <div className={styles.transactionsList}>
                {transactions.map((transaction: any) => (
                    <div key={transaction.id || transaction._id} className={styles.transactionCard}>
                        <div className={styles.transactionInfo}>
                            <h3>{transaction.type || 'Transaction'}</h3>
                            <p style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                                Amount: <span style={{ color: '#3b82f6' }}>${Math.abs(transaction.amount || 0).toFixed(2)}</span>
                            </p>
                            <p style={{ marginBottom: '12px' }}>
                                Status: <span style={{
                                    display: 'inline-block',
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    background: transaction.status === 'pending' ? '#fef3c7' : transaction.status === 'approved' ? '#d1fae5' : '#fee2e2',
                                    color: transaction.status === 'pending' ? '#92400e' : transaction.status === 'approved' ? '#065f46' : '#991b1b'
                                }}>
                                    {transaction.status || 'Pending'}
                                </span>
                            </p>
                            {transaction.userId && (
                                <p>User: {transaction.userId.username || transaction.userId.phone || 'Unknown'}</p>
                            )}
                            {transaction.withdrawalMethod && (
                                <p style={{ fontSize: '14px', color: '#111827', margin: '8px 0' }}>
                                    Method: <span style={{ fontWeight: '600', textTransform: 'uppercase' }}>
                                        {transaction.withdrawalMethod === 'evc_plus' ? 'EVC PLUS' : 
                                         transaction.withdrawalMethod === 'somnet' ? 'SOMNET' : 
                                         transaction.withdrawalMethod === 'e_dahab' ? 'E-DAHAB' : 
                                         transaction.withdrawalMethod}
                                    </span>
                                </p>
                            )}
                            {transaction.withdrawalDetails && (
                                <div style={{ marginTop: '12px', padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                    {transaction.withdrawalDetails.phoneNumber && (
                                        <p style={{ fontSize: '14px', color: '#111827', margin: '4px 0' }}>Phone: {transaction.withdrawalDetails.phoneNumber}</p>
                                    )}
                                    {transaction.withdrawalDetails.recipientName && (
                                        <p style={{ fontSize: '14px', color: '#111827', margin: '4px 0' }}>Recipient: {transaction.withdrawalDetails.recipientName}</p>
                                    )}
                                    {transaction.withdrawalDetails.accountNumber && (
                                        <p style={{ fontSize: '14px', color: '#111827', margin: '4px 0' }}>Account: {transaction.withdrawalDetails.accountNumber}</p>
                                    )}
                                    {transaction.withdrawalDetails.bankName && (
                                        <p style={{ fontSize: '14px', color: '#111827', margin: '4px 0' }}>Bank: {transaction.withdrawalDetails.bankName}</p>
                                    )}
                                </div>
                            )}
                            {transaction.createdAt && <p style={{ color: '#111827' }}>Date: {new Date(transaction.createdAt).toLocaleString()}</p>}
                            {transaction.processedBy && (
                                <p style={{ color: '#111827' }}>Processed by: {transaction.processedBy.username || 'Admin'}</p>
                            )}
                            {transaction.adminNotes && (
                                <p style={{ fontSize: '14px', color: '#374151', fontStyle: 'italic', marginTop: '8px', padding: '8px', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fde68a' }}>
                                    Notes: {transaction.adminNotes}
                                </p>
                            )}
                        </div>
                        {transaction.status === 'pending' && (
                            <div className={styles.transactionActions}>
                                <button
                                    className={styles.approveButton}
                                    onClick={() => handleApproveTransaction(transaction.id || transaction._id)}
                                >
                                    Approve
                                </button>
                                <button
                                    className={styles.rejectButton}
                                    onClick={() => handleRejectTransaction(transaction.id || transaction._id)}
                                >
                                    Reject
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const renderUsers = () => {
        if (loading) {
            return <div className={styles.loading}>Loading users...</div>;
        }

        if (error) {
            return <div className={styles.error}>{error}</div>;
        }

        // Filter users based on search query (phone number)
        let filteredUsers = userSearchQuery.trim() === '' 
            ? users 
            : users.filter(user => {
                const phone = (user.phone || '').toLowerCase();
                const query = userSearchQuery.toLowerCase().trim();
                return phone.includes(query);
            });

        // Sort users based on selected sort option
        if (userSortBy === 'profit') {
            filteredUsers = [...filteredUsers].sort((a, b) => (b.netProfit || 0) - (a.netProfit || 0));
        } else if (userSortBy === 'balance') {
            filteredUsers = [...filteredUsers].sort((a, b) => (b.balance || 0) - (a.balance || 0));
        } else if (userSortBy === 'matches') {
            filteredUsers = [...filteredUsers].sort((a, b) => (b.matchesPlayed || 0) - (a.matchesPlayed || 0));
        }

        return (
            <div>
                {/* Total Users Header */}
                <div style={{
                    background: '#ffffff',
                    padding: '20px',
                    borderRadius: '12px',
                    marginBottom: '24px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '20px',
                        flexWrap: 'wrap',
                        gap: '16px'
                    }}>
                        <div>
                            <h2 style={{
                                margin: '0 0 8px 0',
                                fontSize: '24px',
                                fontWeight: '700',
                                color: '#111827'
                            }}>
                                Total Users ({totalUsers || users.length})
                            </h2>
                            <p style={{
                                margin: '0',
                                fontSize: '14px',
                                color: '#6b7280'
                            }}>
                                Total number of registered users in the database
                            </p>
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            flexWrap: 'wrap'
                        }}>
                            <select
                                value={userSortBy}
                                onChange={(e) => setUserSortBy(e.target.value as any)}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '8px',
                                    border: '2px solid #e5e7eb',
                                    background: '#ffffff',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#111827',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    transition: 'all 0.2s'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#3b82f6';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e5e7eb';
                                    e.target.style.boxShadow = 'none';
                                }}
                            >
                                <option value="default">📋 Default Order</option>
                                <option value="profit">💰 Most Profitable</option>
                                <option value="balance">💵 Highest Balance</option>
                                <option value="matches">🎮 Most Matches</option>
                            </select>
                            <div style={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                padding: '20px 28px',
                                borderRadius: '16px',
                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                            }}>
                                <div style={{
                                    fontSize: '36px',
                                    fontWeight: '700',
                                    color: '#ffffff',
                                    lineHeight: '1'
                                }}>
                                    {totalUsers || users.length}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div style={{
                        position: 'relative'
                    }}>
                        <input
                            type="text"
                            placeholder="🔍 Search by phone number..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '14px 16px 14px 48px',
                                fontSize: '15px',
                                border: '2px solid #e5e7eb',
                                borderRadius: '12px',
                                outline: 'none',
                                transition: 'all 0.2s',
                                background: '#ffffff',
                                color: '#111827'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#3b82f6';
                                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#e5e7eb';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                        <div style={{
                            position: 'absolute',
                            left: '16px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '20px',
                            pointerEvents: 'none'
                        }}>
                            🔍
                        </div>
                        {userSearchQuery && (
                            <button
                                onClick={() => setUserSearchQuery('')}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '4px',
                                    color: '#6b7280',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#f3f4f6';
                                    e.currentTarget.style.color = '#111827';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#6b7280';
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    {userSearchQuery && (
                        <div style={{
                            marginTop: '12px',
                            fontSize: '14px',
                            color: '#6b7280'
                        }}>
                            Showing {filteredUsers.length} of {users.length} users
                        </div>
                    )}
                </div>

                {filteredUsers.length === 0 ? (
                    <div className={styles.emptyState}>
                        {userSearchQuery ? (
                            <>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                                <div>No users found</div>
                                <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
                                    No users match the phone number "{userSearchQuery}"
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                                <div>No users found</div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className={styles.usersGrid}>
                        {filteredUsers.map((user: any, index: number) => {
                            const userRank = userSortBy === 'profit' ? index + 1 : null;
                            const isTopThree = userRank !== null && userRank <= 3;
                            
                            return (
                            <div 
                                key={user.id || user._id} 
                                className={styles.userCard}
                                onClick={() => handleUserClick(user)}
                                style={{ position: 'relative' }}
                            >
                                {/* Ranking Badge for Top 3 Most Profitable */}
                                {isTopThree && userSortBy === 'profit' && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        right: '12px',
                                        background: userRank === 1 ? '#fbbf24' : 
                                                   userRank === 2 ? '#94a3b8' : '#cd7f32',
                                        color: 'white',
                                        padding: '6px 12px',
                                        borderRadius: '20px',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                        zIndex: 10,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        #{userRank} {userRank === 1 ? '🥇' : userRank === 2 ? '🥈' : '🥉'}
                                    </div>
                                )}
                                <h3>{user.username || user.name || 'User'}</h3>
                                <p>
                                    <span style={{ marginRight: '8px' }}>📱</span>
                                    <span>{user.phone || 'N/A'}</span>
                                </p>
                                <p>
                                    <span style={{ marginRight: '8px' }}>💰</span>
                                    <span style={{ fontWeight: '600', color: '#059669' }}>
                                        ${(user.balance || 0).toFixed(2)}
                                    </span>
                                </p>
                                {/* Net Profit Display */}
                                <div style={{ 
                                    marginTop: '12px',
                                    padding: '10px 12px',
                                    background: (user.netProfit || 0) >= 0 
                                        ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' 
                                        : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                                    borderRadius: '8px',
                                    border: `1px solid ${(user.netProfit || 0) >= 0 ? '#10b981' : '#ef4444'}`,
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: (user.netProfit || 0) >= 0 ? '#065f46' : '#991b1b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    <span>💵</span>
                                    <span>Net Profit: ${((user.netProfit || 0)).toFixed(2)}</span>
                                </div>
                                <div style={{ 
                                    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                                    padding: '12px 16px',
                                    borderRadius: '10px',
                                    marginTop: '12px',
                                    border: '1px solid #93c5fd',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span style={{ fontSize: '18px' }}>🎮</span>
                                    <span style={{ 
                                        fontSize: '15px', 
                                        fontWeight: '600',
                                        color: '#1e40af'
                                    }}>
                                        Matches Played: <strong>{user.matchesPlayed || 0}</strong>
                                    </span>
                                </div>
                                {user.createdAt && (
                                    <p style={{ 
                                        fontSize: '12px', 
                                        color: '#6b7280', 
                                        marginTop: '12px',
                                        paddingTop: '12px',
                                        borderTop: '1px solid #e5e7eb',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <span>📅</span>
                                        <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                                    </p>
                                )}
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderStats = () => {
        if (loading) {
            return <div className={styles.loading}>Loading statistics...</div>;
        }

        if (error) {
            return <div className={styles.error}>{error}</div>;
        }

        if (!gameStats) {
            return <div className={styles.emptyState}>No statistics available</div>;
        }

        return (
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <h3>Total Games</h3>
                    <p>{gameStats.totalGames || 0}</p>
                </div>
                <div className={styles.statCard}>
                    <h3>Total Revenue</h3>
                    <p>${(gameStats.totalRevenue || 0).toFixed(2)}</p>
                </div>
                <div className={styles.statCard}>
                    <h3>Platform Commission</h3>
                    <p style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
                        {((gameStats.commissionRate || 0.10) * 100).toFixed(0)}%
                    </p>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                        ${(gameStats.totalCommission || gameStats.totalRevenue || 0).toFixed(2)}
                    </p>
                </div>
                <div className={styles.statCard}>
                    <h3>Total Bet Amount</h3>
                    <p>${(gameStats.totalBet || 0).toFixed(2)}</p>
                </div>
            </div>
        );
    };

    const renderRevenue = () => {
        if (loading) {
            return <div className={styles.loading}>Loading revenue data...</div>;
        }

        if (error) {
            return <div className={styles.error}>{error}</div>;
        }

        if (!revenue) {
            return <div className={styles.emptyState}>No revenue data available</div>;
        }

        return (
            <div className={styles.revenueContainer}>
                <div className={styles.revenueHeader}>
                    <h2>Match Revenue</h2>
                    <div className={styles.revenueFilters}>
                        {['all', 'today', 'week', 'month'].map((filter) => (
                            <button
                                key={filter}
                                className={revenueFilter === filter ? styles.revenueFilterActive : styles.revenueFilterBtn}
                                onClick={() => setRevenueFilter(filter)}
                            >
                                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
                <div className={styles.revenueStats}>
                    <div className={styles.revenueCard}>
                        <div className={styles.revenueIcon}>💰</div>
                        <div>
                            <h3>Available Balance</h3>
                            <p>${(revenue.availableBalance || 0).toFixed(2)}</p>
                        </div>
                    </div>
                    <div className={styles.revenueCard}>
                        <div className={styles.revenueIcon}>📈</div>
                        <div>
                            <h3>Total Revenue</h3>
                            <p>${(revenue.totalRevenue || 0).toFixed(2)}</p>
                        </div>
                    </div>
                    <div className={styles.revenueCard} style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    }}>
                        <div className={styles.revenueIcon}>💼</div>
                        <div>
                            <h3>Platform Commission</h3>
                            <p style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px', color: '#ffffff' }}>10%</p>
                            <p style={{ fontSize: '14px', opacity: 0.9, color: '#ffffff' }}>
                                ${(revenue.totalRevenue || 0).toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <div className={styles.revenueCard}>
                        <div className={styles.revenueIcon}>🏆</div>
                        <div>
                            <h3>Total Matches</h3>
                            <p>{revenue.totalMatches || 0}</p>
                        </div>
                    </div>
                    <div className={styles.revenueCard} style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    }}>
                        <div className={styles.revenueIcon}>💵</div>
                        <div>
                            <h3>Total Deposits</h3>
                            <p>${(revenue.totalDeposits || 0).toFixed(2)}</p>
                        </div>
                    </div>
                    <div className={styles.revenueCard} style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                    }}>
                        <div className={styles.revenueIcon}>🔄</div>
                        <div>
                            <h3>Circulating Amount</h3>
                            <p>${(revenue.circulatingAmount || 0).toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                {revenue.matches && revenue.matches.length > 0 ? (
                    <div className={styles.matchesList}>
                        <h3>Recent Matches</h3>
                        <div className={styles.matchesTable}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Game ID</th>
                                        <th>Bet Amount</th>
                                        <th>Winner</th>
                                        <th>Loser</th>
                                        <th>Total Bet</th>
                                        <th>Commission</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {revenue.matches.map((match: any, index: number) => (
                                        <tr key={index}>
                                            <td>{match.gameId}</td>
                                            <td>${(match.betAmount || 0.5).toFixed(2)}</td>
                                            <td>{match.winner?.username || 'Unknown'}</td>
                                            <td>{match.loser?.username || 'Unknown'}</td>
                                            <td>${(match.totalBet || 0).toFixed(2)}</td>
                                            <td>${(match.commission || 0).toFixed(2)}</td>
                                            <td>{new Date(match.completedAt).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className={styles.emptyState}>No matches found</div>
                )}
            </div>
        );
    };

    const renderLedger = () => {
        if (loading) {
            return <div className={styles.loading}>Loading ledger...</div>;
        }

        if (error) {
            return <div className={styles.error}>{error}</div>;
        }

        if (!ledger) {
            return <div className={styles.emptyState}>No ledger data available</div>;
        }

        return (
            <div className={styles.ledgerContainer}>
                <div className={styles.ledgerSummary}>
                    <div className={styles.ledgerStat}>
                        <h3>Total Revenue</h3>
                        <p>${ledger.totalRevenue || 0}</p>
                    </div>
                    <div className={styles.ledgerStat}>
                        <h3>Total Expenses</h3>
                        <p>${ledger.totalExpenses || 0}</p>
                    </div>
                    <div className={styles.ledgerStat}>
                        <h3>Net Balance</h3>
                        <p>${ledger.netBalance || 0}</p>
                    </div>
                </div>
                {ledger.ledgerEntries && ledger.ledgerEntries.length > 0 ? (
                    <div className={styles.ledgerEntries}>
                        {ledger.ledgerEntries.map((entry: any, index: number) => (
                            <div key={index} className={styles.ledgerEntry}>
                                <p>{entry.description || 'Entry'}</p>
                                <p>${entry.amount || 0}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>No ledger entries</div>
                )}
            </div>
        );
    };

    return (
        <div className={styles.adminContainer}>
            <div className={styles.adminCard}>
                <div className={styles.header}>
                    <div>
                        <h1>{isSuperAdmin ? 'Super Admin Dashboard' : 'Admin Dashboard'}</h1>
                        <p>Manage your game platform</p>
                    </div>
                    <button className={styles.backButton} onClick={onExit}>
                        Back to Game
                    </button>
                </div>

                <div className={styles.tabs}>
                    <button
                        className={activeTab === 'transactions' ? styles.activeTab : ''}
                        onClick={() => setActiveTab('transactions')}
                    >
                        Transactions
                    </button>
                    <button
                        className={activeTab === 'users' ? styles.activeTab : ''}
                        onClick={() => setActiveTab('users')}
                    >
                        Users
                    </button>
                    <button
                        className={activeTab === 'stats' ? styles.activeTab : ''}
                        onClick={() => setActiveTab('stats')}
                    >
                        Game Stats
                    </button>
                    <button
                        className={activeTab === 'revenue' ? styles.activeTab : ''}
                        onClick={() => setActiveTab('revenue')}
                    >
                        Revenue
                    </button>
                    <button
                        className={activeTab === 'ledger' ? styles.activeTab : ''}
                        onClick={() => setActiveTab('ledger')}
                    >
                        Ledger
                    </button>
                </div>

                <div className={styles.tabContent}>
                    {activeTab === 'transactions' && (
                        <>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
                                <button
                                    onClick={() => setTransactionSubTab('pending')}
                                    style={{
                                        padding: '10px 20px',
                                        border: 'none',
                                        background: transactionSubTab === 'pending' ? '#3b82f6' : 'transparent',
                                        color: transactionSubTab === 'pending' ? 'white' : '#6b7280',
                                        cursor: 'pointer',
                                        borderBottom: transactionSubTab === 'pending' ? '3px solid #2563eb' : '3px solid transparent',
                                        fontWeight: transactionSubTab === 'pending' ? '600' : '400',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Pending
                                </button>
                                <button
                                    onClick={() => setTransactionSubTab('all')}
                                    style={{
                                        padding: '10px 20px',
                                        border: 'none',
                                        background: transactionSubTab === 'all' ? '#3b82f6' : 'transparent',
                                        color: transactionSubTab === 'all' ? 'white' : '#6b7280',
                                        cursor: 'pointer',
                                        borderBottom: transactionSubTab === 'all' ? '3px solid #2563eb' : '3px solid transparent',
                                        fontWeight: transactionSubTab === 'all' ? '600' : '400',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    All Transactions
                                </button>
                            </div>
                            {renderTransactions()}
                        </>
                    )}
                    {activeTab === 'users' && renderUsers()}
                    {activeTab === 'stats' && renderStats()}
                    {activeTab === 'revenue' && renderRevenue()}
                    {activeTab === 'ledger' && renderLedger()}
                </div>
            </div>

            {/* User Match History Modal */}
            {selectedUser && (
                <div 
                    className={styles.successModalOverlay} 
                    onClick={handleCloseMatchHistory}
                    style={{ zIndex: 10002 }}
                >
                    <div 
                        className={styles.successModal} 
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                            maxWidth: '800px', 
                            maxHeight: '90vh', 
                            overflowY: 'auto',
                            background: '#ffffff',
                            padding: '40px'
                        }}
                    >
                        <div style={{ marginBottom: '24px' }}>
                            <h2 style={{ 
                                margin: '0 0 8px 0', 
                                fontSize: '28px', 
                                fontWeight: '700',
                                color: '#111827'
                            }}>
                                {selectedUser.username || selectedUser.name || 'User'}'s Details
                            </h2>
                            <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
                                Phone: {selectedUser.phone || 'N/A'} | Balance: ${(selectedUser.balance || 0).toFixed(2)}
                            </p>
                        </div>

                        {/* Tab Navigation */}
                        <div style={{ 
                            display: 'flex', 
                            gap: '10px', 
                            marginBottom: '24px', 
                            borderBottom: '2px solid #e5e7eb' 
                        }}>
                            <button
                                onClick={() => setUserDetailTab('matches')}
                                style={{
                                    padding: '12px 24px',
                                    border: 'none',
                                    background: userDetailTab === 'matches' ? '#3b82f6' : 'transparent',
                                    color: userDetailTab === 'matches' ? 'white' : '#6b7280',
                                    cursor: 'pointer',
                                    borderBottom: userDetailTab === 'matches' ? '3px solid #2563eb' : '3px solid transparent',
                                    fontWeight: userDetailTab === 'matches' ? '600' : '400',
                                    transition: 'all 0.2s',
                                    fontSize: '15px',
                                    borderRadius: '8px 8px 0 0'
                                }}
                            >
                                🎮 Matches
                            </button>
                            <button
                                onClick={() => setUserDetailTab('transactions')}
                                style={{
                                    padding: '12px 24px',
                                    border: 'none',
                                    background: userDetailTab === 'transactions' ? '#3b82f6' : 'transparent',
                                    color: userDetailTab === 'transactions' ? 'white' : '#6b7280',
                                    cursor: 'pointer',
                                    borderBottom: userDetailTab === 'transactions' ? '3px solid #2563eb' : '3px solid transparent',
                                    fontWeight: userDetailTab === 'transactions' ? '600' : '400',
                                    transition: 'all 0.2s',
                                    fontSize: '15px',
                                    borderRadius: '8px 8px 0 0'
                                }}
                            >
                                💰 Deposits & Withdrawals
                            </button>
                        </div>

                        {/* Matches Tab Content */}
                        {userDetailTab === 'matches' && (
                            <>
                                {loadingMatchHistory ? (
                            <div className={styles.loading}>Loading match history...</div>
                        ) : userMatchHistory.length === 0 ? (
                            <div className={styles.emptyState}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎮</div>
                                <div>No matches found</div>
                                <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
                                    This user hasn't played any matches yet
                                </div>
                            </div>
                        ) : (
                            <div>
                                {/* Summary Stats */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '16px',
                                    marginBottom: '24px'
                                }}>
                                    <div style={{
                                        background: '#f8f9fa',
                                        padding: '20px',
                                        borderRadius: '12px',
                                        textAlign: 'center',
                                        border: '2px solid #e5e7eb'
                                    }}>
                                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                                            {userMatchHistory.length}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
                                            Total Matches
                                        </div>
                                    </div>
                                    <div style={{
                                        background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                                        padding: '20px',
                                        borderRadius: '12px',
                                        textAlign: 'center',
                                        border: '2px solid #10b981'
                                    }}>
                                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#065f46', marginBottom: '8px' }}>
                                            {userMatchHistory.filter(m => m.result === 'won').length}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#047857', fontWeight: '500' }}>
                                            Wins 🏆
                                        </div>
                                    </div>
                                    <div style={{
                                        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                                        padding: '20px',
                                        borderRadius: '12px',
                                        textAlign: 'center',
                                        border: '2px solid #ef4444'
                                    }}>
                                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#991b1b', marginBottom: '8px' }}>
                                            {userMatchHistory.filter(m => m.result === 'lost').length}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#dc2626', fontWeight: '500' }}>
                                            Losses ❌
                                        </div>
                                    </div>
                                </div>

                                {/* Match List */}
                                <div style={{ marginBottom: '20px' }}>
                                    <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600', color: '#111827' }}>
                                        All Matches
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {userMatchHistory.map((match: any, index: number) => (
                                            <div 
                                                key={match.gameId || index}
                                                style={{
                                                    background: match.result === 'won' 
                                                        ? 'linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%)' 
                                                        : match.result === 'lost' 
                                                        ? 'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)' 
                                                        : '#f8f9fa',
                                                    padding: '20px',
                                                    borderRadius: '12px',
                                                    border: `2px solid ${match.result === 'won' ? '#10b981' : match.result === 'lost' ? '#ef4444' : '#e5e7eb'}`,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div>
                                                    <div style={{ 
                                                        fontSize: '18px', 
                                                        fontWeight: '700',
                                                        color: '#111827',
                                                        marginBottom: '8px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px'
                                                    }}>
                                                        <span>🎮</span>
                                                        <span>Game #{match.gameId || 'N/A'}</span>
                                                    </div>
                                                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
                                                        📅 {new Date(match.date).toLocaleString()}
                                                    </div>
                                                    <div style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                                                        💰 Bet: ${(match.betAmount || 0).toFixed(2)}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    {match.result === 'won' ? (
                                                        <div>
                                                            <div style={{
                                                                fontSize: '20px',
                                                                fontWeight: '700',
                                                                color: '#059669',
                                                                marginBottom: '6px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                justifyContent: 'flex-end'
                                                            }}>
                                                                <span>🏆</span>
                                                                <span>Won</span>
                                                            </div>
                                                            <div style={{ fontSize: '16px', color: '#047857', fontWeight: '600' }}>
                                                                +${(match.amount || 0).toFixed(2)}
                                                            </div>
                                                        </div>
                                                    ) : match.result === 'lost' ? (
                                                        <div>
                                                            <div style={{
                                                                fontSize: '20px',
                                                                fontWeight: '700',
                                                                color: '#dc2626',
                                                                marginBottom: '6px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                justifyContent: 'flex-end'
                                                            }}>
                                                                <span>❌</span>
                                                                <span>Lost</span>
                                                            </div>
                                                            <div style={{ fontSize: '16px', color: '#991b1b', fontWeight: '600' }}>
                                                                -${(match.amount || 0).toFixed(2)}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
                                                            ⏳ Pending
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                            </>
                        )}

                        {/* Transactions Tab Content */}
                        {userDetailTab === 'transactions' && (
                            <>
                                {loadingTransactions ? (
                                    <div className={styles.loading}>Loading transactions...</div>
                                ) : userTransactions.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
                                        <div>No transactions found</div>
                                        <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
                                            This user hasn't made any deposit or withdrawal requests yet
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        {/* Summary Stats */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, 1fr)',
                                            gap: '16px',
                                            marginBottom: '24px'
                                        }}>
                                            <div style={{
                                                background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                                                padding: '20px',
                                                borderRadius: '12px',
                                                textAlign: 'center',
                                                border: '2px solid #3b82f6'
                                            }}>
                                                <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e40af', marginBottom: '8px' }}>
                                                    {userTransactions.filter(t => t.type === 'DEPOSIT').length}
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#1e3a8a', fontWeight: '500' }}>
                                                    Deposits 💰
                                                </div>
                                            </div>
                                            <div style={{
                                                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                                padding: '20px',
                                                borderRadius: '12px',
                                                textAlign: 'center',
                                                border: '2px solid #f59e0b'
                                            }}>
                                                <div style={{ fontSize: '32px', fontWeight: '700', color: '#92400e', marginBottom: '8px' }}>
                                                    {userTransactions.filter(t => t.type === 'WITHDRAWAL').length}
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#78350f', fontWeight: '500' }}>
                                                    Withdrawals 💸
                                                </div>
                                            </div>
                                        </div>

                                        {/* Transactions List */}
                                        <div style={{ marginBottom: '20px' }}>
                                            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600', color: '#111827' }}>
                                                All Transactions
                                            </h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {userTransactions.map((transaction: any) => (
                                                    <div 
                                                        key={transaction._id || transaction.id}
                                                        style={{
                                                            background: transaction.type === 'DEPOSIT' 
                                                                ? 'linear-gradient(135deg, #dbeafe 0%, #ecfdf5 100%)' 
                                                                : 'linear-gradient(135deg, #fef3c7 0%, #fef2f2 100%)',
                                                            padding: '20px',
                                                            borderRadius: '12px',
                                                            border: `2px solid ${transaction.type === 'DEPOSIT' ? '#3b82f6' : '#f59e0b'}`,
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        <div>
                                                            <div style={{ 
                                                                fontSize: '18px', 
                                                                fontWeight: '700',
                                                                color: '#111827',
                                                                marginBottom: '8px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px'
                                                            }}>
                                                                <span>{transaction.type === 'DEPOSIT' ? '💰' : '💸'}</span>
                                                                <span>{transaction.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}</span>
                                                            </div>
                                                            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
                                                                📅 {new Date(transaction.createdAt).toLocaleString()}
                                                            </div>
                                                            <div style={{ fontSize: '14px', color: '#374151', fontWeight: '500', marginBottom: '4px' }}>
                                                                Amount: ${Math.abs(transaction.amount || 0).toFixed(2)}
                                                            </div>
                                                            {transaction.withdrawalMethod && (
                                                                <div style={{ fontSize: '12px', color: '#374151', fontWeight: '600', marginTop: '4px' }}>
                                                                    Method: {transaction.withdrawalMethod === 'evc_plus' ? 'EVC PLUS' : 
                                                                             transaction.withdrawalMethod === 'somnet' ? 'SOMNET' : 
                                                                             transaction.withdrawalMethod === 'e_dahab' ? 'E-DAHAB' : 
                                                                             transaction.withdrawalMethod}
                                                                </div>
                                                            )}
                                                            {transaction.withdrawalDetails && (
                                                                <div style={{ 
                                                                    marginTop: '8px', 
                                                                    padding: '8px', 
                                                                    background: '#ffffff', 
                                                                    borderRadius: '6px',
                                                                    fontSize: '12px',
                                                                    color: '#374151'
                                                                }}>
                                                                    {transaction.withdrawalDetails.phoneNumber && (
                                                                        <div>Phone: {transaction.withdrawalDetails.phoneNumber}</div>
                                                                    )}
                                                                    {transaction.withdrawalDetails.recipientName && (
                                                                        <div>Recipient: {transaction.withdrawalDetails.recipientName}</div>
                                                                    )}
                                                                    {transaction.withdrawalDetails.accountNumber && (
                                                                        <div>Account: {transaction.withdrawalDetails.accountNumber}</div>
                                                                    )}
                                                                    {transaction.withdrawalDetails.bankName && (
                                                                        <div>Bank: {transaction.withdrawalDetails.bankName}</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{
                                                                fontSize: '16px',
                                                                fontWeight: '700',
                                                                color: transaction.status === 'approved' ? '#059669' : transaction.status === 'rejected' ? '#dc2626' : '#f59e0b',
                                                                marginBottom: '6px',
                                                                padding: '6px 12px',
                                                                background: transaction.status === 'approved' 
                                                                    ? '#d1fae5' 
                                                                    : transaction.status === 'rejected' 
                                                                    ? '#fee2e2' 
                                                                    : '#fef3c7',
                                                                borderRadius: '8px',
                                                                border: `1px solid ${transaction.status === 'approved' 
                                                                    ? '#10b981' 
                                                                    : transaction.status === 'rejected' 
                                                                    ? '#ef4444' 
                                                                    : '#f59e0b'}`
                                                            }}>
                                                                {transaction.status === 'approved' ? '✅ Approved' : 
                                                                 transaction.status === 'rejected' ? '❌ Rejected' : 
                                                                 '⏳ Pending'}
                                                            </div>
                                                            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                                                                Balance: ${(transaction.balanceAfter || 0).toFixed(2)}
                                                            </div>
                                                            {transaction.adminNotes && (
                                                                <div style={{ 
                                                                    fontSize: '12px', 
                                                                    color: '#6b7280', 
                                                                    fontStyle: 'italic',
                                                                    marginTop: '4px',
                                                                    maxWidth: '200px'
                                                                }}>
                                                                    Note: {transaction.adminNotes}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <button 
                            className={styles.successCloseButton}
                            onClick={handleCloseMatchHistory}
                            style={{ marginTop: '20px', width: '100%' }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className={styles.successModalOverlay} onClick={() => setShowSuccessModal(false)}>
                    <div className={styles.successModal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.successIconContainer}>
                            <svg className={styles.checkmark} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                                <circle className={styles.checkmarkCircle} cx="26" cy="26" r="25" fill="none"/>
                                <path className={styles.checkmarkCheck} fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                            </svg>
                        </div>
                        <h2 className={styles.successTitle}>Approved Successfully!</h2>
                        <p className={styles.successMessage}>The transaction has been approved and processed.</p>
                        <button 
                            className={styles.successCloseButton}
                            onClick={() => setShowSuccessModal(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;

