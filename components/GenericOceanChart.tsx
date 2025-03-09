"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { OceanDataType } from "./OceanDataChart";

// 使用动态导入避免SSR问题
const OceanDataChart = dynamic(() => import("./OceanDataChart"), {
  ssr: false,
  loading: () => <ChartLoadingPlaceholder />,
});

interface GenericOceanChartProps {
  dataType: OceanDataType;
  height?: number;
  startTime?: number;
  endTime?: number;
  title?: string;
}

// 加载占位组件
function ChartLoadingPlaceholder() {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[250px] bg-gray-50 rounded-lg">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
    </div>
  );
}

/**
 * 通用海洋数据图表组件
 * 可以显示温度、盐度或溶解氧数据
 * 用于替代多个相似的单一用途图表组件
 */
export default function GenericOceanChart({
  dataType,
  height = 300,
  startTime,
  endTime,
  title,
}: GenericOceanChartProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      {title && <h3 className="text-lg font-medium mb-2">{title}</h3>}
      <Suspense fallback={<ChartLoadingPlaceholder />}>
        <OceanDataChart
          dataType={dataType}
          height={height}
          startTime={startTime}
          endTime={endTime}
        />
      </Suspense>
    </div>
  );
}
