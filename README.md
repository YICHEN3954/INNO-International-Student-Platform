# INNO Prototype

INNO is a WebApp MVP for a verified international student social platform.

This version uses Firebase Realtime Database for changing user data:

- Email/password authentication
- School email verification
- Profile setup
- Friend request consent
- Chat messages
- Event sign-ups
- Reports

Mock friend recommendations and mock event cards are still local prototype data.

## Run

```bash
npm run dev
```

Then open:

```text
http://localhost:4173
```

## Firebase Data

The app uses Firebase Authentication email/password accounts. After login, it writes data under these Realtime Database paths using `auth.uid`:

- `users/{userId}/login`
- `users/{userId}/verified`
- `users/{userId}/profile`
- `users/{userId}/requests`
- `users/{userId}/joinedEvents`
- `chats/{userId}/friends/{friendId}/messages`
- `reports/{userId}`

The current MVP still stores only lightweight UI preferences in `localStorage`, such as the current screen and translation toggle.

## Enable Email Login

In Firebase Console:

1. Open Authentication.
2. Open Sign-in method.
3. Enable Email/Password.
4. Save.

## Firebase Rules For Prototype Testing

For authenticated testing, Realtime Database can restrict users to their own data:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "chats": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "reports": {
      "$uid": {
        ".read": false,
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```
