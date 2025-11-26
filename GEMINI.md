# Gemini Code Understanding

This document provides a high-level overview of the Liftly web application, its structure, and general guidance

## Project Overview

Liftly is a web application designed for tracking workouts. It allows users to create, edit, and view their workout sessions. The application uses Firebase for authentication and is built with React and Material-UI.

## Technologies Used

*   **Frontend Framework:** React
*   **Language:** TypeScript
*   **UI Library:** Material-UI
*   **Routing:** React Router
*   **Build Tool:** Vite
*   **Backend:** Firebase (Authentication)
*   **Linting:** ESLint

## Project Structure

The project follows a standard React application structure:

*   `public/`: Contains static assets like `index.html` and icons.
*   `src/`: Contains the main application source code.
    *   `components/`: Contains reusable React components.
        *   `LoginPage.tsx`: Handles user authentication.
        *   `WorkoutPage.tsx`: Core component for creating and editing workouts.
        *   `ProtectedLayout.tsx`: A component that guards routes that require authentication.
    *   `contexts/`: Contains React contexts, such as for authentication.
    *   `data/`: Contains static data, such as the list of exercises.
    *   `firebase.ts`: Initializes and configures the Firebase SDK.
    *   `App.tsx`: The main application component that sets up routing.
    *   `main.tsx`: The entry point of the application.

## General Guidance
*   Use material UI instead of raw html elements (eg div, input, etc)
*   Use https://mui.com/material-ui/llms.txt as MUI reference
*   Make the UI work on mobile as well as desktop
*   Test the build/lint with `npm run build`