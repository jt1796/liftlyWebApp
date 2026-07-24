/**
 * Migration script: workouts → workoutYears (year-bucketed)
 *
 * Reads every document in the `workouts` collection, groups by userId + year,
 * and writes year-bucketed documents to `workoutYears`.
 *
 * Run with: npx ts-node scripts/migrateWorkouts.ts
 *
 * Prerequisites:
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account key, OR
 *   - gcloud application-default credentials configured
 *   - npm install firebase-admin (dev dependency)
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();

const migrate = async () => {
  // 1. Fetch ALL workout documents across all users
  const snapshot = await db.collection('workouts').get();
  console.log(`Found ${snapshot.size} total workout documents`);

  // 2. Group by userId, then by year
  const byUserYear = new Map<string, Map<number, Record<string, Record<string, unknown>>>>();

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const userId = data.userId as string;
    const date = (data.date as Timestamp).toDate();
    const year = date.getFullYear();

    if (!byUserYear.has(userId)) byUserYear.set(userId, new Map());
    const userMap = byUserYear.get(userId)!;
    if (!userMap.has(year)) userMap.set(year, {});

    // Generate a fresh ID — old Firestore doc IDs are not preserved
    const workoutId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId: _uid, ...workoutData } = data; // strip userId from workout data
    userMap.get(year)![workoutId] = workoutData;
  }

  // 3. Write year documents (one batch per user)
  for (const [userId, yearMap] of byUserYear) {
    const batch = db.batch();
    for (const [year, workouts] of yearMap) {
      const yearDocRef = db.doc(`workoutYears/${userId}_${year}`);
      batch.set(yearDocRef, {
        userId,
        year,
        workouts,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    console.log(`Migrated user ${userId}: ${yearMap.size} year doc(s)`);
  }

  console.log(`Done. Migrated ${byUserYear.size} user(s).`);
};

migrate().catch(console.error);
