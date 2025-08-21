# Dynamic Error Handler - Usage Guide & Examples

## Overview
This error handling system can handle ANY backend error format automatically. It's designed to be bulletproof and work even with inconsistent or malformed error responses.

## Key Features
- ✅ Handles any error object structure
- ✅ Extracts field-specific errors automatically
- ✅ Provides fallback messages for unknown formats
- ✅ Works with network errors, timeouts, and HTTP status codes
- ✅ React hook for easy integration
- ✅ Type-safe and thoroughly tested

## Quick Setup

### 1. Import the Error Handler
```javascript
import { ErrorHandler, useErrorHandler } from '../../../utils/errorHandler';
```

### 2. Use the React Hook
```javascript
const { errors, handleError, clearErrors, getToastMessage, hasError, getError } = useErrorHandler();
```

### 3. Handle Errors in API Calls
```javascript
try {
  await axiosInstance.post(API_URL, data);
  toast.success("Success!");
} catch (err) {
  const extractedErrors = handleError(err);
  const toastMessage = getToastMessage(err, "Operation failed");
  toast.error(toastMessage);
}
```

## Supported Error Formats

### Format 1: Simple Field Errors (Django/DRF Style)
```javascript
// Backend Response:
{
  "email": ["This email is already taken"],
  "phone_no": ["Invalid phone number format"],
  "password": ["Password too weak"]
}

// Result:
{
  "email": "This email is already taken",
  "phone_no": "Invalid phone number format", 
  "password": "Password too weak"
}
```

### Format 2: Nested Error Objects
```javascript
// Backend Response:
{
  "errors": {
    "user": {
      "email": "Invalid email",
      "name": "Name required"
    },
    "profile": {
      "age": "Must be 18 or older"
    }
  }
}

// Result:
{
  "user.email": "Invalid email",
