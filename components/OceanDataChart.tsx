"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { ChartData, ChartOptions } from "chart.js";
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
import "chartjs-adapter-date-fns";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

// 使用dynamic导入以避免SSR渲染问题
const Line = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
    </div>
  ),
});

// 确保Chart.js组件只在客户端注册
useEffect(() => {
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
}, []);

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

  // 使用传入的时间范围或默认为过去24小时
  const endTime = propEndTime || Date.now();
  const startTime = propStartTime || endTime - 24 * 60 * 60 * 1000;

  // 生成唯一的数据获取键，确保在时间范围变化时强制刷新数据
  const [dataFetchKey] = useState<string>(
    `${dataType}-${startTime}-${endTime}`
  );

  // 获取数据
  const data = useQuery(api.oceanElements.getByTimeRange, {
    startTime,
    endTime,
  });

  const [chartData, setChartData] = useState<ChartData<"line">>({
    labels: [],
    datasets: [
      {
        label: `${config.label} (${config.unit})`,
        data: [],
        borderColor: config.color,
        backgroundColor: config.backgroundColor,
        tension: 0.6,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2.5,
        fill: true,
      },
    ],
  });

  // 计算时间范围（天数）
  const timeRangeInDays = (endTime - startTime) / (24 * 60 * 60 * 1000);

  // 格式化时间标签
  const formatTimeLabel = (timestamp: number): string => {
    const date = new Date(timestamp);
    if (timeRangeInDays <= 1) {
      return format(date, "HH:mm", { locale: zhCN });
    } else if (timeRangeInDays <= 7) {
      return format(date, "MM-dd HH:mm", { locale: zhCN });
    } else {
      return format(date, "MM-dd", { locale: zhCN });
    }
  };

  useEffect(() => {
    if (!data) return;

    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

    if (sortedData.length === 0) {
      setChartData({
        labels: [formatTimeLabel(startTime), formatTimeLabel(endTime)],
        datasets: [
          {
            ...chartData.datasets[0],
            data: [null, null],
            borderColor: "rgba(200, 200, 200, 0.5)",
            backgroundColor: "rgba(200, 200, 200, 0.1)",
          },
        ],
      });
      return;
    }

    const dataValues = sortedData.map((item) => {
      const val = item[dataType];
      return typeof val === "number" ? val : null;
    });

    setChartData({
      labels: sortedData.map((item) => formatTimeLabel(item.timestamp)),
      datasets: [
        {
          ...chartData.datasets[0],
          data: dataValues,
        },
      ],
    });
  }, [data, startTime, endTime, dataType, config]);

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "time",
        time: {
          unit:
            timeRangeInDays <= 1
              ? "hour"
              : timeRangeInDays <= 7
                ? "day"
                : "week",
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
      },
      y: {
        beginAtZero: false,
        min: config.yAxisMin,
        max: config.yAxisMax,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  if (!data) {
    return <ChartLoadingPlaceholder />;
  }

  return (
    <div
      style={{ height: `${height}px` }}
      className="bg-gradient-to-b from-white to-gray-50 rounded-lg p-2"
    >
      <Line data={chartData} options={chartOptions} />
    </div>
  );
}

function ChartLoadingPlaceholder() {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
    </div>
  );
}
