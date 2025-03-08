"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";

// Fix Leaflet icon issues in Next.js
const DEFAULT_ICON = L.icon({
  iconUrl: "/marker-icon.png",
  iconRetinaUrl: "/marker-icon-2x.png",
  shadowUrl: "/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface DeviceType {
  _id: Id<"devices">;
  _creationTime: number;
  batteryLevel?: number;
  type: string;
  location: {
    description?: string;
    latitude: number;
    longitude: number;
  };
  status: string;
  name: string;
  lastActive: number;
  config: Record<string, any>;
}

interface MapComponentProps {
  devices: DeviceType[];
  center: [number, number];
}

const MapComponent = ({ devices, center }: MapComponentProps) => {
  useEffect(() => {
    // Set default icon for markers
    L.Marker.prototype.options.icon = DEFAULT_ICON;
  }, []);

  return (
    <MapContainer
      center={center}
      zoom={5}
      style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {devices.map((device) => (
        <Marker
          key={device._id}
          position={[device.location.latitude, device.location.longitude]}
        >
          <Popup>
            <div className="p-1">
              <h3 className="font-medium">{device.name}</h3>
              <p className="text-xs text-gray-500">{device.type}</p>
              <p className="text-xs mt-1">
                状态:{" "}
                <span
                  className={
                    device.status === "online"
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {device.status === "online" ? "在线" : "离线"}
                </span>
              </p>
              <div className="mt-2 text-xs">
                <p>经度: {device.location.longitude.toFixed(4)}</p>
                <p>纬度: {device.location.latitude.toFixed(4)}</p>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapComponent;
