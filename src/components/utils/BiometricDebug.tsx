import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import { Fingerprint, CheckCircle, AlertCircle, Info } from 'lucide-react';
import {
  isBiometricSupported,
  isWebAuthnSupported,
  registerBiometric,
  authenticateBiometric,
  getBiometricCredentials,
  getBiometricErrorMessage,
  clearAllBiometricCredentials
} from '../../utils/webauthn';

const BiometricDebug: React.FC = () => {
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const checkSupport = () => {
      const webAuthn = isWebAuthnSupported();
      const biometric = isBiometricSupported();
      const creds = getBiometricCredentials();
      
      setWebAuthnSupported(webAuthn);
      setBiometricSupported(biometric);
      setCredentials(creds);
      
      setDebugInfo({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        webAuthnSupported: webAuthn,
        biometricSupported: biometric,
        credentialsCount: creds.length,
        hasNavigatorCredentials: !!navigator.credentials,
        hasCredentialsCreate: !!(navigator.credentials && navigator.credentials.create),
        hasCredentialsGet: !!(navigator.credentials && navigator.credentials.get),
        isSecureContext: window.isSecureContext,
        location: window.location.href
      });
    };

    checkSupport();
  }, []);

  const testRegistration = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      console.log('🔧 Starting biometric registration test...');
      const credential = await registerBiometric('debug@test.com');
      
      if (credential) {
        console.log('✅ Registration successful:', credential);
        setMessage({
          type: 'success',
          text: `Registration successful! Credential ID: ${credential.id.substring(0, 20)}...`
        });
        setCredentials(getBiometricCredentials());
      } else {
        console.log('❌ Registration returned null');
        setMessage({
          type: 'error',
          text: 'Registration returned null credential'
        });
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      setMessage({
        type: 'error',
        text: `Registration error: ${getBiometricErrorMessage(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testAuthentication = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      console.log('🔧 Starting biometric authentication test...');
      const result = await authenticateBiometric('debug@test.com');
      
      if (result) {
        console.log('✅ Authentication successful:', result);
        setMessage({
          type: 'success',
          text: `Authentication successful for: ${result}`
        });
      } else {
        console.log('❌ Authentication returned null');
        setMessage({
          type: 'error',
          text: 'Authentication returned null'
        });
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
      setMessage({
        type: 'error',
        text: `Authentication error: ${getBiometricErrorMessage(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearCredentials = () => {
    clearAllBiometricCredentials();
    setCredentials([]);
    setMessage({
      type: 'info',
      text: 'All credentials cleared'
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Fingerprint className="h-5 w-5 mr-2 text-blue-600" />
            Biometric Authentication Debug
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Browser Support */}
          <div>
            <h3 className="text-lg font-medium mb-3">Browser Support</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center p-3 bg-gray-50 rounded-md">
                {webAuthnSupported ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                )}
                <div>
                  <p className="text-sm font-medium">WebAuthn Support</p>
                  <p className="text-xs text-gray-600">
                    {webAuthnSupported ? 'Supported' : 'Not supported'}
                  </p>
                </div>
              </div>

              <div className="flex items-center p-3 bg-gray-50 rounded-md">
                {biometricSupported ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                )}
                <div>
                  <p className="text-sm font-medium">Biometric Support</p>
                  <p className="text-xs text-gray-600">
                    {biometricSupported ? 'Likely supported' : 'Not supported'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Debug Information */}
          <div>
            <h3 className="text-lg font-medium mb-3">Debug Information</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          </div>

          {/* Test Actions */}
          {biometricSupported && (
            <div>
              <h3 className="text-lg font-medium mb-3">Test Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={testRegistration}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Registering...' : 'Test Registration'}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={testAuthentication}
                  disabled={isLoading || credentials.length === 0}
                  className="w-full"
                >
                  {isLoading ? 'Authenticating...' : 'Test Authentication'}
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={clearCredentials}
                  disabled={isLoading}
                  className="w-full"
                >
                  Clear All Credentials
                </Button>
              </div>
            </div>
          )}

          {/* Messages */}
          {message && (
            <div className={`p-3 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : message.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              <div className="flex items-center">
                {message.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 mr-2" />
                ) : message.type === 'error' ? (
                  <AlertCircle className="h-4 w-4 mr-2" />
                ) : (
                  <Info className="h-4 w-4 mr-2" />
                )}
                <span className="text-sm">{message.text}</span>
              </div>
            </div>
          )}

          {/* Stored Credentials */}
          {credentials.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">Stored Credentials ({credentials.length})</h3>
              <div className="space-y-2">
                {credentials.map((cred, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      <div>
                        <strong>Email:</strong> {cred.userEmail}
                      </div>
                      <div>
                        <strong>ID:</strong> {cred.id.substring(0, 20)}...
                      </div>
                      <div>
                        <strong>Created:</strong> {new Date(cred.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-start">
              <Info className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
              <div className="text-sm text-yellow-700">
                <p className="font-medium">Troubleshooting Steps:</p>
                <ol className="mt-2 list-decimal list-inside space-y-1">
                  <li>Make sure you're using Chrome or Safari on macOS</li>
                  <li>Ensure Touch ID is enabled in System Preferences</li>
                  <li>Check that you're on a secure connection (https or localhost)</li>
                  <li>Try clearing credentials and re-registering</li>
                  <li>Check the browser console for detailed error messages</li>
                </ol>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BiometricDebug; 