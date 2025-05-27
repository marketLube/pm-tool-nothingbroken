import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import { Fingerprint, Shield, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  isBiometricSupported,
  hasBiometricCredential,
  registerBiometric,
  removeBiometricCredential,
  getBiometricErrorMessage,
  getBiometricCredentials
} from '../../utils/webauthn';

const BiometricSettings: React.FC = () => {
  const { currentUser } = useAuth();
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricRegistered, setBiometricRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const checkBiometricStatus = () => {
      const supported = isBiometricSupported();
      setBiometricSupported(supported);
      
      if (currentUser?.email && supported) {
        setBiometricRegistered(hasBiometricCredential(currentUser.email));
      }
    };

    checkBiometricStatus();
  }, [currentUser]);

  const handleSetupBiometric = async () => {
    if (!currentUser?.email) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const credential = await registerBiometric(currentUser.email);
      if (credential) {
        setBiometricRegistered(true);
        setMessage({
          type: 'success',
          text: 'Touch ID has been set up successfully! You can now use it to sign in.'
        });
      }
    } catch (error) {
      console.error('Biometric setup error:', error);
      setMessage({
        type: 'error',
        text: getBiometricErrorMessage(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveBiometric = async () => {
    if (!currentUser?.email) return;

    setIsLoading(true);
    setMessage(null);

    try {
      removeBiometricCredential(currentUser.email);
      setBiometricRegistered(false);
      setMessage({
        type: 'success',
        text: 'Touch ID has been removed from your account.'
      });
    } catch (error) {
      console.error('Biometric removal error:', error);
      setMessage({
        type: 'error',
        text: 'Failed to remove Touch ID. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessage = () => {
    setMessage(null);
  };

  // Auto-clear messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(clearMessage, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!biometricSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Fingerprint className="h-5 w-5 mr-2 text-gray-400" />
            Biometric Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center p-4 bg-gray-50 rounded-md">
            <AlertCircle className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-700">Not Available</p>
              <p className="text-xs text-gray-500 mt-1">
                Biometric authentication is not supported on this device or browser.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Fingerprint className="h-5 w-5 mr-2 text-blue-600" />
          Biometric Authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900">Touch ID / Face ID</h4>
            <p className="text-sm text-gray-600 mt-1">
              Use your device's biometric authentication for quick and secure login.
            </p>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-2" />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          {biometricRegistered ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-gray-900">Touch ID is enabled</span>
                </div>
                <span className="text-xs text-gray-500">Active</span>
              </div>
              
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={handleRemoveBiometric}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? 'Removing...' : 'Remove Touch ID'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">Touch ID is not set up</span>
              </div>
              
              <Button
                variant="primary"
                size="sm"
                icon={Fingerprint}
                onClick={handleSetupBiometric}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? 'Setting up...' : 'Set up Touch ID'}
              </Button>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-start">
            <Shield className="h-4 w-4 text-blue-600 mr-2 mt-0.5" />
            <div className="text-xs text-blue-700">
              <p className="font-medium">Security Note:</p>
              <p className="mt-1">
                Your biometric data is stored securely on your device and never leaves it. 
                This feature uses your device's built-in security features.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BiometricSettings; 