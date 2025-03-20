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
import { OceanDataType } from "@/components/OceanDataChart";

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

// 配置不同元素的显示信息
const elementConfig = {
  temperature: {
    title: "海水温度",
    unit: "°C",
    description: "查看和分析海水温度历史数据",
    chartColor: "rgb(53, 162, 235)",
    chartBgColor: "rgba(53, 162, 235, 0.5)",
    maxColor: "rgb(255, 99, 132)",
    maxBgColor: "rgba(255, 99, 132, 0.5)",
    minColor: "rgb(75, 192, 192)",
    minBgColor: "rgba(75, 192, 192, 0.5)",
    predictionColor: "rgb(255, 159, 64)",
    predictionBgColor: "rgba(255, 159, 64, 0.5)",
    yAxisMin: 5,
    yAxisMax: 30,
  },
  salinity: {
    title: "海水盐度",
    unit: "PSU",
    description: "查看和分析海水盐度历史数据",
    chartColor: "rgb(75, 192, 192)",
    chartBgColor: "rgba(75, 192, 192, 0.5)",
    maxColor: "rgb(255, 159, 64)",
    maxBgColor: "rgba(255, 159, 64, 0.5)",
    minColor: "rgb(54, 162, 235)",
    minBgColor: "rgba(54, 162, 235, 0.5)",
    predictionColor: "rgb(153, 102, 255)",
    predictionBgColor: "rgba(153, 102, 255, 0.5)",
    yAxisMin: 34,
    yAxisMax: 36,
  },
  dissolvedOxygen: {
    title: "溶解氧",
    unit: "mg/L",
    description: "查看和分析海水溶解氧历史数据",
    chartColor: "rgb(153, 102, 255)",
    chartBgColor: "rgba(153, 102, 255, 0.5)",
    maxColor: "rgb(255, 99, 132)",
    maxBgColor: "rgba(255, 99, 132, 0.5)",
    minColor: "rgb(75, 192, 192)",
    minBgColor: "rgba(75, 192, 192, 0.5)",
    predictionColor: "rgb(255, 159, 64)",
    predictionBgColor: "rgba(255, 159, 64, 0.5)",
    yAxisMin: 4,
    yAxisMax: 10,
  },
};

interface OceanElementDetailPageProps {
  elementType: OceanDataType;
}

