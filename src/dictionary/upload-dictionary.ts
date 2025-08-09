import { db } from '../firebase/firebase';
import { collection, doc, setDoc, type Firestore } from 'firebase/firestore';
import { INITIAL_DICTIONARY } from './initial-dictionary';
import { FIREBASE_CONFIG } from './constants';

export async function uploadInitialDictionary() {
  try {
    const database: Firestore = db as unknown as Firestore;
    const dictionaryDoc = doc(collection(database, FIREBASE_CONFIG.COLLECTIONS.DICTIONARY));
    await setDoc(dictionaryDoc, { 
      words: INITIAL_DICTIONARY,
      updatedAt: new Date().toISOString(),
      version: '1.0.0'
    });
    console.log('Initial dictionary uploaded successfully');
    return true;
  } catch (error) {
    console.error('Failed to upload dictionary:', error);
    return false;
  }
} 