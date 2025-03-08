"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useMemo } from "react";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import { zhCN } from "date-fns/locale";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

export default function TemperatureDetailPage() {
  const [timeRange, setTimeRange] = useState({
    days: 7,
    label: "7天",
  });

  // Use useMemo to calculate time range values to prevent recalculations on every render
  const { startTime, endTime } = useMemo(() => {
    const end = Date.now();
    const start = end - timeRange.days * 24 * 60 * 60 * 1000;
    return { startTime: start, endTime: end };
  }, [timeRange.days]);

  const temperatureData = useQuery(api.oceanElements.getByTimeRange, {
    startTime,
    endTime,
  });

  useEffect(() => {
    console.log("TimeRange:", { startTime, endTime });
    console.log("Temperature data:", temperatureData);
  }, [temperatureData, startTime, endTime]);

  const hourlyTrends = useQuery(api.oceanElements.getHourlyTrends, {
    parameter: "temperature",
    days: timeRange.days,
  });

  useEffect(() => {
    console.log("Hourly trends:", hourlyTrends);
  }, [hourlyTrends]);

  const statistics = useQuery(api.analysis.getStatistics, {
    parameter: "temperature",
    timeRange: { start: startTime, end: endTime },
  });

  const devices = useQuery(api.devices.getAll);

  // 处理图表数据
  const processChartData = () => {
    // 检查是否有主要数据源
    if (temperatureData && temperatureData.length > 0) {
      const sortedData = [...temperatureData].sort(
        (a, b) => a.timestamp - b.timestamp
      );

      // 为每个设备创建一个数据集
      const deviceMap = new Map();

      sortedData.forEach((item) => {
        if (!item.temperature) return;

        if (!deviceMap.has(item.deviceId)) {
          deviceMap.set(item.deviceId, {
            label: `设备 ${item.deviceId.substring(0, 8)}`,
            data: [],
            borderColor: getRandomColor(item.deviceId),
            backgroundColor: getRandomColor(item.deviceId, 0.5),
            tension: 0.3,
          });
        }

        deviceMap.get(item.deviceId).data.push({
          x: item.timestamp,
          y: item.temperature,
        });
      });

      return {
        datasets: Array.from(deviceMap.values()),
      };
    }
    // 尝试使用小时趋势数据作为备选
    else if (hourlyTrends && hourlyTrends.length > 0) {
      return {
        datasets: [
          {
            label: "平均温度",
            data: hourlyTrends.map((item) => ({
              x: item.timestamp,
              y: item.average,
            })),
            borderColor: "rgb(53, 162, 235)",
            backgroundColor: "rgba(53, 162, 235, 0.5)",
            tension: 0.3,
          },
          {
            label: "最高温度",
            data: hourlyTrends.map((item) => ({
              x: item.timestamp,
              y: item.max,
            })),
            borderColor: "rgb(255, 99, 132)",
            backgroundColor: "rgba(255, 99, 132, 0.5)",
            borderDash: [5, 5],
            tension: 0.3,
          },
          {
            label: "最低温度",
            data: hourlyTrends.map((item) => ({
              x: item.timestamp,
              y: item.min,
            })),
            borderColor: "rgb(75, 192, 192)",
            backgroundColor: "rgba(75, 192, 192, 0.5)",
            borderDash: [5, 5],
            tension: 0.3,
          },
        ],
      };
    }

    // 如果没有数据，返回null
    return null;
  };

  // 生成随机颜色但基于设备ID保持一致
  function getRandomColor(seed: string, alpha = 1) {
    // 简单的字符串哈希函数
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }

    // 确保颜色多样性
    const r = ((hash & 0xff) % 200) + 20;
    const g = (((hash >> 8) & 0xff) % 200) + 20;
    const b = (((hash >> 16) & 0xff) % 200) + 20;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const chartData = processChartData();

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
            <h1 className="text-2xl font-bold">海水温度详细分析</h1>
            <p className="text-gray-500">查看和分析海水温度历史数据</p>
          </div>

          <div className="flex space-x-2 mt-4 md:mt-0">
            <button
              onClick={() => setTimeRange({ days: 1, label: "24小时" })}
              className={`px-3 py-1 text-sm rounded-md ${
                timeRange.days === 1
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 border"
              }`}
            >
              24小时
            </button>
            <button
              onClick={() => setTimeRange({ days: 7, label: "7天" })}
              className={`px-3 py-1 text-sm rounded-md ${
                timeRange.days === 7
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 border"
              }`}
            >
              7天
            </button>
            <button
              onClick={() => setTimeRange({ days: 30, label: "30天" })}
              className={`px-3 py-1 text-sm rounded-md ${
                timeRange.days === 30
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 border"
              }`}
            >
              30天
            </button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">平均温度</h3>
          <p className="text-2xl font-bold mt-1">
            {statistics && statistics.average !== undefined
              ? statistics.average.toFixed(1)
              : "--"}
            °C
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">最高温度</h3>
          <p className="text-2xl font-bold mt-1">
            {statistics && statistics.maximum !== undefined
              ? statistics.maximum.toFixed(1)
              : "--"}
            °C
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">最低温度</h3>
          <p className="text-2xl font-bold mt-1">
            {statistics && statistics.minimum !== undefined
              ? statistics.minimum.toFixed(1)
              : "--"}
            °C
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">数据趋势</h3>
          <p className="text-2xl font-bold mt-1">
            {statistics
              ? statistics.trend === "increasing"
                ? "上升"
                : statistics.trend === "decreasing"
                  ? "下降"
                  : statistics.trend === "stable"
                    ? "稳定"
                    : "数据不足"
              : "--"}
          </p>
        </div>
      </div>

      {/* 主图表 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <h2 className="text-lg font-medium mb-4">
          温度变化趋势 - {timeRange.label}
        </h2>
        <div className="h-80">
          {chartData ? (
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: {
                    type: "time",
                    time: {
                      unit:
                        timeRange.days === 1
                          ? "hour"
                          : timeRange.days === 7
                            ? "day"
                            : "week",
                      displayFormats: {
                        hour: "HH:mm",
                        day: "MM-dd",
                        week: "yyyy-MM-dd",
                      },
                    },
                    adapters: {
                      date: {
                        locale: zhCN,
                      },
                    },
                    title: {
                      display: true,
                      text: "时间",
                    },
                  },
                  y: {
                    title: {
                      display: true,
                      text: "温度 (°C)",
                    },
                  },
                },
                plugins: {
                  legend: {
                    position: "top",
                  },
                  tooltip: {
                    callbacks: {
                      title: function (context) {
                        const date = new Date(context[0].parsed.x);
                        return date.toLocaleString();
                      },
                    },
                  },
                },
              }}
            />
          ) : temperatureData === undefined || hourlyTrends === undefined ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center flex-col">
              <p className="text-gray-500 mb-2">暂无数据</p>
              <button
                onClick={() => (window.location.href = "/admin")}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                前往生成测试数据
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 设备列表 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-medium mb-4">监测设备</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  设备名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最新温度
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  位置
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {devices ? (
                devices.length > 0 ? (
                  devices.map((device) => (
                    <tr key={device._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {device.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getLatestTemperature(device._id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {device.location.latitude.toFixed(4)},{" "}
                        {device.location.longitude.toFixed(4)}
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
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      没有找到设备数据
                    </td>
                  </tr>
                )
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500 mx-auto"></div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );

  // 辅助函数：获取设备最新温度
  function getLatestTemperature(deviceId: string) {
    if (!temperatureData) return "--";

    const deviceData = temperatureData
      .filter(
        (item) => item.deviceId === deviceId && item.temperature !== undefined
      )
      .sort((a, b) => b.timestamp - a.timestamp);

    if (deviceData.length === 0) return "--";

    // Fix TypeScript error by checking if the first item exists
    return deviceData[0]?.temperature
      ? `${deviceData[0].temperature.toFixed(1)}°C`
      : "--";
  }
}
