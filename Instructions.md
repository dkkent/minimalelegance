# Partner Avatar Image Fix Instructions

## Issue Identified

After reviewing the codebase, I've identified an issue with the partner's avatar image not displaying in the header. The problem appears to be in how profile picture paths are handled in the frontend components.

### Current Implementation

1. The `UserAvatar` component (in `client/src/components/ui/user-avatar.tsx`) directly uses the profile picture URL received from the API without any path formatting:

```jsx
<AvatarImage 
  src={user.profilePicture} 
  alt={user.name || "User"} 
  className="object-cover"
/>
```

2. The profile picture paths are properly formatted in the backend using the `formatUserProfilePicture` function:

```js
private formatUserProfilePicture<T extends {profilePicture?: string | null}>(user: T | undefined): T | undefined {
  if (!user) return undefined;
  
  if (user.profilePicture) {
    user.profilePicture = user.profilePicture.startsWith('/') 
      ? user.profilePicture 
      : `/uploads/profile_pictures/${user.profilePicture}`;
  }
  
  return user;
}
```

3. The backend stores full paths in the database (checked via SQL query):
```
/uploads/profile_pictures/[filename]
```

4. The issue appears to be that sometimes the `partner` data doesn't have its profile picture path fully formatted when received by the frontend components.

## Fix Plan

1. Modify the `UserAvatar` component to handle both types of profile picture paths:
   - Full paths (starting with `/uploads/...`)
   - Relative paths (just the filename)

2. Update `client/src/components/ui/user-avatar.tsx` to include path formatting logic:

```jsx
<AvatarImage 
  src={user.profilePicture.startsWith('/') 
    ? user.profilePicture 
    : `/uploads/profile_pictures/${user.profilePicture}`
  } 
  alt={user.name || "User"} 
  className="object-cover"
/>
```

3. This ensures that even if the backend returns an inconsistently formatted profile picture path, the frontend component will handle it properly.

4. The change should be minimal and focused only on the `UserAvatar` component, as this component is used throughout the application for displaying user and partner avatars.

## Implementation Steps

1. Open `client/src/components/ui/user-avatar.tsx`
2. Find the `AvatarImage` component in the `UserAvatar` function
3. Replace the `src` attribute with the conditional logic to format the path
4. Test by checking both user and partner avatars in the header

This fix ensures consistency in how profile picture paths are handled across the application without requiring changes to the backend or database.
