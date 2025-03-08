"use client";

import { useState } from "react";

interface TimeframeSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
}

export default function TimeframeSelector({
  value,
  onChange,
}: TimeframeSelectorProps = {}) {
  const [internalTimeframe, setInternalTimeframe] = useState("24h");

  // 使用传入的值或内部状态
  const timeframe = value !== undefined ? value : internalTimeframe;

  // 处理时间范围变化
  const handleTimeframeChange = (newTimeframe: string) => {
    if (onChange) {
      // 如果提供了外部onChange处理函数，则调用它
      onChange(newTimeframe);
    } else {
      // 否则使用内部状态
      setInternalTimeframe(newTimeframe);
    }
  };

  return (
    <div className="inline-flex items-center bg-white border rounded-md shadow-sm mt-4 md:mt-0">
      <button
        onClick={() => handleTimeframeChange("24h")}
        className={`px-3 py-2 text-sm font-medium rounded-l-md ${
          timeframe === "24h"
            ? "bg-blue-50 text-blue-600"
            : "text-gray-500 hover:bg-gray-50"
        }`}
      >
        24小时
      </button>
      <button
        onClick={() => handleTimeframeChange("7d")}
        className={`px-3 py-2 text-sm font-medium ${
          timeframe === "7d"
            ? "bg-blue-50 text-blue-600"
            : "text-gray-500 hover:bg-gray-50"
        }`}
      >
        7天
      </button>
      <button
        onClick={() => handleTimeframeChange("30d")}
        className={`px-3 py-2 text-sm font-medium rounded-r-md ${
          timeframe === "30d"
            ? "bg-blue-50 text-blue-600"
            : "text-gray-500 hover:bg-gray-50"
        }`}
      >
        30天
      </button>
    </div>
  );
}
