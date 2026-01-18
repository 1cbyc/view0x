import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../services/api';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

// In a real application, you would use a context to manage the auth state.
// For now, we'll manage it by saving the token to localStorage.
// import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // const { login } = useAuth(); // This would be the ideal way to handle login state.

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Display a success message if redirected from the registration page
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
  }, [location.state]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!formData.email || !formData.password) {
      setError('Email and password are required.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await authApi.login(formData);

      // Check if response is successful
      if (response.data && response.data.success && response.data.data) {
        // In a full implementation, this logic would be in an AuthContext
        const { tokens, user } = response.data.data;
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        // Trigger storage event so Navbar can update
        window.dispatchEvent(new Event('storage'));

        // Redirect to dashboard on successful login
        navigate('/dashboard', { replace: true });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      // Handle error - check both axios error format and backend error format
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (err.error?.message) {
        // Backend error format: { success: false, error: { message: ... } }
        errorMessage = err.error.message;
      } else if (err.response?.data?.error?.message) {
        // Axios error with backend format
        errorMessage = err.response.data.error.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-white/60">
            Or{' '}
            <Link to="/register" className="font-medium text-accent hover:text-accent/80">
              create a new account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-400">{error}</h3>
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="rounded-md bg-green-500/10 border border-green-500/20 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-400">{successMessage}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full appearance-none rounded-none rounded-t-md border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:z-10 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full appearance-none rounded-none rounded-b-md border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:z-10 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link to="/forgot-password" className="font-medium text-white/60 hover:text-white">
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-full border border-transparent bg-white text-black py-3 px-4 text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black disabled:bg-white/50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-3" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
