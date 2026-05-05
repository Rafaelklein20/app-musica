import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { handleFirestoreError, OperationType } from './firebaseUtils';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    
    // Save/update user profile
    if (result.user) {
      const userPath = `users/${result.user.uid}`;
      const userRef = doc(db, 'users', result.user.uid);
      try {
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
          await setDoc(userRef, {
            email: result.user.email,
            displayName: result.user.displayName,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } else {
          await setDoc(userRef, {
            email: result.user.email,
            displayName: result.user.displayName,
            createdAt: docSnap.data().createdAt,
            updatedAt: serverTimestamp()
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, userPath);
      }
    }
    
    return result.user;
  } catch (error) {
    console.error("Login failed", error);
    throw error;
  }
};

export const logout = () => signOut(auth);

// Test Connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
