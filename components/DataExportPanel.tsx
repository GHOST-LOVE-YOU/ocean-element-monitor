"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function DataExportPanel() {
  const [dataType, setDataType] = useState("oceanElements");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState("csv");

  // 获取所有设备
  const devices = useQuery(api.devices.getAll) || [];

  // 当前日期
  const today = new Date().toISOString().split("T")[0];
  // 默认开始日期为30天前
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  const thirtyDaysAgo = defaultStartDate.toISOString().split("T")[0];

  // 处理导出操作
  const handleExport = async (format) => {
    try {
      setIsExporting(true);
      setExportFormat(format);

      if (!startDate) setStartDate(thirtyDaysAgo);
      if (!endDate) setEndDate(today);

      // 转换日期为时间戳
      const startTime = new Date(startDate || thirtyDaysAgo).getTime();
      const endTime =
        new Date(endDate || today).getTime() + (24 * 60 * 60 * 1000 - 1); // 包含结束日期的整天

      // 获取数据
      const data = await window.convex.query(api.oceanElements.exportData, {
        startTime,
        endTime,
        deviceId: selectedDeviceId || undefined,
        format,
      });

      // 处理导出结果
      if (format === "csv") {
        downloadCSV(data, `海洋数据_${startDate}_${endDate}.csv`);
      } else if (format === "excel") {
        // Excel需要前端处理，但我们可以先简单地用JSON代替
        downloadJSON(data, `海洋数据_${startDate}_${endDate}.json`);
      } else {
        downloadJSON(data, `海洋数据_${startDate}_${endDate}.json`);
      }
    } catch (error) {
      console.error("导出失败:", error);
      alert(`导出失败: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 下载CSV文件
  const downloadCSV = (csvString, filename) => {
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    downloadFile(blob, filename);
  };

  // 下载JSON文件
  const downloadJSON = (data, filename) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], {
      type: "application/json;charset=utf-8;",
    });
    downloadFile(blob, filename);
  };

  // 通用下载文件函数
  const downloadFile = (blob, filename) => {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 0);
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-4">数据导出</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            数据类型
          </label>
          <select
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            value={dataType}
            onChange={(e) => setDataType(e.target.value)}
          >
            <option value="oceanElements">海洋元素数据</option>
            <option value="devices">设备监控数据</option>
            <option value="alerts">警报历史</option>
            <option value="analysis">分析结果</option>
          </select>
        </div>

        {dataType === "oceanElements" && (
          <div>
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
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            时间范围
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              placeholder="开始日期"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={today}
            />
            <input
              type="date"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              placeholder="结束日期"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              max={today}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            不选择日期范围则默认为最近30天
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
            onClick={() => handleExport("csv")}
            disabled={isExporting}
          >
            {isExporting && exportFormat === "csv" ? "导出中..." : "导出 CSV"}
          </button>
          <button
            className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300"
            onClick={() => handleExport("excel")}
            disabled={isExporting}
          >
            {isExporting && exportFormat === "excel"
              ? "导出中..."
              : "导出 Excel"}
          </button>
        </div>

        {isExporting && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-sm text-gray-500">正在准备数据...</span>
          </div>
        )}
      </div>
    </div>
  );
}
