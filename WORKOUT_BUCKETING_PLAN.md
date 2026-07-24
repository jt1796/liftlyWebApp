# Plan: Year-Bucketed Workout Storage

> **Goal:** Reduce Firestore document-read costs by storing all workouts for a given
> user-year in a single document, instead of one document per workout.

---

## 1. Problem Statement

### Current Architecture

| Aspect | Detail |
|---|---|
| **Collection** | `workouts` (top-level) |
| **Granularity** | 1 Firestore document per workout |
| **Read pattern** | `getWorkoutsForUser()` runs `where('userId', '==', uid)` → fetches **every** workout document |
| **Write pattern** | `addDoc` / `setDoc` / `deleteDoc` on individual docs |
| **Cost model** | Each document read counts as 1 Firestore read. Loading the app = N reads (N = total workout count) |

A user who has worked out 3×/week for 3 years has ~468 documents. Every page load
that calls `getWorkoutsForUser()` (Dashboard, WorkoutList, Records, Calculator,
FriendWorkouts, FriendRecords) bills **468 reads**. This grows linearly forever.

### Target Architecture

| Aspect | Detail |
|---|---|
| **Collection** | `workoutYears` (top-level) |
| **Granularity** | 1 Firestore document per user per calendar year |
| **Document ID** | `{userId}_{year}` (e.g. `xQ0sExBTk..._{2025}`) |
| **Read pattern** | `where('userId', '==', uid)` → fetches **~3-4 documents** (one per year of history) |
| **Write pattern** | Targeted updates to a single workout within the year document |
| **Cost model** | Same user = **3-4 reads** regardless of workout count. 100× reduction. |

---

## 2. Data Model Design

### 2.1 New Type: `WorkoutYearDoc`

```typescript
// types.ts — new interface
export interface WorkoutYearDoc {
  userId: string;
  year: number;                          // e.g. 2025
  workouts: Record<string, Workout>;     // keyed by workout ID
  updatedAt: Date;                       // last modification timestamp
}
```

**Key design decision:** Store workouts in a `Record<string, Workout>` (object map)
rather than an array. This enables Firestore **dot-notation updates** on individual
workouts without rewriting the entire document:

```typescript
// Update only one workout within the year doc:
await updateDoc(yearDocRef, {
  [`workouts.${workoutId}.title`]: "New Title",
  [`workouts.${workoutId}.exercises`]: [...],
  updatedAt: serverTimestamp(),
});
```

### 2.2 Document ID Scheme

```
Document ID: `${userId}_${year}`
```

- Deterministic — no need to query to find the right doc
- Enables direct `doc()` reference for writes (no query needed)
- Example: `xQ0sExBTkmZSCQD2Zs0hDORRUt12_2025`

### 2.3 Workout ID Generation

Each workout still needs a unique ID (for URL routing, editing, deletion). All IDs
include a year prefix for consistency:

