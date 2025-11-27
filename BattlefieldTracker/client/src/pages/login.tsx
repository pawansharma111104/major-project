import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginCredentials } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface LoginPageProps {
  onLoginSuccess: (soldier: { id: string; codename: string; role: string }) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState<"soldier" | "tracker">("soldier");
  const { toast } = useToast();

  const form = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      codename: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginCredentials) {
    setIsLoading(true);
    try {
      const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
      const endpoint = apiBase
        ? `${apiBase}/api/auth/${isRegister ? "register" : "login"}`
        : isRegister
        ? "/api/auth/register"
        : "/api/auth/login";
      const payload = isRegister ? { ...data, role } : data;
      
      const result = await apiRequest("POST", endpoint, payload);
      
      toast({
        title: isRegister ? "Registration Successful" : "Login Successful",
        description: `Welcome, ${result.codename}`,
      });
      
      onLoginSuccess(result);
    } catch (error: any) {
      toast({
        title: "Authentication Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl font-bold">
            Battlefield Tracker
          </CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            {isRegister ? "Create New Account" : "Tactical Authentication System"}
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="codename"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codename</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter codename"
                        className="h-12"
                        data-testid="input-codename"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Enter password"
                        className="h-12"
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isRegister && (
                <div className="space-y-2">
                  <FormLabel>Role</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={role === "soldier" ? "default" : "outline"}
                      onClick={() => setRole("soldier")}
                      data-testid="button-role-soldier"
                    >
                      Soldier
                    </Button>
                    <Button
                      type="button"
                      variant={role === "tracker" ? "default" : "outline"}
                      onClick={() => setRole("tracker")}
                      data-testid="button-role-tracker"
                    >
                      Tracker
                    </Button>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12"
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading ? "Processing..." : isRegister ? "Register" : "Login"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsRegister(!isRegister)}
                data-testid="button-toggle-mode"
              >
                {isRegister ? "Already have an account? Login" : "New user? Register"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
