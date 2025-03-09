"use client";

import OceanDataChart from "./OceanDataChart";

interface TemperatureChartProps {
  height?: number;
  startTime?: number;
  endTime?: number;
}

export default function TemperatureChart({
  height = 300,
  startTime,
  endTime,
}: TemperatureChartProps) {
  return (
    <OceanDataChart
      dataType="temperature"
      height={height}
      startTime={startTime}
      endTime={endTime}
    />
  );
}
