import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

type CallbackStatus = 'processing' | 'success' | 'error';

export default function Callback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useAuth();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    let timeoutId: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Handle OAuth errors from Spotify
      if (error) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(errorDescription || error || 'Authentication was denied');
        }
        return;
      }

      // Validate required params
      if (!code || !state) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage('Missing authorization parameters. Please try logging in again.');
        }
        return;
      }

      try {
        await handleCallback(code, state);
        if (isMounted) {
          setStatus('success');
          // Redirect to home after a brief success message
          timeoutId = setTimeout(() => {
            navigate('/', { replace: true });
          }, 1500);
        }
      } catch (err) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(err instanceof Error ? err.message : 'Failed to complete authentication');
        }
      }
    };

    processCallback();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [searchParams, handleCallback, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        {status === 'processing' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h1 className="text-2xl font-semibold">Connecting to Spotify...</h1>
            <p className="text-muted-foreground">Please wait while we complete your login.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
            <h1 className="text-2xl font-semibold">Successfully Connected!</h1>
            <p className="text-muted-foreground">Redirecting you to the app...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="text-2xl font-semibold">Authentication Failed</h1>
            <p className="text-muted-foreground max-w-md">{errorMessage}</p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Return to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
