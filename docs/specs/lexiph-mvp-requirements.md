# Requirements Document

## Introduction

LexInSight is a Philippine legal compliance chat assistant with a ChatGPT-style interface. The MVP focuses on user authentication and a polished chat UI foundation, built with Next.js 14, Supabase, Zustand, and Tailwind CSS. The system enables users to create accounts, authenticate securely, and access a clean chat interface that will eventually provide AI-powered legal compliance assistance.

## Glossary

- **LexInSight System**: The complete web application including authentication, chat interface, and backend services
- **User**: An individual who creates an account and uses the LexInSight chat assistant
- **Session**: An authenticated user's active connection to the LexInSight System
- **Chat Interface**: The main application screen where users interact with the assistant
- **Auth Store**: The Zustand state management store handling authentication state
- **Supabase Client**: The service managing authentication and database operations
- **Protected Route**: A page that requires authentication to access
- **Message Bubble**: A UI component displaying a single chat message
- **User Avatar**: A visual representation of the user in the header (profile picture or initial)

## Requirements

### Requirement 1: User Account Creation

**User Story:** As a new user, I want to create an account with my email and password, so that I can access the LexInSight chat assistant.

#### Acceptance Criteria

1. WHEN a user navigates to the signup page, THE LexInSight System SHALL display email input, password input, confirm password input, and a submit button
2. WHEN a user submits the signup form with valid credentials, THE LexInSight System SHALL create a new account in Supabase Auth
3. WHEN a user submits the signup form with valid credentials, THE LexInSight System SHALL automatically authenticate the user and redirect to the chat page
4. IF a user attempts to sign up with an email that already exists, THEN THE LexInSight System SHALL display the error message "Email already exists"
5. IF a user enters passwords that do not match, THEN THE LexInSight System SHALL display an error message indicating passwords must match
6. IF a user enters a password shorter than 6 characters, THEN THE LexInSight System SHALL display the error message "Password must be at least 6 characters"
7. WHILE the signup request is processing, THE LexInSight System SHALL disable all form inputs and display a loading state

### Requirement 2: User Authentication

**User Story:** As a registered user, I want to log in with my email and password, so that I can access my chat history and continue using the assistant.

#### Acceptance Criteria

1. WHEN a user navigates to the login page, THE LexInSight System SHALL display email input, password input, and a submit button
2. WHEN a user submits valid credentials, THE LexInSight System SHALL authenticate the user through Supabase Auth
3. WHEN authentication succeeds, THE LexInSight System SHALL redirect the user to the chat page
4. IF a user submits invalid credentials, THEN THE LexInSight System SHALL display the error message "Invalid email or password"
5. WHILE the login request is processing, THE LexInSight System SHALL disable all form inputs and display a loading state
6. WHEN a user is already authenticated, THE LexInSight System SHALL redirect from login page to chat page automatically

### Requirement 3: Session Management

**User Story:** As an authenticated user, I want my session to persist across page refreshes, so that I don't have to log in repeatedly.

#### Acceptance Criteria

1. WHEN the LexInSight System loads, THE LexInSight System SHALL check for an existing Supabase session
2. WHEN a valid session exists, THE LexInSight System SHALL populate the Auth Store with user data
3. WHEN a valid session exists, THE LexInSight System SHALL allow access to protected routes
4. WHEN the page refreshes, THE LexInSight System SHALL maintain the authenticated state without requiring re-login
5. WHEN no valid session exists, THE LexInSight System SHALL set the user state to null in the Auth Store

### Requirement 4: User Logout

**User Story:** As an authenticated user, I want to log out of my account, so that I can secure my session when using shared devices.

#### Acceptance Criteria

1. WHEN a user clicks the logout option in the user menu, THE LexInSight System SHALL terminate the Supabase session
2. WHEN logout completes, THE LexInSight System SHALL clear all user data from the Auth Store
3. WHEN logout completes, THE LexInSight System SHALL redirect the user to the login page
4. WHEN a user logs out, THE LexInSight System SHALL prevent access to protected routes until re-authentication

### Requirement 5: Route Protection

**User Story:** As a system administrator, I want unauthenticated users to be redirected to login, so that protected content remains secure.

#### Acceptance Criteria

1. WHEN an unauthenticated user attempts to access the chat page, THE LexInSight System SHALL redirect to the login page
2. WHEN an authenticated user accesses the login page, THE LexInSight System SHALL redirect to the chat page
3. WHEN an authenticated user accesses the signup page, THE LexInSight System SHALL redirect to the chat page
4. WHEN a user's session expires, THE LexInSight System SHALL redirect to the login page upon next navigation

