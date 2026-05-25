import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Shield, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background tactical-grid dark">
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-destructive/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <Card className="w-full max-w-md mx-4 card-tactical tactical-corners relative z-10">
        <div className="corner-tr" />
        <div className="corner-bl" />
        
        <CardContent className="pt-12 pb-10 px-8">
          {/* Error icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-xl bg-destructive/10 flex items-center justify-center border border-destructive/30">
                <AlertCircle className="h-10 w-10 text-destructive" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse" />
            </div>
          </div>

          {/* Error code */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-destructive/10 border border-destructive/30 rounded-md">
              <span className="text-xs font-mono text-destructive uppercase tracking-widest">Error Code</span>
            </div>
            
            <h1 className="text-5xl font-mono font-bold text-foreground">404</h1>
            
            <div className="space-y-2">
              <p className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
                Target Not Found
              </p>
              <p className="text-xs text-muted-foreground/70">
                The requested resource could not be located in this sector.
              </p>
            </div>
          </div>

          <div className="divider-tactical my-6" />

          {/* Suggestions */}
          <div className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                Possible Actions
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="text-primary">→</span>
                  Verify the URL path is correct
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">→</span>
                  Check if the page was added to router
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">→</span>
                  Return to command center
                </li>
              </ul>
            </div>

            <Button 
              variant="outline" 
              className="w-full h-11 font-mono text-xs uppercase tracking-wider border-border/60 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all"
              onClick={() => window.location.href = '/'}
            >
              <Home className="h-4 w-4 mr-2" />
              Return to Base
            </Button>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-border/50 flex items-center justify-center gap-2 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">
            <Shield className="h-3 w-3" />
            AEGIS DEFENSE SYSTEMS
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
