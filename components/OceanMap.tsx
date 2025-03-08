"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { Id } from "@/convex/_generated/dataModel";

// Define more specific types
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

// Define the type for the props we'll pass to MapComponent
interface MapComponentProps {
  devices: DeviceType[];
  center: [number, number];
}

// Use a type assertion for the dynamic import to resolve TypeScript errors
const MapWithNoSSR = dynamic(
  () => import("./MapComponent").then((mod) => mod.default) as any,
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
      </div>
    ),
  }
) as React.ComponentType<MapComponentProps>;

export default function OceanMap() {
  const devices = useQuery(api.devices.getAll);
  const [isClient, setIsClient] = useState(false);

  // 解决水合错误
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 计算中心位置
  const calculateCenter = (): [number, number] => {
    if (!devices || devices.length === 0) {
      return [31.23, 121.47] as [number, number]; // 默认中心点
    }

    const latSum = devices.reduce(
      (sum, device) => sum + device.location.latitude,
      0
    );
    const lngSum = devices.reduce(
      (sum, device) => sum + device.location.longitude,
      0
    );

    return [latSum / devices.length, lngSum / devices.length] as [
      number,
      number,
    ];
  };

  if (!isClient) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  if (!devices) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  const center = calculateCenter();

  return <MapWithNoSSR devices={devices} center={center} />;
}
