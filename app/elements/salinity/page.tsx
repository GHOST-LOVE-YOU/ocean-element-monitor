"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo } from "react";
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

export default function SalinityDetailPage() {
  const [timeRange, setTimeRange] = useState({
    days: 7,
    label: "7天",
  });

  // Memoize time calculations to prevent unnecessary re-renders
  const { startTime, endTime } = useMemo(() => {
    const end = Date.now();
    const start = end - timeRange.days * 24 * 60 * 60 * 1000;
    return { startTime: start, endTime: end };
  }, [timeRange.days]);

  const salinityData = useQuery(api.oceanElements.getByTimeRange, {
    startTime,
    endTime,
  });

  const statistics = useQuery(api.analysis.getStatistics, {
    parameter: "salinity",
    timeRange: { start: startTime, end: endTime },
  });

  const devices = useQuery(api.devices.getAll);

  // 处理图表数据
  const processChartData = () => {
    if (!salinityData) return null;

    const sortedData = [...salinityData].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    // 为每个设备创建一个数据集
    const deviceMap = new Map();

    sortedData.forEach((item) => {
      if (!item.salinity) return;

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
        y: item.salinity,
      });
    });

    return {
      datasets: Array.from(deviceMap.values()),
    };
  };

  // 生成随机颜色但基于设备ID保持一致
  function getRandomColor(seed: string, alpha = 1) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }

    const r = ((hash & 0xff) % 200) + 20;
    const g = (((hash >> 8) & 0xff) % 200) + 20;
    const b = (((hash >> 16) & 0xff) % 200) + 20;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Use useMemo to memoize the chart data
  const chartData = useMemo(() => processChartData(), [salinityData]);

  // Memoize the getLatestSalinity function to prevent it from being recreated on each render
  const getLatestSalinity = useMemo(() => {
    return (deviceId: string) => {
      if (!salinityData) return "--";

      const deviceData = salinityData
        .filter(
          (item) => item.deviceId === deviceId && item.salinity !== undefined
        )
        .sort((a, b) => b.timestamp - a.timestamp);

      if (deviceData.length === 0) return "--";

      const salinity = deviceData[0]?.salinity;
      if (salinity === undefined) return "--";

      return `${salinity.toFixed(1)}‰`;
    };
  }, [salinityData]);

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
            <h1 className="text-2xl font-bold">海水盐度详细分析</h1>
            <p className="text-gray-500">查看和分析海水盐度历史数据</p>
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
          <h3 className="text-sm font-medium text-gray-500">平均盐度</h3>
          <p className="text-2xl font-bold mt-1">
            {statistics && statistics.average !== undefined
              ? statistics.average.toFixed(1)
              : "--"}
            ‰
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">最高盐度</h3>
          <p className="text-2xl font-bold mt-1">
            {statistics && statistics.maximum !== undefined
              ? statistics.maximum.toFixed(1)
              : "--"}
            ‰
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">最低盐度</h3>
          <p className="text-2xl font-bold mt-1">
            {statistics && statistics.minimum !== undefined
              ? statistics.minimum.toFixed(1)
              : "--"}
            ‰
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
          盐度变化趋势 - {timeRange.label}
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
                      text: "盐度 (‰)",
                    },
                    suggestedMin: 30,
                    suggestedMax: 40,
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
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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
                  最新盐度
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
                        {getLatestSalinity(device._id)}
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
}
