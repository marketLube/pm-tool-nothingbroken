/**
 * WebAuthn utility for biometric authentication (Touch ID, Face ID, Fingerprint)
 * Supports Chrome on Mac with Touch ID and other compatible devices
 */

import { getIndiaDateTime } from './timezone';

// Check if WebAuthn is supported
export const isWebAuthnSupported = (): boolean => {
  return !!(navigator.credentials && navigator.credentials.create);
};

// Check if the device likely supports biometric authentication
export const isBiometricSupported = (): boolean => {
  return isWebAuthnSupported() && 
         (navigator.userAgent.includes('Mac') || 
          navigator.userAgent.includes('Windows') ||
          navigator.userAgent.includes('Android') ||
          navigator.userAgent.includes('iPhone'));
};

// Generate a random challenge
const generateChallenge = (): Uint8Array => {
  return new Uint8Array(32).map(() => Math.floor(Math.random() * 256));
};

// Convert string to ArrayBuffer
const stringToArrayBuffer = (str: string): ArrayBuffer => {
  const encoder = new TextEncoder();
  return encoder.encode(str);
};

// Convert ArrayBuffer to base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Convert base64 to ArrayBuffer
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

export interface BiometricCredential {
  id: string;
  publicKey: string;
  userEmail: string;
  createdAt: string;
}

/**
 * Register a new biometric credential for a user
 */
export const registerBiometric = async (userEmail: string): Promise<BiometricCredential | null> => {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported on this device');
  }

  try {
    const challenge = generateChallenge();
    const userId = stringToArrayBuffer(userEmail);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: "Project Management Tool",
        id: window.location.hostname,
      },
      user: {
        id: userId,
        name: userEmail,
        displayName: userEmail,
      },
      pubKeyCredParams: [
        {
          alg: -7, // ES256
          type: "public-key",
        },
        {
          alg: -257, // RS256
          type: "public-key",
        },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // Use platform authenticator (Touch ID, Face ID, Windows Hello)
        userVerification: "required",
        requireResidentKey: false,
      },
      timeout: 60000,
      attestation: "direct",
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    }) as PublicKeyCredential;

    if (!credential) {
      return null;
    }

    const response = credential.response as AuthenticatorAttestationResponse;
    const credentialData: BiometricCredential = {
      id: arrayBufferToBase64(credential.rawId),
      publicKey: arrayBufferToBase64(response.getPublicKey()!),
      userEmail,
      createdAt: getIndiaDateTime().toISOString(),
    };

    // Store credential in localStorage for this demo
    // In production, you'd store this on your server
    const existingCredentials = getBiometricCredentials();
    const updatedCredentials = existingCredentials.filter(cred => cred.userEmail !== userEmail);
    updatedCredentials.push(credentialData);
    localStorage.setItem('biometric_credentials', JSON.stringify(updatedCredentials));

    return credentialData;
  } catch (error) {
    console.error('Error registering biometric credential:', error);
    throw error;
  }
};

/**
 * Authenticate using biometric credential
 */
export const authenticateBiometric = async (userEmail?: string): Promise<string | null> => {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported on this device');
  }

  try {
    const credentials = getBiometricCredentials();
    
    // If userEmail is provided, filter to that user's credentials
    const userCredentials = userEmail 
      ? credentials.filter(cred => cred.userEmail === userEmail)
      : credentials;

    if (userCredentials.length === 0) {
      throw new Error('No biometric credentials found for this user');
    }

    const challenge = generateChallenge();
    const allowCredentials = userCredentials.map(cred => ({
      id: base64ToArrayBuffer(cred.id),
      type: "public-key" as const,
      transports: ["internal"] as AuthenticatorTransport[],
    }));

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials,
      timeout: 60000,
      userVerification: "required",
    };

    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    }) as PublicKeyCredential;

    if (!assertion) {
      return null;
    }

    // Find the credential that was used
    const assertionIdBase64 = arrayBufferToBase64(assertion.rawId);
    const usedCredential = userCredentials.find(cred => 
      cred.id === assertionIdBase64
    );

    return usedCredential?.userEmail || null;
  } catch (error) {
    console.error('Error authenticating with biometric:', error);
    throw error;
  }
};

/**
 * Get stored biometric credentials
 */
export const getBiometricCredentials = (): BiometricCredential[] => {
  try {
    const stored = localStorage.getItem('biometric_credentials');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Check if user has biometric credential registered
 */
export const hasBiometricCredential = (userEmail: string): boolean => {
  const credentials = getBiometricCredentials();
  return credentials.some(cred => cred.userEmail === userEmail);
};

/**
 * Remove biometric credential for a user
 */
export const removeBiometricCredential = (userEmail: string): void => {
  const credentials = getBiometricCredentials();
  const filteredCredentials = credentials.filter(cred => cred.userEmail !== userEmail);
  localStorage.setItem('biometric_credentials', JSON.stringify(filteredCredentials));
};

/**
 * Clear all biometric credentials (useful for fixing corruption)
 */
export const clearAllBiometricCredentials = (): void => {
  localStorage.removeItem('biometric_credentials');
};

/**
 * Get user-friendly error messages
 */
export const getBiometricErrorMessage = (error: any): string => {
  if (error.name === 'NotSupportedError') {
    return 'Biometric authentication is not supported on this device';
  }
  if (error.name === 'NotAllowedError') {
    return 'Biometric authentication was cancelled or not allowed';
  }
  if (error.name === 'InvalidStateError') {
    return 'Biometric authentication is already in progress';
  }
  if (error.name === 'SecurityError') {
    return 'Security error occurred during biometric authentication';
  }
  if (error.name === 'AbortError') {
    return 'Biometric authentication was aborted';
  }
  if (error.name === 'InvalidCharacterError' || error.message?.includes('atob')) {
    return 'Biometric credentials are corrupted. Please clear and re-register your fingerprint.';
  }
  if (error.message?.includes('No biometric credentials found')) {
    return 'No fingerprint registered. Please set up biometric authentication first.';
  }
  
  return 'An error occurred during biometric authentication';
};

export const storeCredential = async (userId: string, credential: any) => {
  try {
    const credentialData = {
      id: credential.id,
      user_id: userId,
      public_key: credential.publicKey,
      counter: credential.counter || 0,
      createdAt: getIndiaDateTime().toISOString(),
    };

    const { error } = await supabase
      .from('webauthn_credentials')
      .insert([credentialData]);

    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error storing credential:', error);
    return false;
  }
}; 