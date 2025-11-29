export interface Set {
  weight: number;
  reps: number;
}

export interface Exercise {
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
