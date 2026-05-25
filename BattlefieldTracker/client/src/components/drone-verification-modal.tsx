import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface DroneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  soldier: {
    id: string;
    codename: string;
    latitude: number;
    longitude: number;
  } | null;
  onInitiateVerification: (soldierId: string) => void;
  verificationStatus: "idle" | "pending" | "verified" | "failed" | null;
}

export default function DroneVerificationModal({
  isOpen,
  onClose,
  soldier,
  onInitiateVerification,
  verificationStatus,
}: DroneVerificationModalProps) {
  if (!soldier) return null;

  const statusConfig = {
    idle: {
      icon: Shield,
      color: "default" as const,
      label: "Ready",
    },
    pending: {
      icon: Loader2,
      color: "default" as const,
      label: "Verifying...",
      animate: "animate-spin",
    },
    verified: {
      icon: CheckCircle2,
      color: "default" as const,
      label: "Verified",
    },
    failed: {
      icon: XCircle,
      color: "destructive" as const,
      label: "Verification Failed",
    },
  };

  const currentStatus = verificationStatus || "idle";
  const config = statusConfig[currentStatus];
  const StatusIcon = config.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="dialog-drone-verification">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Drone Face Verification
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Target Soldier Info */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="text-sm text-muted-foreground">Target Soldier</div>
            <div className="text-lg font-semibold">{soldier.codename}</div>
            <div className="text-xs font-mono text-muted-foreground">
              {soldier.latitude.toFixed(6)}°, {soldier.longitude.toFixed(6)}°
            </div>
          </div>

          {/* Simulated Camera Feed */}
          <div className="aspect-video bg-muted rounded-lg border border-border flex items-center justify-center overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-muted to-background opacity-50" />
            <div className="relative text-center space-y-2">
              <Shield className="h-16 w-16 mx-auto text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                Simulated Drone Camera Feed
              </div>
              <div className="text-xs text-muted-foreground/60 font-mono">
                Production: OpenCV + DeepFace
              </div>
            </div>
          </div>

          {/* Verification Status */}
          <div
            className="h-12 flex items-center justify-center gap-2 rounded-lg"
            style={{
              backgroundColor: currentStatus === "verified"
                ? "hsl(var(--chart-2) / 0.1)"
                : currentStatus === "failed"
                ? "hsl(var(--destructive) / 0.1)"
                : "hsl(var(--muted))",
            }}
            data-testid="verification-status"
          >
            <StatusIcon
              className={`h-5 w-5 ${config.animate || ""}`}
              style={{
                color: currentStatus === "verified"
                  ? "hsl(var(--chart-2))"
                  : currentStatus === "failed"
                  ? "hsl(var(--destructive))"
                  : "hsl(var(--foreground))",
              }}
            />
            <span className="font-semibold">{config.label}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => onInitiateVerification(soldier.id)}
              disabled={currentStatus === "pending"}
              data-testid="button-initiate-verification"
            >
              {currentStatus === "pending" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Initiate Verification"
              )}
            </Button>
            <Button variant="outline" onClick={onClose} data-testid="button-close-modal">
              Close
            </Button>
          </div>

          {/* Simulation Info */}
          <div className="text-xs text-muted-foreground text-center p-2 bg-muted/50 rounded">
            <p>
              Simulated verification process (2-3 seconds)
            </p>
            <p className="mt-1">
              Production: Drone GPS → Face Capture → DeepFace Matching
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
