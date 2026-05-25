"use client";

import {
  useState,
  useEffect,
} from "react";

import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import {
  loginSchema,
  type LoginCredentials,
} from "@shared/schema";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Shield,
  Lock,
  User,
  Fingerprint,
  Radio,
  Crosshair,
  Activity,
  Plane,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";

import { apiRequest } from "@/lib/queryClient";

interface LoginPageProps {
  onLoginSuccess: (
    soldier: {
      id: string;
      codename: string;
      role: string;
    }
  ) => void;
}

export default function LoginPage({
  onLoginSuccess,
}: LoginPageProps) {
  const [isLoading, setIsLoading] =
    useState(false);

  const [isRegister, setIsRegister] =
    useState(false);

  const [role, setRole] =
    useState<
      | "soldier"
      | "tracker"
      | "drone"
    >("soldier");

  const [currentTime, setCurrentTime] =
    useState(new Date());

  const { toast } =
    useToast();

  // CLOCK
  useEffect(() => {
    const interval =
      setInterval(
        () =>
          setCurrentTime(
            new Date()
          ),
        1000
      );

    return () =>
      clearInterval(
        interval
      );
  }, []);

  const form =
    useForm<LoginCredentials>({
      resolver:
        zodResolver(
          loginSchema
        ),

      defaultValues: {
        codename: "",
        password: "",
      },
    });

  async function onSubmit(
    data: LoginCredentials
  ) {
    setIsLoading(true);

    try {
      const apiBase = (
        import.meta.env
          .VITE_API_URL || ""
      ).replace(/\/$/, "");

      const endpoint =
        apiBase
          ? `${apiBase}/api/auth/${
              isRegister
                ? "register"
                : "login"
            }`
          : isRegister
          ? "/api/auth/register"
          : "/api/auth/login";

      const payload =
        isRegister
          ? {
              ...data,
              role,
            }
          : data;

      const result =
        await apiRequest(
          "POST",
          endpoint,
          payload
        );

      toast({
        title: isRegister
          ? "Registration Successful"
          : "Login Successful",

        description: `Welcome, ${result.codename}`,
      });

      onLoginSuccess(
        result
      );
    } catch (
      error: unknown
    ) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Invalid credentials";

      toast({
        title:
          "Authentication Failed",

        description:
          errorMessage,

        variant:
          "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background tactical-grid p-4 relative overflow-hidden dark">
      {/* AMBIENT BG */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />

        <div className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/3 rounded-full blur-[120px]" />
      </div>

      {/* TOP BAR */}
      <div className="fixed top-0 left-0 right-0 h-10 header-tactical flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-primary animate-pulse" />

            {/* <span className="text-primary font-semibold">
              AEGIS
            </span> */}

            <span className="text-muted-foreground/60">
              DEFENSE SYSTEMS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />

            <span className="text-green-500">
              SECURE
            </span>
          </div>

          <span className="tabular-nums">
            {currentTime.toLocaleTimeString(
              "en-US",
              {
                hour12:
                  false,
              }
            )}
          </span>
        </div>
      </div>

      {/* CARD */}
      <Card className="w-full max-w-md card-tactical tactical-corners relative z-10 shadow-2xl">
        <div className="corner-tr" />

        <div className="corner-bl" />

        <CardHeader className="space-y-6 pb-4 pt-8">
          {/* LOGO */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="h-24 w-24 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30 hud-frame">
                <Shield className="h-12 w-12 text-primary" />
              </div>

              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary rounded-full animate-pulse-glow" />

              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-primary/60 rounded-full" />
            </div>
          </div>

          {/* TITLE */}
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-bold tracking-tight text-gradient">
              BATTLEFIELD TRACKER
            </h1>

            <div className="flex items-center justify-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />

              <Lock className="h-3.5 w-3.5 text-muted-foreground" />

              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-border to-transparent" />
            </div>

            <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.2em]">
              {isRegister
                ? "Create New Operative Account"
                : "Tactical Authentication Portal"}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pb-8">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(
                onSubmit
              )}
              className="space-y-5"
            >
              {/* CODENAME */}
              <FormField
                control={
                  form.control
                }
                name="codename"
                render={({
                  field,
                }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
                      <Crosshair className="h-3 w-3" />

                      Operative Codename
                    </FormLabel>

                    <FormControl>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />

                        <Input
                          {...field}
                          placeholder="Enter codename"
                          className="h-12 pl-11 bg-input/50 border-border/60 font-mono text-sm input-tactical focus-tactical placeholder:text-muted-foreground/50"
                        />
                      </div>
                    </FormControl>

                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* PASSWORD */}
              <FormField
                control={
                  form.control
                }
                name="password"
                render={({
                  field,
                }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
                      <Lock className="h-3 w-3" />

                      Security Credentials
                    </FormLabel>

                    <FormControl>
                      <div className="relative group">
                        <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />

                        <Input
                          {...field}
                          type="password"
                          placeholder="Enter password"
                          className="h-12 pl-11 bg-input/50 border-border/60 font-mono text-sm input-tactical focus-tactical placeholder:text-muted-foreground/50"
                        />
                      </div>
                    </FormControl>

                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* ROLE SELECT */}
              {isRegister && (
                <div className="space-y-3">
                  <FormLabel className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
                    <Shield className="h-3 w-3" />

                    Operative Role Assignment
                  </FormLabel>

                  <div className="grid grid-cols-3 gap-3">
                    {/* SOLDIER */}
                    <Button
                      type="button"
                      variant={
                        role ===
                        "soldier"
                          ? "default"
                          : "outline"
                      }
                      className={`h-16 flex-col gap-2 btn-tactical transition-all duration-300 ${
                        role ===
                        "soldier"
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                          : "border-border/60 hover:border-primary/50 hover:bg-primary/5"
                      }`}
                      onClick={() =>
                        setRole(
                          "soldier"
                        )
                      }
                    >
                      <User className="h-5 w-5" />

                      <span className="text-[10px] font-mono tracking-wider">
                        SOLDIER
                      </span>
                    </Button>

                    {/* TRACKER */}
                    <Button
                      type="button"
                      variant={
                        role ===
                        "tracker"
                          ? "default"
                          : "outline"
                      }
                      className={`h-16 flex-col gap-2 btn-tactical transition-all duration-300 ${
                        role ===
                        "tracker"
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                          : "border-border/60 hover:border-primary/50 hover:bg-primary/5"
                      }`}
                      onClick={() =>
                        setRole(
                          "tracker"
                        )
                      }
                    >
                      <Radio className="h-5 w-5" />

                      <span className="text-[10px] font-mono tracking-wider">
                        COMMAND
                      </span>
                    </Button>

                    {/* DRONE */}
                    <Button
                      type="button"
                      variant={
                        role ===
                        "drone"
                          ? "default"
                          : "outline"
                      }
                      className={`h-16 flex-col gap-2 btn-tactical transition-all duration-300 ${
                        role ===
                        "drone"
                          ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/25"
                          : "border-border/60 hover:border-cyan-400/50 hover:bg-cyan-500/5"
                      }`}
                      onClick={() =>
                        setRole(
                          "drone"
                        )
                      }
                    >
                      <Plane className="h-5 w-5" />

                      <span className="text-[10px] font-mono tracking-wider">
                        UAV
                      </span>
                    </Button>
                  </div>
                </div>
              )}

              {/* SUBMIT */}
              <div className="pt-3">
                <Button
                  type="submit"
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-mono uppercase tracking-widest text-xs btn-tactical relative overflow-hidden group shadow-lg shadow-primary/20"
                  disabled={
                    isLoading
                  }
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="spinner-tactical" />

                      <span>
                        Authenticating...
                      </span>
                    </div>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />

                      {isRegister
                        ? "Create Account"
                        : "Authenticate"}
                    </>
                  )}
                </Button>
              </div>

              <div className="divider-tactical" />

              {/* TOGGLE */}
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground hover:bg-muted/50 text-xs font-mono tracking-wider transition-all duration-200"
                onClick={() =>
                  setIsRegister(
                    !isRegister
                  )
                }
              >
                {isRegister
                  ? "Already registered? Login"
                  : "New operative? Register"}
              </Button>
            </form>
          </Form>

          {/* SECURITY */}
          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-muted-foreground/70 uppercase tracking-widest">
              <Lock className="h-3 w-3" />

              AES-256 Encrypted Connection
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FOOTER */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />

        <span>
          System Operational
        </span>

        <span className="text-border">
          |
        </span>

        <span>v2.4.1</span>
      </div>
    </div>
  );
}