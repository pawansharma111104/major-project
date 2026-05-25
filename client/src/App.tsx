import { useState, useEffect, useRef } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import LoginPage from "@/pages/login";
import SoldierDashboard from "@/pages/soldier-dashboard";
import TrackerDashboard from "@/pages/tracker-dashboard";
import DroneDashboard from "@/pages/drone-dashboard";

function App() {
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    codename: string;
    role: string;
  } | null>(null);

  const [websocket, setWebsocket] =
    useState<WebSocket | null>(null);

  const wsRef =
    useRef<WebSocket | null>(null);

  // Initialize WebSocket connection
// Initialize WebSocket connection
useEffect(() => {
  if (!currentUser) return;

  // PRODUCTION RENDER WS
  const productionWs =
    "wss://battlefield-backend-g1f2.onrender.com/ws";

  // LOCALHOST DEV WS
  const localWs =
    "ws://localhost:5000/ws";

  // AUTO SWITCH
  const wsUrl =
    window.location.hostname ===
    "localhost"
      ? localWs
      : productionWs;

  const ws =
    new WebSocket(wsUrl);

  wsRef.current = ws;

  ws.onopen = () => {
    console.log(
      "WebSocket connected"
    );

    setWebsocket(ws);

    // REGISTER USER
    ws.send(
      JSON.stringify({
        type: "register",

        data: {
          userId:
            currentUser.id,

          codename:
            currentUser.codename,

          role:
            currentUser.role,
        },
      })
    );
  };

  ws.onclose = () => {
    console.log(
      "WebSocket disconnected"
    );

    setWebsocket(null);
  };

  ws.onerror = (
    error
  ) => {
    console.error(
      "WebSocket error:",
      error
    );
  };

  return () => {
    if (
      ws.readyState ===
      WebSocket.OPEN
    ) {
      ws.close();
    }
  };
}, [currentUser]);

  const handleLogout = () => {
    if (
      wsRef.current &&
      wsRef.current
        .readyState ===
        WebSocket.OPEN
    ) {
      wsRef.current.close();
    }

    setCurrentUser(null);

    setWebsocket(null);
  };

  return (
    <QueryClientProvider
      client={queryClient}
    >
      <TooltipProvider>
        {!currentUser ? (
          <LoginPage
            onLoginSuccess={
              setCurrentUser
            }
          />
        ) : currentUser.role ===
          "soldier" ? (
          <SoldierDashboard
            soldier={
              currentUser
            }
            websocket={
              websocket
            }
            onLogout={
              handleLogout
            }
          />
        ) : currentUser.role ===
          "drone" ? (
          <DroneDashboard
            drone={
              currentUser
            }
            websocket={
              websocket
            }
            onLogout={
              handleLogout
            }
          />
        ) : (
          <TrackerDashboard
            soldier={
              currentUser
            }
            websocket={
              websocket
            }
            onLogout={
              handleLogout
            }
          />
        )}

        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;