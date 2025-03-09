"use client";

import Link from "next/link";
import { FiSend, FiBell } from "react-icons/fi";

export default function ApiDirectoryPage() {
  const apiEndpoints = [
    {
      title: "发送数据",
      description: "发送设备监测数据到系统",
      link: "/admin/api/sendmessage",
      icon: <FiSend className="h-6 w-6" />,
      color: "blue",
    },
    {
      title: "发送警报",
      description: "发送海洋指标异常警报",
      link: "/admin/api/sendalert",
      icon: <FiBell className="h-6 w-6" />,
      color: "red",
    },
    // 未来可以添加更多API端点
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-blue-800">API管理</h1>
            <p className="text-gray-500">管理和测试系统API接口</p>
          </div>
          <div className="flex space-x-4">
            <Link
              href="/admin"
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              返回管理主页
            </Link>
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              返回仪表板
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-blue-700 border-b pb-2">
            API端点概览
          </h2>
          <p className="text-gray-600 mb-4">
            海洋要素监测系统提供多种API端点，允许设备和外部系统与平台集成。每个API都需要进行密钥认证。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {apiEndpoints.map((endpoint, index) => (
              <Link
                key={index}
                href={endpoint.link}
                className={`block p-5 rounded-lg border border-${endpoint.color}-100 hover:border-${endpoint.color}-300 bg-${endpoint.color}-50 hover:bg-${endpoint.color}-100 transition-all group`}
              >
                <div className="flex items-start">
                  <div
                    className={`p-3 rounded-lg bg-${endpoint.color}-100 text-${endpoint.color}-600 mr-4`}
                  >
                    {endpoint.icon}
                  </div>
                  <div>
                    <h3
                      className={`font-medium text-${endpoint.color}-800 text-lg mb-1 group-hover:text-${endpoint.color}-700`}
                    >
                      {endpoint.title}
                    </h3>
                    <p className="text-gray-600">{endpoint.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-blue-700 border-b pb-2">
            API使用指南
          </h2>

          <div className="mb-6">
            <h3 className="font-medium text-gray-800 mb-2">认证</h3>
            <p className="text-gray-600 mb-3">
              所有API请求都需要在请求头中包含API密钥进行认证。请在每个请求中包含以下请求头：
            </p>
            <pre className="text-sm bg-gray-50 p-3 rounded-md border overflow-auto">
              {`x-api-key: your-api-key`}
            </pre>
          </div>

          <div className="mb-6">
            <h3 className="font-medium text-gray-800 mb-2">错误处理</h3>
            <p className="text-gray-600 mb-3">
              当API请求失败时，服务器将返回适当的HTTP状态码和JSON格式的错误详情：
            </p>
            <pre className="text-sm bg-gray-50 p-3 rounded-md border overflow-auto">
              {`{
  "error": "错误描述",
  "details": "错误详情（如适用）"
}`}
            </pre>
          </div>

          <div>
            <h3 className="font-medium text-gray-800 mb-2">常见HTTP状态码</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>
                <span className="font-mono text-sm text-green-600">200 OK</span>{" "}
                - 请求成功
              </li>
              <li>
                <span className="font-mono text-sm text-green-600">
                  201 Created
                </span>{" "}
                - 资源创建成功
              </li>
              <li>
                <span className="font-mono text-sm text-amber-600">
                  400 Bad Request
                </span>{" "}
                - 请求格式或参数错误
              </li>
              <li>
                <span className="font-mono text-sm text-amber-600">
                  401 Unauthorized
                </span>{" "}
                - API密钥无效或缺失
              </li>
              <li>
                <span className="font-mono text-sm text-red-600">
                  500 Internal Server Error
                </span>{" "}
                - 服务器内部错误
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
