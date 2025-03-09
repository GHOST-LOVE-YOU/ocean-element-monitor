"use client";

import Link from "next/link";
import TimeframeSelector from "@/components/TimeframeSelector";
import StatisticCard from "@/components/StatisticCard";
import OceanMap from "@/components/OceanMap";
import AlertList from "@/components/AlertList";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";

// 动态导入新的通用图表组件
const GenericOceanChart = dynamic(
  () => import("@/components/GenericOceanChart"),
  { ssr: false }
);

// 定义处理后的图表数据类型
interface ProcessedChartData {
  labels: string[];
  data: (number | null)[];
  statistics: {
    count: number;
    average: number | null;
    minimum: number | null;
    maximum: number | null;
    standardDeviation: number | null;
  };
}

export default function Dashboard() {
  // 设置时间范围状态
  const [timeframe, setTimeframe] = useState<string>("24h");

  // 计算时间范围
  const timeRange = useMemo(() => {
    const now = Date.now();
    let startTime: number;

    switch (timeframe) {
      case "7d":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "30d":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "24h":
      default:
        startTime = now - 24 * 60 * 60 * 1000;
        break;
    }

    return { startTime, endTime: now };
  }, [timeframe]);

  // 获取设备数据
  const devices = useQuery(api.devices.getAll);

  // 获取警报数据 - 根据时间范围筛选
  const alerts = useQuery(api.alerts.getAll, {
    status: "new",
  });

  // 过滤警报数据，只显示指定时间范围内的警报
  const filteredAlerts = useMemo(() => {
    if (!alerts) return [];
    return alerts.filter((alert) => alert.timestamp >= timeRange.startTime);
  }, [alerts, timeRange.startTime]);

  // 获取与详情页面一致的温度统计数据
  const temperatureStats = useQuery(api.oceanElements.getProcessedChartData, {
    dataType: "temperature",
    startTime: timeRange.startTime,
    endTime: timeRange.endTime,
  }) as ProcessedChartData | undefined;

  // 获取与详情页面一致的数据点数量
  const allData = useQuery(api.oceanElements.getByTimeRange, {
    startTime: timeRange.startTime,
    endTime: timeRange.endTime,
  });

  // 计算数据点增长
  const prevPeriodData = useQuery(api.oceanElements.getByTimeRange, {
    startTime: timeRange.startTime - (timeRange.endTime - timeRange.startTime),
    endTime: timeRange.startTime,
  });

  // 计算数据点增长数量
  const dataPointsGrowth = useMemo(() => {
    if (!allData || !prevPeriodData) return 0;
    return allData.length - prevPeriodData.length;
  }, [allData, prevPeriodData]);

  // 格式化温度数据
  const formatTemperature = (temp: number | undefined): string => {
    if (temp === undefined || temp === null) return "加载中...";
    return `${temp.toFixed(1)}°C`;
  };

  // 计算温度变化
  const calculateTempChange = (): string => {
    if (!temperatureStats || !temperatureStats.statistics.average)
      return "+0.0°C";

    // 使用标准差作为变化指标
    const change = temperatureStats.statistics.standardDeviation
      ? temperatureStats.statistics.standardDeviation / 10
      : 0;
    return `±${change.toFixed(1)}°C`;
  };

  // 确定温度变化状态
  const getTempChangeStatus = (
    change: string
  ): "up" | "down" | "warning" | "neutral" => {
    if (!change) return "neutral";
    const numChange = parseFloat(change.replace("±", ""));
    if (numChange > 0.5) return "warning";
    return "neutral";
  };

  // 当timeframe变化时更新时间范围
  useEffect(() => {
    // 时间范围变化时的逻辑处理
  }, [timeframe, timeRange]);

  return (
    <main className="flex min-h-screen flex-col p-6 bg-gray-50">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">海洋要素智能监测系统</h1>
          <p className="text-gray-500">实时监测与分析海洋环境要素</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          <TimeframeSelector value={timeframe} onChange={setTimeframe} />
          <div className="flex space-x-2">
            <Link
              href="/admin"
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
            >
              管理界面
            </Link>
            <Link
              href="/admin/api"
              className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm"
            >
              API管理
            </Link>
          </div>
        </div>
      </div>

      {/* 统计卡片区域 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Link href="/devices" suppressHydrationWarning>
          <StatisticCard
            title="监测设备"
            value={devices ? devices.length.toString() : "加载中..."}
            change={devices ? "+1" : "0"}
            status="up"
            icon="device"
          />
        </Link>

        <Link href="/alerts">
          <StatisticCard
            title="活跃警报"
            value={filteredAlerts.length.toString()}
            change={
              filteredAlerts.length > 0
                ? `+${Math.min(filteredAlerts.length, 5)}`
                : "0"
            }
            status="warning"
            icon="alert"
          />
        </Link>

        <Link href="/elements/temperature">
          <StatisticCard
            title="平均水温"
            value={
              temperatureStats?.statistics.average
                ? formatTemperature(temperatureStats.statistics.average)
                : "加载中..."
            }
            change={calculateTempChange()}
            status={getTempChangeStatus(calculateTempChange())}
            icon="data"
          />
        </Link>

        <Link href="/data">
          <StatisticCard
            title="数据点"
            value={allData ? allData.length.toLocaleString() : "加载中..."}
            change={
              dataPointsGrowth > 0
                ? `+${dataPointsGrowth}`
                : dataPointsGrowth < 0
                  ? `${dataPointsGrowth}`
                  : "0"
            }
            status={
              dataPointsGrowth > 0
                ? "up"
                : dataPointsGrowth < 0
                  ? "down"
                  : "neutral"
            }
            icon="data"
          />
        </Link>
      </div>

      {/* 主要图表区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Link
          href="/elements/temperature"
          className="hover:opacity-90 transition-opacity"
        >
          <div className="h-full p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-lg font-semibold mb-2 flex justify-between items-center">
              海水温度
              <span className="text-blue-500 text-sm">查看详情 →</span>
            </h2>
            <GenericOceanChart
              dataType="temperature"
              height={250}
              startTime={timeRange.startTime}
              endTime={timeRange.endTime}
            />
          </div>
        </Link>

        <Link
          href="/elements/salinity"
          className="hover:opacity-90 transition-opacity"
        >
          <div className="h-full p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-lg font-semibold mb-2 flex justify-between items-center">
              海水盐度
              <span className="text-blue-500 text-sm">查看详情 →</span>
            </h2>
            <GenericOceanChart
              dataType="salinity"
              height={250}
              startTime={timeRange.startTime}
              endTime={timeRange.endTime}
            />
          </div>
        </Link>

        <Link
          href="/elements/oxygen"
          className="hover:opacity-90 transition-opacity"
        >
          <div className="h-full p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-lg font-semibold mb-2 flex justify-between items-center">
              溶解氧
              <span className="text-blue-500 text-sm">查看详情 →</span>
            </h2>
            <GenericOceanChart
              dataType="dissolvedOxygen"
              height={250}
              startTime={timeRange.startTime}
              endTime={timeRange.endTime}
            />
          </div>
        </Link>
      </div>

      {/* 地图和警报区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Link
          href="/map"
          className="lg:col-span-2 hover:opacity-90 transition-opacity"
        >
          <div className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-lg font-semibold mb-4 flex justify-between items-center">
              监测点分布
              <span className="text-blue-500 text-sm">查看详情 →</span>
            </h2>
            <div className="h-[350px]">
              <OceanMap />
            </div>
          </div>
        </Link>

        <Link href="/alerts" className="hover:opacity-90 transition-opacity">
          <div className="h-full p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-lg font-semibold mb-4 flex justify-between items-center">
              实时警报
              <span className="text-blue-500 text-sm">查看全部 →</span>
            </h2>
            <AlertList
              limit={5}
              compact={true}
              startTime={timeRange.startTime}
            />
          </div>
        </Link>
      </div>
    </main>
  );
}
