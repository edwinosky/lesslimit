'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { signMessage } from 'wagmi/actions';
import { config } from '../app/providers';

// Keys for localStorage to track authentication state
const AUTH_STORAGE_KEY = 'lesslimit_auth_complete';
const AUTH_TIMESTAMP_KEY = 'lesslimit_auth_timestamp';

// A simple in-memory flag to prevent re-running the login flow unnecessarily.
let hasAttemptedLogin = false;

export function AuthManager() {
  const { address, isConnected } = useAccount();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Verificar si ya existe una sesión válida (evita el reload innecesario)
  const checkExistingSession = async () => {
    try {
      const verifyResponse = await fetch('/api/proxy/auth/verify-auth');
      return verifyResponse.status === 200;
    } catch (error) {
      return false;
    }
  };

  // Verificar localStorage para ver si completamos autenticación recientemente
  const checkLocalStorageAuth = (): boolean => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    const timestamp = localStorage.getItem(AUTH_TIMESTAMP_KEY);

    if (!stored || !timestamp) return false;

    // Resetear si han pasado más de 24 horas (sesiones típicas en horas)
    const hoursSinceAuth = (Date.now() - parseInt(timestamp, 10)) / (1000 * 60 * 60);
    if (hoursSinceAuth > 24) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_TIMESTAMP_KEY);
      return false;
    }

    return stored === 'true' && timestamp === stored;
  };

  // Guardar estado de autenticación completada
  const saveAuthComplete = () => {
    localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    localStorage.setItem(AUTH_TIMESTAMP_KEY, Date.now().toString());
  };

  useEffect(() => {
    const handleAuth = async () => {
      if (isAuthenticating || !address || !isConnected) {
        return;
      }

      // Si ya verificamos autenticación en esta sesión de wallet, no volver a intentar
      if (hasAttemptedLogin) {
        console.log('AuthManager: Authentication already attempted for this wallet session');
        return;
      }

      // Verificar si ya tenemos una sesión válida guardada
      if (checkLocalStorageAuth()) {
        console.log('AuthManager: Found existing authentication in localStorage');
        hasAttemptedLogin = true; // Marcar como intentada para evitar loops
        return;
      }

      // Verificar si el servidor ya tiene una sesión válida
      const hasValidSession = await checkExistingSession();
      if (hasValidSession) {
        console.log('AuthManager: Server confirms existing valid session');
        saveAuthComplete();
        hasAttemptedLogin = true; // Marcar como intentada
        return;
      }

      console.log('AuthManager: No existing session found. Starting authentication...');
      setIsAuthenticating(true);
      hasAttemptedLogin = true; // Marcar como intentada incluso si falla

      try {
        // 1. Get signing message
        console.log('AuthManager: Getting signing message...');
        const messageResponse = await fetch('/api/proxy/auth/signing-message', {
          headers: { 'Accept': 'application/json' }
        });
        if (!messageResponse.ok) {
          throw new Error(`Failed to get signing message: ${messageResponse.statusText}`);
        }
        const message = await messageResponse.text();
        console.log('AuthManager: Signing message received:', message);

        // 2. Request signature
        console.log('AuthManager: Requesting signature...');
        const signature = await signMessage(config, {
          message: message,
        });
        console.log('AuthManager: Signature received:', signature);

        // 3. Send signature to log in
        console.log('AuthManager: Sending signature to login endpoint...');

        // Convert the message to hex format as required by the API
        const messageBuffer = new TextEncoder().encode(message);
        const hexMessage = '0x' + Array.from(messageBuffer).map(byte => byte.toString(16).padStart(2, '0')).join('');
        console.log('AuthManager: Converted message to hex for header');

        const loginResponse = await fetch('/api/proxy/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-account': address,
            'x-signing-message': hexMessage,
            'x-signature': signature,
          },
          body: JSON.stringify({
            client: 'eoa',
          }),
        });

        if (!loginResponse.ok) {
          const errorBody = await loginResponse.text();
          throw new Error(`Login failed with status ${loginResponse.status}: ${errorBody}`);
        }

        console.log('AuthManager: Authentication successful! Saving state...');
        saveAuthComplete(); // Guardar que completamos la autenticación
        // No hacer window.location.reload() para evitar bucles

      } catch (error) {
        console.error('AuthManager: Authentication failed:', error);
        // Nota: No reseteamos hasAttemptedLogin para evitar bucles, pero permite retry manual
      } finally {
        setIsAuthenticating(false);
      }
    };

    if (isConnected && address) {
      handleAuth();
    } else {
      // Cuando se desconecta la wallet, resetear los flags para permitir re-authenticación
      hasAttemptedLogin = false;
    }
  }, [address, isConnected, isAuthenticating]);

  return null;
}
