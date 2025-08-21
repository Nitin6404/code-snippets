// utils/errorHandler.js

/**
 * Universal Error Handler for handling any backend error format
 * This utility can handle nested objects, arrays, strings, and mixed formats
 */
export class ErrorHandler {
  static DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";
  static NETWORK_ERROR_MESSAGE = "Network error. Please check your connection.";
  static TIMEOUT_ERROR_MESSAGE = "Request timeout. Please try again.";

  /**
   * Extract error messages from any error object structure
   * @param {any} error - Error object from API response
   * @param {string} fallbackMessage - Default message if no errors found
   * @returns {Object} - Formatted error object with field-specific errors
   */
  static extractErrors(error, fallbackMessage = this.DEFAULT_ERROR_MESSAGE) {
    if (!error) return { general: fallbackMessage };

    // Handle different error structures
    const errorData = this.getErrorData(error);
    
    if (!errorData) {
      return { general: fallbackMessage };
    }

    const extractedErrors = {};
    
    // Try to extract structured field errors
    this.extractFieldErrors(errorData, extractedErrors);
    
    // If no field-specific errors found, try to get general message
    if (Object.keys(extractedErrors).length === 0) {
      const generalMessage = this.extractGeneralMessage(errorData, fallbackMessage);
      extractedErrors.general = generalMessage;
    }

    return extractedErrors;
  }

  /**
   * Get error data from various error object structures
   */
  static getErrorData(error) {
    // Handle axios error structure
    if (error?.response?.data) {
      return error.response.data;
    }
    
    // Handle direct error data
    if (error?.data) {
      return error.data;
    }
    
    // Handle error with message property
    if (error?.message) {
      return error.message;
    }
    
    // Handle error with error property
    if (error?.error) {
      return error.error;
    }
    
    // Return error as is
    return error;
  }

  /**
   * Extract field-specific errors from error data
   */
  static extractFieldErrors(errorData, extractedErrors, prefix = '') {
    if (typeof errorData === 'string') {
      if (prefix) {
        extractedErrors[prefix] = errorData;
      } else {
        extractedErrors.general = errorData;
      }
      return;
    }

    if (Array.isArray(errorData)) {
      // Handle array of errors
      const messages = errorData
        .filter(item => item && (typeof item === 'string' || item.message))
        .map(item => typeof item === 'string' ? item : item.message)
        .join(', ');
      
      if (messages) {
        if (prefix) {
          extractedErrors[prefix] = messages;
        } else {
          extractedErrors.general = messages;
        }
      }
      return;
    }

    if (typeof errorData === 'object' && errorData !== null) {
      // Common error field patterns
      const commonPatterns = [
        'errors', 'error', 'validationErrors', 'fieldErrors', 
        'data', 'details', 'issues', 'problems'
      ];

      // Check for common error patterns first
      for (const pattern of commonPatterns) {
        if (errorData[pattern]) {
          this.extractFieldErrors(errorData[pattern], extractedErrors, '');
          if (Object.keys(extractedErrors).length > 0) return;
        }
      }

      // Extract field-level errors
      Object.entries(errorData).forEach(([key, value]) => {
        if (value && this.isErrorValue(value)) {
          const fieldName = prefix ? `${prefix}.${key}` : key;
          this.processFieldError(key, value, extractedErrors, fieldName);
        }
      });
    }
  }

  /**
   * Check if a value represents an error
   */
  static isErrorValue(value) {
    if (typeof value === 'string' && value.trim()) return true;
    if (Array.isArray(value) && value.length > 0) return true;
    if (typeof value === 'object' && value !== null) return true;
    return false;
  }

  /**
   * Process individual field errors
   */
  static processFieldError(fieldName, value, extractedErrors, finalFieldName) {
    if (typeof value === 'string') {
      extractedErrors[finalFieldName] = value.trim();
    } else if (Array.isArray(value)) {
      const messages = value
        .filter(item => item && (typeof item === 'string' || item.message))
        .map(item => typeof item === 'string' ? item : (item.message || item.error || String(item)))
        .join(', ');
      
      if (messages) {
        extractedErrors[finalFieldName] = messages;
      }
    } else if (typeof value === 'object' && value !== null) {
      // Handle nested error objects
      if (value.message) {
        extractedErrors[finalFieldName] = value.message;
      } else if (value.error) {
        extractedErrors[finalFieldName] = value.error;
      } else {
        // Recursively extract nested errors
        this.extractFieldErrors(value, extractedErrors, finalFieldName);
      }
    }
  }

