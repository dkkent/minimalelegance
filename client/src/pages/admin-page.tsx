import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  Users,
  MessageSquare,
  Settings,
  Database,
  ShieldAlert,
  ActivitySquare,
  Lock
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import UserManagement from '@/components/admin/user-management';
import StarterManagement from '@/components/admin/starter-management';
import AdminLogs from '@/components/admin/admin-logs';
import AdminDashboard from '@/components/admin/admin-dashboard';

// Type definitions for admin data
interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'superadmin';
  isIndividual: boolean;
  partnerId: number | null;
  profilePicture: boolean;
  firebaseUid: string | null;
  lastAdminLogin: string | null;
}

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const queryClient = useQueryClient();
  const [isAdminLoading, setIsAdminLoading] = useState(true);
  
  // Clean up resources when component unmounts to prevent WebSocket errors
  useEffect(() => {
    return () => {
      // Reset admin-related queries to prevent stale state when navigating back
      queryClient.removeQueries({
        queryKey: ['/api/admin']
      });
    };
  }, [queryClient]);
  
  // Check if the current user is an admin
  const { data: currentUser, isLoading: isUserLoading, isError } = useQuery({
    queryKey: ['/api/user'],
    retry: false
  });
  
  // Simulate loading state for a short time to ensure loading UI is visible
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAdminLoading(false);
    }, 1000); // Show loading state for at least 1 second
    
    return () => clearTimeout(timer);
  }, []);
  
  // Combined loading state
  const isLoading = isUserLoading || isAdminLoading;
  
  // If the user is not an admin or superadmin, show access denied
  if (!isLoading && !isError && currentUser && 
      currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
    return (
      <div className="container mx-auto py-10 px-4">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to access the admin area.
          </AlertDescription>
        </Alert>
        <Button onClick={() => window.location.href = '/'}>Return to Home</Button>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary mb-4"></div>
          <p className="text-lg font-medium text-muted-foreground mt-4">Loading Admin Panel...</p>
          <p className="text-sm text-muted-foreground mt-2">This might take a moment</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (isError) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>
            There was a problem verifying your admin access. Please try logging in again.
          </AlertDescription>
        </Alert>
        <Button onClick={() => window.location.href = '/login'}>Login</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage users, content, and system settings
          </p>
        </div>
        <div className="flex items-center mt-4 md:mt-0">
          <span className="mr-2">Logged in as:</span>
          <span className="font-semibold">{currentUser?.name}</span>
          <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {currentUser?.role === 'superadmin' ? 'Super Admin' : 'Admin'}
          </span>
        </div>
      </div>

      <Separator className="my-6" />

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <ActivitySquare className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Users</span>
          </TabsTrigger>
          <TabsTrigger value="starters" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Starters</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>Activity Logs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4 bg-card rounded-lg p-4 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">System Dashboard</h2>
          <AdminDashboard />
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4 bg-card rounded-lg p-4 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">User Management</h2>
          <UserManagement currentUserRole={currentUser?.role} />
        </TabsContent>
        
        <TabsContent value="starters" className="space-y-4 bg-card rounded-lg p-4 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Conversation Starters</h2>
          <StarterManagement />
        </TabsContent>
        
        <TabsContent value="logs" className="space-y-4 bg-card rounded-lg p-4 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Admin Activity Logs</h2>
          <AdminLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;