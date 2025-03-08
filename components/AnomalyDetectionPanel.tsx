"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function AnomalyDetectionPanel() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [lookbackHours, setLookbackHours] = useState(24);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  // 获取所有设备
  const devices = useQuery(api.devices.getAll) || [];
  const detectAnomalies = useMutation(api.oceanElements.detectAnomalies);

  const handleDetectAnomalies = async () => {
    try {
      setIsDetecting(true);
      const result = await detectAnomalies({
        deviceId: selectedDeviceId || undefined,
        lookbackHours,
      });
      setResult(result);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setIsDetecting(false);
    }
  };

  // 将参数名称翻译为中文
  const parameterNames = {
    temperature: "温度",
    salinity: "盐度",
    dissolvedOxygen: "溶解氧",
    pH: "pH值",
    turbidity: "浊度",
    flowRate: "流速",
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-4">异常检测</h2>

      <div className="mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            选择设备（可选）
          </label>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          >
            <option value="">所有设备</option>
            {devices.map((device) => (
              <option key={device._id} value={device._id}>
                {device.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            不选择设备则分析所有设备的数据
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            回溯时间（小时）
          </label>
          <input
            type="number"
            min="1"
            max="72"
            value={lookbackHours}
            onChange={(e) => setLookbackHours(Number(e.target.value))}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            分析最近多少小时的数据（1-72小时）
          </p>
        </div>

        <button
          onClick={handleDetectAnomalies}
          disabled={isDetecting}
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {isDetecting ? "检测中..." : "开始异常检测"}
        </button>
      </div>

      {isDetecting && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="mt-2 text-sm text-gray-500">正在分析数据，请稍候...</p>
        </div>
      )}

      {result && !isDetecting && (
        <div className="border rounded-md overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h3 className="font-medium">{result.message}</h3>
          </div>

          {result.anomalies && result.anomalies.length > 0 ? (
            <div className="divide-y">
              {result.anomalies.map((anomaly, index) => (
                <div key={index} className="p-3 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">设备ID: {anomaly.deviceId}</p>
                      <p className="text-sm text-gray-500">
                        时间: {new Date(anomaly.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-medium mb-1">异常参数:</p>
                    <ul className="text-sm space-y-1">
                      {anomaly.anomalies.map((param, pIndex) => (
                        <li
                          key={pIndex}
                          className="pl-2 border-l-2 border-red-400"
                        >
                          <span className="font-medium">
                            {parameterNames[param.parameter] || param.parameter}
                            :
                          </span>{" "}
                          {param.value.toFixed(2)}{" "}
                          <span className="text-gray-500">
                            (偏离 {Math.abs(param.deviation).toFixed(1)}{" "}
                            个标准差)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              {result.data && result.data.length > 0
                ? "未检测到异常数据"
                : "没有足够的数据进行分析"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