  /**
   * Extract general error message when no field-specific errors found
   */
  static extractGeneralMessage(errorData, fallback) {
    const messagePaths = [
      'message', 'error', 'detail', 'description', 'msg', 'errorMessage',
      'general', 'summary', 'title', 'text', 'content'
    ];

    // Try direct string
    if (typeof errorData === 'string' && errorData.trim()) {
      return errorData.trim();
    }

    // Try message paths
    if (typeof errorData === 'object' && errorData !== null) {
      for (const path of messagePaths) {
        const message = this.getNestedValue(errorData, path);
        if (message && typeof message === 'string' && message.trim()) {
          return message.trim();
        }
      }

      // Try to extract from first available field
      const firstKey = Object.keys(errorData)[0];
      if (firstKey) {
        const firstValue = errorData[firstKey];
        if (typeof firstValue === 'string' && firstValue.trim()) {
          return firstValue.trim();
        }
        if (Array.isArray(firstValue) && firstValue.length > 0) {
          const firstError = firstValue[0];
          if (typeof firstError === 'string') return firstError.trim();
          if (firstError?.message) return firstError.message.trim();
        }
      }

      // Last resort: stringify object
      try {
        const stringified = JSON.stringify(errorData);
        if (stringified !== '{}' && stringified !== '[]') {
          return `Error: ${stringified}`;
        }
      } catch (e) {
        // Ignore JSON stringify errors
      }
    }

    return fallback;
  }

  /**
   * Get nested value from object using dot notation
   */
  static getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get user-friendly error message for toast notifications
   */
  static getToastMessage(error, fallback = this.DEFAULT_ERROR_MESSAGE) {
    const errors = this.extractErrors(error, fallback);
    
    // Return general error if exists
    if (errors.general) {
      return errors.general;
    }

    // Return first field error
    const firstError = Object.values(errors)[0];
    if (firstError) {
      return firstError;
    }

    return fallback;
  }

  /**
   * Handle network and HTTP errors
   */
  static handleNetworkError(error) {
    if (!error.response) {
      // Network error
      if (error.code === 'ECONNABORTED') {
        return { general: this.TIMEOUT_ERROR_MESSAGE };
      }
      return { general: this.NETWORK_ERROR_MESSAGE };
    }

    // HTTP error
    const status = error.response.status;
    const statusMessages = {
      400: "Invalid request. Please check your input.",
      401: "Unauthorized. Please log in again.",
      403: "Access denied. You don't have permission.",
      404: "Resource not found.",
      409: "Conflict. Resource already exists.",
      422: "Validation failed. Please check your input.",
      429: "Too many requests. Please try again later.",
      500: "Internal server error. Please try again.",
      502: "Service temporarily unavailable.",
      503: "Service unavailable. Please try again later.",
      504: "Request timeout. Please try again."
    };

    const statusMessage = statusMessages[status] || `Error ${status}: ${error.response.statusText}`;
    
    // Try to extract specific errors from response
    const specificErrors = this.extractErrors(error.response.data);
    
    // If no specific errors, return status-based message
    if (Object.keys(specificErrors).length === 1 && specificErrors.general === this.DEFAULT_ERROR_MESSAGE) {
      return { general: statusMessage };
    }

    return specificErrors;
  }

  /**
   * Main error handling method - use this in your components
   */
  static handle(error, fallback = this.DEFAULT_ERROR_MESSAGE) {
    console.error('Error occurred:', error);
    
    // Handle network/HTTP errors
    if (error?.code || error?.response?.status) {
      return this.handleNetworkError(error);
    }

    // Handle regular errors
    return this.extractErrors(error, fallback);
  }
}

/**
 * React hook for error handling
 */
export function useErrorHandler() {
  const [errors, setErrors] = React.useState({});

  const handleError = (error, fallback) => {
    const extractedErrors = ErrorHandler.handle(error, fallback);
    setErrors(extractedErrors);
    return extractedErrors;
  };

  const clearErrors = (field) => {
    if (field) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    } else {
      setErrors({});
    }
  };

  const hasError = (field) => {
    return field ? !!errors[field] : Object.keys(errors).length > 0;
  };

  const getError = (field) => {
    return errors[field] || null;
  };

  const getToastMessage = (error, fallback) => {
    return ErrorHandler.getToastMessage(error, fallback);
  };

  return {
    errors,
    handleError,
    clearErrors,
    hasError,
    getError,
    getToastMessage,
    setErrors
  };
}
