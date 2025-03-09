"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

export default function AdminPage() {
  // 历史数据生成状态
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [days, setDays] = useState<number>(7);
  const [dataPointsPerDay, setDataPointsPerDay] = useState<number>(48);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<string>("");
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // 获取系统统计数据
  const devices =
    useQuery(api.devices.getAll, {}, { refreshKey: String(refreshKey) }) || [];
  const alerts = useQuery(api.alerts.getAll, { status: "new" }) || [];
  const latestData = useQuery(api.oceanElements.getLatest, { limit: 1 });

  // Convex mutations
  const startSimulation = useMutation(api.scheduler.startDeviceSimulation);
  const stopSimulation = useMutation(api.scheduler.stopDeviceSimulation);
  const initScheduler = useMutation(api.scheduler.initScheduler);

  // 初始化定时任务
  useEffect(() => {
    // 初始化定时任务
    initScheduler()
      .then(() => {
        setInitialized(true);
      })
      .catch((error) => {
        setError("初始化定时任务失败");
      });
  }, [initScheduler]);

  // 计算系统状态
  const systemStatus = {
    deviceCount: devices.length,
    onlineDevices: devices.filter((d) => d.status === "online").length,
    simulatingDevices: devices.filter((d) => d.isSimulating ?? false).length,
    alertCount: alerts.length,
    lastDataUpdate:
      latestData && latestData.length > 0
        ? new Date(latestData[0].timestamp).toLocaleString()
        : "无数据",
  };

  // 切换设备模拟状态
  const toggleSimulation = async (
    deviceId: Id<"devices">,
    isSimulating: boolean
  ) => {
    try {
      if (isSimulating) {
        await stopSimulation({ deviceId });
      } else {
        await startSimulation({ deviceId });
      }
      setRefreshKey(Date.now()); // 触发设备列表刷新
    } catch (error) {
      setError("模拟状态切换失败");
    }
  };

  // 生成历史数据
  const generateHistoricalData = async () => {
    if (!selectedDevice || isGenerating) return;

    setIsGenerating(true);
    setGenerationResult("");

    try {
      const response = await fetch("/api/historical", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceId: selectedDevice,
          days,
          dataPointsPerDay,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setGenerationResult(`成功生成 ${result.count} 条历史数据`);
      } else {
        setGenerationResult(`生成失败: ${result.error}`);
      }
    } catch (error: any) {
      setGenerationResult(`生成失败: ${error.message || "未知错误"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">设备模拟器</h1>
            <p className="text-gray-500">管理和模拟设备数据发送</p>
          </div>
          <div className="flex space-x-4">
            <Link
              href="/dashboard"
              className="text-blue-500 hover:text-blue-700"
            >
              返回仪表板
            </Link>
            <Link
              href="/admin/api"
              className="text-blue-500 hover:text-blue-700"
            >
              API管理
            </Link>
          </div>
        </div>

        {/* 系统状态概览 */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4">系统状态</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg bg-blue-50">
              <div className="text-sm font-medium text-gray-500">监测设备</div>
              <div className="mt-1 flex justify-between items-end">
                <div className="text-2xl font-bold">
                  {systemStatus.deviceCount}
                </div>
                <div className="text-sm text-blue-600">
                  {systemStatus.onlineDevices} 在线
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-green-50">
              <div className="text-sm font-medium text-gray-500">
                模拟中设备
              </div>
              <div className="mt-1 flex justify-between items-end">
                <div className="text-2xl font-bold">
                  {systemStatus.simulatingDevices}
                </div>
                <div className="text-sm text-green-600">自动发送数据</div>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-red-50">
              <div className="text-sm font-medium text-gray-500">活跃警报</div>
              <div className="mt-1 flex justify-between items-end">
                <div className="text-2xl font-bold">
                  {systemStatus.alertCount}
                </div>
                <div className="text-sm text-red-600">
                  {systemStatus.alertCount > 0 ? "需要处理" : "无警报"}
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-purple-50">
              <div className="text-sm font-medium text-gray-500">
                最后数据更新
              </div>
              <div className="mt-1 flex justify-between items-end">
                <div className="text-lg font-bold truncate">
                  {systemStatus.lastDataUpdate}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 设备列表 */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4">设备列表</h2>
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
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    位置
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最后活动时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {devices.map((device) => (
                  <tr key={device._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {device.name}
                      </div>
                      <div className="text-sm text-gray-500">{device._id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {device.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          device.status === "online"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {device.status === "online" ? "在线" : "离线"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {device.location.description ||
                        `${device.location.latitude}, ${device.location.longitude}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {device.lastActive
                        ? new Date(device.lastActive).toLocaleString()
                        : "从未活动"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() =>
                          toggleSimulation(
                            device._id,
                            device.isSimulating ?? false
                          )
                        }
                        className={`px-3 py-1 rounded ${
                          device.isSimulating
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : "bg-green-500 hover:bg-green-600 text-white"
                        }`}
                      >
                        {device.isSimulating ? "停止模拟" : "开始模拟"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 历史数据生成 */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">历史数据生成</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                选择设备
              </label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">请选择设备</option>
                {devices.map((device) => (
                  <option key={device._id} value={device._id}>
                    {device.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                生成天数
              </label>
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                min="1"
                max="30"
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                每天数据点数
              </label>
              <input
                type="number"
                value={dataPointsPerDay}
                onChange={(e) => setDataPointsPerDay(parseInt(e.target.value))}
                min="1"
                max="144"
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={generateHistoricalData}
                disabled={!selectedDevice || isGenerating}
                className={`w-full p-2 rounded ${
                  !selectedDevice || isGenerating
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                {isGenerating ? "生成中..." : "生成历史数据"}
              </button>
            </div>
          </div>

          {generationResult && (
            <div
              className={`mt-4 p-3 rounded ${
                generationResult.includes("成功")
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <p
                className={`text-sm ${
                  generationResult.includes("成功")
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                {generationResult}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
