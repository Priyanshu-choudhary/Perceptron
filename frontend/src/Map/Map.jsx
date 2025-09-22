import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import { useMap } from "react-leaflet";

// Fix Leaflet's default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const MapWithGPS = ({ status }) => {
  const [position, setPosition] = useState([37.7749, -122.4194]); // Default to San Francisco
  const [path, setPath] = useState([]); // Store the path as an array of positions
//   const { status } = useWebSocket("ws://localhost:8080/ws");

  useEffect(() => {
    if (status?.lat && status?.log) {
      const newPosition = [status.lat, status.log];
      setPosition(newPosition); // Update the current position
      setPath((prevPath) => [...prevPath, newPosition]); // Append to the path
    }
  }, [status.lat, status.log]);

  const UpdateMapView = ({ center }) => {
    const map = useMap();
    useEffect(() => {
      map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
  };

  return (
    <MapContainer
      center={position}
      zoom={15}
      style={{ height: "200px", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={position}>
        <Popup>
          Latitude: {position[0]} <br />
          Longitude: {position[1]}
        </Popup>
      </Marker>
      {/* Add Polyline for the path */}
      <Polyline positions={path} color="blue" />
      <UpdateMapView center={position} />
    </MapContainer>
  );
};

export default MapWithGPS;