export default function OceanElementDetailPage({
  elementType,
}: OceanElementDetailPageProps) {
  const config = elementConfig[elementType];

  const [timeRange, setTimeRange] = useState({
    days: 7,
    label: "7天",
  });

  // 添加数据获取键，确保时间范围变化时强制更新
  const [dataFetchKey, setDataFetchKey] = useState<string>(`${timeRange.days}`);

  // 当时间范围变化时，更新dataFetchKey
  useEffect(() => {
    // 使用日期和随机数，确保每次都是新的键
    setDataFetchKey(`${timeRange.days}-${Date.now()}-${Math.random()}`);
  }, [timeRange]);

  // 使用useMemo计算时间范围以避免不必要的重新渲染
  const { startTime, endTime } = useMemo(() => {
    // 确保使用当前时间作为结束时间，而不是缓存的时间
    const end = Date.now();
    const start = end - timeRange.days * 24 * 60 * 60 * 1000;
    return { startTime: start, endTime: end };
  }, [timeRange.days]);

  // 添加dataFetchKey作为第二个参数，确保时间范围变化时重新获取数据
  const elementData = useQuery(
    api.oceanElements.getByTimeRange,
    {
      startTime,
      endTime,
    },
    {
      refetchKey: dataFetchKey, // 使用refetchKey来强制重新获取数据
    }
  );

  const hourlyTrends = useQuery(
    api.oceanElements.getHourlyTrends,
    {
      parameter: elementType,
      days: timeRange.days,
    },
    {
      refetchKey: dataFetchKey, // 使用refetchKey来强制重新获取数据
    }
  );

  // 获取预测数据
  const predictedData = useQuery(
    api.oceanElements.getPredictedTrends,
    {
      parameter: elementType,
      days: timeRange.days,
      predictionDays: 2, // 预测未来2天
    },
    {
      refetchKey: dataFetchKey,
    }
  );

  const statistics = useQuery(
    api.analysis.getStatistics,
    {
      parameter: elementType,
      timeRange: { start: startTime, end: endTime },
    },
    {
      refetchKey: dataFetchKey, // 使用refetchKey来强制重新获取数据
    }
  );

  const devices = useQuery(api.devices.getAll);

  // 处理图表数据
  const processChartData = () => {
    // 检查是否有主要数据源
    if (elementData && elementData.length > 0) {
      // 确保数据在指定的时间范围内
      const filteredData = elementData.filter(
        (item) => item.timestamp >= startTime && item.timestamp <= endTime
      );

      // 按时间排序
      const sortedData = [...filteredData].sort(
        (a, b) => a.timestamp - b.timestamp
      );

      // 为每个设备创建一个数据集
      const deviceMap = new Map();

      sortedData.forEach((item) => {
        if (!item[elementType]) return;

        if (!deviceMap.has(item.deviceId)) {
          deviceMap.set(item.deviceId, {
            label: `设备 ${item.deviceId.substring(0, 8)}`,
            data: [],
            borderColor: getRandomColor(item.deviceId),
            backgroundColor: getRandomColor(item.deviceId, 0.5),
            tension: 0.6, // 更光滑的曲线
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 4,
            fill: false,
            spanGaps: true,
          });
        }

        deviceMap.get(item.deviceId).data.push({
          x: item.timestamp,
          y: item[elementType],
        });
      });

      // 添加预测数据
      if (predictedData && predictedData.length > 0) {
        // 为每个设备添加预测数据
        predictedData.forEach((item) => {
          if (!item[elementType] || !deviceMap.has(item.deviceId)) return;

          // 如果该设备还没有预测数据集，创建一个新的
          if (!deviceMap.has(`${item.deviceId}-prediction`)) {
            deviceMap.set(`${item.deviceId}-prediction`, {
              label: `设备 ${item.deviceId.substring(0, 8)} 预测`,
              data: [],
              borderColor: getRandomColor(item.deviceId),
              backgroundColor: getRandomColor(item.deviceId, 0.3),
              tension: 0.6,
              borderWidth: 2,
              borderDash: [5, 5], // 虚线表示预测数据
              pointRadius: 0,
              pointHoverRadius: 4,
              fill: false,
              spanGaps: true,
            });
          }

          deviceMap.get(`${item.deviceId}-prediction`).data.push({
            x: item.timestamp,
            y: item[elementType],
          });
        });
      }

      return {
        datasets: Array.from(deviceMap.values()),
      };
    }
    // 尝试使用小时趋势数据作为备选
    else if (hourlyTrends && hourlyTrends.length > 0) {
      const datasets = [
        {
          label: `平均${config.title}`,
          data: hourlyTrends.map((item) => ({
            x: item.timestamp,
            y: item.average,
          })),
          borderColor: config.chartColor,
          backgroundColor: config.chartBgColor,
          fill: {
            target: "origin",
            above: config.chartBgColor,
          },
          tension: 0.6, // 更光滑的曲线
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 5,
          spanGaps: true,
        },
        {
          label: `最高${config.title}`,
          data: hourlyTrends.map((item) => ({
            x: item.timestamp,
            y: item.max,
          })),
          borderColor: config.maxColor,
          backgroundColor: config.maxBgColor,
          borderDash: [5, 5],
          borderWidth: 2,
          tension: 0.6, // 更光滑的曲线
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: false,
          spanGaps: true,
        },
        {
          label: `最低${config.title}`,
          data: hourlyTrends.map((item) => ({
            x: item.timestamp,
            y: item.min,
          })),
          borderColor: config.minColor,
          backgroundColor: config.minBgColor,
          borderDash: [5, 5],
          borderWidth: 2,
          tension: 0.6, // 更光滑的曲线
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: false,
          spanGaps: true,
        },
      ];

      // 添加预测数据
      if (predictedData && predictedData.length > 0) {
        // 为了简化，我们在趋势数据中只添加一个预测线，取所有设备的平均值
        const predictionsByHour = new Map<number, number[]>();

        predictedData.forEach((item) => {
          const hour =
            Math.floor(item.timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000);
          if (!predictionsByHour.has(hour)) {
            predictionsByHour.set(hour, []);
          }
          predictionsByHour.get(hour)?.push(item[elementType]);
        });

        const predictionTrend = Array.from(predictionsByHour.entries()).map(
          ([timestamp, values]) => ({
            timestamp,
            average:
              values.reduce((sum: number, value: number) => sum + value, 0) /
              values.length,
          })
        );

        datasets.push({
          label: `预测${config.title}趋势`,
          data: predictionTrend.map((item) => ({
            x: item.timestamp,
            y: item.average,
          })),
          borderColor: config.predictionColor,
          backgroundColor: config.predictionBgColor,
          borderDash: [5, 5],
          borderWidth: 2,
          tension: 0.6,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: false,
          spanGaps: true,
        });
      }

      return { datasets };
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

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          boxWidth: 12,
          padding: 15,
          font: {
            size: 13,
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#333",
        bodyColor: "#666",
        borderColor: "rgba(0, 0, 0, 0.1)",
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        cornerRadius: 8,
        usePointStyle: true,
        callbacks: {
          title: function (context: { parsed: { x: number } }[]) {
            const date = new Date(context[0].parsed.x);
            return date.toLocaleString("zh-CN");
          },
        },
      },
    },
    scales: {
      x: {
        type: "time" as const,
        time: {
          unit:
            timeRange.days === 1
              ? ("hour" as const)
              : timeRange.days === 7
                ? ("day" as const)
                : ("week" as const),
          tooltipFormat: "yyyy-MM-dd HH:mm",
          displayFormats: {
            hour: "HH:mm",
            day: "MM-dd",
            week: "MM-dd",
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
          padding: {
            top: 10,
            bottom: 5,
          },
          font: {
            size: 13,
            weight: "bold" as const,
          },
        },
        grid: {
          display: true,
          color: "rgba(0, 0, 0, 0.05)",
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: "#666",
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        title: {
          display: true,
          text: `${config.title} (${config.unit})`,
          padding: {
            top: 5,
            bottom: 10,
          },
          font: {
            size: 13,
            weight: "bold" as const,
          },
        },
        beginAtZero: false,
        suggestedMin: config.yAxisMin,
        suggestedMax: config.yAxisMax,
        grid: {
          display: true,
          color: "rgba(0, 0, 0, 0.05)",
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          precision: 1,
          color: "#666",
        },
      },
    },
    elements: {
      line: {
        cubicInterpolationMode: "monotone" as const,
        borderWidth: 2.5,
      },
      point: {
        radius: 0,
        hitRadius: 10,
        hoverRadius: 4,
      },
    },
    layout: {
      padding: 10,
    },
    animation: {
      duration: 1000,
      easing: "easeOutQuart" as const,
    },
  };

  // 获取最新的指标值
  function getLatestElementValue(deviceId: string) {
    if (!elementData || elementData.length === 0) return null;

    // 过滤出指定设备的数据
    const deviceData = elementData.filter((item) => item.deviceId === deviceId);
    if (deviceData.length === 0) return null;

    // 找到最新的数据点
    const latestData = deviceData.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    );

    return latestData[elementType];
  }

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
            <h1 className="text-2xl font-bold">{config.title}详细分析</h1>
            <p className="text-gray-500">{config.description}</p>
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
          <h3 className="text-sm font-medium text-gray-500">
            平均{config.title}
          </h3>
          <p className="text-2xl font-bold mt-1">
            {statistics && statistics.average !== undefined
              ? statistics.average.toFixed(1)
              : "--"}
            {config.unit}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">
            最高{config.title}
          </h3>
          <p className="text-2xl font-bold mt-1">
            {statistics && statistics.maximum !== undefined
              ? statistics.maximum.toFixed(1)
              : "--"}
            {config.unit}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">
            最低{config.title}
          </h3>
          <p className="text-2xl font-bold mt-1">
            {statistics && statistics.minimum !== undefined
              ? statistics.minimum.toFixed(1)
              : "--"}
            {config.unit}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">数据趋势</h3>
          <p className="text-2xl font-bold mt-1">
            {statistics && statistics.trend
              ? statistics.trend === "上升"
                ? "↑ 上升"
                : statistics.trend === "下降"
                  ? "↓ 下降"
                  : "→ 稳定"
              : "--"}
          </p>
        </div>
      </div>

      {/* 主图表 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <h2 className="text-lg font-semibold mb-4">
          {timeRange.label}内{config.title}走势
        </h2>
        <div className="h-96 bg-gradient-to-b from-white to-gray-50 p-2 rounded-lg">
          {chartData ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              暂无数据
            </div>
          )}
        </div>
      </div>

      {/* 设备列表 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <h2 className="text-lg font-semibold mb-4">
          监测设备实时{config.title}
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  设备ID
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  设备名称
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  设备位置
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  当前{config.title}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  状态
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {devices &&
                devices.map((device) => {
                  const latestValue = getLatestElementValue(device._id);
                  return (
                    <tr key={device._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {device._id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {device.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {device.location.description ||
                          `${device.location.latitude.toFixed(
                            2
                          )}, ${device.location.longitude.toFixed(2)}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {latestValue !== null
                          ? `${latestValue?.toFixed(1)} ${config.unit}`
                          : "暂无数据"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            device.status === "online"
                              ? "bg-green-100 text-green-800"
                              : device.status === "offline"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {device.status === "online"
                            ? "在线"
                            : device.status === "offline"
                              ? "离线"
                              : "维护中"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
