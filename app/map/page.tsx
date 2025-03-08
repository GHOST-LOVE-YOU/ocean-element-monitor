"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { ChevronLeftIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import dynamic from "next/dynamic";

// 动态导入地图组件以避免SSR问题
const MapWithNoSSR = dynamic(() => import("../../components/OceanMapFull"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  ),
});

export default function MapDetailPage() {
  const devices = useQuery(api.devices.getAll);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [latestData, setLatestData] = useState({});

  // 获取最新数据
  const allLatestData = useQuery(api.oceanElements.getLatest, { limit: 100 });

  useEffect(() => {
    if (allLatestData && devices) {
      // 为每个设备找到最新的数据
      const latestByDevice = {};

      devices.forEach((device) => {
        const deviceData = allLatestData
          .filter((data) => data.deviceId === device._id)
          .sort((a, b) => b.timestamp - a.timestamp);

        if (deviceData.length > 0) {
          latestByDevice[device._id] = deviceData[0];
        }
      });

      setLatestData(latestByDevice);
    }
  }, [allLatestData, devices]);

  const handleDeviceClick = (device) => {
    setSelectedDevice(device._id === selectedDevice ? null : device._id);
  };

  return (
    <main className="flex min-h-screen flex-col p-6 bg-gray-50">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="flex items-center text-blue-500 hover:text-blue-700 mb-4"
        >
          <ChevronLeftIcon className="h-4 w-4 mr-1" />
          返回仪表板
        </Link>
        <h1 className="text-2xl font-bold">监测点分布</h1>
        <p className="text-gray-500">查看所有海洋监测设备的地理位置和状态</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧设备列表 */}
        <div className="lg:col-span-1">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h2 className="text-lg font-medium mb-4">设备列表</h2>

            {devices ? (
              devices.length > 0 ? (
                <div className="space-y-3">
                  {devices.map((device) => (
                    <div
                      key={device._id}
                      className={`p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedDevice === device._id
                          ? "bg-blue-50 border-blue-300"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => handleDeviceClick(device)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <MapPinIcon
                            className={`h-5 w-5 mr-2 ${
                              device.status === "online"
                                ? "text-green-500"
                                : "text-red-500"
                            }`}
                          />
                          <div>
                            <h3 className="text-sm font-medium">
                              {device.name}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {device.type}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            device.status === "online"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {device.status === "online" ? "在线" : "离线"}
                        </span>
                      </div>

                      {selectedDevice === device._id &&
                        latestData[device._id] && (
                          <div className="mt-3 pt-3 border-t border-gray-100 text-xs">
                            <p className="grid grid-cols-2 gap-1 mb-1">
                              <span className="text-gray-500">温度:</span>
                              <span className="font-medium">
                                {latestData[device._id].temperature?.toFixed(
                                  1
                                ) || "--"}{" "}
                                °C
                              </span>
                            </p>
                            <p className="grid grid-cols-2 gap-1 mb-1">
                              <span className="text-gray-500">盐度:</span>
                              <span className="font-medium">
                                {latestData[device._id].salinity?.toFixed(1) ||
                                  "--"}{" "}
                                ‰
                              </span>
                            </p>
                            <p className="grid grid-cols-2 gap-1 mb-1">
                              <span className="text-gray-500">溶解氧:</span>
                              <span className="font-medium">
                                {latestData[
                                  device._id
                                ].dissolvedOxygen?.toFixed(1) || "--"}{" "}
                                mg/L
                              </span>
                            </p>
                            <p className="grid grid-cols-2 gap-1 mb-1">
                              <span className="text-gray-500">最后更新:</span>
                              <span className="font-medium">
                                {formatDistanceToNow(
                                  new Date(latestData[device._id].timestamp),
                                  {
                                    addSuffix: true,
                                    locale: zhCN,
                                  }
                                )}
                              </span>
                            </p>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  没有找到设备数据
                </div>
              )
            ) : (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧地图 */}
        <div className="lg:col-span-3">
          <div className="bg-white p-4 rounded-lg shadow-sm border h-[700px]">
            <h2 className="text-lg font-medium mb-4">监测设备分布图</h2>
            <div className="h-[640px]">
              <MapWithNoSSR selectedDevice={selectedDevice} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