### Requirement 6: Chat Interface Layout

**User Story:** As a user, I want a clean ChatGPT-style interface, so that I have a familiar and intuitive experience.

#### Acceptance Criteria

1. THE LexInSight System SHALL display a header with the LexInSight logo on the left and user avatar on the right
2. THE LexInSight System SHALL display a centered chat container with maximum width of 3xl
3. THE LexInSight System SHALL display a scrollable messages area between the header and input
4. THE LexInSight System SHALL display a fixed input area at the bottom with a textarea and send button
5. THE LexInSight System SHALL use a white background with slate-50 for the page background
6. THE LexInSight System SHALL display a sticky header that remains visible during scroll

### Requirement 7: Chat Header

**User Story:** As an authenticated user, I want to see my profile information in the header, so that I can access account options and confirm my identity.

#### Acceptance Criteria

1. THE LexInSight System SHALL display "LexInSight" text logo in the header left section with text-xl and font-bold styling
2. THE LexInSight System SHALL display the user avatar in the header right section
3. WHEN a user clicks the avatar, THE LexInSight System SHALL display a dropdown menu with user email and sign out option
4. WHEN a user has no profile picture, THE LexInSight System SHALL display the first letter of their email as the avatar
5. THE LexInSight System SHALL apply a white background and bottom border to the header

### Requirement 8: Message Display

**User Story:** As a user, I want to see messages in distinct bubbles, so that I can easily distinguish between my messages and AI responses.

#### Acceptance Criteria

1. WHEN displaying user messages, THE LexInSight System SHALL render bubbles with blue-500 background, white text, and right alignment
2. WHEN displaying AI messages, THE LexInSight System SHALL render bubbles with white background, border, and left alignment
3. THE LexInSight System SHALL display rounded corners and appropriate padding on all message bubbles
4. THE LexInSight System SHALL display a timestamp in small gray text for each message
5. WHEN no messages exist, THE LexInSight System SHALL display "Start a conversation..." as an empty state
6. WHEN a new message is added, THE LexInSight System SHALL automatically scroll to the bottom of the messages area

### Requirement 9: Chat Input

**User Story:** As a user, I want to type and send messages easily, so that I can interact with the assistant efficiently.

#### Acceptance Criteria

1. THE LexInSight System SHALL display a textarea with placeholder text "Ask about Philippine compliance laws..."
2. THE LexInSight System SHALL display a send button with an arrow icon adjacent to the textarea
3. THE LexInSight System SHALL apply rounded borders and appropriate styling to the input area
4. WHILE a message is being sent, THE LexInSight System SHALL disable the input and send button
5. THE LexInSight System SHALL fix the input area to the bottom of the viewport

### Requirement 10: Error Handling

**User Story:** As a user, I want clear error messages when something goes wrong, so that I understand what happened and how to proceed.

#### Acceptance Criteria

1. WHEN a network error occurs during authentication, THE LexInSight System SHALL display "Connection failed. Please try again."
2. WHEN Supabase returns an authentication error, THE LexInSight System SHALL display the error message in the form
3. THE LexInSight System SHALL display error messages in a visually distinct style (red text or border)
4. WHEN an error is displayed, THE LexInSight System SHALL allow the user to retry the action
5. WHEN a form submission succeeds, THE LexInSight System SHALL clear any previous error messages

### Requirement 11: Responsive Design

**User Story:** As a mobile user, I want the interface to work well on my device, so that I can use LexInSight on the go.

#### Acceptance Criteria

1. WHEN viewed on mobile devices, THE LexInSight System SHALL stack components vertically
2. WHEN viewed on mobile devices, THE LexInSight System SHALL maintain readable text sizes and touch-friendly button sizes
3. THE LexInSight System SHALL apply responsive padding and spacing using Tailwind breakpoints
4. THE LexInSight System SHALL ensure the chat container adapts to screen width while maintaining readability

### Requirement 12: User Profile Management

**User Story:** As a user, I want my profile information stored securely, so that my data is protected and accessible when needed.

#### Acceptance Criteria

1. WHEN a user signs up, THE LexInSight System SHALL automatically create a profile record in the profiles table
2. THE LexInSight System SHALL store user id, email, full_name, and avatar_url in the profiles table
3. THE LexInSight System SHALL enforce Row Level Security policies allowing users to view and update only their own profile
4. WHEN a user authenticates, THE LexInSight System SHALL retrieve profile data from the profiles table
