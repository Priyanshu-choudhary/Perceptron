#!/usr/bin/env python3
import asyncio
import json
import cv2
from aiortc import (
    RTCPeerConnection, 
    VideoStreamTrack, 
    RTCSessionDescription, 
    RTCIceCandidate,
    RTCConfiguration, 
    RTCIceServer       
)
from av import VideoFrame
import websockets

SIGNALING_SERVER = "ws://13.201.65.188:8080/ws"
CAMERA_INDEX = 0
WIDTH = 640
HEIGHT = 480
FPS = 30

# Global variables for current connection
pc = None
track = None

# --------------------------
# Camera Track
# --------------------------
class CameraVideoTrack(VideoStreamTrack):
    def __init__(self, camera_index=0, width=640, height=480, fps=30):
        super().__init__()
        # Try hardware-accelerated GStreamer pipeline first
        gstreamer_pipeline = f"v4l2src device=/dev/video{camera_index} ! video/x-raw,width={width},height={height},framerate={fps}/1 ! videoconvert ! appsink"
        self.cap = cv2.VideoCapture(gstreamer_pipeline, cv2.CAP_GSTREAMER)
        if not self.cap.isOpened():
            # Fallback to standard V4L2 to avoid GStreamer warning
            self.cap = cv2.VideoCapture(camera_index)
            if not self.cap.isOpened():
                raise RuntimeError("Cannot open camera")
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
            self.cap.set(cv2.CAP_PROP_FPS, fps)
        print(f"Camera initialized: {width}x{height}@{fps}fps")

    async def recv(self):
        pts, time_base = await self.next_timestamp()
        ret, frame = self.cap.read()
        if not ret:
            raise RuntimeError("Failed to read frame from camera")
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        video_frame = VideoFrame.from_ndarray(frame, format="rgb24")
        video_frame.pts = pts
        video_frame.time_base = time_base
        return video_frame

    def stop(self):
        if self.cap and self.cap.isOpened():
            self.cap.release()
            print("Camera released")

# --------------------------
# Function to (re)create connection and send offer
# --------------------------
async def create_and_send_offer(ws):
    global pc, track
    # Clean up old connection if exists
    if pc:
        await pc.close()
        pc = None
    if track:
        track.stop()
        track = None
        
    # Create RTCPeerConnection with TURN configuration + force relay
    # Create RTCPeerConnection with TURN configuration (no iceTransportPolicy)
    pc = RTCPeerConnection(
        configuration=RTCConfiguration(
            iceServers=[
                # RTCIceServer(urls="stun:stun.l.google.com:19302"),  # ← Comment out for forcing TURN
                RTCIceServer(
                    urls="turn:13.201.65.188:3478?transport=udp",
                    username="perceptron", 
                    credential="root"       
                )
            ]
        )
    )
    
    track = CameraVideoTrack(camera_index=CAMERA_INDEX, width=WIDTH, height=HEIGHT, fps=FPS)
    pc.addTrack(track)

    # Store track reference in the pc object for access in callbacks
    pc._local_track = track

    # Send ICE candidates with sdpMid for compatibility
    @pc.on("icecandidate")
    async def on_icecandidate(event):
        if event.candidate:
            print(f"PI Generated ICE candidate: {event.candidate.candidate}")
            print(f"PI Candidate type: {event.candidate.type}")
            candidate_dict = {
                "candidate": event.candidate.candidate,
                "sdpMid": event.candidate.sdpMid or "0",
                "sdpMLineIndex": event.candidate.sdpMLineIndex or 0
                # Drop usernameFragment unless needed
            }
            await ws.send(json.dumps({"candidate": candidate_dict}))

    # Monitor connection state for disconnects (use global pc)
    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        global pc, track
        if pc is not None:
            print(f"Connection state changed to: {pc.connectionState}")
            if pc.connectionState in ["disconnected", "failed", "closed"]:
                print("Connection lost. Cleaning up and waiting for new request...")
                if pc:
                    await pc.close()
                # Use the track reference stored in pc object
                if hasattr(pc, '_local_track') and pc._local_track:
                    pc._local_track.stop()
                pc = None
                # Don't set track = None here since it's global
        else:
            print("Connection state change: pc is None (already cleaned up)")

    # Create and send offer (with bitrate SDP mod for quality)
    offer = await pc.createOffer()
    # Modify SDP for higher bitrate (e.g., 2000 kbps for 480p; increase for higher res)
    sdp_lines = offer.sdp.splitlines()
    new_sdp_lines = []
    for line in sdp_lines:
        new_sdp_lines.append(line)
        if line.startswith("m=video"):
            new_sdp_lines.append("a=x-google-max-bitrate=2000")
            new_sdp_lines.append("a=x-google-min-bitrate=500")
    offer.sdp = "\n".join(new_sdp_lines)
    await pc.setLocalDescription(offer)
    await ws.send(json.dumps({
        "sdp": pc.localDescription.sdp,
        "type": pc.localDescription.type
    }))
    print("Offer sent, waiting for answer...")

