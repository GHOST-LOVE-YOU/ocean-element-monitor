"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
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
  TooltipItem,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

// 使用dynamic导入以避免SSR渲染问题
const Line = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), {
  ssr: false,
});

// 确保Chart.js组件只在客户端注册
if (typeof window !== "undefined") {
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
}

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

interface ChartDataType {
  labels: string[];
  datasets: {
    label: string;
    data: (number | null)[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
    pointRadius: number;
    pointHoverRadius: number;
    borderWidth: number;
    fill: {
      target: string;
      above: string;
    };
  }[];
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
  const formatTimeLabel = (timestamp: string): string => {
    const date = new Date(timestamp);

    // 根据显示的数据范围选择合适的时间格式
    if (timeRangeInDays <= 1) {
      return format(date, "HH:mm", { locale: zhCN });
    } else if (timeRangeInDays <= 7) {
      return format(date, "MM-dd HH:mm", { locale: zhCN });
    } else {
      return format(date, "MM-dd", { locale: zhCN });
    }
  };

  // 准备图表数据
  const chartData: ChartDataType = {
    labels: processedData?.labels || [],
    datasets: [
      {
        label: `${config.label} (${config.unit})`,
        data: processedData?.data || [],
        borderColor: config.color,
        backgroundColor: config.backgroundColor,
        tension: 0.6,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2.5,
        fill: {
          target: "origin",
          above: `${config.backgroundColor}25`, // 25% opacity
        },
      },
    ],
  };

  // 图表配置
  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: (tooltipItems: TooltipItem<"line">[]) => {
            if (tooltipItems.length === 0) return "";
            const index = tooltipItems[0].dataIndex;
            const label = processedData?.labels[index];
            return label ? formatTimeLabel(label) : "";
          },
          label: (context: TooltipItem<"line">) => {
            const value = context.parsed.y;
            if (value === null || value === undefined) return "无数据";
            return `${config.label}: ${value.toFixed(2)} ${config.unit}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "time" as const,
        time: {
          unit: timeRangeInDays <= 1 ? ("hour" as const) : ("day" as const),
          displayFormats: {
            hour: "HH:mm",
            day: "MM-dd",
          },
        },
        adapters: {
          date: {
            locale: zhCN,
          },
        },
        title: {
          display: false,
        },
        grid: {
          display: false,
        },
      },
      y: {
        min: config.yAxisMin,
        max: config.yAxisMax,
        title: {
          display: false,
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          callback: function (tickValue: string | number) {
            return `${tickValue} ${config.unit}`;
          },
        },
      },
    },
  };

  return (
    <div style={{ height: `${height}px`, width: "100%" }}>
      {!processedData ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-gray-400">加载中...</div>
        </div>
      ) : processedData.data.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">暂无数据</div>
        </div>
      ) : (
        <Line data={chartData} options={options} />
      )}
    </div>
  );
}
