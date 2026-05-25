import {
  useEffect,
  useState,
  useRef,
} from "react";

import * as faceapi from "face-api.js";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  Button,
} from "@/components/ui/button";

import {
  Badge,
} from "@/components/ui/badge";



import {
  Send,
  MapPin,
  Navigation,
  Clock,
  Crosshair,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Camera,
  Upload,
  User,
  ScanFace,
} from "lucide-react";

import {
  formatDistance,
  calculateDistance,
} from "@/lib/geo";

import {
  soldiers as knownSoldiers,
} from "@/data/soldiers";

interface SoldierLocation {
  id: string;

  codename: string;

  latitude: number;

  longitude: number;

  status: string;

  lastSeen?: Date;
}

interface DroneVerificationModalProps {
  isOpen: boolean;

  onClose: () => void;

  soldier: SoldierLocation | null;

  onInitiateVerification: () => void;

  verificationStatus:
    | "idle"
    | "dispatching"
    | "inProgress"
    | "complete"
    | "failed";

  trackerLocation?: {
    latitude: number;
    longitude: number;
  };
}

export default function DroneVerificationModal({
  isOpen,
  onClose,
  soldier,
  onInitiateVerification,
  verificationStatus,
  trackerLocation,
}: DroneVerificationModalProps) {
  const [
    modelsLoaded,
    setModelsLoaded,
  ] = useState(false);

  const [
    selectedImage,
    setSelectedImage,
  ] = useState<string | null>(
    null
  );

  const [
    verifying,
    setVerifying,
  ] = useState(false);

  const [
    verificationResult,
    setVerificationResult,
  ] = useState<{
    matched: boolean;

    confidence: number;

    soldier?: {
      codename: string;
      name: string;
      rank: string;
      image: string;
    };
  } | null>(null);

  const [
    progress,
    setProgress,
  ] = useState(0);

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

const distance =
  soldier &&
  trackerLocation
    ? calculateDistance(
        trackerLocation.latitude,
        trackerLocation.longitude,
        soldier.latitude,
        soldier.longitude
      )
    : null;

// LOAD MODELS
useEffect(() => {
  const loadModels =
    async () => {
      try {
        await Promise.all([
          faceapi.nets
            .tinyFaceDetector
            .loadFromUri(
              "/models"
            ),

          faceapi.nets
            .faceLandmark68Net
            .loadFromUri(
              "/models"
            ),

          faceapi.nets
            .faceRecognitionNet
            .loadFromUri(
              "/models"
            ),
        ]);

        setModelsLoaded(
          true
        );
      } catch (err) {
        console.error(
          err
        );
      }
    };

  loadModels();
}, []);

// IMPORTANT:
// KEEP THIS BELOW ALL HOOKS
if (!soldier)
  return null;

  const getDescriptor =
  async (
    imageUrl: string
  ) => {
    const img =
      new Image();

    img.src =
      imageUrl;

    await new Promise(
      (resolve) => {
        img.onload =
          resolve;
      }
    );

    const detection =
      await faceapi
        .detectSingleFace(
          img,
          new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

    return detection;
  };

  const handleVerify =
    async () => {
      if (
        !selectedImage ||
        !modelsLoaded
      )
        return;

      try {
        setVerifying(true);

        setProgress(10);

        const uploadedFace =
          await getDescriptor(
            selectedImage
          );

        if (
          !uploadedFace
        ) {
          setVerificationResult(
            {
              matched:
                false,

              confidence: 0,
            }
          );

          setVerifying(
            false
          );

          return;
        }

        setProgress(40);

        let bestMatch:
          | any
          | null = null;

        let bestDistance =
          Infinity;

        for (const known of knownSoldiers) {
          const knownFace =
            await getDescriptor(
              known.image
            );

          if (
            !knownFace
          )
            continue;

          const distance =
            faceapi.euclideanDistance(
              uploadedFace.descriptor,
              knownFace.descriptor
            );

          if (
            distance <
            bestDistance
          ) {
            bestDistance =
              distance;

            bestMatch =
              known;
          }
        }

        setProgress(90);

        const confidence =
          Math.max(
            0,
            Math.round(
              (1 -
                bestDistance) *
                100
            )
          );

        if (
          bestMatch &&
          confidence >
            45
        ) {
          setVerificationResult(
            {
              matched:
                true,

              confidence,

              soldier:
                bestMatch,
            }
          );
        } else {
          setVerificationResult(
            {
              matched:
                false,

              confidence,
            }
          );
        }

        setProgress(100);

        setVerifying(
          false
        );
      } catch (
        err
      ) {
        console.error(
          err
        );

        setVerifying(
          false
        );

        setVerificationResult(
          {
            matched:
              false,

            confidence: 0,
          }
        );
      }
    };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(
        open
      ) =>
        !open &&
        onClose()
      }
    >
      <DialogContent className="sm:max-w-2xl bg-card border-border tactical-corners">
        <div className="corner-tr" />

        <div className="corner-bl" />

        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/30">
              <Crosshair className="h-5 w-5 text-primary" />
            </div>

            <div>
              <DialogTitle className="text-base font-mono uppercase tracking-wider">
                Drone Verification
              </DialogTitle>

              <DialogDescription className="text-xs font-mono text-muted-foreground">
                AI-powered facial recognition
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* TARGET INFO */}
          <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="status-dot status-dot-online animate-status-pulse" />

                <div>
                  <h4 className="text-sm font-mono font-semibold">
                    {
                      soldier.codename
                    }
                  </h4>

                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Target Unit
                  </p>
                </div>
              </div>

              <Badge className="badge-tactical badge-online">
                READY
              </Badge>
            </div>

            <div className="divider-tactical !my-3" />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />

                <div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
                    Position
                  </div>

                  <div className="text-xs font-mono tabular-nums">
                    {soldier.latitude.toFixed(
                      4
                    )}
                    °
                    ,
                    {" "}
                    {soldier.longitude.toFixed(
                      4
                    )}
                    °
                  </div>
                </div>
              </div>

              {distance !==
                null && (
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary" />

                  <div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
                      Distance
                    </div>

                    <div className="text-xs font-mono text-primary font-semibold">
                      {formatDistance(
                        distance
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* IMAGE INPUT */}
          <div className="space-y-3">
            <input
              ref={
                fileInputRef
              }
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(
                e
              ) => {
                const file =
                  e.target
                    .files?.[0];

                if (
                  file
                ) {
                  const reader =
                    new FileReader();

                  reader.onload =
                    () => {
                      setSelectedImage(
                        reader.result as string
                      );

                      setVerificationResult(
                        null
                      );
                    };

                  reader.readAsDataURL(
                    file
                  );
                }
              }}
            />

            {!selectedImage ? (
              <div
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 transition-all"
              >
                <Camera className="h-10 w-10 mx-auto mb-4 text-primary" />

                <p className="font-mono text-sm uppercase tracking-wider mb-2">
                  Upload Verification Image
                </p>

                <p className="text-xs text-muted-foreground">
                  Drone snapshot or target photo
                </p>
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img
                  src={
                    selectedImage
                  }
                  alt="Verification"
                  className="w-full h-72 object-cover"
                />

                {/* HUD */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary" />

                  <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary" />

                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary" />

                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary" />
                </div>
              </div>
            )}
          </div>

          {/* VERIFYING */}
          {verifying && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-primary font-mono text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />

                ANALYZING FACE...
              </div>

             <div className="w-full h-2 bg-muted rounded overflow-hidden">
  <div
    className="h-full bg-primary transition-all duration-300"
    style={{
      width: `${progress}%`,
    }}
  />
</div>
            </div>
          )}

          {/* RESULTS */}
          {verificationResult && (
            <>
              {verificationResult.matched ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/10">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />

                      <div>
                        <p className="text-sm font-mono font-semibold text-green-500">
                          Identity Verified
                        </p>

                        <p className="text-xs text-muted-foreground">
                          Match found in personnel database
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-lg border border-border/50 flex items-center gap-4">
                    <img
                      src={
                        verificationResult
                          .soldier
                          ?.image
                      }
                      className="w-20 h-20 rounded-lg object-cover border border-primary/30"
                    />

                    <div className="space-y-1">
                      <div className="text-lg font-mono font-bold text-primary">
                        {
                          verificationResult
                            .soldier
                            ?.codename
                        }
                      </div>

                      <div className="text-sm">
                        {
                          verificationResult
                            .soldier
                            ?.name
                        }
                      </div>

                      <div className="text-xs text-muted-foreground uppercase tracking-wider">
                        {
                          verificationResult
                            .soldier
                            ?.rank
                        }
                      </div>

                      <Badge className="badge-tactical badge-online mt-2">
                        {
                          verificationResult.confidence
                        }
                        %
                        CONFIDENCE
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="alert-critical rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive" />

                    <div>
                      <p className="text-sm font-mono font-semibold text-destructive">
                        No Match Found
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Unknown individual or low confidence
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => {
  setSelectedImage(null);

  setVerificationResult(null);

  setProgress(0);

  onClose();
}}
            className="flex-1 font-mono text-xs uppercase tracking-wider border-border/60"
          >
            Close
          </Button>

          <Button
            onClick={
              handleVerify
            }
            disabled={
              !selectedImage ||
              !modelsLoaded ||
              verifying
            }
            className="flex-1 btn-tactical bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
          >
            <ScanFace className="h-4 w-4 mr-2" />

            Verify Face
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}