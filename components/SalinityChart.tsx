"use client";

import OceanDataChart from "./OceanDataChart";

interface SalinityChartProps {
  height?: number;
  startTime?: number;
  endTime?: number;
}

export default function SalinityChart({
  height = 300,
  startTime,
  endTime,
}: SalinityChartProps) {
  return (
    <OceanDataChart
      dataType="salinity"
      height={height}
      startTime={startTime}
      endTime={endTime}
    />
  );
}
