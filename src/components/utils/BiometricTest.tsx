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
  getBiometricErrorMessage
} from '../../utils/webauthn';

const BiometricTest: React.FC = () => {
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [testEmail] = useState('test@example.com');
  const [credentials, setCredentials] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setWebAuthnSupported(isWebAuthnSupported());
    setBiometricSupported(isBiometricSupported());
    setCredentials(getBiometricCredentials());
  }, []);

  const testRegistration = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const credential = await registerBiometric(testEmail);
      if (credential) {
        setMessage({
          type: 'success',
          text: `Successfully registered biometric credential for ${testEmail}`
        });
        setCredentials(getBiometricCredentials());
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: getBiometricErrorMessage(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testAuthentication = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const authenticatedEmail = await authenticateBiometric(testEmail);
      if (authenticatedEmail) {
        setMessage({
          type: 'success',
          text: `Successfully authenticated as ${authenticatedEmail}`
        });
      } else {
        setMessage({
          type: 'error',
          text: 'Authentication failed'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: getBiometricErrorMessage(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearCredentials = () => {
    localStorage.removeItem('biometric_credentials');
    setCredentials([]);
    setMessage({
      type: 'info',
      text: 'All biometric credentials cleared'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Fingerprint className="h-5 w-5 mr-2 text-blue-600" />
            Biometric Authentication Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Support Status */}
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

          {/* Browser Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start">
              <Info className="h-4 w-4 text-blue-600 mr-2 mt-0.5" />
              <div className="text-xs text-blue-700">
                <p className="font-medium">Browser Info:</p>
                <p className="mt-1">User Agent: {navigator.userAgent}</p>
                <p className="mt-1">Platform: {navigator.platform}</p>
              </div>
            </div>
          </div>

          {/* Test Actions */}
          {biometricSupported && (
            <div className="space-y-3">
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
                  disabled={isLoading}
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
                  Clear Credentials
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
              <h4 className="text-sm font-medium text-gray-900 mb-2">Stored Credentials:</h4>
              <div className="space-y-2">
                {credentials.map((cred, index) => (
                  <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                    <p><strong>Email:</strong> {cred.userEmail}</p>
                    <p><strong>ID:</strong> {cred.id.substring(0, 20)}...</p>
                    <p><strong>Created:</strong> {new Date(cred.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex items-start">
              <Info className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
              <div className="text-xs text-yellow-700">
                <p className="font-medium">Testing Instructions:</p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>Make sure you're using Chrome on macOS with Touch ID enabled</li>
                  <li>Click "Test Registration" to set up biometric authentication</li>
                  <li>Follow the browser prompts to use Touch ID</li>
                  <li>Click "Test Authentication" to verify the setup works</li>
                  <li>Use "Clear Credentials" to reset and test again</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BiometricTest; 