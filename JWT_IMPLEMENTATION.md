# JWT Authentication Implementation

This document describes the JWT authentication implementation added to PlantDaddy for iOS and mobile app support.

## Overview

JWT (JSON Web Token) authentication has been added alongside the existing session-based authentication. This allows:
- **Web app**: Continue using session cookies (no changes needed)
- **iOS/Mobile apps**: Use JWT tokens for authentication
- **Dual support**: Both methods work simultaneously

## New Endpoints

### 1. Register with JWT Token
**Endpoint**: `POST /api/token-register`

**Request Body**:
```json
{
  "username": "myusername",
  "password": "mypassword"
}
```

**Response** (201 Created):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "myusername"
  }
}
```

**Error Response** (400/409):
```json
{
  "error": "Username already exists"
}
```

### 2. Login with JWT Token
**Endpoint**: `POST /api/token-login`

**Request Body**:
```json
{
  "username": "myusername",
  "password": "mypassword"
}
```

**Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "myusername"
  }
}
```

**Error Response** (401):
```json
{
  "error": "Invalid username or password"
}
```

## Using JWT Tokens

### Authentication Header
Include the token in the `Authorization` header for all authenticated requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Example Request
```bash
curl -X GET http://localhost:5000/api/plants \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Swift Example
```swift
var request = URLRequest(url: url)
request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
```

## Token Details

- **Expiration**: 30 days (matches session duration)
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Payload**:
  - `userId`: User's database ID
  - `username`: User's username
  - `iat`: Issued at timestamp
  - `exp`: Expiration timestamp

## Environment Variables

### Required for Production
Set `JWT_SECRET` in your Railway environment:

```bash
JWT_SECRET=your-long-random-secret-string-here
```

**Generate a secure secret**:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Railway Setup
1. Go to Railway dashboard
2. Select your PlantDaddy project
3. Go to Variables
4. Add: `JWT_SECRET` = your generated secret

## Architecture

### Dual Authentication Flow

```
┌─────────────────┐
│  HTTP Request   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Session Auth    │  ← Web app uses this
│ (Passport.js)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  JWT Auth       │  ← Mobile app uses this
│  Middleware     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Set User       │  req.user is set by either auth method
│  Context        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Route Handler  │  Works with both auth methods
└─────────────────┘
```

### Middleware Order
1. **Session middleware** (express-session)
2. **Passport middleware** (passport.initialize, passport.session)
3. **JWT middleware** (custom jwtAuthMiddleware)
4. **User context** (setUserContext)
5. **API routes**

### Key Files

- `server/jwt.ts` - JWT token generation and verification
- `server/auth.ts` - Authentication setup + JWT middleware
- `server/routes.ts` - JWT endpoints + dual auth support
- `server/user-context.ts` - Updated to support both auth methods

## Security Features

✅ **Stateless tokens** - No database lookup on every request
✅ **Token expiration** - 30-day validity
✅ **Secret-based signing** - Only server can generate valid tokens
✅ **Password hashing** - scrypt with salt
✅ **User isolation** - All data scoped to authenticated user
✅ **Dual auth** - Web sessions unaffected

## Testing

### Manual Testing
Run the test script (requires server running):

```bash
chmod +x test-jwt.sh
./test-jwt.sh
```

### Using cURL

1. **Register**:
```bash
curl -X POST http://localhost:5000/api/token-register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'
```

2. **Login**:
```bash
curl -X POST http://localhost:5000/api/token-login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'
```

3. **Access Protected Endpoint**:
```bash
curl http://localhost:5000/api/user \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## iOS Implementation Guide

### 1. Store Token Securely
Use Keychain for token storage:

```swift
import Security

func saveToken(_ token: String) {
    let data = token.data(using: .utf8)!
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: "plantdaddy_token",
        kSecValueData as String: data
    ]

    SecItemDelete(query as CFDictionary)
    SecItemAdd(query as CFDictionary, nil)
}
```

### 2. Network Layer
Create a networking service:

```swift
class PlantDaddyAPI {
    let baseURL = "https://your-railway-url.up.railway.app/api"

    func login(username: String, password: String) async throws -> String {
        let url = URL(string: "\(baseURL)/token-login")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["username": username, "password": password]
        request.httpBody = try JSONEncoder().encode(body)

        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(LoginResponse.self, from: data)
        return response.token
    }

    func getPlants(token: String) async throws -> [Plant] {
        let url = URL(string: "\(baseURL)/plants")!
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode([Plant].self, from: data)
    }
}
```

### 3. Handle Token Expiration
Implement token refresh or re-login flow when token expires (401 response).

## Migration Notes

- ✅ **No breaking changes** - Existing web app continues to work
- ✅ **No database changes** - Uses existing user table
- ✅ **Backward compatible** - All existing endpoints work with both auth methods

## Benefits for Railway

- 🚀 **Better scaling** - Stateless JWT reduces database load
- 💰 **Lower costs** - Fewer session store queries
- 📱 **Mobile ready** - Native mobile app support
- 🌍 **Multi-instance** - No shared session store needed

## Next Steps for iOS Development

1. **Set `JWT_SECRET` in Railway** (required)
2. **Test endpoints** with curl or Postman
3. **Build iOS networking layer** (see examples above)
4. **Implement token storage** in Keychain
5. **Add push notifications** (APNs)
6. **Handle offline mode** (optional)

## Support

For issues or questions:
- Check Railway logs for auth errors
- Verify `JWT_SECRET` is set in production
- Test endpoints with curl first
- Check token format in Authorization header
