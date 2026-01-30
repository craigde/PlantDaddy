import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, ShieldAlert, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface AdminUser {
  id: number;
  username: string;
  isAdmin: boolean | null;
  plantCount: number;
  householdCount: number;
  locationCount: number;
}

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  const { data: users, isLoading, error } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: (data) => {
      toast({ title: "User deleted", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setUserToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (error) {
    const is403 = (error as any)?.message?.includes("403") || (error as any)?.message?.includes("Admin");
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <ShieldAlert className="h-12 w-12 mx-auto text-destructive" />
            <p className="text-lg font-medium">
              {is403 ? "Admin access required" : "Failed to load admin panel"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is403
                ? "Your account does not have admin privileges."
                : String((error as Error).message)}
            </p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to app
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage user accounts</p>
        </div>
        <Link href="/settings">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users ({users?.length ?? 0})</CardTitle>
          <CardDescription>
            Delete orphan or test accounts. All related data (plants, locations,
            households, health records, care activities, notification settings,
            device tokens) will be permanently removed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead className="text-center">Plants</TableHead>
                  <TableHead className="text-center">Households</TableHead>
                  <TableHead className="text-center">Locations</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-muted-foreground">
                      {user.id}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{user.username}</span>
                      {user.isAdmin && (
                        <Badge variant="secondary" className="ml-2">
                          admin
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{user.plantCount}</TableCell>
                    <TableCell className="text-center">{user.householdCount}</TableCell>
                    <TableCell className="text-center">{user.locationCount}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={!!user.isAdmin}
                        onClick={() => setUserToDelete(user)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {users?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user "{userToDelete?.username}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user account and all associated data:
              {userToDelete && (
                <span className="block mt-2 font-mono text-xs">
                  {userToDelete.plantCount} plants, {userToDelete.locationCount} locations,{" "}
                  {userToDelete.householdCount} household memberships, plus all health records,
                  care activities, notification settings, and device tokens.
                </span>
              )}
              <span className="block mt-2 font-semibold">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (userToDelete) {
                  deleteMutation.mutate(userToDelete.id);
                }
              }}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
