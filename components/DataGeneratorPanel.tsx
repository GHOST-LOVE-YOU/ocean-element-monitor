"use client";

import { useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function DataGeneratorPanel() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [days, setDays] = useState(7);
  const [pointsPerDay, setPointsPerDay] = useState(24);

  // 获取所有设备
  const devices = useQuery(api.devices.getAll) || [];
  const createSampleDevices = useMutation(api.generateData.createSampleDevices);
  const generateHistorical = useAction(api.generateData.generateHistoricalData);
  const generateRealtime = useAction(api.generateData.generateRealtimeUpdate);

  const handleCreateSampleDevices = async () => {
    try {
      setIsGenerating(true);
      const result = await createSampleDevices();
      setResult(result);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateHistorical = async (deviceId: string) => {
    try {
      setIsGenerating(true);
      const result = await generateHistorical({
        deviceId,
        days,
        dataPointsPerDay: pointsPerDay,
      });
      setResult(result);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateRealtime = async () => {
    try {
      setIsGenerating(true);
      const deviceIds = devices.map((device) => device._id);
      const result = await generateRealtime({ deviceIds });
      setResult(result);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-4">数据生成器</h2>

      <div className="mb-4">
        <h3 className="text-md font-medium mb-2">配置</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              历史数据天数
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              每天数据点数
            </label>
            <input
              type="number"
              min="1"
              max="144"
              value={pointsPerDay}
              onChange={(e) => setPointsPerDay(Number(e.target.value))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <button
            onClick={handleCreateSampleDevices}
            disabled={isGenerating}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            创建示例设备
          </button>
        </div>

        <div>
          <button
            onClick={handleGenerateRealtime}
            disabled={isGenerating || devices.length === 0}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            生成实时数据更新
          </button>
        </div>

        {devices.length > 0 && (
          <div>
            <h3 className="text-md font-medium mb-2">为设备生成历史数据</h3>
            <div className="space-y-2">
              {devices.map((device) => (
                <div
                  key={device._id}
                  className="flex items-center justify-between bg-gray-50 p-2 rounded"
                >
                  <span className="text-sm">{device.name}</span>
                  <button
                    onClick={() => handleGenerateHistorical(device._id)}
                    disabled={isGenerating}
                    className="py-1 px-3 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    生成历史数据
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isGenerating && (
        <div className="mt-4 text-center">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-500">正在生成数据...</span>
        </div>
      )}

      {result && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <h3 className="text-sm font-medium mb-1">结果</h3>
          <pre className="text-xs overflow-auto max-h-40">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
