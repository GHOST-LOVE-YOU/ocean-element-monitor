"use client";

import Link from "next/link";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  DeviceTabletIcon,
  BellAlertIcon,
  CircleStackIcon,
} from "@heroicons/react/24/outline"; // Removed ThermometerIcon as it is not exported

type StatisticCardProps = {
  title: string;
  value: string;
  change: string;
  status: "up" | "down" | "warning" | "neutral";
  icon: "device" | "alert" | "data"; // Removed "temperature" from icon type
  href?: string; // Make href optional
};

export default function StatisticCard({
  title,
  value,
  change,
  status,
  icon,
  href,
}: StatisticCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case "up":
        return "text-green-500";
      case "down":
        return "text-red-500";
      case "warning":
        return "text-amber-500";
      case "neutral":
        return "text-blue-500";
      default:
        return "text-gray-500";
    }
  };

  const getIcon = () => {
    switch (icon) {
      case "device":
        return <DeviceTabletIcon className="h-6 w-6" />;
      case "alert":
        return <BellAlertIcon className="h-6 w-6" />;
      case "data":
        return <CircleStackIcon className="h-6 w-6" />;
      default:
        return null;
    }
  };

  const getChangeIcon = () => {
    if (status === "up") return <ArrowUpIcon className="h-3 w-3" />;
    if (status === "down") return <ArrowDownIcon className="h-3 w-3" />;
    return null;
  };

  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        {href ? (
          <Link href={href}>
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          </Link>
        ) : (
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        )}
        <div className="text-gray-400">{getIcon()}</div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className={`text-xs flex items-center ${getStatusColor()}`}>
            {getChangeIcon()}
            <span className="ml-1">{change}</span>
          </p>
        </div>
        {href ? (
          <Link href={href}>
            <span className="text-blue-500 text-xs">查看详情 →</span>
          </Link>
        ) : (
          <span className="text-blue-500 text-xs">查看详情 →</span>
        )}
      </div>
    </div>
  );
}
