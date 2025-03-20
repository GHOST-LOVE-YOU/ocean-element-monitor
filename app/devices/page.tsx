"use client";

import React from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { ChevronLeftIcon, PlusIcon } from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Id } from "@/convex/_generated/dataModel";

// Define device type to use in the component
type DeviceType = {
  _id: Id<"devices">;
  name: string;
  type: string;
  status: string;
  lastActive: number;
  batteryLevel?: number;
  location: {
    latitude: number;
    longitude: number;
    description?: string;
  };
  config: {
    sampleRate: number;
    uploadInterval: number;
    parameters: string[];
  };
};

export default function DevicesPage() {
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [isEditDeviceOpen, setIsEditDeviceOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Id<"devices"> | null>(
    null
  );
  const [editingDevice, setEditingDevice] = useState<DeviceType | null>(null);

  const devices = useQuery(api.devices.getAll);
  const alerts = useQuery(api.alerts.getAll, { limit: 50, status: "new" });
  const addDevice = useMutation(api.devices.add);
  const updateDevice = useMutation(api.devices.updateDevice);
  const deleteDevice = useMutation(api.devices.deleteDevice);
  const devicesHealth = useQuery(api.devices.getDeviceHealth, {});

  const [newDevice, setNewDevice] = useState({
    name: "",
    type: "浮标",
    location: {
      latitude: 31.23,
      longitude: 121.47,
      description: "",
    },
    config: {
      sampleRate: 15,
      uploadInterval: 60,
      parameters: ["temperature", "salinity", "dissolvedOxygen", "pH"],
    },
  });

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await addDevice({
        ...newDevice,
        // 确保参数是数组
        config: {
          ...newDevice.config,
          parameters: Array.isArray(newDevice.config.parameters)
            ? newDevice.config.parameters
            : (newDevice.config.parameters as unknown as string)
                .split(",")
                .map((p: string) => p.trim()),
        },
      });

      // 重置表单并关闭
      setNewDevice({
        name: "",
        type: "浮标",
        location: {
          latitude: 31.23,
          longitude: 121.47,
          description: "",
        },
        config: {
          sampleRate: 15,
          uploadInterval: 60,
          parameters: ["temperature", "salinity", "dissolvedOxygen", "pH"],
        },
      });
      setIsAddDeviceOpen(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      alert("添加设备失败: " + errorMessage);
    }
  };

  const handleEditDevice = (device: DeviceType) => {
    // 复制设备数据到编辑表单
    setEditingDevice({
      ...device,
      config: {
        ...device.config,
        parameters: Array.isArray(device.config.parameters)
          ? device.config.parameters
          : [device.config.parameters],
      },
    });
    setIsEditDeviceOpen(true);
  };

  const handleUpdateDevice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingDevice) return;

    try {
      await updateDevice({
        id: editingDevice._id,
        name: editingDevice.name,
        type: editingDevice.type,
        location: editingDevice.location,
        config: {
          ...editingDevice.config,
          parameters: Array.isArray(editingDevice.config.parameters)
            ? editingDevice.config.parameters
            : (editingDevice.config.parameters as unknown as string)
                .split(",")
                .map((p: string) => p.trim()),
        },
      });

      // 关闭编辑模态框
      setIsEditDeviceOpen(false);
      setEditingDevice(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      alert("更新设备失败: " + errorMessage);
    }
  };

  const getDeviceAlerts = (deviceId: Id<"devices">) => {
    if (!alerts) return [];
    return alerts.filter((alert) => alert.deviceId === deviceId);
  };

  const handleDeleteDevice = async (deviceId: Id<"devices">) => {
    if (
      !confirm(
        "确定要删除此设备吗？此操作将同时删除所有与此设备相关的数据，且无法恢复。"
      )
    ) {
      return;
    }

    try {
      const result = await deleteDevice({
        id: deviceId,
      });
      alert(result.message);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      alert("删除设备失败: " + errorMessage);
    }
  };

  const getDeviceHealth = (deviceId: Id<"devices">) => {
    if (!devicesHealth) return null;
    return devicesHealth.find((health) => health.id === deviceId);
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">监测设备管理</h1>
            <p className="text-gray-500">查看和管理所有海洋监测设备</p>
          </div>

          <button
            onClick={() => setIsAddDeviceOpen(true)}
            className="flex items-center mt-4 md:mt-0 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            添加设备
          </button>
        </div>
      </div>

      {/* 设备列表 */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  设备名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  位置
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  健康状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最后活动
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  警报
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {devices ? (
                devices.length > 0 ? (
                  devices.map((device) => (
                    <React.Fragment key={device._id}>
                      <tr
                        className={`hover:bg-gray-50 cursor-pointer ${selectedDevice === device._id ? "bg-blue-50" : ""}`}
                        onClick={() =>
                          setSelectedDevice(
                            selectedDevice === device._id ? null : device._id
                          )
                        }
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {device.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {device.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {device.location.description ||
                            `${device.location.latitude.toFixed(4)}, ${device.location.longitude.toFixed(4)}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              device.status === "online"
                                ? "bg-green-100 text-green-800"
                                : device.status === "offline"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {device.status === "online"
                              ? "在线"
                              : device.status === "offline"
                                ? "离线"
                                : "维护中"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const healthData = getDeviceHealth(device._id);
                            if (!healthData) {
                              return (
                                <div className="animate-pulse w-16 h-3 bg-gray-200 rounded"></div>
                              );
                            }

                            const getHealthColor = (score: number) => {
                              if (score >= 80)
                                return "bg-green-100 text-green-800";
                              if (score >= 50)
                                return "bg-amber-100 text-amber-800";
                              return "bg-red-100 text-red-800";
                            };

                            return (
                              <div className="flex items-center space-x-2">
                                <div className="w-10 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={
                                      getHealthColor(
                                        healthData.healthScore
                                      ).split(" ")[0]
                                    }
                                    style={{
                                      width: `${healthData.healthScore}%`,
                                      height: "100%",
                                    }}
                                  ></div>
                                </div>
                                <span
                                  className={`text-xs ${getHealthColor(healthData.healthScore)}`}
                                >
                                  {healthData.healthScore}%
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDistanceToNow(new Date(device.lastActive), {
                            addSuffix: true,
                            locale: zhCN,
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {alerts ? (
                            (() => {
                              const deviceAlerts = getDeviceAlerts(device._id);
                              if (deviceAlerts.length === 0)
                                return (
                                  <span className="text-xs text-gray-500">
                                    无
                                  </span>
                                );

                              return (
                                <span className="bg-red-100 text-red-800 px-2 py-1 text-xs rounded-full">
                                  {deviceAlerts.length}
                                </span>
                              );
                            })()
                          ) : (
                            <div className="animate-pulse w-4 h-4 bg-gray-200 rounded-full"></div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditDevice(device);
                              }}
                              className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md px-2 py-1 text-sm"
                            >
                              编辑
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDevice(device._id);
                              }}
                              className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md px-2 py-1 text-sm"
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                      {selectedDevice === device._id && (
                        <tr className="bg-gray-50">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="text-sm">
                              <h3 className="font-medium mb-2">设备详情</h3>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                <div>
                                  <p className="text-gray-500 text-xs mb-1">
                                    设备ID
                                  </p>
                                  <p className="font-medium">{device._id}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs mb-1">
                                    电池电量
                                  </p>
                                  <p className="font-medium">
                                    {device.batteryLevel
                                      ? `${device.batteryLevel}%`
                                      : "未知"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs mb-1">
                                    精确位置
                                  </p>
                                  <p className="font-medium">
                                    经度: {device.location.longitude.toFixed(6)}
                                    <br />
                                    纬度: {device.location.latitude.toFixed(6)}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4">
                                <p className="text-gray-500 text-xs mb-1">
                                  设备健康状态
                                </p>
                                {(() => {
                                  const healthData = getDeviceHealth(
                                    device._id
                                  );
                                  if (!healthData) {
                                    return (
                                      <p className="text-sm text-gray-500">
                                        加载中...
                                      </p>
                                    );
                                  }

                                  const getHealthColor = (score: number) => {
                                    if (score >= 80)
                                      return "bg-green-100 text-green-800";
                                    if (score >= 50)
                                      return "bg-amber-100 text-amber-800";
                                    return "bg-red-100 text-red-800";
                                  };

                                  return (
                                    <div className="space-y-2">
                                      <div className="flex items-center">
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                          <div
                                            className={`h-2.5 rounded-full ${getHealthColor(healthData.healthScore)}`}
                                            style={{
                                              width: `${healthData.healthScore}%`,
                                            }}
                                          ></div>
                                        </div>
                                        <p
                                          className={`ml-2 text-sm font-medium ${getHealthColor(healthData.healthScore)}`}
                                        >
                                          {healthData.healthScore}%
                                        </p>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                        <div>
                                          <p className="text-xs">
                                            活动状态:
                                            <span
                                              className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                                                healthData.activeStatus ===
                                                "正常"
                                                  ? "bg-green-100 text-green-800"
                                                  : healthData.activeStatus ===
                                                      "警告"
                                                    ? "bg-amber-100 text-amber-800"
                                                    : "bg-red-100 text-red-800"
                                              }`}
                                            >
                                              {healthData.activeStatus}
                                            </span>
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs">
                                            最近7天数据点:
                                            <span className="font-medium ml-1">
                                              {healthData.dataPointsLastWeek}
                                            </span>
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs">
                                            当前警报:
                                            <span
                                              className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                                                healthData.activeAlerts > 0
                                                  ? "bg-red-100 text-red-800"
                                                  : "bg-gray-100 text-gray-800"
                                              }`}
                                            >
                                              {healthData.activeAlerts}
                                            </span>
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>

                              <div className="mt-4">
                                <p className="text-gray-500 text-xs mb-1">
                                  配置信息
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <p className="text-xs">
                                      采样频率:{" "}
                                      <span className="font-medium">
                                        {device.config.sampleRate} 分钟
                                      </span>
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs">
                                      上传间隔:{" "}
                                      <span className="font-medium">
                                        {device.config.uploadInterval} 分钟
                                      </span>
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs">
                                      监测参数:{" "}
                                      <span className="font-medium">
                                        {device.config.parameters.join(", ")}
                                      </span>
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {alerts &&
                                getDeviceAlerts(device._id).length > 0 && (
                                  <div className="mt-4">
                                    <p className="text-gray-500 text-xs mb-1">
                                      当前警报
                                    </p>
                                    <div className="space-y-2">
                                      {getDeviceAlerts(device._id).map(
                                        (alert) => (
                                          <div
                                            key={alert._id}
                                            className="p-2 bg-red-50 border border-red-200 rounded text-xs"
                                          >
                                            <p className="font-medium">
                                              {alert.message}
                                            </p>
                                            <p className="text-gray-500 mt-1">
                                              {formatDistanceToNow(
                                                new Date(alert.timestamp),
                                                {
                                                  addSuffix: true,
                                                  locale: zhCN,
                                                }
                                              )}
                                            </p>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      没有找到设备数据
                    </td>
                  </tr>
                )
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500 mx-auto"></div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 添加设备模态框 */}
      {isAddDeviceOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">添加新设备</h3>

              <form onSubmit={handleAddDevice}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      设备名称
                    </label>
                    <input
                      type="text"
                      required
                      value={newDevice.name}
                      onChange={(e) =>
                        setNewDevice({ ...newDevice, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      设备类型
                    </label>
                    <select
                      value={newDevice.type}
                      onChange={(e) =>
                        setNewDevice({ ...newDevice, type: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    >
                      <option value="浮标">浮标</option>
                      <option value="固定观测站">固定观测站</option>
                      <option value="研究平台">研究平台</option>
                      <option value="水下机器人">水下机器人</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        纬度
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        required
                        value={newDevice.location.latitude}
                        onChange={(e) =>
                          setNewDevice({
                            ...newDevice,
                            location: {
                              ...newDevice.location,
                              latitude: parseFloat(e.target.value),
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        经度
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        required
                        value={newDevice.location.longitude}
                        onChange={(e) =>
                          setNewDevice({
                            ...newDevice,
                            location: {
                              ...newDevice.location,
                              longitude: parseFloat(e.target.value),
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      位置描述
                    </label>
                    <input
                      type="text"
                      value={newDevice.location.description || ""}
                      onChange={(e) =>
                        setNewDevice({
                          ...newDevice,
                          location: {
                            ...newDevice.location,
                            description: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        采样频率 (分钟)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newDevice.config.sampleRate}
                        onChange={(e) =>
                          setNewDevice({
                            ...newDevice,
                            config: {
                              ...newDevice.config,
                              sampleRate: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        上传间隔 (分钟)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newDevice.config.uploadInterval}
                        onChange={(e) =>
                          setNewDevice({
                            ...newDevice,
                            config: {
                              ...newDevice.config,
                              uploadInterval: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      监测参数 (逗号分隔)
                    </label>
                    <input
                      type="text"
                      required
                      value={
                        Array.isArray(newDevice.config.parameters)
                          ? newDevice.config.parameters.join(", ")
                          : newDevice.config.parameters
                      }
                      onChange={(e) =>
                        setNewDevice({
                          ...newDevice,
                          config: {
                            ...newDevice.config,
                            parameters: e.target.value
                              .split(",")
                              .map((p) => p.trim()),
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      例如: temperature, salinity, dissolvedOxygen
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsAddDeviceOpen(false)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md shadow-sm text-gray-700 hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm border border-transparent rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600"
                  >
                    添加设备
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 编辑设备模态框 */}
      {isEditDeviceOpen && editingDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">编辑设备</h3>

              <form onSubmit={handleUpdateDevice}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      设备名称
                    </label>
                    <input
                      type="text"
                      required
                      value={editingDevice.name}
                      onChange={(e) =>
                        setEditingDevice({
                          ...editingDevice,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      设备类型
                    </label>
                    <select
                      value={editingDevice.type}
                      onChange={(e) =>
                        setEditingDevice({
                          ...editingDevice,
                          type: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    >
                      <option value="浮标">浮标</option>
                      <option value="固定观测站">固定观测站</option>
                      <option value="研究平台">研究平台</option>
                      <option value="水下机器人">水下机器人</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        纬度
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        required
                        value={editingDevice.location.latitude}
                        onChange={(e) =>
                          setEditingDevice({
                            ...editingDevice,
                            location: {
                              ...editingDevice.location,
                              latitude: parseFloat(e.target.value),
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        经度
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        required
                        value={editingDevice.location.longitude}
                        onChange={(e) =>
                          setEditingDevice({
                            ...editingDevice,
                            location: {
                              ...editingDevice.location,
                              longitude: parseFloat(e.target.value),
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      位置描述
                    </label>
                    <input
                      type="text"
                      value={editingDevice.location.description || ""}
                      onChange={(e) =>
                        setEditingDevice({
                          ...editingDevice,
                          location: {
                            ...editingDevice.location,
                            description: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        采样频率 (分钟)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={editingDevice.config.sampleRate}
                        onChange={(e) =>
                          setEditingDevice({
                            ...editingDevice,
                            config: {
                              ...editingDevice.config,
                              sampleRate: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        上传间隔 (分钟)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={editingDevice.config.uploadInterval}
                        onChange={(e) =>
                          setEditingDevice({
                            ...editingDevice,
                            config: {
                              ...editingDevice.config,
                              uploadInterval: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      监测参数 (逗号分隔)
                    </label>
                    <input
                      type="text"
                      required
                      value={
                        Array.isArray(editingDevice.config.parameters)
                          ? editingDevice.config.parameters.join(", ")
                          : editingDevice.config.parameters
                      }
                      onChange={(e) =>
                        setEditingDevice({
                          ...editingDevice,
                          config: {
                            ...editingDevice.config,
                            parameters: e.target.value
                              .split(",")
                              .map((p) => p.trim()),
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      例如: temperature, salinity, dissolvedOxygen
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditDeviceOpen(false);
                      setEditingDevice(null);
                    }}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md shadow-sm text-gray-700 hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm border border-transparent rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600"
                  >
                    保存修改
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
