# Wallet Restrictions & Limits

This document outlines all the wallet restrictions and limits implemented to prevent abuse and ensure security.

## 🔒 Implemented Restrictions

### 1. **One Deposit Request at a Time**
- **Rule**: Users can only have ONE pending deposit request at a time
- **Behavior**: 
  - If a user has a pending deposit, they cannot create another deposit request
  - Must wait for admin to approve or reject the current request
- **Error Message**: "You already have a pending deposit request. Please wait for admin approval or rejection before requesting another deposit."
- **Audit Log**: `MULTIPLE_PENDING_DEPOSITS` (medium severity)

### 2. **One Withdrawal Request at a Time**
- **Rule**: Users can only have ONE pending withdrawal request at a time
- **Behavior**:
  - If a user has a pending withdrawal, they cannot create another withdrawal request
  - Must wait for admin to approve or reject the current request
- **Error Message**: "You already have a pending withdrawal request. Please wait for admin approval or rejection before requesting another withdrawal."
- **Audit Log**: `MULTIPLE_PENDING_WITHDRAWALS` (medium severity)

### 3. **24-Hour Withdrawal Limit**
- **Rule**: Users can only make ONE withdrawal request every 24 hours
- **Behavior**:
  - Checks for any withdrawal (pending or approved) in the last 24 hours
  - Prevents multiple withdrawals within a 24-hour period
- **Error Message**: "You can only make one withdrawal request every 24 hours. Please wait before requesting another withdrawal."
- **Audit Log**: `WITHDRAWAL_WITHIN_24_HOURS` (medium severity)

### 4. **Maximum Wallet Balance: $300**
- **Rule**: No user's wallet balance can exceed $300
- **Behavior**:
  - When requesting a deposit, system checks if deposit would exceed $300
  - When admin approves a deposit, system checks again
  - Calculates maximum allowed deposit: `$300 - current_balance`
- **Error Messages**:
  - User request: "Maximum wallet balance is $300. Your current balance is $X. Maximum deposit allowed is $Y."
  - Admin approval: "Cannot approve deposit: Maximum wallet balance is $300. Current balance is $X. Maximum deposit allowed is $Y."
- **Audit Logs**: 
  - `DEPOSIT_EXCEEDS_MAX_BALANCE` (medium severity)
  - `DEPOSIT_APPROVAL_EXCEEDS_MAX_BALANCE` (high severity)

### 5. **Withdrawal Cannot Exceed Balance**
- **Rule**: Users cannot withdraw more money than they have in their wallet
- **Behavior**:
  - System checks current balance before allowing withdrawal
  - Rejects withdrawal if amount > current balance
- **Error Message**: "Insufficient balance. Your current balance is $X. You cannot withdraw more than what is in your wallet."
- **Audit Log**: `INSUFFICIENT_BALANCE_WITHDRAWAL` (medium severity)

### 6. **Login Attempt Limit: 5 per 30 Minutes**
- **Rule**: Maximum 5 login attempts per IP address per 30 minutes
- **Behavior**:
  - Rate limiting prevents brute force attacks
  - Blocks IP after 5 failed attempts
  - Must wait 30 minutes before trying again
- **Error Message**: "Too many authentication attempts from this IP, please try again later."
- **Audit Log**: All failed login attempts are logged

## 📊 Summary Table

| Restriction | Limit | Time Period | Applies To |
|------------|-------|------------|------------|
| Pending Deposits | 1 | Until approved/rejected | Per user |
| Pending Withdrawals | 1 | Until approved/rejected | Per user |
| Withdrawals | 1 | 24 hours | Per user |
| Maximum Balance | $300 | Always | Per user |
| Withdrawal Amount | ≤ Current Balance | Always | Per user |
| Login Attempts | 5 | 30 minutes | Per IP |

## 🔍 How It Works

### Deposit Flow
1. User requests deposit
2. ✅ Check: No pending deposit? → Continue
3. ✅ Check: Would balance exceed $100? → Reject if yes
4. ✅ Create pending transaction
5. Admin reviews
6. ✅ Check: Would balance exceed $100? → Reject if yes (double check)
7. ✅ Approve → Balance updated

### Withdrawal Flow
1. User requests withdrawal
2. ✅ Check: No pending withdrawal? → Continue
3. ✅ Check: No withdrawal in last 24 hours? → Continue
4. ✅ Check: Amount ≤ current balance? → Continue
5. ✅ Create pending transaction (balance held)
6. Admin reviews
7. ✅ Approve → Balance deducted
8. ✅ Reject → Balance refunded

## 🚨 Security Features

All restriction violations are:
- ✅ Logged in audit system
- ✅ Tagged with appropriate severity
- ✅ Include user ID, IP address, and timestamp
- ✅ Available for admin review via `/api/admin/audit-logs`

## 📝 Example Scenarios

### Scenario 1: User tries to deposit $50 when balance is $260
- **Current Balance**: $260
- **Requested Deposit**: $50
- **Result**: ❌ Rejected
- **Reason**: Would exceed $300 limit (would be $310)
- **Max Allowed**: $40

### Scenario 2: User tries to withdraw $30 when balance is $20
- **Current Balance**: $20
- **Requested Withdrawal**: $30
- **Result**: ❌ Rejected
- **Reason**: Cannot withdraw more than balance
- **Max Allowed**: $20

### Scenario 3: User tries to withdraw twice in one day
- **First Withdrawal**: Approved at 10:00 AM
- **Second Withdrawal**: Attempted at 2:00 PM (same day)
- **Result**: ❌ Rejected
- **Reason**: Only one withdrawal per 24 hours
- **Wait Time**: Until 10:00 AM next day

### Scenario 4: User has pending deposit, tries another
- **First Deposit**: $20 (pending)
- **Second Deposit**: $30 (attempted)
- **Result**: ❌ Rejected
- **Reason**: Already has pending deposit
- **Action**: Wait for admin to approve/reject first deposit

## 🔧 Technical Implementation

### Helper Functions
- `hasPendingDeposit(userId)` - Checks for pending deposits
- `hasPendingWithdrawal(userId)` - Checks for pending withdrawals
- `hasWithdrawnInLast24Hours(userId)` - Checks 24-hour limit
- `wouldExceedMaxBalance(currentBalance, amountToAdd)` - Checks $100 limit

### Rate Limiting
- Authentication endpoints: 5 attempts per 30 minutes
- Wallet endpoints: 20 requests per 15 minutes
- Admin endpoints: 100 requests per 15 minutes

---

**Last Updated**: All restrictions implemented and active
**Status**: ✅ All wallet restrictions enforced

