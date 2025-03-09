"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useRef } from "react";
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
  TimeScale,
  TooltipItem,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { format } from "date-fns";
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

  // 使用refreshKey确保数据获取被强制刷新
  const data = useQuery(
    api.oceanElements.getByTimeRange,
    {
      startTime,
      endTime,
    },
    {
      refreshKey: dataFetchKey,
    }
  );

  // 保存采样后的数据点，用于tooltip显示
  const [sampledDataPoints, setSampledDataPoints] = useState<Array<any>>([]);

  const [chartData, setChartData] = useState<ChartDataType>({
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
        fill: {
          target: "origin",
          above: `${config.backgroundColor}25`, // 25% opacity
        },
      },
    ],
  });

  // 计算时间范围（天数）
  const timeRangeInDays = (endTime - startTime) / (24 * 60 * 60 * 1000);

  // 格式化时间标签，根据时间范围自动调整格式
  const formatTimeLabel = (timestamp: number): string => {
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

  useEffect(() => {
    if (data) {
      // 确保数据在指定的时间范围内
      const filteredData = data.filter(
        (item) => item.timestamp >= startTime && item.timestamp <= endTime
      );

      // 数据为空的处理
      if (filteredData.length === 0) {
        // 添加一些占位数据点，避免图表为空
        const placeholderData = [
          {
            timestamp: startTime,
            [config.dataKey]:
              config.dataKey === "temperature"
                ? 15
                : config.dataKey === "salinity"
                  ? 35
                  : config.dataKey === "dissolvedOxygen"
                    ? 7
                    : 0,
          },
          {
            timestamp: endTime,
            [config.dataKey]:
              config.dataKey === "temperature"
                ? 15
                : config.dataKey === "salinity"
                  ? 35
                  : config.dataKey === "dissolvedOxygen"
                    ? 7
                    : 0,
          },
        ];

        setSampledDataPoints(placeholderData);
        setChartData({
          labels: placeholderData.map((item) =>
            formatTimeLabel(item.timestamp)
          ),
          datasets: [
            {
              label: `${config.label} (${config.unit}) - 无数据`,
              data: placeholderData.map(() => null), // 使用null表示无数据
              borderColor: "rgba(200, 200, 200, 0.5)",
              backgroundColor: "rgba(200, 200, 200, 0.1)",
              tension: 0,
              pointRadius: 0,
              pointHoverRadius: 0,
              borderWidth: 1,
              fill: {
                target: "origin",
                above: "rgba(200, 200, 200, 0.05)",
              },
            },
          ],
        });
        return;
      }

      // 按时间排序
      const sortedData = [...filteredData].sort(
        (a, b) => a.timestamp - b.timestamp
      );

      // 数据采样 - 确保每个时间范围有足够的代表性数据点
      let sampledData = sortedData;

      // 如果只有一个数据点，添加一个虚拟点以形成直线
      if (sortedData.length === 1) {
        const singlePoint = sortedData[0];
        const value = singlePoint[config.dataKey];

        // 添加一个间隔5分钟的额外点
        const extraPoint = {
          ...singlePoint,
          timestamp: singlePoint.timestamp + 5 * 60 * 1000,
        };

        sampledData = [singlePoint, extraPoint];
      }
      // 对于更多的数据点，进行正常采样
      else if (sortedData.length > 1) {
        // 根据时间范围决定采样率
        let targetPointCount = 100; // 默认采样点数

        if (timeRangeInDays > 7) {
          targetPointCount = 40; // 长时间范围减少点数，更好地显示趋势
        } else if (timeRangeInDays <= 1) {
          targetPointCount = 72; // 短时间范围增加点数，显示更多细节 (每20分钟一个点)
        }

        if (sortedData.length > targetPointCount) {
          const sampleRate = Math.ceil(sortedData.length / targetPointCount);
          sampledData = sortedData.filter(
            (_, index) => index % sampleRate === 0
          );

          // 确保包含最后一个点以显示最新数据
          if (
            sortedData.length > 0 &&
            sampledData[sampledData.length - 1] !==
              sortedData[sortedData.length - 1]
          ) {
            sampledData.push(sortedData[sortedData.length - 1]);
          }
        }
      }

      // 保存采样后的数据点，用于tooltip显示
      setSampledDataPoints(sampledData);

      // 提取数据和时间标签
      const dataValues = sampledData.map((item) => {
        const value = item[config.dataKey as keyof typeof item];
        // 确保没有NaN或undefined值，转换为数字类型
        return value !== undefined && !isNaN(Number(value))
          ? parseFloat(Number(value).toFixed(2))
          : null;
      });
      const labels = sampledData.map((item) => formatTimeLabel(item.timestamp));

      // 检查是否有有效的数据值
      const hasValidData = dataValues.some(
        (value) => value !== null && value !== undefined
      );

      // 更新图表数据
      setChartData({
        labels,
        datasets: [
          {
            label: `${config.label} (${config.unit})`,
            data: dataValues,
            borderColor: config.color,
            backgroundColor: config.backgroundColor,
            tension: 0.4,
            pointRadius: sampledData.length < 30 ? 3 : 1,
            pointHoverRadius: 5,
            borderWidth: 2,
            fill: {
              target: "origin",
              above: `${config.backgroundColor}30`,
            },
          },
        ],
      });
    }
  }, [data, startTime, endTime, dataType, config, dataFetchKey]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500,
    },
    plugins: {
      legend: {
        position: "top" as const,
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#333",
        bodyColor: "#666",
        borderColor: "rgba(0, 0, 0, 0.1)",
        borderWidth: 1,
        padding: 8,
      },
    },
    scales: {
      x: {
        type: "category" as const,
        time: {
          unit:
            timeRangeInDays <= 1
              ? ("hour" as const)
              : timeRangeInDays <= 7
                ? ("day" as const)
                : ("week" as const),
          stepSize: timeRangeInDays <= 1 ? 2 : 1,
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
        ticks: {
          maxRotation: 30,
          minRotation: 0,
          autoSkip: true,
          maxTicksLimit: timeRangeInDays <= 1 ? 6 : 5,
          color: "#666",
          font: {
            size: 9,
          },
          padding: 2,
        },
        grid: {
          display: true,
          color: "rgba(0, 0, 0, 0.05)",
          drawBorder: false,
        },
        title: {
          display: false,
          text: "时间",
          font: {
            size: 10,
            weight: "bold" as const,
          },
          padding: {
            top: 4,
            bottom: 2,
          },
        },
        bounds: "data" as const,
      },
      y: {
        beginAtZero: false,
        min: config.yAxisMin,
        max: config.yAxisMax,
        grid: {
          display: true,
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
    },
  };

  if (!data) {
    return (
      <div
        style={{ height: `${height}px` }}
        className="flex items-center justify-center bg-gradient-to-b from-white to-gray-50 rounded-lg"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  // 创建一个简单的图表数据对象用于显示
  const simpleChartData = {
    labels: chartData.labels,
    datasets: [
      {
        ...chartData.datasets[0],
        tension: 0.4,
        fill: {
          target: "origin",
          above: `${config.backgroundColor}30`,
        },
        borderWidth: 2,
      },
    ],
  };

  // 创建一个简单的图表选项对象用于显示
  const simpleChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500,
    },
    scales: {
      x: {
        type: "category" as const,
        grid: {
          display: true,
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      y: {
        beginAtZero: false,
        suggestedMin: config.yAxisMin,
        suggestedMax: config.yAxisMax,
        grid: {
          display: true,
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#333",
        bodyColor: "#666",
        borderColor: "rgba(0, 0, 0, 0.1)",
        borderWidth: 1,
        padding: 8,
      },
    },
  };

  return (
    <div
      style={{ height: `${height}px` }}
      className="bg-gradient-to-b from-white to-gray-50 rounded-lg p-2"
    >
      <Line data={simpleChartData} options={simpleChartOptions} />
    </div>
  );
}
