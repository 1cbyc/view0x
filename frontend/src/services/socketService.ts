import { io, Socket } from "socket.io-client";

// This interface should match the AnalysisUpdatePayload in the backend
export interface AnalysisUpdatePayload {
  analysisId: string;
  status: "processing" | "completed" | "failed";
  progress: number;
  message?: string;
  error?: string;
  result?: any;
}

export type AnalysisUpdateCallback = (payload: AnalysisUpdatePayload) => void;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

class SocketService {
  private socket: Socket | null = null;
  
  get socketInstance() {
    return this.socket;
  }

  connect() {
    if (this.socket && this.socket.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
    });

    this.socket.on("connect", () => {
      console.log("WebSocket connected:", this.socket?.id);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("WebSocket disconnected:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribeToAnalysis(analysisId: string, callback: AnalysisUpdateCallback) {
    if (!this.socket) {
      console.error("Cannot subscribe, socket is not connected.");
      return;
    }

    this.socket.emit("subscribe-analysis", { analysisId });
    this.socket.on("analysis:update", callback);
  }

  unsubscribeFromAnalysis(analysisId: string) {
    if (!this.socket) {
      return;
    }

    this.socket.emit("unsubscribe-analysis", { analysisId });
    this.socket.off("analysis:update");
  }
}

export const socketService = new SocketService();
