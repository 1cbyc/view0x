import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/services/api';
import { Loader2, AlertTriangle, CheckCircle, User as UserIcon, Mail, Building, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  company?: string;
  plan: 'free' | 'pro' | 'enterprise';
  emailVerified: boolean;
  createdAt: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    company: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const response = await authApi.getCurrentUser();
        const userData = response.data.data.user;
        setUser(userData);
        setFormData({
          name: userData.name || '',
          company: userData.company || '',
        });
      } catch (err: any) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          navigate('/login', { replace: true });
          return;
        }
        setError(err.error?.message || 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    // TODO: Implement update profile endpoint
    // For now, just show a success message
    setTimeout(() => {
      setSuccess('Profile updated successfully (feature coming soon)');
      setIsSaving(false);
    }, 1000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto" />
          <p className="mt-4 text-white/60">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">User Profile</h1>
        <p className="text-sm text-white/60 mt-1">Manage your account settings and preferences</p>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-red-400">Error</AlertTitle>
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-500/10 border-green-500/20">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <AlertTitle className="text-green-400">Success</AlertTitle>
          <AlertDescription className="text-green-400">{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-white">
                  Name
                </label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="bg-input/30 text-foreground placeholder-muted-foreground border-border focus:border-primary focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-white flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  className="bg-input/20 text-muted-foreground border-border"
                />
                {!user.emailVerified && (
                  <p className="text-xs text-yellow-500">Email not verified</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="company" className="text-sm font-medium text-white flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Company
                </label>
                <Input
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Optional"
                  className="bg-input/30 text-foreground placeholder-muted-foreground border-border focus:border-primary focus:ring-primary"
                />
              </div>

              <Button
                type="submit"
                disabled={isSaving}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>View your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Plan</span>
              <Badge variant={user.plan === 'enterprise' ? 'default' : user.plan === 'pro' ? 'secondary' : 'outline'}>
                {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Email Status</span>
              <Badge variant={user.emailVerified ? 'default' : 'destructive'}>
                {user.emailVerified ? 'Verified' : 'Unverified'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Member Since</span>
              <span className="text-sm text-white/60">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="pt-4 border-t border-white/10">
              <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Account Security
              </h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/forgot-password')}
                  className="w-full text-white/60 hover:text-white"
                >
                  Change Password
                </Button>
                {/* TODO: Add 2FA toggle when implemented */}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
