import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, FilterX, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';

interface AdminLog {
  id: number;
  adminId: number;
  adminName: string;
  action: string;
  resourceType: string;
  resourceId: number | null;
  details: string;
  timestamp: string;
}

const AdminLogs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  
  // Fetch logs with pagination
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/admin/logs', actionFilter, date ? format(date, 'yyyy-MM-dd') : null],
    retry: 1
  });

  const logs: AdminLog[] = data?.logs || [];
  
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resourceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = !actionFilter || log.action === actionFilter;
    
    const matchesDate = !date || 
      format(new Date(log.timestamp), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    
    return matchesSearch && matchesAction && matchesDate;
  });
  
  const handleClearFilters = () => {
    setSearchTerm('');
    setActionFilter(null);
    setDate(undefined);
  };
  
  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Create</Badge>;
      case 'update':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Update</Badge>;
      case 'delete':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Delete</Badge>;
      case 'login':
        return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Login</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy HH:mm:ss');
  };
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-4 mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-2">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-md">
        <p className="font-semibold">Error loading admin logs</p>
        <p className="text-sm">Please try again later or contact the system administrator.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 mb-6">
        <Input 
          type="search" 
          placeholder="Search logs..." 
          className="max-w-xs" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <Select value={actionFilter || ''} onValueChange={(value) => setActionFilter(value || null)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="login">Login</SelectItem>
          </SelectContent>
        </Select>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={date ? "text-primary" : ""}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, 'PPP') : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        
        {(searchTerm || actionFilter || date) && (
          <Button variant="ghost" onClick={handleClearFilters}>
            <FilterX className="h-4 w-4 mr-2" />
            Clear filters
          </Button>
        )}
      </div>
      
      <div className="rounded-md border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead className="w-[250px]">Time</TableHead>
              <TableHead className="w-[80px]">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No logs found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.adminName}</TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell>
                    {log.resourceType} {log.resourceId && <span className="text-muted-foreground">#{log.resourceId}</span>}
                  </TableCell>
                  <TableCell>{formatDate(log.timestamp)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">View details</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[300px]">
                        <div className="p-4">
                          <h4 className="font-medium mb-2">Action Details</h4>
                          <p className="text-sm whitespace-pre-wrap">{log.details}</p>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminLogs;