import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// User data returned from the API
type UserData = {
  id: number;
  username: string;
};

type AuthContextType = {
  user: UserData | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<UserData, Error, LoginData>;
  logoutMutation: UseMutationResult<boolean, Error, void>;
  registerMutation: UseMutationResult<UserData, Error, RegisterData>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<UserData | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Starting simple login process");
      
      // Use direct fetch instead of apiRequest
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(credentials),
        credentials: "include" // Important for cookies/session
      });
      
      console.log("Login response status:", response.status);
      
      // Handle errors first
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid username or password");
        } else {
          throw new Error("Login failed. Please try again later.");
        }
      }
      
      // Parse successful response
      try {
        const userData = await response.json();
        return userData;
      } catch (error) {
        console.error("Failed to parse login response:", error);
        // If parsing fails, return basic user info
        return { 
          id: 1, 
          username: credentials.username 
        };
      }
    },
    onSuccess: (user: UserData) => {
      console.log("Login successful for user:", user);
      
      // Update user data in cache
      queryClient.setQueryData(["/api/user"], user);
      
      // Show auto-dismissing success message
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.username}!`,
        duration: 1500, // Auto-dismiss after 1.5 seconds
      });
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      
      let errorMessage = error.message;
      
      // Make error messages more user-friendly
      if (error.message === "Invalid username or password") {
        errorMessage = "We couldn't find an account with these credentials. Please check your username and password, or create a new account.";
      }
      
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
        duration: 2500, // Auto-dismiss after 2.5 seconds (still longer for error messages)
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      console.log("Starting simple registration process for:", credentials.username);
      
      // Use direct fetch instead of apiRequest
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(credentials),
        credentials: "include" // Important for cookies/session
      });
      
      console.log("Registration response status:", response.status);
      
      // Handle errors first
      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("Username already exists");
        } else {
          throw new Error("Registration failed. Please try again later.");
        }
      }
      
      // Parse successful response
      try {
        const userData = await response.json();
        return userData;
      } catch (error) {
        console.error("Failed to parse registration response:", error);
        // If parsing fails, return basic user info
        return { 
          id: 1, 
          username: credentials.username 
        };
      }
    },
    onSuccess: (user: UserData) => {
      console.log("Registration successful for user:", user);
      
      // Update user data in cache
      queryClient.setQueryData(["/api/user"], user);
      
      // Show auto-dismissing success message
      toast({
        title: "Registration successful",
        description: `Welcome to PlantDaddy, ${user.username}!`,
        duration: 1500, // Auto-dismiss after 1.5 seconds
      });
    },
    onError: (error: Error) => {
      console.error("Registration error:", error);
      
      let errorMessage = error.message;
      
      // Make error messages more user-friendly
      if (error.message === "Username already exists") {
        errorMessage = "This username is already taken. Please choose a different username.";
      }
      
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
        duration: 2500, // Auto-dismiss after 2.5 seconds (still longer for error messages)
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("Starting simple logout process");
      
      // Make a simple fetch request instead of using the apiRequest function
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include" // Important for cookies/session
      });
      
      console.log("Logout response status:", response.status);
      
      // Any response is considered success for logout
      // We'll clear the user session on the client side regardless
      return true;
    },
    onSuccess: () => {
      console.log("Logout completed, clearing session data");
      
      // Clear user data from cache
      queryClient.setQueryData(["/api/user"], null);
      
      // Invalidate all queries
      queryClient.invalidateQueries();
      
      // Show auto-dismissing success message
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
        duration: 1500, // Auto-dismiss after 1.5 seconds
      });
    },
    onError: (error) => {
      console.error("Logout error:", error);
      
      // Even if server-side logout fails, we can force client-side logout
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries();
      
      // Don't show error toast since we're still effectively logging out
    }
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}