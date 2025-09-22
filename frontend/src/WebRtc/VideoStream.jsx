import React, { useRef, useState, useEffect } from "react";

const VideoStream = ({ip}) => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const wsRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [bitrate, setBitrate] = useState(0); // New state for bitrate

  const startVideo = async () => {
    if (streaming) return;

    setStatus("Connecting...");

const pc = new RTCPeerConnection({
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { 
      urls: "turn:13.201.65.188:3478?transport=udp",
      username: "perceptron",
      credential: "root"
    },
    { 
      urls: "turn:13.201.65.188:3478?transport=tcp",  // TCP fallback
      username: "perceptron",
      credential: "root"
    }
  ],
  iceTransportPolicy: "relay"  // ← FORCE TURN usage!
});

    // Handle remote video track
    // Add this to your pc.ontrack handler
pc.ontrack = (event) => {
  console.log("Received remote track", event.streams);
  if (videoRef.current) {
    console.log("Setting video source");
    videoRef.current.srcObject = event.streams[0];
    
    // Add event listeners to debug video
    videoRef.current.onloadedmetadata = () => {
      console.log("Video metadata loaded");
      setStatus("connected");
    };
    
    videoRef.current.onplay = () => {
      console.log("Video started playing");
    };
    
    videoRef.current.onerror = (e) => {
      console.error("Video error:", e);
    };
  }
};

    pc.onconnectionstatechange = () => {
      // console.log("Connection state:", pc.connectionState);
      setStatus(pc.connectionState.toLowerCase()); // Normalize to lowercase
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        console.log("Connection lost. Please restart.");
        setBitrate(0); // Reset bitrate on disconnect
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") {
        console.log("ICE failed - check network/STUN");
      }else if (pc.iceConnectionState === "connected") {
    setStatus("connected");  // Ensure status updates here too
  }
    };

    // Send ICE candidates to server
  // Add this to your frontend
