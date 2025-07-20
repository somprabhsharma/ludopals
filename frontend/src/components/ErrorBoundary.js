/**
 * ErrorBoundary Component
 * Catches JavaScript errors in the React component tree and displays a fallback UI
 */

import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Report error to monitoring service (if available)
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: true
      });
    }

    // Store error in localStorage for debugging
    try {
      const errorData = {
        error: error.toString(),
        errorInfo: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      localStorage.setItem('ludopals_last_error', JSON.stringify(errorData));
    } catch (e) {
      console.error('Failed to store error data:', e);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorId } = this.state;
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
          <motion.div
            className="max-w-2xl w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Error Card */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-8 py-6 text-white">
                <motion.div
                  className="flex items-center space-x-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    <AlertTriangle size={32} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Oops! Something went wrong</h1>
                    <p className="text-red-100 mt-1">
                      We encountered an unexpected error
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Content */}
              <div className="px-8 py-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                >
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Don't worry! This happens sometimes. The error has been logged and our team 
                    will look into it. In the meantime, you can try one of the options below.
                  </p>

                  {/* Error ID */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <p className="text-sm text-gray-500 mb-1">Error ID (for support):</p>
                    <code className="text-sm font-mono text-gray-800 bg-white px-2 py-1 rounded">
                      {errorId}
                    </code>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <motion.button
                      onClick={this.handleRetry}
                      className="btn btn-primary btn-lg flex-1"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <RefreshCw size={20} className="mr-2" />
                      Try Again
                    </motion.button>

                    <motion.button
                      onClick={this.handleReload}
                      className="btn btn-secondary btn-lg flex-1"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <RefreshCw size={20} className="mr-2" />
                      Reload Page
                    </motion.button>

                    <motion.button
                      onClick={this.handleGoHome}
                      className="btn btn-ghost btn-lg flex-1"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Home size={20} className="mr-2" />
                      Go Home
                    </motion.button>
                  </div>

                  {/* Help Text */}
                  <div className="text-center text-sm text-gray-500">
                    <p>
                      If this problem persists, please{' '}
                      <a 
                        href="mailto:support@ludopals.com" 
                        className="text-primary hover:underline"
                      >
                        contact support
                      </a>
                      {' '}with the error ID above.
                    </p>
                  </div>

                  {/* Development Error Details */}
                  {isDevelopment && error && (
                    <motion.details
                      className="mt-8 bg-gray-900 text-green-400 rounded-lg overflow-hidden"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <summary className="px-4 py-3 cursor-pointer hover:bg-gray-800 transition-colors">
                        <span className="font-mono text-sm">🐛 Development Error Details</span>
                      </summary>
                      <div className="px-4 py-3 border-t border-gray-700">
                        <div className="mb-4">
                          <h4 className="text-red-400 font-semibold mb-2">Error:</h4>
                          <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                            {error.toString()}
                          </pre>
                        </div>
                        {errorInfo && (
                          <div>
                            <h4 className="text-red-400 font-semibold mb-2">Component Stack:</h4>
                            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                              {errorInfo.componentStack}
                            </pre>
                          </div>
                        )}
                      </div>
                    </motion.details>
                  )}
                </motion.div>
              </div>
            </div>

            {/* Footer */}
            <motion.div
              className="text-center mt-6 text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <p className="text-sm">
                LudoPals • We're sorry for the inconvenience
              </p>
            </motion.div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;