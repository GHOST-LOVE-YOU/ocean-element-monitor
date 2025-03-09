"use client";

import dynamic from "next/dynamic";
import { OceanDataType } from "./OceanDataChart";

// 使用动态导入避免SSR问题
const OceanDataChart = dynamic(() => import("./OceanDataChart"), {
  ssr: false,
});

interface GenericOceanChartProps {
  dataType: OceanDataType;
  height?: number;
  startTime?: number;
  endTime?: number;
  title?: string;
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
      <OceanDataChart
        dataType={dataType}
        height={height}
        startTime={startTime}
        endTime={endTime}
      />
    </div>
  );
}