# --------------------------
# Main WebRTC Client
# --------------------------
async def run_client():
    global pc, track
    async with websockets.connect(SIGNALING_SERVER) as ws:
        print("Connected to signaling server")

        # Identify as Pi
        await ws.send(json.dumps({"role": "pi"}))

        # Listen for messages - handle both text and binary
        async for raw_msg in ws:
            try:
                # DEBUG: Print the exact type and content first
                
                
                # Try to parse as JSON safely
                if isinstance(raw_msg, str):
                    try:
                        data = json.loads(raw_msg)
                        print(f"Received JSON message: {data}")
                        
                        if "action" in data and data["action"] == "request-offer":
                            print("Received request for offer. Creating new connection...")
                            await create_and_send_offer(ws)
                        elif pc and "sdp" in data and data["type"] == "answer":
                            answer = RTCSessionDescription(sdp=data["sdp"], type=data["type"])
                            await pc.setRemoteDescription(answer)
                            print("Remote description set successfully!")
                        elif pc and "candidate" in data:
                            try:
                                cand = data["candidate"]
                                
                                # Strip "candidate:" prefix and split
                                candidate_str = cand.get("candidate", "").strip()
                                if candidate_str.startswith("candidate:"):
                                    candidate_str = candidate_str[10:].strip()  # Remove "candidate:" (len=10)
                                
                                parts = candidate_str.split()
                                if len(parts) < 8:  # Minimum for basic candidate
                                    raise ValueError("Candidate string too short")
                                
                                # Extract fields using fixed indices (standard WebRTC format)
                                foundation = parts[0]
                                component = int(parts[1])
                                protocol = parts[2].lower()
                                priority = int(parts[3])
                                ip = parts[4]
                                port = int(parts[5])
                                # Skip 'typ' (parts[6]), get type (parts[7])
                                candidate_type = parts[7]
                                
                                # Optional related addr/port (search for keys)
                                related_address = None
                                related_port = None
                                for i in range(8, len(parts), 2):
                                    if parts[i] == "raddr":
                                        related_address = parts[i + 1]
                                    elif parts[i] == "rport":
                                        related_port = int(parts[i + 1])
                                
                                # Create candidate
                                candidate = RTCIceCandidate(
                                    foundation=foundation,
                                    component=component,
                                    protocol=protocol,
                                    priority=priority,
                                    ip=ip,
                                    port=port,
                                    type=candidate_type,
                                    relatedAddress=related_address,
                                    relatedPort=related_port,
                                    sdpMid=cand.get("sdpMid"),
                                    sdpMLineIndex=cand.get("sdpMLineIndex")
                                )
                                print(f"PI: adding remote candidate: {cand.get('candidate')}")
                                await pc.addIceCandidate(candidate)
                                print("Added ICE candidate successfully")
                            except Exception as e:
                                print(f"Failed to add ICE candidate: {e}")
                            

                    except json.JSONDecodeError:
                        print(f"Failed to parse as JSON: {raw_msg}")
                        continue
                                        
               
                    
            except Exception as e:
                print(f"Error processing message: {e}")
                print(f"Message that caused error: {raw_msg}")
                continue

if __name__ == "__main__":
    try:
        asyncio.run(run_client())
    except KeyboardInterrupt:
        print("Exiting...")
        if 'pc' in globals() and pc:
            asyncio.run(pc.close())
        if 'track' in globals() and track:
            track.stop()