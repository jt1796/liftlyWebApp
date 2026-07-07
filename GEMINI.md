# Gemini Code Understanding

This document provides a high-level overview of the Liftly web application, its structure, and general guidance

## Project Overview

Liftly is a web application designed for tracking workouts. It allows users to create, edit, and view their workout sessions. The application uses Firebase for authentication and is built with React and Material-UI.

The application will have access to the users workout history, and can use this to provide hints to the user for creating the next workouts. As well as tracking progress

## Technologies Used

*   **Frontend Framework:** React
*   **Frontend State Management** React query
*   **Language:** TypeScript
*   **UI Library:** Material-UI
*   **Routing:** React Router
*   **Build Tool:** Vite
*   **Backend:** Firebase (Authentication)
*   **Linting:** ESLint
*   **Database:** Firestore

## Project Structure

The project follows a standard React application structure:

*   `public/`: Contains static assets like `index.html` and icons.
    *   `src/`: Contains the main application source code.
    *   `types.ts`: Defines TypeScript interfaces for data structures like `Set`, `Exercise`, `Workout`, `CustomExercise`, `Template`, and `Script`.
    *   `utils/`: Contains utility functions.
        *   `database.ts`: Handles interactions with Firebase Firestore for custom exercises, workout data, workout templates, user scripts, user profiles, and friendships.
        *   `scriptExecutor.ts`: Executes user-provided JavaScript snippets in a Web Worker sandbox to generate new workouts based on history.
        *   `localUtils.ts`: Provides functions for filtering, calculating one-rep max, tracking personal records (PRs) including real-time details (`getPRDetailsForWorkout`), analyzing exercise metrics, generating E1RM suggestions, converting workout data to text, getting exercise history, calculating total workout weight (`calculateTotalWorkoutWeight`), matching weight to progressive ascii/emoji objects (`getWorkoutWeightObject`), and converting workouts to templates with calculated 1RM percentages (`workoutToTemplate`).
    *   `components/`: Contains reusable React components.
        *   `RecordsPage.tsx`: A component for showing PRs and exercise history.
        *   `CalculatorPage.tsx`: A component containing lifting calculators, including an E1RM breaker finder and a 1RM percentage estimator.
        *   `LoginPage.tsx`: Handles user authentication.
        *   `WorkoutPage.tsx`: Core component for creating and editing workouts. Supports drag-and-drop re-ordering of exercises and sets, and creating templates of saved workouts with computed 1RM percentages.
        *   `WorkoutListPage.tsx`: A component for listing workouts.
        *   `ExercisesPage.tsx`: A component for managing custom exercises.
        *   `TemplatesPage.tsx`: A component for creating and managing workout templates.
        *   `ScriptsPage.tsx`: A component for creating and managing user-defined JavaScript snippets. Supports script execution to generate new workouts. Features an enhanced debug mode that generates 25 sequential workouts, passing state between them, and displays the results in a summary table.
        *   `ProtectedLayout.tsx`: A component that guards routes that require authentication.
        *   `ExerciseHistoryDialog.tsx`: A component for showing the history of a given exercise.
        *   `FriendsPage.tsx`: Manage friends — displays the user's shareable invite code (based on UID), a friend-code lookup/add flow, and a tabbed list of accepted friends and pending requests. Friends can navigate to each other's workouts and records.
        *   `FriendWorkoutsPage.tsx`: Read-only view of a friend's workout history. Accessed at `/friends/:friendUid/workouts`.
        *   `FriendRecordsPage.tsx`: Read-only view of a friend's exercise metrics and PRs. Accessed at `/friends/:friendUid/records`.
        *   `FriendTemplatesPage.tsx`: Read-only view of a friend's templates list with functionality to start a workout or import/copy templates. Accessed at `/friends/:friendUid/templates`.
        *   `FriendScriptsPage.tsx`: Read-only view of a friend's scripts with functionality to execute, debug, or import/copy scripts. Accessed at `/friends/:friendUid/scripts`.
    *   `contexts/`: Contains React contexts for managing application-wide state.
        *   `AuthContext.tsx`: Provides an `AuthProvider` component to manage user authentication state using Firebase. It makes the current user, loading status, and logout function available to its children.
        *   `auth-context-utils.ts`: Defines the `AuthContext` and a `useAuth` hook for components to easily access authentication state.
        *   `AppProvider.tsx`: Provides an `AppProvider` component that manages application-level settings, such as the light/dark mode theme, using local storage for persistence.
        *   `app-context-utils.ts`: Defines the `AppContext` and a `useApp` hook for components to access application-level settings.
    *   `data/`: Contains static data, such as the list of exercises.
    *   `firebase.ts`: Initializes and configures the Firebase SDK.
    *   `App.tsx`: The main application component that sets up routing.
    *   `main.tsx`: The entry point of the application.

## General Guidance
*   Use material UI instead of raw html elements (eg div, input, etc)
*   Use https://mui.com/material-ui/llms.txt as MUI reference
*   Make the UI work on mobile as well as desktop
*   Test the build/lint with `npm run build`
*   Update this files after making new files/functions