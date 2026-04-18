import { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { app } from '../firebase';
import { setCurrentUser, migrateToUser } from '../storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth(app);

  useEffect(() => {
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
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  async function logout() {
    setCurrentUser('');
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
