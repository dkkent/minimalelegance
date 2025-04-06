import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  Pencil, 
  Key, 
  UserX, 
  ShieldCheck, 
  Shield, 
  UserMinus 
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface User {
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

interface UserManagementProps {
  currentUserRole: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUserRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [editedRole, setEditedRole] = useState<'user' | 'admin' | 'superadmin'>('user');
  
  const isSuperAdmin = currentUserRole === 'superadmin';
  
  // Fetch users
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['/api/admin/users'],
    retry: 1
  });
  
  // Filter users based on search term
  const filteredUsers = searchTerm 
    ? users.filter((user: User) => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : users;
  
  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: (userData: { id: number, data: any }) => 
      apiRequest(`/api/admin/users/${userData.id}`, { 
        method: 'PATCH', 
        data: userData.data 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User updated",
        description: "User information has been updated successfully."
      });
      setEditUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating user",
        description: error.message || "There was a problem updating the user.",
        variant: "destructive"
      });
    }
  });
  
  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: (data: { id: number, newPassword: string }) => 
      apiRequest(`/api/admin/users/${data.id}/reset-password`, { 
        method: 'POST', 
        data: { newPassword: data.newPassword } 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Password reset",
        description: "User password has been reset successfully."
      });
      setResetPasswordUser(null);
      setNewPassword('');
    },
    onError: (error: any) => {
      toast({
        title: "Error resetting password",
        description: error.message || "There was a problem resetting the password.",
        variant: "destructive"
      });
    }
  });
  
  // Delete user mutation (superadmin only)
  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => 
      apiRequest(`/api/admin/users/${userId}`, { 
        method: 'DELETE' 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User deleted",
        description: "User has been permanently deleted."
      });
      setDeleteUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting user",
        description: error.message || "There was a problem deleting the user.",
        variant: "destructive"
      });
    }
  });
  
  const handleEditOpen = (user: User) => {
    setEditUser(user);
    setEditedName(user.name);
    setEditedEmail(user.email);
    setEditedRole(user.role);
  };
  
  const handleUpdateUser = () => {
    if (!editUser) return;
    
    const updateData: any = {};
    
    if (editedName !== editUser.name) updateData.name = editedName;
    if (editedEmail !== editUser.email) updateData.email = editedEmail;
    if (editedRole !== editUser.role && isSuperAdmin) updateData.role = editedRole;
    
    // Only proceed if there are changes
    if (Object.keys(updateData).length > 0) {
      updateUserMutation.mutate({ id: editUser.id, data: updateData });
    } else {
      setEditUser(null);
    }
  };
  
  const handleResetPassword = () => {
    if (!resetPasswordUser || !newPassword || newPassword.length < 8) return;
    
    resetPasswordMutation.mutate({ 
      id: resetPasswordUser.id, 
      newPassword 
    });
  };
  
  const handleDeleteConfirm = () => {
    if (!deleteUser) return;
    deleteUserMutation.mutate(deleteUser.id);
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full max-w-sm mb-6" />
        <div className="space-y-2">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-md">
        <p className="font-semibold">Error loading users</p>
        <p className="text-sm">Please try again later or contact the system administrator.</p>
      </div>
    );
  }
  
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <Badge variant="default" className="bg-destructive">Super Admin</Badge>;
      case 'admin':
        return <Badge variant="default" className="bg-primary">Admin</Badge>;
      default:
        return <Badge variant="outline">User</Badge>;
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between mb-6">
        <Input 
          type="search" 
          placeholder="Search users..." 
          className="max-w-sm" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No users match your search' : 'No users found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user: User) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    {user.partnerId ? (
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                        Partnered
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                        {user.isIndividual ? 'Individual' : 'Awaiting partner'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditOpen(user)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit user
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setResetPasswordUser(user)}>
                          <Key className="h-4 w-4 mr-2" />
                          Reset password
                        </DropdownMenuItem>
                        {isSuperAdmin && user.role !== 'superadmin' && (
                          <DropdownMenuItem onClick={() => setDeleteUser(user)}>
                            <UserX className="h-4 w-4 mr-2" />
                            Delete user
                          </DropdownMenuItem>
                        )}
                        {isSuperAdmin && user.role !== 'superadmin' && (
                          <DropdownMenuItem 
                            onClick={() => {
                              const newRole = user.role === 'admin' ? 'user' : 'admin';
                              updateUserMutation.mutate({ 
                                id: user.id, 
                                data: { role: newRole } 
                              });
                            }}
                          >
                            {user.role === 'admin' ? (
                              <>
                                <UserMinus className="h-4 w-4 mr-2" />
                                Remove admin
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="h-4 w-4 mr-2" />
                                Make admin
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                value={editedName} 
                onChange={(e) => setEditedName(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={editedEmail} 
                onChange={(e) => setEditedEmail(e.target.value)} 
              />
            </div>
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={editedRole} 
                  onValueChange={(value: any) => setEditedRole(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={(open) => !open && setResetPasswordUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetPasswordUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input 
                id="newPassword" 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="Minimum 8 characters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordUser(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleResetPassword} 
              disabled={resetPasswordMutation.isPending || newPassword.length < 8}
            >
              {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete User Confirmation Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteUser?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-destructive">
              All user data including relationships, responses, and journal entries will be permanently deleted.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm} 
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;