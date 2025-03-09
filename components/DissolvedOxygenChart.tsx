"use client";

import OceanDataChart from "./OceanDataChart";

interface DissolvedOxygenChartProps {
  height?: number;
  startTime?: number;
  endTime?: number;
}

export default function DissolvedOxygenChart({
  height = 300,
  startTime,
  endTime,
}: DissolvedOxygenChartProps) {
  return (
    <OceanDataChart
      dataType="dissolvedOxygen"
      height={height}
      startTime={startTime}
      endTime={endTime}
    />
  );
}
