import React, { useState, useEffect } from 'react';
import { walletAPI } from '../services/walletAPI';
import { useAuth } from '../context/AuthContext';
import SuccessModal from './SuccessModal';
import styles from './Wallet.module.css';

interface Transaction {
    _id: string;
    type: string;
    amount: number;
    status: string;
    description: string;
    createdAt: string;
    balanceBefore: number;
    balanceAfter: number;
}

const Wallet: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const { user, updateBalance } = useAuth();
    const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successModalMessage, setSuccessModalMessage] = useState('');
    const [transactionType, setTransactionType] = useState<'deposit' | 'withdraw'>('deposit');

    // Deposit form
    const [depositAmount, setDepositAmount] = useState('');
    const [paymentReference, setPaymentReference] = useState('');

    // Withdrawal form
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawalMethod, setWithdrawalMethod] = useState('evc_plus');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [recipientName, setRecipientName] = useState('');

    // Transaction history
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (activeTab === 'history') {
            loadTransactionHistory();
        }
    }, [activeTab]);

    const loadTransactionHistory = async () => {
        setLoadingHistory(true);
        try {
            const result = await walletAPI.getTransactions({ limit: 50 });
            if (result.error) {
                setError(result.error);
            } else {
                setTransactions(result.transactions || []);
            }
        } catch (err: any) {
            setError('Failed to load transaction history');
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const amount = parseFloat(depositAmount);
        if (!amount || amount < 1) {
            setError('Minimum deposit is $1');
            setLoading(false);
            return;
        }

        try {
            const result = await walletAPI.deposit(amount, paymentReference || undefined);
            if (result.error) {
                setError(result.error);
            } else {
                setSuccessModalMessage('Deposit request submitted. Pending admin approval.');
                setTransactionType('deposit');
                setShowSuccessModal(true);
                setDepositAmount('');
                setPaymentReference('');
                updateBalance();
            }
        } catch (err: any) {
            setError('Deposit failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const amount = parseFloat(withdrawAmount);
        if (!amount || amount < 3) {
            setError('Minimum withdrawal is $3');
            setLoading(false);
            return;
        }

        if (user && user.balance !== undefined && amount > user.balance) {
            setError('Insufficient balance');
            setLoading(false);
            return;
        }

        if (!phoneNumber.trim()) {
            setError('Phone number is required');
            setLoading(false);
            return;
        }

        try {
            const result = await walletAPI.withdraw({
                amount,
                withdrawalMethod,
                phoneNumber: phoneNumber || undefined,
                recipientName: recipientName || undefined
            });

            if (result.error) {
                setError(result.error);
            } else {
                setSuccessModalMessage('Withdrawal request submitted. Pending admin approval.');
                setTransactionType('withdraw');
                setShowSuccessModal(true);
                setWithdrawAmount('');
                setPhoneNumber('');
                setRecipientName('');
                updateBalance();
            }
        } catch (err: any) {
            setError('Withdrawal request failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const formatAmount = (amount: number) => {
        return `$${Math.abs(amount).toFixed(2)}`;
    };

    return (
        <>
            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                message={successModalMessage}
                transactionType={transactionType}
            />
            <div className={styles.walletContainer}>
                <div className={styles.walletHeader}>
                <div className={styles.headerContent}>
                    <button className={styles.backButton} onClick={onExit}>
                        ← Back
                    </button>
                    <h1 className={styles.walletTitle}>My Wallet</h1>
                </div>
            </div>

            <div className={styles.walletBody}>
                <div className={styles.balanceCard}>
                    <div className={styles.balanceInfo}>
                        <p className={styles.balanceLabel}>Available Balance</p>
                        <p className={styles.balanceAmount}>${user?.balance?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className={styles.balanceActions}>
                        <button 
                            className={`${styles.quickAction} ${activeTab === 'deposit' ? styles.active : ''}`}
                            onClick={() => setActiveTab('deposit')}
                        >
                            Deposit
                        </button>
                        <button 
                            className={`${styles.quickAction} ${activeTab === 'withdraw' ? styles.active : ''}`}
                            onClick={() => setActiveTab('withdraw')}
                        >
                            Withdraw
                        </button>
                    </div>
                </div>

                {error && <div className={styles.alertMessage}>{error}</div>}

                <div className={styles.tabsContainer}>
                    <div className={styles.tabs}>
                        <button
                            className={activeTab === 'deposit' ? styles.activeTab : ''}
                            onClick={() => setActiveTab('deposit')}
                        >
                            💰 Deposit
                        </button>
                        <button
                            className={activeTab === 'withdraw' ? styles.activeTab : ''}
                            onClick={() => setActiveTab('withdraw')}
                        >
                            💸 Withdraw
                        </button>
                        <button
                            className={activeTab === 'history' ? styles.activeTab : ''}
                            onClick={() => setActiveTab('history')}
                        >
                            📜 History
                        </button>
                    </div>
                </div>

                <div className={styles.contentCard}>
                    <div className={styles.tabContent}>
                    {activeTab === 'deposit' && (
                        <form onSubmit={handleDeposit} className={styles.form}>
                            <div className={styles.sectionTitle}>Deposit Funds</div>

                            <div className={styles.formGroup}>
                                <label htmlFor="depositAmount">Amount ($)</label>
                                <input
                                    id="depositAmount"
                                    type="number"
                                    step="0.01"
                                    min="1"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    placeholder="Enter amount (min $1)"
                                    required
                                    disabled={loading}
                                    className={styles.amountInput}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="paymentReference">Payment Reference (Optional)</label>
                                <input
                                    id="paymentReference"
                                    type="text"
                                    value={paymentReference}
                                    onChange={(e) => setPaymentReference(e.target.value)}
                                    placeholder="Transaction reference number"
                                    disabled={loading}
                                />
                            </div>

                            <button
                                type="submit"
                                className={styles.primaryButton}
                                disabled={loading || !depositAmount}
                            >
                                {loading ? 'Processing...' : 'Deposit Now'}
                            </button>
                            <div className={styles.infoBox}>
                                <p className={styles.infoText}>
                                    ⏳ Deposit requests require admin approval. Your balance will be updated once the request is approved.
                                </p>
                            </div>
                        </form>
                    )}

                    {activeTab === 'withdraw' && (
                        <form onSubmit={handleWithdraw} className={styles.form}>
                            <div className={styles.sectionTitle}>Request Withdrawal</div>
                            
                            <div className={styles.availableBalance}>
                                <span>Available Balance:</span>
                                <span className={styles.balanceValue}>${user?.balance?.toFixed(2) || '0.00'}</span>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="withdrawAmount">Withdrawal Amount ($)</label>
                                <input
                                    id="withdrawAmount"
                                    type="number"
                                    step="0.01"
                                    min="3"
                                    max={user?.balance || 0}
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    placeholder="Enter amount (min $3)"
                                    required
                                    disabled={loading}
                                    className={styles.amountInput}
                                />
                                <small>Minimum withdrawal: $3.00</small>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="withdrawalMethod">Withdrawal Method</label>
                                <select
                                    id="withdrawalMethod"
                                    value={withdrawalMethod}
                                    onChange={(e) => setWithdrawalMethod(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="evc_plus">EVC PLUS</option>
                                    <option value="somnet">SOMNET</option>
                                    <option value="e_dahab">E-DAHAB</option>
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="phoneNumber">Phone Number *</label>
                                <input
                                    id="phoneNumber"
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="Enter phone number"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="recipientName">Geli magaca soo baxaayo numberkaaga</label>
                                <input
                                    id="recipientName"
                                    type="text"
                                    value={recipientName}
                                    onChange={(e) => setRecipientName(e.target.value)}
                                    placeholder="Enter recipient name"
                                    disabled={loading}
                                />
                            </div>

                            <button
                                type="submit"
                                className={styles.primaryButton}
                                disabled={loading || !withdrawAmount}
                            >
                                {loading ? 'Submitting...' : 'Request Withdrawal'}
                            </button>
                            <div className={styles.infoBox}>
                                <p className={styles.infoText}>
                                    ⏳ Withdrawal requests require admin approval. Your balance will be held until the request is processed.
                                </p>
                            </div>
                        </form>
                    )}

                    {activeTab === 'history' && (
                        <div className={styles.historySection}>
                            <div className={styles.sectionTitle}>Transaction History</div>
                            {loadingHistory ? (
                                <div className={styles.loadingState}>
                                    <div className={styles.spinner}></div>
                                    <p>Loading transaction history...</p>
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <div className={styles.emptyIcon}>📭</div>
                                    <p>No transactions found</p>
                                    <small>Your transaction history will appear here</small>
                                </div>
                            ) : (
                                <div className={styles.transactionsList}>
                                    {transactions.map((transaction) => (
                                        <div key={transaction._id} className={styles.transactionCard}>
                                            <div className={styles.transactionHeader}>
                                                <div className={styles.transactionLeft}>
                                                    <div className={styles.transactionIcon}>
                                                        {transaction.type === 'DEPOSIT' ? '💰' : transaction.type === 'WITHDRAWAL' ? '💸' : '🔄'}
                                                    </div>
                                                    <div className={styles.transactionInfo}>
                                                        <span className={styles.transactionType}>{transaction.type.replace('_', ' ')}</span>
                                                        <span className={styles.transactionDescription}>{transaction.description}</span>
                                                    </div>
                                                </div>
                                                <div className={styles.transactionRight}>
                                                    <span className={`${styles.transactionAmount} ${transaction.amount < 0 ? styles.negative : styles.positive}`}>
                                                        {transaction.amount < 0 ? '-' : '+'}{formatAmount(transaction.amount)}
                                                    </span>
                                                    <span className={`${styles.statusBadge} ${styles[transaction.status]}`}>
                                                        {transaction.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={styles.transactionFooter}>
                                                <span className={styles.transactionDate}>{formatDate(transaction.createdAt)}</span>
                                                <div className={styles.balanceChange}>
                                                    <span>Balance: ${transaction.balanceBefore.toFixed(2)} → ${transaction.balanceAfter.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    </div>
                </div>
            </div>
        </div>
        </>
    );
};

export default Wallet;

