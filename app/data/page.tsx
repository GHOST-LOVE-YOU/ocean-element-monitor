"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeftIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";

export default function DataPage() {
  const [timeRange, setTimeRange] = useState({
    days: 7,
    label: "7天",
  });
  const [selectedDeviceId, setSelectedDeviceId] = useState("all");
  const [selectedParameter, setSelectedParameter] = useState("all");
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 20;

  const { startTime, endTime } = useMemo(() => {
    const end = Date.now();
    const start = end - timeRange.days * 24 * 60 * 60 * 1000;
    return { startTime: start, endTime: end };
  }, [timeRange.days]);

  const devices = useQuery(api.devices.getAll);

  const allData = useQuery(api.oceanElements.getByTimeRange, {
    startTime,
    endTime,
    deviceId: selectedDeviceId === "all" ? undefined : selectedDeviceId,
  });

  const { filteredData, paginatedData, totalPages } = useMemo(() => {
    const filtered = allData
      ? allData
          .filter((item) => {
            if (selectedParameter === "all") return true;
            return (
              selectedParameter in item &&
              item[selectedParameter as keyof typeof item] !== undefined
            );
          })
          .sort((a, b) => b.timestamp - a.timestamp)
      : [];

    const paginated = filtered.slice(
      pageIndex * pageSize,
      (pageIndex + 1) * pageSize
    );

    const total = Math.ceil(filtered.length / pageSize);

    return {
      filteredData: filtered,
      paginatedData: paginated,
      totalPages: total,
    };
  }, [allData, selectedParameter, pageIndex, pageSize]);

  useEffect(() => {
    setPageIndex(0);
  }, [timeRange, selectedDeviceId, selectedParameter]);

  const exportToCSV = () => {
    if (!filteredData || filteredData.length === 0) return;

    const allKeys = new Set();
    filteredData.forEach((item) => {
      Object.keys(item).forEach((key) => {
        if (key !== "_id" && key !== "status" && !key.startsWith("_")) {
          allKeys.add(key);
        }
      });
    });

    allKeys.delete("location");
    allKeys.add("latitude");
    allKeys.add("longitude");
    allKeys.add("depth");

    const keys = Array.from(allKeys) as string[];

    let csvContent = keys.join(",") + "\n";

    filteredData.forEach((item) => {
      const row = keys.map((key) => {
        if (key === "latitude") return item.location?.latitude ?? "";
        if (key === "longitude") return item.location?.longitude ?? "";
        if (key === "depth") return item.location?.depth ?? "";
        if (key === "timestamp")
          return new Date(
            item[key as keyof typeof item] as number
          ).toISOString();
        return (item[key as keyof typeof item] ?? "").toString();
      });

      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `ocean-data-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDeviceName = (deviceId: string) => {
    if (!devices) return deviceId.substring(0, 8);
    const device = devices.find((d) => d._id === deviceId);
    return device ? device.name : deviceId.substring(0, 8);
  };

  const formatParameterValue = (
    parameter: string,
    value: number | undefined | null
  ) => {
    if (value === undefined || value === null) return "--";

    switch (parameter) {
      case "temperature":
        return `${value.toFixed(1)} °C`;
      case "salinity":
        return `${value.toFixed(1)} ‰`;
      case "dissolvedOxygen":
        return `${value.toFixed(1)} mg/L`;
      case "pH":
        return value.toFixed(2);
      case "flowRate":
        return `${value.toFixed(2)} m/s`;
      case "turbidity":
        return `${value.toFixed(1)} NTU`;
      default:
        return value.toString();
    }
  };

  return (
    <main className="flex min-h-screen flex-col p-6 bg-gray-50">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="flex items-center text-blue-500 hover:text-blue-700 mb-4"
        >
          <ChevronLeftIcon className="h-4 w-4 mr-1" />
          返回仪表板
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">历史数据查询</h1>
            <p className="text-gray-500">浏览和导出海洋要素历史监测数据</p>
          </div>

          <button
            onClick={exportToCSV}
            disabled={!filteredData || filteredData.length === 0}
            className="flex items-center mt-4 md:mt-0 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            导出数据
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              时间范围
            </label>
            <select
              value={timeRange.days}
              onChange={(e) =>
                setTimeRange({
                  days: parseInt(e.target.value),
                  label: e.target.options[e.target.selectedIndex].text,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            >
              <option value="1">24小时</option>
              <option value="7">7天</option>
              <option value="30">30天</option>
              <option value="90">90天</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              设备
            </label>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            >
              <option value="all">全部设备</option>
              {devices &&
                devices.map((device) => (
                  <option key={device._id} value={device._id}>
                    {device.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              参数
            </label>
            <select
              value={selectedParameter}
              onChange={(e) => setSelectedParameter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            >
              <option value="all">全部参数</option>
              <option value="temperature">温度</option>
              <option value="salinity">盐度</option>
              <option value="dissolvedOxygen">溶解氧</option>
              <option value="pH">pH值</option>
              <option value="flowRate">流速</option>
              <option value="turbidity">浊度</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-500">
              共 {filteredData.length} 条数据
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  设备
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  位置
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  温度
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  盐度
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  溶解氧
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  pH值
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  流速
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  浊度
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!allData ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500 mx-auto"></div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    没有找到匹配的数据
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(item.timestamp), "yyyy-MM-dd HH:mm:ss")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getDeviceName(item.deviceId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.location
                        ? `${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}`
                        : "--"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatParameterValue("temperature", item.temperature)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatParameterValue("salinity", item.salinity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatParameterValue(
                        "dissolvedOxygen",
                        item.dissolvedOxygen
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatParameterValue("pH", item.pH)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatParameterValue("flowRate", item.flowRate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatParameterValue("turbidity", item.turbidity)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
                disabled={pageIndex === 0}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
              >
                上一页
              </button>
              <button
                onClick={() =>
                  setPageIndex(Math.min(totalPages - 1, pageIndex + 1))
                }
                disabled={pageIndex === totalPages - 1}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
              >
                下一页
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  显示第{" "}
                  <span className="font-medium">
                    {pageIndex * pageSize + 1}
                  </span>{" "}
                  至
                  <span className="font-medium">
                    {Math.min((pageIndex + 1) * pageSize, filteredData.length)}
                  </span>{" "}
                  条， 共{" "}
                  <span className="font-medium">{filteredData.length}</span>{" "}
                  条结果
                </p>
              </div>
              <div>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
                    disabled={pageIndex === 0}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <span className="sr-only">上一页</span>
                    <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }).map(
                    (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i;
                      } else if (pageIndex < 2) {
                        pageNum = i;
                      } else if (pageIndex > totalPages - 3) {
                        pageNum = totalPages - 5 + i;
                      } else {
                        pageNum = pageIndex - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPageIndex(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            pageIndex === pageNum
                              ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum + 1}
                        </button>
                      );
                    }
                  )}

                  <button
                    onClick={() =>
                      setPageIndex(Math.min(totalPages - 1, pageIndex + 1))
                    }
                    disabled={pageIndex === totalPages - 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <span className="sr-only">下一页</span>
                    <ChevronLeftIcon
                      className="h-5 w-5 transform rotate-180"
                      aria-hidden="true"
                    />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
