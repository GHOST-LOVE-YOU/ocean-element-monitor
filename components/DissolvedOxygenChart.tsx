"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DissolvedOxygenChartProps {
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
  }[];
}

export default function DissolvedOxygenChart({
  height = 300,
  startTime: propStartTime,
  endTime: propEndTime,
}: DissolvedOxygenChartProps) {
  // 使用传入的时间范围或默认为过去24小时
  const endTime = propEndTime || Date.now();
  const startTime = propStartTime || endTime - 24 * 60 * 60 * 1000;

  const data = useQuery(api.oceanElements.getByTimeRange, {
    startTime,
    endTime,
  });

  const [chartData, setChartData] = useState<ChartDataType>({
    labels: [],
    datasets: [
      {
        label: "溶解氧 (mg/L)",
        data: [],
        borderColor: "rgb(153, 102, 255)",
        backgroundColor: "rgba(153, 102, 255, 0.5)",
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  });

  // 格式化时间标签，根据时间范围选择合适的格式
  const formatTimeLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    const timeRangeInDays = (endTime - startTime) / (24 * 60 * 60 * 1000);

    if (timeRangeInDays <= 1) {
      // 24小时内显示时:分
      return format(date, "HH:mm", { locale: zhCN });
    } else if (timeRangeInDays <= 7) {
      // 7天内显示日期和时间
      return format(date, "MM-dd HH:mm", { locale: zhCN });
    } else {
      // 更长时间范围显示月-日
      return format(date, "MM-dd", { locale: zhCN });
    }
  };

  useEffect(() => {
    if (data) {
      // 按时间排序
      const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

      // 数据采样 - 如果数据点过多，进行采样减少点数
      let sampledData = sortedData;
      if (sortedData.length > 50) {
        const sampleRate = Math.ceil(sortedData.length / 50);
        sampledData = sortedData.filter((_, index) => index % sampleRate === 0);
        // 确保包含最后一个点以显示最新数据
        if (
          sortedData.length > 0 &&
          sampledData[sampledData.length - 1] !==
            sortedData[sortedData.length - 1]
        ) {
          sampledData.push(sortedData[sortedData.length - 1]);
        }
      }

      // 提取溶解氧数据和时间标签
      const oxygen = sampledData.map((item) => item.dissolvedOxygen ?? null);
      const labels = sampledData.map((item) => formatTimeLabel(item.timestamp));

      setChartData({
        labels,
        datasets: [
          {
            label: "溶解氧 (mg/L)",
            data: oxygen,
            borderColor: "rgb(153, 102, 255)",
            backgroundColor: "rgba(153, 102, 255, 0.5)",
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
        ],
      });
    }
  }, [data, startTime, endTime]); // 添加startTime和endTime作为依赖项

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            // 在tooltip中显示完整日期时间
            const index = context[0].dataIndex;
            const timestamp = data?.[index]?.timestamp;
            if (timestamp) {
              return format(new Date(timestamp), "yyyy-MM-dd HH:mm:ss", {
                locale: zhCN,
              });
            }
            return "";
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 45, // 旋转标签以避免重叠
          minRotation: 45,
          autoSkip: true, // 自动跳过标签以避免拥挤
          maxTicksLimit: 10, // 限制显示的标签数量
        },
        grid: {
          display: false, // 隐藏网格线使图表更清晰
        },
      },
      y: {
        beginAtZero: false,
        suggestedMin: 4, // 溶解氧通常在4-10之间
        suggestedMax: 10,
      },
    },
    elements: {
      line: {
        cubicInterpolationMode: "monotone" as const,
      },
    },
  };

  if (!data) {
    return (
      <div
        style={{ height: `${height}px` }}
        className="flex items-center justify-center"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  return (
    <div style={{ height: `${height}px` }}>
      <Line data={chartData} options={options} />
    </div>
  );
}
