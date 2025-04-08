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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  Pencil,
  Trash,
  Plus,
  Tag
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

interface ConversationStarter {
  id: number;
  content: string;
  themeId: number;
  themeName?: string;
  createdAt: string;
  createdBy: number | null;
  createdByName?: string;
  isGlobal: boolean;
}

interface Theme {
  id: number;
  name: string;
  color: string;
}

const StarterManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [themeFilter, setThemeFilter] = useState<number | null>(null);
  const [editStarter, setEditStarter] = useState<ConversationStarter | null>(null);
  const [deleteStarter, setDeleteStarter] = useState<ConversationStarter | null>(null);
  const [newStarter, setNewStarter] = useState<{ content: string; themeId: number | null; isGlobal: boolean }>({
    content: '',
    themeId: null,
    isGlobal: true
  });
  const [showNewDialog, setShowNewDialog] = useState(false);
  
  // Fetch conversation starters
  const { data: startersData, isLoading: loadingStarters } = useQuery({
    queryKey: ['/api/admin/conversation-starters'],
    retry: 1
  });
  
  // Fetch themes
  const { data: themesData, isLoading: loadingThemes } = useQuery({
    queryKey: ['/api/admin/themes'],
    retry: 1
  });
  
  const starters: ConversationStarter[] = startersData?.starters || [];
  const themes: Theme[] = themesData?.themes || [];
  
  // Filter starters based on search term and theme filter
  const filteredStarters = starters.filter(starter => {
    const matchesSearch = searchTerm === '' || 
      starter.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (starter.themeName && starter.themeName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTheme = themeFilter === null || starter.themeId === themeFilter;
    
    return matchesSearch && matchesTheme;
  });
  
  // Create starter mutation
  const createStarterMutation = useMutation({
    mutationFn: (data: { content: string; themeId: number; isGlobal: boolean }) => 
      apiRequest('/api/admin/conversation-starters', { 
        method: 'POST', 
        data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/conversation-starters'] });
      toast({
        title: "Starter created",
        description: "New conversation starter has been created successfully."
      });
      setShowNewDialog(false);
      setNewStarter({
        content: '',
        themeId: null,
        isGlobal: true
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating starter",
        description: error.message || "There was a problem creating the conversation starter.",
        variant: "destructive"
      });
    }
  });
  
  // Update starter mutation
  const updateStarterMutation = useMutation({
    mutationFn: (data: { id: number; content: string; themeId: number; isGlobal: boolean }) => 
      apiRequest(`/api/admin/conversation-starters/${data.id}`, { 
        method: 'PATCH', 
        data: {
          content: data.content,
          themeId: data.themeId,
          isGlobal: data.isGlobal
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/conversation-starters'] });
      toast({
        title: "Starter updated",
        description: "Conversation starter has been updated successfully."
      });
      setEditStarter(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating starter",
        description: error.message || "There was a problem updating the conversation starter.",
        variant: "destructive"
      });
    }
  });
  
  // Delete starter mutation
  const deleteStarterMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/admin/conversation-starters/${id}`, { 
        method: 'DELETE' 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/conversation-starters'] });
      toast({
        title: "Starter deleted",
        description: "Conversation starter has been deleted successfully."
      });
      setDeleteStarter(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting starter",
        description: error.message || "There was a problem deleting the conversation starter.",
        variant: "destructive"
      });
    }
  });
  
  const handleEditOpen = (starter: ConversationStarter) => {
    setEditStarter(starter);
  };
  
  const handleUpdateStarter = () => {
    if (!editStarter || !editStarter.themeId) return;
    
    updateStarterMutation.mutate({
      id: editStarter.id,
      content: editStarter.content,
      themeId: editStarter.themeId,
      isGlobal: editStarter.isGlobal
    });
  };
  
  const handleCreateStarter = () => {
    if (!newStarter.content || !newStarter.themeId) return;
    
    createStarterMutation.mutate({
      content: newStarter.content,
      themeId: newStarter.themeId,
      isGlobal: newStarter.isGlobal
    });
  };
  
  const handleDeleteConfirm = () => {
    if (!deleteStarter) return;
    deleteStarterMutation.mutate(deleteStarter.id);
  };
  
  const getThemeColor = (themeId: number | string) => {
    // Handle the case where themeId comes as a string and needs to be converted
    const themeIdNum = typeof themeId === 'string' ? parseInt(themeId) : themeId;
    
    // First check if we have a direct match on ID
    let theme = themes.find(t => t.id === themeIdNum);
    
    // If no match found, try to find by theme name (some starters might have theme as a string name)
    if (!theme && typeof themeId === 'string') {
      theme = themes.find(t => t.name.toLowerCase() === themeId.toLowerCase());
    }
    
    return theme?.color || '#CBD5E0';
  };
  
  const getThemeBadge = (themeId: number | string) => {
    // Handle the case where themeId comes as a string and needs to be converted
    const themeIdNum = typeof themeId === 'string' ? parseInt(themeId) : themeId;
    
    // First check if we have a direct match on ID
    let theme = themes.find(t => t.id === themeIdNum);
    
    // If no match found, try to find by theme name (some starters might have theme as a string name)
    if (!theme && typeof themeId === 'string') {
      theme = themes.find(t => t.name.toLowerCase() === themeId.toLowerCase());
    }
    
    // If still no match, check if themeName is available on the starter
    if (!theme) {
      // This is a fallback that uses the Unknown badge
      return <Badge variant="outline">Unknown</Badge>;
    }
    
    return (
      <Badge
        style={{ 
          backgroundColor: `${theme.color}20`, 
          color: theme.color,
          borderColor: `${theme.color}40`
        }}
        variant="outline"
      >
        {theme.name}
      </Badge>
    );
  };
  
  if (loadingStarters || loadingThemes) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-2">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <Input 
            type="search" 
            placeholder="Search starters..." 
            className="w-64" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <Select 
            value={themeFilter?.toString() || 'all'} 
            onValueChange={(value) => setThemeFilter(value === 'all' ? null : parseInt(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All themes</SelectItem>
              {themes.map(theme => (
                <SelectItem key={theme.id} value={theme.id.toString()}>
                  {theme.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Starter
        </Button>
      </div>
      
      <div className="rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Content</TableHead>
              <TableHead>Theme</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStarters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {searchTerm || themeFilter ? 'No starters match your search' : 'No conversation starters found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredStarters.map((starter) => (
                <TableRow key={starter.id}>
                  <TableCell className="font-medium">{starter.content}</TableCell>
                  <TableCell>{getThemeBadge(starter.themeId)}</TableCell>
                  <TableCell>
                    {starter.createdByName || 
                      <span className="text-muted-foreground italic">System</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={starter.isGlobal ? "default" : "outline"}>
                      {starter.isGlobal ? 'Global' : 'Personal'}
                    </Badge>
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
                        <DropdownMenuItem onClick={() => handleEditOpen(starter)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteStarter(starter)}>
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Create Starter Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Conversation Starter</DialogTitle>
            <DialogDescription>
              Add a new conversation starter to the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-content">Question or Prompt</Label>
              <Textarea 
                id="new-content" 
                placeholder="Enter the conversation starter question or prompt"
                value={newStarter.content}
                onChange={(e) => setNewStarter({...newStarter, content: e.target.value})}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-theme">Theme</Label>
              <Select 
                value={newStarter.themeId?.toString() || ''} 
                onValueChange={(value) => setNewStarter({...newStarter, themeId: parseInt(value)})}
              >
                <SelectTrigger id="new-theme">
                  <SelectValue placeholder="Select a theme" />
                </SelectTrigger>
                <SelectContent>
                  {themes.map(theme => (
                    <SelectItem key={theme.id} value={theme.id.toString()}>
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: theme.color }} 
                        />
                        {theme.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="new-global"
                className="rounded border-gray-300 text-primary focus:ring-primary"
                checked={newStarter.isGlobal}
                onChange={(e) => setNewStarter({...newStarter, isGlobal: e.target.checked})}
              />
              <Label htmlFor="new-global">Make available to all users (global)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowNewDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateStarter} 
              disabled={createStarterMutation.isPending || !newStarter.content || !newStarter.themeId}
            >
              {createStarterMutation.isPending ? 'Creating...' : 'Create Starter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Starter Dialog */}
      <Dialog open={!!editStarter} onOpenChange={(open) => !open && setEditStarter(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Conversation Starter</DialogTitle>
            <DialogDescription>
              Make changes to the conversation starter.
            </DialogDescription>
          </DialogHeader>
          {editStarter && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-content">Question or Prompt</Label>
                <Textarea 
                  id="edit-content" 
                  value={editStarter.content}
                  onChange={(e) => setEditStarter({...editStarter, content: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-theme">Theme</Label>
                <Select 
                  value={editStarter.themeId.toString()} 
                  onValueChange={(value) => setEditStarter({
                    ...editStarter, 
                    themeId: parseInt(value)
                  })}
                >
                  <SelectTrigger id="edit-theme">
                    <SelectValue placeholder="Select a theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {themes.map(theme => (
                      <SelectItem key={theme.id} value={theme.id.toString()}>
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: theme.color }} 
                          />
                          {theme.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-global"
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                  checked={editStarter.isGlobal}
                  onChange={(e) => setEditStarter({...editStarter, isGlobal: e.target.checked})}
                />
                <Label htmlFor="edit-global">Make available to all users (global)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditStarter(null)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateStarter} 
              disabled={updateStarterMutation.isPending || !editStarter?.content}
            >
              {updateStarterMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Starter Confirmation Dialog */}
      <Dialog open={!!deleteStarter} onOpenChange={(open) => !open && setDeleteStarter(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation Starter</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation starter? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {deleteStarter && (
              <div className="bg-muted p-3 rounded-md">
                <p className="font-medium mb-1">{deleteStarter.content}</p>
                <div className="flex items-center mt-2">
                  <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {(() => {
                      // Use the same theme finding logic as getThemeBadge
                      const themeIdNum = typeof deleteStarter.themeId === 'string' 
                        ? parseInt(deleteStarter.themeId) 
                        : deleteStarter.themeId;
                        
                      let theme = themes.find(t => t.id === themeIdNum);
                      
                      if (!theme && typeof deleteStarter.themeId === 'string') {
                        theme = themes.find(t => t.name.toLowerCase() === deleteStarter.themeId.toLowerCase());
                      }
                      
                      return theme?.name || 'Unknown theme';
                    })()}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteStarter(null)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm} 
              disabled={deleteStarterMutation.isPending}
            >
              {deleteStarterMutation.isPending ? 'Deleting...' : 'Delete Starter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StarterManagement;