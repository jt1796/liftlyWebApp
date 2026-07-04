export interface Set {
  id?: string;
  weight: number;
  reps: number;
}

export interface Exercise {
  id?: string;
  name: string;
  sets: Set[];
}

export interface Workout {
  id?: string;
  date: Date;
  exercises: Exercise[];
}

export interface CustomExercise {
  name: string;
}

export interface Template {
  id?: string;
  name: string;
  exercises: Exercise[];
}

export interface Script {
  id?: string;
  name: string;
  code: string;
  lastExecutionMessage: string;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
}

export type FriendshipStatus = 'pending' | 'accepted';

export interface Friendship {
  id: string;              // composite doc ID: smallerUid_largerUid
  requesterId: string;
  receiverId: string;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}