```typescript
const workoutId = `${year}_${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
```

This ID becomes the key in the `workouts` map. The year prefix can be used to
determine which year document a workout belongs to without needing the full workout
object.

### 2.4 Size Budget

Firestore maximum document size: **1 MiB (1,048,576 bytes)**

A typical workout serializes to roughly **500-1500 bytes** depending on exercise/set count.
Conservatively at 1.5 KB per workout, a year of 365 daily workouts = **~548 KB** — well
within the 1 MiB limit. Even a power user doing 2 workouts/day with extensive notes
would remain under the limit.

> **Note:** For extreme edge cases, a runtime size check can be added before writes.
> If a year document approaches 900 KB, the UI can warn the user. This is a future
> concern and not part of the initial implementation.

---

## 3. CRUD Operations

### 3.1 Read — `getWorkoutsForUser(userId)`

**Current** (N reads):
```typescript
const q = query(collection(db, 'workouts'), where('userId', '==', userId));
const snapshot = await getDocs(q);
// → N document reads
```

**New** (~3-4 reads):
```typescript
export const getWorkoutsForUser = async (userId: string): Promise<Workout[]> => {
  const q = query(
    collection(db, 'workoutYears'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);  // → ~3-4 document reads

  const workouts: Workout[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as WorkoutYearDoc;
    for (const [workoutId, workout] of Object.entries(data.workouts)) {
      workouts.push({
        ...workout,
        id: workoutId,
        date: (workout.date as unknown as Timestamp).toDate(),
      });
    }
  });

  workouts.sort((a, b) => b.date.getTime() - a.date.getTime());
  return workouts;
};
```

### 3.2 Read Single — Eliminated

**Current:** `getWorkoutById(id)` fetches a single workout document from Firestore.
This is only called in one place — `WorkoutPage.tsx` line ~106 — as a React Query
`queryFn` when navigating to `/workout/:id`.

**New:** Remove `getWorkoutById` entirely. Instead, `WorkoutPage` will find the
workout from the already-cached `['workouts', userId]` query data:

```typescript
// WorkoutPage.tsx — replace the single-workout query with a cache lookup
const queryClient = useQueryClient();
const cachedWorkouts = queryClient.getQueryData<Workout[]>(['workouts', currentUser?.uid]);
const existingWorkout = cachedWorkouts?.find(w => w.id === id) ?? null;
```

If the cache is cold (e.g. direct URL navigation), the full `['workouts', userId]`
query will fire first (3-4 reads), and the workout is found in that result. This is
the same cost as before (the full list is needed by most pages anyway), and avoids
any need for year-prefixed IDs or a separate single-doc fetch function.

### 3.3 Create — `handleSaveWorkout` (new workout)

**Current:**
```typescript
await addDoc(collection(db, 'workouts'), workoutData);
```

**New** (1 write, targeted):
```typescript
const year = workout.date.getFullYear();
const workoutId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const yearDocId = `${userId}_${year}`;
const yearDocRef = doc(db, 'workoutYears', yearDocId);

// setDoc with merge: true will create the document if it doesn't exist,
// or update just the specified fields if it does.
await setDoc(yearDocRef, {
  userId,
  year,
  [`workouts.${workoutId}`]: workoutData,
  updatedAt: serverTimestamp(),
}, { merge: true });
```

> **Important:** `setDoc` with `merge: true` using dot-notation for the workout key will
> only touch that one workout entry — it won't overwrite other workouts in the map.
> However, there's a subtlety: when the document doesn't exist yet, `merge: true`
> creates it. When it does exist, dot-notation paths are merged field-by-field.
> This is the optimal pattern for both creates and updates.

### 3.4 Update — `handleSaveWorkout` (existing workout)

**Current:**
```typescript
await setDoc(doc(db, 'workouts', id), workoutData);
```

**New** (1 write, targeted):
```typescript
const year = workout.date.getFullYear();
const yearDocRef = doc(db, 'workoutYears', `${userId}_${year}`);

await updateDoc(yearDocRef, {
  [`workouts.${workoutId}`]: workoutData,
  updatedAt: serverTimestamp(),
});
```

The year is derived from the workout's `date` field. This replaces only the single
workout entry — other workouts in the document are untouched. Firestore bills this
as **1 write**.

### 3.5 Delete — `handleDeleteWorkout`

**Current:**
```typescript
await deleteDoc(doc(db, 'workouts', id));
```

**New** (1 write, targeted):
```typescript
import { deleteField } from 'firebase/firestore';

const year = workout.date.getFullYear();
const yearDocRef = doc(db, 'workoutYears', `${userId}_${year}`);

await updateDoc(yearDocRef, {
  [`workouts.${workoutId}`]: deleteField(),
  updatedAt: serverTimestamp(),
});
```

The year is derived from the workout being deleted (which is available in component
state). `deleteField()` removes just that one key from the map — not the whole
document. Firestore bills this as **1 write**.

---

## 4. Firestore Security Rules

New rules for the `workoutYears` collection:

```javascript
// ─── Workout Years (bucketed) ──────────────────────────────────────────────
match /workoutYears/{yearDocId} {
  // Owner can read, update, delete
  allow read, update, delete: if request.auth != null
    && request.auth.uid == resource.data.userId
    && isAllowedUser();

  // Owner can create
  allow create: if request.auth != null
    && request.auth.uid == request.resource.data.userId
    && isAllowedUser();

  // Accepted friends can read (not write)
  allow read: if request.auth != null
    && isAllowedUser()
    && isAcceptedFriend(resource.data.userId);
}
```

These mirror the existing `workouts` rules but apply to the new collection.

---

## 5. Migration Strategy

### 5.1 Migration Script

A one-time server-side script using the **Firebase Admin SDK**. It reads every
document in the `workouts` collection, groups by `userId` and year, and writes
the year-bucketed documents. Run with `npx ts-node scripts/migrateWorkouts.ts`.

```typescript
// scripts/migrateWorkouts.ts
import * as admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

const migrate = async () => {
  // 1. Fetch ALL workout documents across all users
  const snapshot = await db.collection('workouts').get();
  console.log(`Found ${snapshot.size} total workout documents`);

  // 2. Group by userId, then by year
  const byUserYear = new Map<string, Map<number, Record<string, any>>>();

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const userId = data.userId as string;
    const date = (data.date as admin.firestore.Timestamp).toDate();
    const year = date.getFullYear();

    if (!byUserYear.has(userId)) byUserYear.set(userId, new Map());
    const userMap = byUserYear.get(userId)!;
    if (!userMap.has(year)) userMap.set(year, {});

    // Generate a fresh year-prefixed ID — old IDs are not preserved
    const workoutId = `${year}_${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const { userId: _uid, ...workoutData } = data;  // strip userId from workout data
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
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    console.log(`Migrated user ${userId}: ${yearMap.size} year doc(s)`);
  }

  console.log(`Done. Migrated ${byUserYear.size} user(s).`);
};

migrate().catch(console.error);
```

### 5.2 Cutover Strategy

Hard cutover — no dual-read needed:

1. Run `migrateUserWorkouts()` for each user (can loop over known UIDs)
2. Deploy updated code that reads/writes `workoutYears` only
3. Verify everything works
4. Delete the old `workouts` collection documents

### 5.3 URL Routing for Workout IDs

Current routes use the old Firestore doc ID:
```
/workout/:id        → view/edit a workout
/workout/new        → create a new workout
```

Workout IDs are year-prefixed timestamps (`2025_1690000000000-abc1234`). These are
URL-safe and don't require route changes. Old IDs are not preserved — the migration
generates fresh IDs for all workouts.

---

## 6. React Query Cache Strategy

### Current
```typescript
queryKey: ['workouts', userId]   // invalidated on every mutation
queryKey: ['workout', id]        // single workout fetch (WorkoutPage only)
```

### New
- **Remove** the `['workout', id]` query entirely. `WorkoutPage` will find its
  workout from the cached `['workouts', userId]` data instead.
- Keep `['workouts', userId]` — the data shape returned to consumers is identical
  (`Workout[]`). The optimization is entirely in the database layer.
- After a mutation, continue to invalidate `['workouts', userId]`. This re-fetches
  only 3-4 year documents instead of N workout documents.

---

## 7. Impact on Existing Features

### 7.1 Friend Viewing

No API change needed. `getWorkoutsForUser(friendUid)` returns the same `Workout[]`.
Friend pages (`FriendWorkoutsPage`, `FriendRecordsPage`, `FriendTemplatesPage`,
`FriendScriptsPage`) all consume the same data shape.

### 7.2 PR Calculations & Records

`localUtils.ts` functions (`calculateAllPRs`, `getPRDetailsForWorkout`, etc.)
all operate on `Workout[]` — no change needed.

### 7.3 Dashboard Heatmap

Operates on `Workout[]` dates — no change needed.

### 7.4 Script Execution

`scriptExecutor.ts` receives `Workout[]` — no change needed.

### 7.5 Templates

`workoutToTemplate()` operates on a single `Workout` object — no change needed.

### 7.6 Exercise History Dialog

Filters from the `Workout[]` array — no change needed.

### 7.7 `getWorkoutById` — Removed

`getWorkoutById` is deleted from `database.ts`. Its only call site (`WorkoutPage.tsx`
line ~106) is replaced with a cache lookup from the `['workouts', userId]` query.
No other code references this function.

---

## 8. Files to Modify

| File | Changes |
|---|---|
| `types.ts` | Add `WorkoutYearDoc` interface |
| `utils/database.ts` | Rewrite `getWorkoutsForUser`; remove `getWorkoutById`; add `saveWorkout`, `deleteWorkout` functions that target `workoutYears` |
| `components/WorkoutPage.tsx` | Replace `getWorkoutById` query with cache lookup; update `handleSaveWorkout` and `handleDeleteWorkout` to call new database functions instead of inline Firestore calls |
| `firestore.rules` | Add `workoutYears` collection rules |
| New: `utils/migrateWorkouts.ts` | Migration script for existing data |
| `GEMINI.md` | Document new collection and functions |

---

## 9. Cost Comparison

| Scenario | Before (per-doc) | After (year-bucketed) | Savings |
|---|---|---|---|
| Page load (3 years of data, 468 workouts) | 468 reads | 3 reads | **99.4%** |
| Save workout | 1 write + 468 reads (cache invalidation refetch) | 1 write + 3 reads | **99.4%** |
| Delete workout | 1 write + 468 reads | 1 write + 3 reads | **99.4%** |
| Friend views your data | 468 reads | 3 reads | **99.4%** |
| Get single workout by ID | 1 read | 0 reads (cache lookup) | **100%** |

---

## 10. Implementation Order

- [ ] **Step 1:** Add `WorkoutYearDoc` to `types.ts`
- [ ] **Step 2:** Add new CRUD functions to `database.ts` targeting `workoutYears` (replace old ones)
- [ ] **Step 3:** Update `firestore.rules` with `workoutYears` rules
- [ ] **Step 4:** Update `WorkoutPage.tsx` to use new database functions
- [ ] **Step 5:** Create `utils/migrateWorkouts.ts` migration script
- [ ] **Step 6:** Run migration for all users
- [ ] **Step 7:** Deploy updated code
- [ ] **Step 8:** Test all features (CRUD, friends, records, scripts, templates)
- [ ] **Step 9:** Delete old `workouts` documents from Firestore
- [ ] **Step 10:** Update `GEMINI.md` documentation

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Year document exceeds 1 MiB | Add pre-write size check; typical usage is ~50-200 KB/year — this is very unlikely |
| Concurrent writes to same year doc | Firestore handles document-level locking; dot-notation updates on different keys don't conflict |
| Date changes move workout to different year | Delete from old year doc, create in new year doc (2 writes in a transaction) |
| Migration failure mid-way | Migration is additive (writes to new collection); old data is untouched until manual deletion |
