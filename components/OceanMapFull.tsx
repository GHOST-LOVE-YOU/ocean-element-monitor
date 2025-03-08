"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// 修复Leaflet图标在Next.js中的问题
const DEFAULT_ICON = L.icon({
  iconUrl: "/marker-icon.png",
  iconRetinaUrl: "/marker-icon-2x.png",
  shadowUrl: "/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// 在线设备图标
const ONLINE_ICON = L.icon({
  iconUrl: "/marker-icon-green.png",
  iconRetinaUrl: "/marker-icon-2x-green.png",
  shadowUrl: "/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DEFAULT_ICON;

// 用于移动地图视角的组件
function MapController({ selectedDevice, devices }) {
  const map = useMap();

  useEffect(() => {
    if (selectedDevice && devices) {
      const device = devices.find((d) => d._id === selectedDevice);
      if (device) {
        map.flyTo([device.location.latitude, device.location.longitude], 10, {
          animate: true,
          duration: 1.5,
        });
      }
    }
  }, [selectedDevice, devices, map]);

  return null;
}

export default function OceanMapFull({ selectedDevice }) {
  const devices = useQuery(api.devices.getAll);
  const [isClient, setIsClient] = useState(false);

  // 获取最新数据
  const latestData = useQuery(api.oceanElements.getLatest, { limit: 100 });

  // 解决水合错误
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 计算中心位置
  const calculateCenter = () => {
    if (!devices || devices.length === 0) {
      return [31.23, 121.47]; // 默认中心点
    }

    const latSum = devices.reduce(
      (sum, device) => sum + device.location.latitude,
      0
    );
    const lngSum = devices.reduce(
      (sum, device) => sum + device.location.longitude,
      0
    );

    return [latSum / devices.length, lngSum / devices.length];
  };

  // 获取设备最新数据
  const getDeviceLatestData = (deviceId) => {
    if (!latestData) return null;

    const deviceData = latestData
      .filter((data) => data.deviceId === deviceId)
      .sort((a, b) => b.timestamp - a.timestamp);

    return deviceData.length > 0 ? deviceData[0] : null;
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

      <MapController selectedDevice={selectedDevice} devices={devices} />

      {devices.map((device) => {
        const latestDeviceData = getDeviceLatestData(device._id);
        return (
          <Marker
            key={device._id}
            position={[device.location.latitude, device.location.longitude]}
            icon={device.status === "online" ? ONLINE_ICON : DEFAULT_ICON}
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

                {latestDeviceData && (
                  <div className="mt-2 text-xs border-t pt-2">
                    <p className="mb-1">
                      温度: {latestDeviceData.temperature?.toFixed(1) || "--"}{" "}
                      °C
                    </p>
                    <p className="mb-1">
                      盐度: {latestDeviceData.salinity?.toFixed(1) || "--"} ‰
                    </p>
                    <p className="mb-1">
                      溶解氧:{" "}
                      {latestDeviceData.dissolvedOxygen?.toFixed(1) || "--"}{" "}
                      mg/L
                    </p>
                    <p className="mb-1">
                      pH值: {latestDeviceData.pH?.toFixed(1) || "--"}
                    </p>
                  </div>
                )}

                <div className="mt-2 text-xs">
                  <p>经度: {device.location.longitude.toFixed(4)}</p>
                  <p>纬度: {device.location.latitude.toFixed(4)}</p>
                  {device.location.depth && (
                    <p>深度: {device.location.depth} 米</p>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
