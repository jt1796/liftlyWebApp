
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDKRnURifMmnI4VsiaIim0U8I5au86Mih4',
  authDomain: 'liftly-9f56a.firebaseapp.com',
  projectId: 'liftly-9f56a',
  storageBucket: 'liftly-9f56a.firebasestorage.app',
  messagingSenderId: '541906169729',
  appId: '1:541906169729:web:e5a58ec268dd52c09ac280',
  measurementId: 'G-9PM7NSZJD1'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
