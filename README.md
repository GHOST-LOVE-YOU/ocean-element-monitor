# 海洋要素智能监测系统

一个用于监测和分析海洋环境要素的实时系统，包括温度、盐度、溶解氧等数据的采集、分析和可视化。

## 功能特点

- 实时监测海洋环境要素数据
- 多维度数据可视化
- 时间范围选择和数据过滤
- 异常检测和警报系统
- 设备管理和监控
- 外部API接口，支持数据导入

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
npm run start
```

## 管理界面

系统提供了管理界面，用于管理系统和数据。访问路径：`/admin`

管理界面功能：
- 系统状态概览：显示设备、警报、数据库等状态
- 管理模块导航：提供各个管理模块的快速访问
- 系统信息：显示系统版本、服务器状态等信息

### API管理

系统提供了专门的API管理界面，用于测试API和生成测试数据。访问路径：`/admin/api`

API管理功能：
- 随机数据生成器：可以生成指定数量的随机数据，用于测试系统
- 手动数据发送：可以手动输入数据并发送到系统
- 操作日志：显示最近的操作记录
- 最新数据：显示最近添加的数据
- API文档：提供API使用说明

## API接口

系统提供了REST API接口，用于从外部添加数据。

### 添加数据

**请求**

```
POST /api/data
```

**请求头**

```
Content-Type: application/json
x-api-key: your-api-key
```

**请求体**

```json
{
  "deviceId": "device-001",
  "timestamp": 1646006400000,
  "location": {
    "latitude": 30.5,
    "longitude": 121.3,
    "depth": 5
  },
  "temperature": 18.5,
  "salinity": 35.2,
  "dissolvedOxygen": 6.8,
  "pH": 8.1,
  "flowRate": 0.5,
  "turbidity": 2.3,
  "status": "normal"
}
```

**响应**

```json
{
  "success": true,
  "id": "data-id"
}
```

### 使用curl测试API

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-api-key: ocean-monitor-api-key" \
  -d '{"deviceId":"device-001","timestamp":1646006400000,"location":{"latitude":30.5,"longitude":121.3,"depth":5},"temperature":18.5,"salinity":35.2,"dissolvedOxygen":6.8}' \
  http://localhost:3000/api/data
```

### 使用测试脚本

系统提供了一个测试脚本，用于批量发送测试数据：

```bash
npm run test-api
```

可以在`scripts/test-api.js`中修改配置参数。

## 技术栈

- **前端**：Next.js, React, TailwindCSS, Chart.js, Leaflet
- **后端**：Convex (数据库和后端服务)
- **API**：Next.js API Routes

## 数据模型

系统主要包含以下数据模型：

- **海洋要素数据**：温度、盐度、溶解氧等测量值
- **设备**：监测设备信息
- **警报**：异常数据警报
- **分析结果**：数据分析结果

## 许可证

MIT
