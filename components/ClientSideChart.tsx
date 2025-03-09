"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// 动态导入 Chart 组件，确保它不会在服务器端渲染
const LineChart = dynamic(
  () => import("react-chartjs-2").then((mod) => mod.Line),
  { ssr: false } // 禁用服务器端渲染
);

interface ClientSideChartProps {
  data: any;
  options: any;
  height?: number;
  width?: string;
}

export default function ClientSideChart({
  data,
  options,
  height = 300,
  width = "100%",
}: ClientSideChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // 客户端未挂载时显示加载状态
    return (
      <div
        style={{ height: `${height}px`, width }}
        className="flex items-center justify-center text-gray-500"
      >
        <p>图表加载中...</p>
      </div>
    );
  }

  return (
    <div style={{ height: `${height}px`, width }}>
      <LineChart data={data} options={options} />
    </div>
  );
}
