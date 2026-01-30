import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useHouseholds } from "@/hooks/use-households";
import { useHouseholdContext } from "@/hooks/use-household-context";
import { Loader2, Home, UserPlus } from "lucide-react";

export default function HouseholdOnboarding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createHousehold, joinHousehold } = useHouseholds();
  const { refreshHouseholds } = useHouseholdContext();

  const [householdName, setHouseholdName] = useState(
    `${user?.username ?? "My"}'s Home`
  );
  const [inviteCode, setInviteCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreate = async () => {
    const name = householdName.trim();
    if (!name) return;

    setIsCreating(true);
    createHousehold.mutate(name, {
      onSuccess: async () => {
        await refreshHouseholds();
        toast({
          title: "Household created",
          description: `Welcome to ${name}!`,
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Failed to create household",
          description: error.message,
          variant: "destructive",
        });
        setIsCreating(false);
      },
    });
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;

    setIsJoining(true);
    joinHousehold.mutate(inviteCode.trim(), {
      onSuccess: async (data: any) => {
        await refreshHouseholds();
        toast({
          title: "Joined household",
          description: `You are now a member of ${data.household?.name ?? "the household"}`,
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Failed to join household",
          description: error.message,
          variant: "destructive",
        });
        setIsJoining(false);
      },
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Home className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-heading">Welcome to PlantDaddy</h1>
          <p className="text-muted-foreground">
            Set up your household to start tracking your plants, or join an existing one.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create a Household</CardTitle>
            <CardDescription>
              Start fresh with your own household for tracking plants.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Household name"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
            />
            <Button
              onClick={handleCreate}
              disabled={!householdName.trim() || isCreating}
              className="w-full"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Home className="h-4 w-4 mr-2" />
              )}
              Create My Household
            </Button>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <div className="flex-1 border-t" />
          <span className="text-sm text-muted-foreground">or</span>
          <div className="flex-1 border-t" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Join a Household</CardTitle>
            <CardDescription>
              Enter an invite code from someone who already has a household.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Enter invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="font-mono tracking-wider"
            />
            <Button
              onClick={handleJoin}
              disabled={!inviteCode.trim() || isJoining}
              variant="outline"
              className="w-full"
            >
              {isJoining ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Join Household
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
