"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
} from "recharts";

// 定义支持的数据类型
export type OceanDataType = "temperature" | "salinity" | "dissolvedOxygen";

// 不同数据类型的配置
const dataTypeConfig: Record<
  OceanDataType,
  {
    label: string;
    dataKey: string;
    unit: string;
    color: string;
    backgroundColor: string;
    yAxisMin?: number;
    yAxisMax?: number;
  }
> = {
  temperature: {
    label: "海水温度",
    dataKey: "temperature",
    unit: "°C",
    color: "rgb(53, 162, 235)",
    backgroundColor: "rgba(53, 162, 235, 0.5)",
  },
  salinity: {
    label: "海水盐度",
    dataKey: "salinity",
    unit: "PSU",
    color: "rgb(75, 192, 192)",
    backgroundColor: "rgba(75, 192, 192, 0.5)",
    yAxisMin: 30,
    yAxisMax: 40,
  },
  dissolvedOxygen: {
    label: "溶解氧",
    dataKey: "dissolvedOxygen",
    unit: "mg/L",
    color: "rgb(153, 102, 255)",
    backgroundColor: "rgba(153, 102, 255, 0.5)",
    yAxisMin: 4,
    yAxisMax: 10,
  },
};

interface OceanDataChartProps {
  dataType: OceanDataType;
  height?: number;
  startTime?: number;
  endTime?: number;
}

// 定义图表数据格式
interface ChartDataPoint {
  timestamp: string;
  value: number | null;
  formattedTime?: string;
}

// 自定义 Tooltip 的 Props 类型
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number | null;
    dataKey: string;
    name: string;
  }>;
  label?: string;
}

export default function OceanDataChart({
  dataType,
  height = 300,
  startTime: propStartTime,
  endTime: propEndTime,
}: OceanDataChartProps) {
  // 获取当前数据类型的配置
  const config = dataTypeConfig[dataType];

  // 引用上一次的时间范围，用于检测变化
  const prevStartTimeRef = useRef<number | undefined>(propStartTime);
  const prevEndTimeRef = useRef<number | undefined>(propEndTime);

  // 使用传入的时间范围或默认为过去24小时
  const endTime = propEndTime || Date.now();
  const startTime = propStartTime || endTime - 24 * 60 * 60 * 1000;

  // 生成唯一的数据获取键，确保在时间范围变化时强制刷新数据
  const [dataFetchKey, setDataFetchKey] = useState<string>(
    `${dataType}-${startTime}-${endTime}`
  );

  // 追踪是否是首次加载
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // 当时间范围或数据类型变化时更新数据获取key
  useEffect(() => {
    // 检查时间范围是否有变化
    if (
      prevStartTimeRef.current !== propStartTime ||
      prevEndTimeRef.current !== propEndTime ||
      isFirstLoad
    ) {
      console.log(
        `时间范围变化: ${new Date(startTime).toLocaleString()} - ${new Date(endTime).toLocaleString()}`
      );

      // 更新数据获取键以强制刷新
      const newKey = `${dataType}-${startTime}-${endTime}-${Date.now()}-${Math.random()}`;
      setDataFetchKey(newKey);

      // 更新引用值
      prevStartTimeRef.current = propStartTime;
      prevEndTimeRef.current = propEndTime;

      // 首次加载后设置为false
      if (isFirstLoad) {
        setIsFirstLoad(false);
      }
    }
  }, [dataType, startTime, endTime, propStartTime, propEndTime, isFirstLoad]);

  // 使用新的后端函数获取已处理的图表数据
  const processedData = useQuery(
    api.oceanElements.getProcessedChartData,
    {
      dataType: config.dataKey,
      startTime,
      endTime,
      maxDataPoints: 100, // 限制数据点数量，避免图表过于密集
    },
    {
      refreshKey: dataFetchKey,
    }
  );

  // 计算时间范围（天数）
  const timeRangeInDays = (endTime - startTime) / (24 * 60 * 60 * 1000);

  // 格式化时间标签，根据时间范围自动调整格式
  const formatTimeLabel = (timestamp: string) => {
    if (!timestamp) return "";

    try {
      const date = new Date(timestamp);

      // 根据显示的数据范围选择合适的时间格式
      if (timeRangeInDays <= 1) {
        return format(date, "HH:mm", { locale: zhCN });
      } else if (timeRangeInDays <= 7) {
        return format(date, "MM-dd HH:mm", { locale: zhCN });
      } else {
        return format(date, "MM-dd", { locale: zhCN });
      }
    } catch (error) {
      console.error("Error formatting time:", error);
      return "";
    }
  };

  // 准备 Recharts 数据格式
  const chartData: ChartDataPoint[] = processedData
    ? processedData.labels.map((label, index) => ({
        timestamp: label,
        value: processedData.data[index],
        formattedTime: formatTimeLabel(label),
      }))
    : [];

  // 自定义 Tooltip 内容
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-sm rounded text-sm">
          <p className="font-medium text-gray-700">
            {label && formatTimeLabel(label)}
          </p>
          <p className="text-gray-600">
            {config.label}:{" "}
            {value !== null ? `${value.toFixed(2)} ${config.unit}` : "无数据"}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ height: `${height}px`, width: "100%" }}>
      {!processedData ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-gray-400">加载中...</div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">暂无数据</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTimeLabel}
              stroke="#888"
              fontSize={10}
              tickMargin={8}
            />
            <YAxis
              domain={[
                config.yAxisMin !== undefined ? config.yAxisMin : "auto",
                config.yAxisMax !== undefined ? config.yAxisMax : "auto",
              ]}
              tickFormatter={(value) => `${value}${config.unit}`}
              stroke="#888"
              fontSize={10}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <defs>
              <linearGradient
                id={`gradient-${dataType}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={config.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#gradient-${dataType})`}
              activeDot={{ r: 6, strokeWidth: 0 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
