"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

export default function SendAlertPage() {
  const [apiKey, setApiKey] = useState("ocean-monitor-api-key");
  const [deviceId, setDeviceId] = useState("device-001");
  const [alertData, setAlertData] = useState({
    alertType: "highTemperature", // 默认警报类型
    severity: "medium", // 默认严重程度，与schema统一
    parameter: "temperature", // 默认参数
    value: "28.5", // 默认值
    threshold: "25.0", // 默认阈值
    description: "温度超过警戒值", // 默认描述
    latitude: "30.5",
    longitude: "121.3",
    depth: "5",
  });
  const [apiResponse, setApiResponse] = useState<{
    success: boolean;
    id: string;
  } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);

  // 获取设备列表
  const devices = useQuery(api.devices.getAll) || [];

  // 警报类型选项
  const alertTypes = [
    { value: "highTemperature", label: "高温警报" },
    { value: "lowTemperature", label: "低温警报" },
    { value: "highSalinity", label: "高盐度警报" },
    { value: "lowSalinity", label: "低盐度警报" },
    { value: "lowOxygen", label: "低氧警报" },
    { value: "highTurbidity", label: "高浊度警报" },
    { value: "abnormalPH", label: "异常pH值" },
    { value: "deviceError", label: "设备故障" },
  ];

  // 参数选项
  const parameterOptions = [
    { value: "temperature", label: "温度" },
    { value: "salinity", label: "盐度" },
    { value: "dissolvedOxygen", label: "溶解氧" },
    { value: "pH", label: "pH值" },
    { value: "flowRate", label: "流速" },
    { value: "turbidity", label: "浊度" },
    { value: "device", label: "设备状态" },
  ];

  // 严重程度选项
  const severityOptions = [
    { value: "low", label: "低" },
    { value: "medium", label: "中等" },
    { value: "high", label: "高" },
    { value: "info", label: "信息" },
  ];

  // 在客户端更新时间戳
  useEffect(() => {
    setCurrentTimestamp(Date.now());

    // 每秒更新一次时间戳
    const intervalId = setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 10000); // 10秒更新一次，避免频繁更新

    return () => clearInterval(intervalId);
  }, []);

  // 手动发送警报
  const sendManualAlert = async () => {
    try {
      setApiError(null);
      setApiResponse(null);

      // 准备数据
      const data = {
        deviceId,
        timestamp: Date.now(),
        location: {
          latitude: parseFloat(alertData.latitude),
          longitude: parseFloat(alertData.longitude),
          depth: parseFloat(alertData.depth),
        },
        alertType: alertData.alertType,
        severity: alertData.severity,
        parameter: alertData.parameter,
        value: parseFloat(alertData.value),
        threshold: parseFloat(alertData.threshold),
        description: alertData.description,
      };

      // 发送到API
      const response = await fetch("/api/alert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setApiResponse(result);
      } else {
        setApiError(result.error);
      }
    } catch (error) {
      setApiError((error as Error).message);
    }
  };

  // 处理输入变化
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setAlertData((prev) => ({ ...prev, [name]: value }));
  };

  // 客户端渲染的示例JSON
  const exampleJson = currentTimestamp
    ? `{
  "deviceId": "device-001",
  "timestamp": ${currentTimestamp},
  "location": {
    "latitude": 30.5,
    "longitude": 121.3,
    "depth": 5
  },
  "alertType": "highTemperature",
  "severity": "medium",
  "parameter": "temperature",
  "value": 28.5,
  "threshold": 25.0,
  "description": "温度超过警戒值"
}`
    : "";

  // 客户端渲染的curl命令
  const curlCommand = currentTimestamp
    ? `curl -X POST \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{"deviceId":"device-001","timestamp":${currentTimestamp},"alertType":"highTemperature","severity":"medium","parameter":"temperature","value":28.5,"threshold":25.0}' \\
  http://localhost:3000/api/alert`
    : "";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-800">发送警报API</h1>
            <p className="text-gray-500">发送海洋指标异常警报</p>
          </div>
          <div className="flex space-x-4">
            <Link
              href="/admin/api"
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              返回API管理
            </Link>
            <Link
              href="/admin"
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              返回管理主页
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 手动发送警报 */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-blue-700 border-b pb-2">
              手动发送警报
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API密钥
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                设备ID
              </label>
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                {devices.map((device) => (
                  <option key={device._id} value={device._id}>
                    {device.name} ({device._id})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  警报类型
                </label>
                <select
                  name="alertType"
                  value={alertData.alertType}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  {alertTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  严重程度
                </label>
                <select
                  name="severity"
                  value={alertData.severity}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  {severityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  参数类型
                </label>
                <select
                  name="parameter"
                  value={alertData.parameter}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  {parameterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  实际值
                </label>
                <input
                  type="text"
                  name="value"
                  value={alertData.value}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  阈值
                </label>
                <input
                  type="text"
                  name="threshold"
                  value={alertData.threshold}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <textarea
                  name="description"
                  value={alertData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  纬度
                </label>
                <input
                  type="text"
                  name="latitude"
                  value={alertData.latitude}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  经度
                </label>
                <input
                  type="text"
                  name="longitude"
                  value={alertData.longitude}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  深度 (m)
                </label>
                <input
                  type="text"
                  name="depth"
                  value={alertData.depth}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <button
              onClick={sendManualAlert}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors shadow-sm font-medium"
            >
              发送警报
            </button>

            {apiResponse && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <h3 className="font-medium text-green-700 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  API响应成功
                </h3>
                <pre className="mt-2 text-sm overflow-auto bg-white p-2 rounded border">
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              </div>
            )}

            {apiError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <h3 className="font-medium text-red-700 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  API响应错误
                </h3>
                <p className="mt-1 text-sm text-red-600">{apiError}</p>
              </div>
            )}
          </div>

          {/* API文档 */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-blue-700 border-b pb-2">
              API文档
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-800 mb-2">发送警报</h3>
                <div className="flex items-center text-sm text-gray-600 mb-3 bg-blue-50 px-3 py-1 rounded-md">
                  <span className="font-mono bg-blue-100 px-2 py-0.5 rounded mr-2">
                    POST
                  </span>
                  <span>/api/alert</span>
                </div>

                <div className="bg-gray-50 p-4 rounded-md border">
                  <h4 className="text-sm font-medium mb-2 text-gray-700">
                    请求头
                  </h4>
                  <pre className="text-xs overflow-auto bg-white p-3 rounded border">
                    {`{
  "Content-Type": "application/json",
  "x-api-key": "your-api-key"
}`}
                  </pre>

                  <h4 className="text-sm font-medium mt-4 mb-2 text-gray-700">
                    请求体示例
                  </h4>
                  {currentTimestamp ? (
                    <pre className="text-xs overflow-auto bg-white p-3 rounded border">
                      {exampleJson}
                    </pre>
                  ) : (
                    <div className="text-center py-3 bg-white rounded border">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 inline-block mr-2"></div>
                      加载中...
                    </div>
                  )}

                  <h4 className="text-sm font-medium mt-4 mb-2 text-gray-700">
                    响应示例
                  </h4>
                  <pre className="text-xs overflow-auto bg-white p-3 rounded border">
                    {`{
  "success": true,
  "id": "alert-id"
}`}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-2">使用curl测试</h3>
                {currentTimestamp ? (
                  <pre className="text-xs bg-gray-50 p-4 rounded-md border overflow-auto">
                    {curlCommand}
                  </pre>
                ) : (
                  <div className="text-center py-3 bg-gray-50 p-3 rounded-md border">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 inline-block mr-2"></div>
                    加载中...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
