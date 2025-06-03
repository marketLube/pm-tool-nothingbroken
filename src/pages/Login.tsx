import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LockKeyhole, Mail, AlertCircle, Info, Fingerprint, Sparkles, Quote, CheckCircle, Zap } from 'lucide-react';
import Button from '../components/ui/Button';
import { 
  isBiometricSupported, 
  authenticateBiometric, 
  registerBiometric, 
  hasBiometricCredential,
  getBiometricErrorMessage,
  clearAllBiometricCredentials
} from '../utils/webauthn';

// Inspiring work quotes array
const workQuotes = [
  {
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill"
  },
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs"
  },
  {
    text: "Innovation distinguishes between a leader and a follower.",
    author: "Steve Jobs"
  },
  {
    text: "Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work.",
    author: "Steve Jobs"
  },
  {
    text: "The future depends on what you do today.",
    author: "Mahatma Gandhi"
  },
  {
    text: "Excellence is not a skill, it's an attitude.",
    author: "Ralph Marston"
  },
  {
    text: "Success is walking from failure to failure with no loss of enthusiasm.",
    author: "Winston Churchill"
  },
  {
    text: "Don't be afraid to give up the good to go for the great.",
    author: "John D. Rockefeller"
  },
  {
    text: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney"
  },
  {
    text: "If you are not willing to risk the usual, you will have to settle for the ordinary.",
    author: "Jim Rohn"
  },
  {
    text: "Trust because you are willing to accept the risk, not because it's safe or certain.",
    author: "Anonymous"
  },
  {
    text: "Take up one idea. Make that one idea your life. Think of it, dream of it, live on that idea. Let the brain, muscles, nerves, every part of your body, be full of that idea, and just leave every other idea alone. This is the way to success.",
    author: "Swami Vivekananda"
  }
];

