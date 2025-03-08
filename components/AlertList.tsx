"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useMemo } from "react";

type AlertListProps = {
  limit?: number;
  compact?: boolean;
  startTime?: number;
};

// 定义参数名称映射类型
type ParameterNames = {
  temperature: string;
  salinity: string;
  dissolvedOxygen: string;
  pH: string;
  flowRate: string;
  turbidity: string;
  [key: string]: string; // 添加索引签名
};

export default function AlertList({
  limit = 10,
  compact = false,
  startTime,
}: AlertListProps) {
  const alerts = useQuery(api.alerts.getAll, {
    limit,
    status: "new",
  });

  const filteredAlerts = useMemo(() => {
    if (!alerts) return [];
    if (!startTime) return alerts;
    return alerts.filter((alert) => alert.timestamp >= startTime);
  }, [alerts, startTime]);

  if (!alerts) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  if (filteredAlerts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        当前时间范围内没有活跃警报
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-amber-100 text-amber-800";
      case "low":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getParameterName = (param: string): string => {
    const names: ParameterNames = {
      temperature: "温度",
      salinity: "盐度",
      dissolvedOxygen: "溶解氧",
      pH: "pH值",
      flowRate: "流速",
      turbidity: "浊度",
    };
    return names[param] || param;
  };

  return (
    <div className="space-y-3">
      {filteredAlerts.map((alert) => (
        <div
          key={alert._id}
          className={`p-3 border rounded-md ${compact ? "border-l-4" : ""} border-l-4 ${
            getSeverityColor(alert.severity).includes("red")
              ? "border-l-red-500"
              : getSeverityColor(alert.severity).includes("amber")
                ? "border-l-amber-500"
                : "border-l-blue-500"
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(alert.severity)}`}
                >
                  {alert.severity === "high"
                    ? "高"
                    : alert.severity === "medium"
                      ? "中"
                      : "低"}
                </span>
                <h3 className="text-sm font-medium">
                  {getParameterName(alert.parameterType)}异常
                </h3>
              </div>
              {!compact && (
                <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(alert.timestamp), {
                addSuffix: true,
                locale: zhCN,
              })}
            </div>
          </div>
          {compact && (
            <p className="text-xs text-gray-600 mt-1 truncate">
              {alert.message}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
