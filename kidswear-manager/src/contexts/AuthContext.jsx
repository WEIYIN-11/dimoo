import { createContext, useContext, useEffect, useState } from 'react';
import {
  getAuth,
  GoogleAuthProvider,
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
    // Handle the redirect result when user comes back from Google
    getRedirectResult(auth)
      .then(result => {
        if (result?.user) {
          migrateToUser(result.user.uid);
          setCurrentUser(result.user.uid);
        }
      })
      .catch(e => {
        if (e.code !== 'auth/cancelled-popup-request') {
          setError(`登入失敗：${e.code}`);
        }
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
    await signInWithRedirect(auth, provider);
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