// Success animation component
const SuccessAnimation: React.FC<{ show: boolean; onComplete: () => void }> = ({ show, onComplete }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="relative">
        {/* Main success animation */}
        <div className="success-animation">
          <div className="checkmark-circle">
            <div className="background"></div>
            <div className="checkmark draw"></div>
          </div>
        </div>
        
        {/* Confetti/sparkles effect */}
        <div className="absolute inset-0 flex items-center justify-center">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-ping"
              style={{
                animationDelay: `${i * 0.1}s`,
                transform: `rotate(${i * 30}deg) translateY(-60px)`,
              }}
            >
              <Sparkles className="h-4 w-4 text-yellow-400" />
            </div>
          ))}
        </div>
        
        {/* Success text */}
        <div className="absolute top-32 left-1/2 transform -translate-x-1/2 text-center">
          <div className="animate-bounce">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back!</h2>
            <p className="text-gray-200">Login successful</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);
  const [biometricRegistered, setBiometricRegistered] = useState(false);
  const [showCorruptedCredentials, setShowCorruptedCredentials] = useState(false);
  const [dailyQuote, setDailyQuote] = useState(workQuotes[0]);
  const { login, isLoggedIn, isLoading } = useAuth();
  const navigate = useNavigate();

  // Get daily quote based on date
  useEffect(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const quoteIndex = dayOfYear % workQuotes.length;
    setDailyQuote(workQuotes[quoteIndex]);
  }, []);

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
  if (isLoggedIn) {
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
        // Show success animation
        setShowSuccessAnimation(true);
        
        // After successful login, show biometric setup option if supported and not registered
        if (biometricSupported && !biometricRegistered) {
          setShowBiometricSetup(true);
          setTimeout(() => setShowBiometricSetup(false), 5000); // Hide after 5 seconds
        }
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

  const handleSuccessAnimationComplete = () => {
    setShowSuccessAnimation(false);
    navigate('/');
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
          setShowSuccessAnimation(true);
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center border border-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading your workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .animated-underline {
          position: relative;
          display: inline-block;
        }
        
        .animated-underline::after {
          content: '';
          position: absolute;
          width: 0;
          height: 2px;
          bottom: -2px;
          left: 0;
          background: linear-gradient(90deg, #3B82F6, #8B5CF6, #EC4899);
          transition: width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        
        .animated-underline:hover::after {
          width: 100%;
        }
        
        .floating-animation {
          animation: float 6s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite alternate;
        }
        
        @keyframes pulse-glow {
          from { box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); }
          to { box-shadow: 0 0 30px rgba(59, 130, 246, 0.6), 0 0 40px rgba(139, 92, 246, 0.3); }
        }
        
        .success-animation .checkmark-circle {
          width: 80px;
          height: 80px;
          position: relative;
          display: inline-block;
          vertical-align: top;
        }
        
        .success-animation .checkmark-circle .background {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #10B981;
          position: absolute;
          transform: scale(0);
          animation: scale 0.6s ease-in-out forwards;
        }
        
        .success-animation .checkmark-circle .checkmark {
          border-radius: 5px;
        }
        
        .success-animation .checkmark-circle .checkmark.draw:after {
          animation-duration: 0.8s;
          animation-timing-function: ease;
          animation-name: checkmark;
          transform: scaleX(-1) rotate(135deg);
          animation-fill-mode: forwards;
        }
        
        .success-animation .checkmark-circle .checkmark:after {
          opacity: 1;
          height: 30px;
          width: 15px;
          transform-origin: left top;
          border-right: 3px solid white;
          border-top: 3px solid white;
          border-radius: 2.5px;
          content: '';
          left: 25px;
          top: 40px;
          position: absolute;
        }
        
        @keyframes scale {
          0%, 20% { transform: scale(0); }
          100% { transform: scale(1); }
        }
        
        @keyframes checkmark {
          0%, 20% { opacity: 0; transform: scaleX(-1) rotate(135deg) scale(0); }
          100% { opacity: 1; transform: scaleX(-1) rotate(135deg) scale(1); }
        }
        
        .gradient-background {
          background: linear-gradient(-45deg, #667eea 0%, #764ba2 100%);
          background-size: 400% 400%;
          animation: gradient 15s ease infinite;
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .glass-morphism {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .input-glow:focus {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 0 20px rgba(59, 130, 246, 0.2);
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
      `}</style>

      <SuccessAnimation 
        show={showSuccessAnimation} 
        onComplete={handleSuccessAnimationComplete} 
      />

      <div className="min-h-screen gradient-background flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <div className="w-full max-w-lg relative z-10">
          <div className="glass-morphism rounded-3xl shadow-2xl overflow-hidden floating-animation">
            {/* Header Section with Animated Underline */}
            <div className="px-8 pt-10 pb-8 text-center">
              <div className="mb-6">
                <h1 className="text-4xl font-bold text-gray-800 mb-3">
                  Project Management Tool: <span className="animated-underline text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 cursor-pointer">marketlube</span>
                </h1>
                <div className="flex items-center justify-center mb-4">
                  <Zap className="h-5 w-5 text-yellow-500 mr-2" />
                  <p className="text-gray-600 font-medium">Transform your workflow today</p>
                  <Zap className="h-5 w-5 text-yellow-500 ml-2" />
                </div>
          </div>

              {/* Daily Quote Section */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-6 border-l-4 border-blue-500">
                <div className="flex items-start">
                  <Quote className="h-6 w-6 text-blue-500 mr-3 mt-1 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-gray-700 italic font-medium leading-relaxed">
                      "{dailyQuote.text}"
                    </p>
                    <p className="text-blue-600 font-semibold mt-2 text-sm">
                      — {dailyQuote.author}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="px-8 pb-8">
              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 backdrop-blur-sm">
                  <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-red-700 text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
                <div className="space-y-2">
                <label 
                  htmlFor="email" 
                    className="block text-sm font-semibold text-gray-700"
                >
                    Email Address
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm input-glow font-medium"
                      placeholder="your.email@company.com"
                  />
                </div>
              </div>

              {/* Password Field */}
                <div className="space-y-2">
                <label 
                  htmlFor="password" 
                    className="block text-sm font-semibold text-gray-700"
                >
                  Password
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <LockKeyhole className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm input-glow font-medium"
                      placeholder="••••••••••••"
                  />
                </div>
              </div>

              {/* Sign In Button */}
                <div className="pt-4">
                <Button
                  type="submit"
                  variant="primary"
                    className="w-full py-4 flex justify-center items-center font-bold text-lg rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 pulse-glow"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                      <div className="flex items-center justify-center">
                        <span className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white mr-3 flex-shrink-0"></span>
                        <span>Signing you in...</span>
                      </div>
                  ) : (
                      <div className="flex items-center justify-center">
                        <Sparkles className="h-5 w-5 mr-2 flex-shrink-0" />
                        <span>Sign In to Your Workspace</span>
                      </div>
                  )}
                </Button>
              </div>
            </form>

            {/* Biometric Authentication Section */}
            {biometricSupported && email && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="space-y-4">
                  {biometricRegistered && !showCorruptedCredentials ? (
                    <Button
                      type="button"
                      variant="secondary"
                        className="w-full py-4 flex justify-center items-center border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 font-semibold rounded-xl transform hover:scale-105"
                      disabled={isLoggingIn}
                      onClick={handleBiometricLogin}
                    >
                      <div className="flex items-center justify-center">
                        {isLoggingIn ? (
                          <>
                              <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-700 mr-3 flex-shrink-0"></span>
                            <span>Authenticating...</span>
                          </>
                        ) : (
                          <>
                              <Fingerprint className="h-6 w-6 mr-3 flex-shrink-0" />
                              <span>Quick Sign-in with Touch ID</span>
                          </>
                        )}
                      </div>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                        className="w-full py-4 flex justify-center items-center border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 hover:from-green-100 hover:to-emerald-100 transition-all duration-200 font-semibold rounded-xl transform hover:scale-105"
                      disabled={isLoggingIn}
                      onClick={handleBiometricSetup}
                    >
                      <div className="flex items-center justify-center">
                          <Fingerprint className="h-6 w-6 mr-3 flex-shrink-0" />
                          <span>Set up Touch ID Authentication</span>
                      </div>
                    </Button>
                  )}
                  
                  {/* Clear corrupted credentials button */}
                  {showCorruptedCredentials && (
                    <Button
                      type="button"
                      variant="danger"
                        className="w-full py-3 flex justify-center items-center text-sm font-semibold rounded-xl"
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
                <div className="mt-6 p-4 rounded-xl bg-green-50 border border-green-200">
                <div className="flex items-center">
                    <CheckCircle className="h-6 w-6 text-green-600 mr-3 flex-shrink-0" />
                    <span className="text-green-700 font-semibold">
                      🎉 You can now set up Touch ID for lightning-fast login!
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Information */}
            <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-blue-50 border-t border-gray-100">
            <div className="space-y-4 text-sm">
              <div className="flex items-start">
                  <Info className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-600 font-medium">
                    New team members can be invited by administrators through the Users panel. 
                    Secure passwords are generated during account creation.
                </p>
              </div>
              
              {biometricSupported && (
                <div className="flex items-start">
                    <Fingerprint className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-600 font-medium">
                      🔒 Touch ID is available on this device for secure, instant access.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Login; 