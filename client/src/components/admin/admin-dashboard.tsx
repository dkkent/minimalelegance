import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Heart, Calendar, UserCheck } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  
  // Clean up dashboard resources when component unmounts
  useEffect(() => {
    return () => {
      // Remove dashboard queries when unmounting to prevent stale data
      queryClient.removeQueries({
        queryKey: ['/api/admin/dashboard']
      });
    };
  }, [queryClient]);
  
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['/api/admin/dashboard'],
    retry: 1,
    // Don't cache admin dashboard data for long to ensure fresh stats
    staleTime: 30000 // 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    console.error('Admin dashboard error:', error);
    
    // Get readable error message
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message);
    }

    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-md">
        <p className="font-semibold">Error loading dashboard data</p>
        <p className="text-sm">Please try again later or contact the system administrator.</p>
        <div className="mt-4 p-2 bg-card border text-xs font-mono overflow-auto">
          <p className="text-xs text-muted-foreground mb-1">Error details (for debugging):</p>
          <code>{errorMessage}</code>
        </div>
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">
            Try refreshing the page or check your browser console for more details.
            If you're an admin, verify your session is active by checking the "Current user" section above.
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-medium">Users</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.userCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Total registered users</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-medium">Partnerships</CardTitle>
              <Heart className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.partnershipCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Active connections</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-medium">Active Users</CardTitle>
              <UserCheck className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.activeUserCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Users active in last 7 days</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-medium">Recent Journals</CardTitle>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.recentJournalCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Entries in last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-muted/50 p-4 rounded-md text-sm mt-4">
        <p className="text-xs text-muted-foreground text-right">
          Last updated: {stats?.timestamp ? formatDate(stats.timestamp) : 'N/A'}
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;