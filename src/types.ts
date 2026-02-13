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
  name: string;
  exercises: Exercise[];
}
