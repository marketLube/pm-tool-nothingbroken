import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LockKeyhole, Mail, AlertCircle, Info, Fingerprint } from 'lucide-react';
import Button from '../components/ui/Button';
import { 
  isBiometricSupported, 
  authenticateBiometric, 
  registerBiometric, 
  hasBiometricCredential,
  getBiometricErrorMessage,
  clearAllBiometricCredentials
} from '../utils/webauthn';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);
  const [biometricRegistered, setBiometricRegistered] = useState(false);
  const [showCorruptedCredentials, setShowCorruptedCredentials] = useState(false);
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // Check biometric support on component mount
  useEffect(() => {
    const checkBiometricSupport = () => {
      const supported = isBiometricSupported();
      setBiometricSupported(supported);
      
      // Check if current email has biometric registered
      if (email && supported) {
        setBiometricRegistered(hasBiometricCredential(email));
      }
    };

    checkBiometricSupport();
  }, [email]);

  // Check biometric registration when email changes
  useEffect(() => {
    if (email && biometricSupported) {
      setBiometricRegistered(hasBiometricCredential(email));
    } else {
      setBiometricRegistered(false);
    }
  }, [email, biometricSupported]);

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoggingIn(true);
    try {
      const success = await login(email, password);
      if (success) {
        // After successful login, show biometric setup option if supported and not registered
        if (biometricSupported && !biometricRegistered) {
          setShowBiometricSetup(true);
          setTimeout(() => setShowBiometricSetup(false), 5000); // Hide after 5 seconds
        }
        navigate('/');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    setIsLoggingIn(true);
    setError('');

    try {
      const authenticatedEmail = await authenticateBiometric(email);
      
      if (authenticatedEmail) {
        // Use the hardcoded admin login for biometric authentication
        const success = await login(authenticatedEmail, 'Mark@99');
        if (success) {
          navigate('/');
        } else {
          setError('Biometric authentication succeeded but login failed');
        }
      } else {
        setError('Biometric authentication failed');
      }
    } catch (err) {
      console.error('Biometric login error:', err);
      const errorMessage = getBiometricErrorMessage(err);
      setError(errorMessage);
      
      // Show clear button if credentials are corrupted
      if (errorMessage.includes('corrupted')) {
        setShowCorruptedCredentials(true);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleBiometricSetup = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    try {
      const credential = await registerBiometric(email);
      if (credential) {
        setBiometricRegistered(true);
        setShowBiometricSetup(false);
        setShowCorruptedCredentials(false);
        setError('');
        // Show success message briefly
        const successMsg = 'Fingerprint authentication set up successfully!';
        setError(''); // Clear any existing errors
        setTimeout(() => {
          // You could add a success state here instead of using error
        }, 3000);
      }
    } catch (err) {
      console.error('Biometric setup error:', err);
      setError(getBiometricErrorMessage(err));
    }
  };

  const handleClearCorruptedCredentials = () => {
    clearAllBiometricCredentials();
    setBiometricRegistered(false);
    setShowCorruptedCredentials(false);
    setError('Corrupted credentials cleared. You can now set up Touch ID again.');
    setTimeout(() => setError(''), 3000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header Section */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-gray-100">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Project Management</h1>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          {/* Main Content */}
          <div className="px-8 py-6">
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label 
                  htmlFor="email" 
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockKeyhole className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Sign In Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-3 flex justify-center items-center font-medium"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <>
                      <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></span>
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </div>
            </form>

            {/* Biometric Authentication Section */}
            {biometricSupported && email && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="space-y-3">
                  {biometricRegistered && !showCorruptedCredentials ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full py-3 flex justify-center items-center border-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-medium"
                      disabled={isLoggingIn}
                      onClick={handleBiometricLogin}
                    >
                      <div className="flex items-center justify-center">
                        {isLoggingIn ? (
                          <>
                            <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-700 mr-2 flex-shrink-0"></span>
                            <span>Authenticating...</span>
                          </>
                        ) : (
                          <>
                            <Fingerprint className="h-5 w-5 mr-2 flex-shrink-0" />
                            <span>Sign in with Touch ID</span>
                          </>
                        )}
                      </div>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full py-3 flex justify-center items-center border-2 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors font-medium"
                      disabled={isLoggingIn}
                      onClick={handleBiometricSetup}
                    >
                      <div className="flex items-center justify-center">
                        <Fingerprint className="h-5 w-5 mr-2 flex-shrink-0" />
                        <span>Set up Touch ID</span>
                      </div>
                    </Button>
                  )}
                  
                  {/* Clear corrupted credentials button */}
                  {showCorruptedCredentials && (
                    <Button
                      type="button"
                      variant="danger"
                      className="w-full py-2 flex justify-center items-center text-sm font-medium"
                      onClick={handleClearCorruptedCredentials}
                    >
                      Clear Corrupted Credentials
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Biometric Setup Success Message */}
            {showBiometricSetup && (
              <div className="mt-4 p-4 rounded-md bg-green-50 border border-green-200">
                <div className="flex items-center">
                  <Fingerprint className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                  <span className="text-green-700 text-sm font-medium">
                    You can now set up Touch ID for faster login!
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Information */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
            <div className="space-y-4 text-sm">
              <div className="flex items-start">
                <Info className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-gray-600">
                  New users can be created by an admin from the Users panel. 
                  Passwords are set during user creation.
                </p>
              </div>
              
              {biometricSupported && (
                <div className="flex items-start">
                  <Fingerprint className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-600">
                    Touch ID is supported on this device. Set it up for faster, secure login.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 