// existing handler — add a ws.send to forward the candidate to the Pi
pc.onicecandidate = (event) => {
  if (event.candidate) {
    console.log("Candidate type:", event.candidate.type); 
    console.log("Candidate:", event.candidate.candidate);
console.log("Full candidate obj:", event.candidate);  // ← Add for debug

    // send candidate back to signaling server so PI can add it
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        candidate: {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex
        }
      }));
    } else {
      console.warn("WebSocket not open, cannot send ICE candidate");
    }
  }
};


    // Monitor bitrate (improved with better timing and logging)
    let lastBytesReceived = 0;
    let lastTimestamp = 0;
    const monitorStats = async () => {
      console.log("Starting stats monitoring...");
      while (pc.connectionState === "connected") {
        try {
          const stats = await pc.getStats();
          let foundVideo = false;
          stats.forEach(report => {
            // console.log(`Stats report: type=${report.type}, kind=${report.kind}, bytesReceived=${report.bytesReceived}`); // Debug all reports
            if (report.type === "inbound-rtp" && report.kind === "video") {
              foundVideo = true;
              const bytesReceived = report.bytesReceived || 0;
              const timestamp = report.timestamp;
              if (lastBytesReceived > 0 && lastTimestamp > 0 && timestamp > lastTimestamp) {
                const deltaBytes = bytesReceived - lastBytesReceived;
                const deltaTime = (timestamp - lastTimestamp) / 1000; // ms to seconds
                if (deltaTime > 0.001) { // Avoid div by near-zero
                  const bitrateKbps = (deltaBytes * 8) / deltaTime / 1000;
                  setBitrate(Math.round(bitrateKbps));
                  // console.log(`Calculated Bitrate: ${bitrateKbps.toFixed(2)} kbps, FPS: ${report.framesPerSecond || "N/A"}`);
                }
              }
              lastBytesReceived = bytesReceived;
              lastTimestamp = timestamp;
            }
          });
          if (!foundVideo) {
            console.log("No inbound-rtp video report found yet - waiting for media...");
          }
        } catch (err) {
          console.error("Error fetching stats:", err);
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); // Check every 2s to allow settling
      }
      console.log("Stats monitoring stopped (disconnected)");
    };

    // Connect to signaling server
    const ws = new WebSocket(`ws://${ip}/ws`);

    ws.onopen = () => {
      console.log("Connected to signaling server");
      ws.send(JSON.stringify({ role: "browser" }));
      ws.send(JSON.stringify({ action: "request-offer" })); // Trigger Pi to send offer
      setStatus("Connected to server, requesting offer...");
      // Don't start monitoring yet - wait for connected state
    };

  ws.onmessage = async (msg) => {
  try {
    let data;
    
    // Check if it's binary data (ArrayBuffer or Blob)
    // if (msg.data instanceof ArrayBuffer || msg.data instanceof Blob) {
    //   // console.log("Received binary data (ignoring for WebRTC):", msg.data);
    //   return; // Skip processing for binary data
    // }
    
    // Handle text messages (WebRTC signaling)
    if (typeof msg.data === 'string') {
      try {
        data = JSON.parse(msg.data);
        // console.log("Received JSON message:", data);
      } catch (jsonError) {
        // console.log("Received non-JSON text message:", msg.data);
        return; // Skip processing for non-JSON text
      }
    // } else {
    //   // console.log("Received unknown message type:", typeof msg.data, msg.data);
    //   return;
    }

    // Check if data is defined before accessing its properties
    if (!data) {
      // console.log("No data to process");
      return;
    }

    // console.log("Processing message:", data);

    // Handle SDP messages
    if (data.sdp && data.type) {
      if (data.type === "offer") {
        console.log("Received offer from Pi");
        setStatus("Received offer, creating answer...");
        
        await pc.setRemoteDescription(data);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        ws.send(JSON.stringify({
          sdp: answer.sdp,
          type: answer.type
        }));
        console.log("Sent answer to Pi");
        setStatus("Answer sent, connecting...");
      } else if (data.type === "answer") {
        console.log("Received answer from Pi");
        await pc.setRemoteDescription(data);
        setStatus("Answer processed, connecting...");
      }
    } 
    // Handle ICE candidate messages
    else if (data.candidate) {
      console.log("Adding ICE candidate from Pi");
      try {
        await pc.addIceCandidate(data.candidate);
      } catch (e) {
        console.error("Error adding ICE candidate:", e);
      }
    }
    // Handle other message types
    else {
      // console.log("Received unknown JSON message format:", data);
    }
  } catch (err) {
    console.error("Error handling message:", err);
    // Don't set status for binary data errors - they're expected
    if (!(msg.data instanceof ArrayBuffer || msg.data instanceof Blob)) {
      setStatus("Error: " + err.message);
    }
  }
};
    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setStatus("WebSocket error");
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
      setStatus("Disconnected");
      setBitrate(0);
    };

    pcRef.current = pc;
    wsRef.current = ws;
    setStreaming(true);

    // Start monitoring after a delay to ensure connection
    setTimeout(() => {
      if (pc.connectionState === "connected") {
        monitorStats();
      } else {
        console.log("Delaying stats monitor until connected");
        const checkInterval = setInterval(() => {
          if (pc.connectionState === "connected") {
            monitorStats();
            clearInterval(checkInterval);
          }
        }, 1000);
      }
    }, 5000); // 5s delay for full negotiation
  };

  const stopVideo = () => {
    if (!streaming) return;

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStreaming(false);
    setStatus("Disconnected");
    setBitrate(0);
    console.log("Stopped streaming");
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pcRef.current) pcRef.current.close();
    };
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>Raspberry Pi Video Stream</h2>
      <div style={{ marginBottom: "10px", color: status === "connected" ? "green" : "orange" }}>
        Status: {status}
      </div>
      <div style={{ marginBottom: "10px" }}>
        Bitrate: {bitrate} kbps {(bitrate/8/1000)} MB/s
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onError={(e) => console.error("Video playback error:", e)}
        onPlaying={() => console.log("Video is playing!")}
        style={{ 
          width: "640px", 
          height: "480px", 
          borderRadius: "10px", 
          background: "black",
          border: "2px solid #ccc",
          display: status === "connected" ? "block" : "none",
          objectFit: "contain"
        }}
      />
      {status !== "connected" && (
        <div style={{ 
          width: "640px", 
          height: "480px", 
          borderRadius: "10px", 
          background: "#333",
          border: "2px solid #ccc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          margin: "0 auto"
        }}>
          {status}
        </div>
      )}
      <div style={{ marginTop: "1rem" }}>
        <button 
          onClick={startVideo} 
          disabled={streaming}
          style={{ margin: "0 10px", padding: "10px 20px" }}
        >
          Start Video
        </button>
        <button 
          onClick={stopVideo} 
          disabled={!streaming}
          style={{ margin: "0 10px", padding: "10px 20px" }}
        >
          Stop Video
        </button>
      </div>
    </div>
  );
};

export default VideoStream;