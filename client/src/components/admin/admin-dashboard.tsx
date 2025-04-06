import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Heart, Calendar, UserCheck } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['/api/admin/dashboard'],
    retry: 1
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
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-md">
        <p className="font-semibold">Error loading dashboard data</p>
        <p className="text-sm">Please try again later or contact the system administrator.</p>
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