# Orphaned Account Login Flow

## What is an Orphaned Account?

An orphaned account is a Firebase Auth user that exists but has **no corresponding Firestore document** in the `users` collection. This happens when:
- Registration creates the auth account successfully
- But Firestore document creation fails
- And auth cleanup also fails (so auth account remains)

## What Happens When Orphaned Account Tries to Log In?

### Scenario: User with orphaned account attempts login

**Step 1: User enters email/password and clicks "Login"**

**Step 2: Firebase Auth authenticates successfully** ✅
- Auth account exists, password is correct
- User is authenticated

**Step 3: LoginForm checks for Firestore document** 🔍
- Before redirecting to dashboard, checks if document exists
- Uses `getDoc(doc(db, 'users', user.uid))`

**Step 4A: Document doesn't exist (orphaned account)** ❌

**What happens:**
1. ✅ Login succeeds (auth works)
2. ❌ Firestore document check fails (no document)
3. ⚠️ **User is NOT redirected to dashboard**
4. 📝 Error message shown: 
   ```
   Your account appears to be incomplete. This may indicate your 
   registration didn't complete successfully. Please try registering 
   again, or contact support@career-9.com if you believe this is an error.
   ```
5. 🚪 **User is automatically signed out** (to prevent issues)
6. ✅ User can try registering again

**Step 4B: Document exists (normal account)** ✅

**What happens:**
1. ✅ Login succeeds (auth works)
2. ✅ Firestore document check succeeds
3. ✅ User is redirected to dashboard
4. ✅ Dashboard loads normally

---

## Flow Diagram

```
User Clicks Login
    ↓
Firebase Auth: signInWithEmailAndPassword()
    ↓
    ├─→ Auth FAILS ──→ Show error (wrong password, etc.)
    │
    └─→ Auth SUCCEEDS ──→ Check Firestore document
                              │
                              ├─→ Document EXISTS ──→ Redirect to dashboard ✅
                              │
                              └─→ Document MISSING ──→ Show error message
                                                         Sign out user
                                                         User can register again ⚠️
```

---

## Two Protection Layers

### Layer 1: LoginForm `handleLogin` function
- Checks document **before** redirecting
- If no document: Shows error, signs out, prevents redirect
- **Prevents:** User from even reaching dashboard

### Layer 2: LoginForm `onAuthStateChanged` listener
- Checks document when auth state changes
- If no document: Shows error, doesn't auto-redirect
- **Prevents:** Auto-redirect loop if user is already authenticated

### Layer 3: Dashboard timeout (backup)
- If user somehow reaches dashboard without document
- Waits 15 seconds, then signs out
- **Prevents:** Refresh loop if other layers fail

---

## User Experience

### For Orphaned Account:

**What user sees:**
1. Enters email/password
2. Clicks "Login"
3. Brief loading state
4. **Error message appears:**
   ```
   Your account appears to be incomplete. This may indicate your 
   registration didn't complete successfully. Please try registering 
   again, or contact support@career-9.com if you believe this is an error.
   ```
5. User is signed out automatically
6. Can try registering again with same email

**What user can do:**
- ✅ Try registering again (auth account will be reused or replaced)
- ✅ Contact support@career-9.com for help
- ✅ Use "Forgot Password" if they want to reset (though it won't help if no document)

---

## Edge Cases

### Edge Case 1: User manually navigates to `/dashboard`
- Dashboard will detect no document
- Wait 15 seconds
- Auto sign-out
- Redirect to login

### Edge Case 2: User is already authenticated (from previous session)
- `onAuthStateChanged` listener fires
- Checks document
- If missing: Shows error, doesn't redirect
- User stays on login page

### Edge Case 3: Document check fails (network error)
- Error caught in try-catch
- Still redirects to dashboard (might be temporary)
- Dashboard will handle it (Layer 3 protection)

---

## Code Flow

### LoginForm.tsx - handleLogin function:

```javascript
1. User submits login form
2. signInWithEmailAndPassword() succeeds
3. getDoc() checks for Firestore document
4. If document.exists():
   → router.push('/dashboard') ✅
5. If !document.exists():
   → setError('Your account appears to be incomplete...')
   → signOut(auth) // Clean up orphaned account
   → User stays on login page ⚠️
```

### LoginForm.tsx - onAuthStateChanged listener:

```javascript
1. Auth state changes (user logs in or already authenticated)
2. If user exists:
   → Check Firestore document
   → If document.exists():
      → router.push('/dashboard') ✅
   → If !document.exists():
      → setError('Your account appears to be incomplete...')
      → User stays on login page ⚠️
```

---

## Summary

| Scenario | Auth Status | Firestore Document | Result |
|----------|------------|-------------------|--------|
| Normal login | ✅ Exists | ✅ Exists | ✅ Redirects to dashboard |
| Orphaned account login | ✅ Exists | ❌ Missing | ⚠️ Error shown, signed out, stays on login |
| Wrong password | ❌ Fails | N/A | ❌ Error shown, stays on login |
| User not found | ❌ Fails | N/A | ❌ Error shown, stays on login |

---

## Key Points

1. ✅ **Orphaned accounts CAN log in** (auth works)
2. ✅ **But they're caught BEFORE reaching dashboard**
3. ✅ **Automatically signed out** to prevent issues
4. ✅ **Clear error message** explains what happened
5. ✅ **User can register again** with same email
6. ✅ **No refresh loop** - multiple protection layers

---

## Testing

To test orphaned account login:

1. Create orphaned account:
   - Register normally
   - Go to Firebase Console
   - Delete Firestore document (keep auth user)

2. Try logging in:
   - Use the same email/password
   - **Expected:** Error message, auto sign-out, stay on login page

3. Try registering again:
   - Use same email
   - **Expected:** May see "email already in use" or registration succeeds

