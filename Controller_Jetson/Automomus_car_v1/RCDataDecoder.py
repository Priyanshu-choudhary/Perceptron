# --- RCDataDecoder.py ---
import asyncio
import websockets
import struct
from tinytlvx import TinyTLVRx, TTP_FRAME_TYPE_RC ,TTP_FRAME_TYPE_CONFIG
from typing import Dict, Optional
import time

# Define channel names
RC_CHANNELS = {
    0: "Roll",     
    1: "Pitch",    
    2: "Throttle", 
    3: "Yaw",      
    4: "Aux1",     
    5: "Aux2",     
    6: "Unused"    
}

class RCDataDecoder:
    """
    Handles WebSocket connection and stores the latest decoded RC data.
    """
    def __init__(self, ws_uri: str):
        self.ws_uri = ws_uri
        self.rx = TinyTLVRx() 
        self.latest_data = {} # Stores the most recent channel dictionary

    def get_latest_data(self) -> Dict[str, int]:
        """Returns the most recent decoded data."""
        return self.latest_data

    def decode_rc_data(self) -> Dict[str, int]:
        frame_type = self.rx.getType()
        decoded_values = {}

        # 1. Handle CONFIG frames
        if frame_type == TTP_FRAME_TYPE_CONFIG:
            self.rx.beginTLV()
            while True:
                tlv = self.rx.nextTLV()
                if tlv is None:
                    break
                
                ch_id, length, data = tlv
                if length == 2:
                    value = struct.unpack('<H', data)[0]
                    ch_name = RC_CHANNELS.get(ch_id, f"Config_Ch_{ch_id}")
                    decoded_values[ch_name] = value
            
            # Add a flag so you know this was a config update
            decoded_values["_frame_type"] = "CONFIG"
            print(f"⚙️ Config Updated: {decoded_values}")
            return decoded_values

        # 2. Handle RC DATA frames
        elif frame_type == TTP_FRAME_TYPE_RC:
            self.rx.beginTLV()
            while True:
                tlv = self.rx.nextTLV()
                if tlv is None:
                    break
                
                ch_id, length, data = tlv

                # Handle Timestamp
                if ch_id == 100 and length == 4:
                    decoded_values["timestamp"] = struct.unpack('<I', data)[0]
                
                # Handle standard RC Channels
                elif length == 2:
                    value = struct.unpack('<H', data)[0]
                    ch_name = RC_CHANNELS.get(ch_id, f"Channel_{ch_id}")
                    decoded_values[ch_name] = value
            
            return decoded_values

        # 3. Handle unknown frames
        return {}

    # --- Inside RCDataDecoder.py ---

    async def run_receiver(self):
        while True:
            try:
                async with websockets.connect(self.ws_uri) as websocket:
                    self.rx.reset()
                    while True:
                        message = await websocket.recv()
                        # Capture exact arrival time immediately!
                        arrival_ts = int(time.time() * 1000) & 0xFFFFFFFF 
                        
                        if isinstance(message, str): continue

                        for byte in message:
                            if self.rx.feed(byte):
                                new_data = self.decode_rc_data()
                                if new_data:
                                    # Attach the arrival time to the data dictionary
                                    new_data["arrival_ts"] = arrival_ts
                                    self.latest_data = new_data                    
            except (websockets.exceptions.ConnectionClosed, ConnectionRefusedError):
                print("⚠️ Connection lost. Retrying in 2s...")
                await asyncio.sleep(2)
            except Exception as e:
                print(f"[ERROR] {e}")
                await asyncio.sleep(2)
