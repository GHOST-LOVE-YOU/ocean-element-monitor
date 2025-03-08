"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

export default function AlertsPage() {
  // 过滤条件
  const [statusFilter, setStatusFilter] = useState<string>("new"); // "all", "new", "acknowledged", "resolved"
  const [severityFilter, setStatusSeverity] = useState<string>("all"); // "all", "low", "medium", "high", "info"
  
  // 获取警报数据
  const alerts = useQuery(api.alerts.getAll, { status: statusFilter !== "all" ? statusFilter : undefined }) || [];
  const devices = useQuery(api.devices.getAll) || [];
  
  // 确认和解决警报的方法
  const acknowledgeAlert = useMutation(api.alerts.acknowledgeAlert);
  const resolveAlert = useMutation(api.alerts.resolveAlert);

  // 根据条件过滤的警报
  const filteredAlerts = alerts
    .filter(alert => severityFilter === "all" || alert.severity === severityFilter)
    .sort((a, b) => b.timestamp - a.timestamp); // 按时间降序排列，最新的在上面

  // 设备ID到名称的映射
  const deviceMap = devices.reduce((map, device) => {
    map[device._id] = device.name;
    return map;
  }, {} as Record<string, string>);

  // 处理警报确认
  const handleAcknowledge = async (alertId: Id<"alerts">) => {
    try {
      await acknowledgeAlert({ alertId });
    } catch (error) {
      console.error("确认警报失败:", error);
    }
  };

  // 处理警报解决
  const handleResolve = async (alertId: Id<"alerts">) => {
    try {
      await resolveAlert({ alertId });
    } catch (error) {
      console.error("解决警报失败:", error);
    }
  };

  // 获取警报严重性对应的样式
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-blue-100 text-blue-800";
      case "info":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // 获取警报状态对应的样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "new":
        return "bg-red-100 text-red-800";
      case "acknowledged":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">警报管理</h1>
            <p className="text-gray-500">查看和管理系统警报</p>
          </div>
          <div className="flex space-x-4">
            <Link href="/dashboard" className="text-blue-500 hover:text-blue-700">
              返回仪表板
            </Link>
            <Link href="/admin" className="text-blue-500 hover:text-blue-700">
              设备管理
            </Link>
          </div>
        </div>

        {/* 筛选控件 */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-40 p-2 border rounded"
              >
                <option value="all">全部</option>
                <option value="new">未处理</option>
                <option value="acknowledged">已确认</option>
                <option value="resolved">已解决</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                严重性
              </label>
              <select
                value={severityFilter}
                onChange={(e) => setStatusSeverity(e.target.value)}
                className="w-40 p-2 border rounded"
              >
                <option value="all">全部</option>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
                <option value="info">信息</option>
              </select>
            </div>
          </div>
        </div>

        {/* 警报列表 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredAlerts.length > 0 ? (
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
                      警报类型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      严重性
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      消息
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAlerts.map((alert) => (
                    <tr key={alert._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {deviceMap[alert.deviceId] || alert.deviceId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {alert.parameterType === "device_status" ? "设备状态" : alert.parameterType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getSeverityStyle(alert.severity)}`}>
                          {alert.severity === "high" && "高"}
                          {alert.severity === "medium" && "中"}
                          {alert.severity === "low" && "低"}
                          {alert.severity === "info" && "信息"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyle(alert.status)}`}>
                          {alert.status === "new" && "未处理"}
                          {alert.status === "acknowledged" && "已确认"}
                          {alert.status === "resolved" && "已解决"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                        {alert.message}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {alert.status === "new" && (
                          <button
                            onClick={() => handleAcknowledge(alert._id)}
                            className="text-indigo-600 hover:text-indigo-900 mr-2"
                          >
                            确认
                          </button>
                        )}
                        {(alert.status === "new" || alert.status === "acknowledged") && (
                          <button
                            onClick={() => handleResolve(alert._id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            解决
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              没有找到符合条件的警报
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
