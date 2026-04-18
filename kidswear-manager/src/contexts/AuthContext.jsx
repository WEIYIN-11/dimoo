import { createContext, useContext, useEffect, useState } from 'react';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { app } from '../firebase';
import { setCurrentUser, migrateToUser } from '../storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const auth = getAuth(app);

  useEffect(() => {
    // Pick up redirect result when returning from Google
    getRedirectResult(auth)
      .then(result => {
        if (result?.user) {
          migrateToUser(result.user.uid);
          setCurrentUser(result.user.uid);
        }
      })
      .catch(e => {
        setError(e.message ?? e.code ?? '登入失敗');
      });

    return onAuthStateChanged(auth, u => {
      if (u) {
        migrateToUser(u.uid);
        setCurrentUser(u.uid);
      } else {
        setCurrentUser('');
      }
      setUser(u);
      setLoading(false);
    });
  }, [auth]);

  async function signInWithGoogle() {
    setError('');
    const provider = new GoogleAuthProvider();
    // Try popup first; on mobile browsers that block popups, fall back to redirect
    try {
      await signInWithPopup(auth, provider);
    } catch (popupErr) {
      if (
        popupErr.code === 'auth/popup-blocked' ||
        popupErr.code === 'auth/popup-closed-by-user' ||
        popupErr.code === 'auth/cancelled-popup-request'
      ) {
        // Silently fall back to redirect flow
        await signInWithRedirect(auth, provider);
      } else {
        setError(popupErr.message ?? popupErr.code ?? '登入失敗');
        throw popupErr;
      }
    }
  }

  async function logout() {
    setCurrentUser('');
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
