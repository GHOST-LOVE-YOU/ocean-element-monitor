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

## 后端架构

系统使用Convex作为后端数据库和API服务。Convex提供了高性能的数据存储和实时数据同步功能，非常适合本系统对实时数据处理的需求。

### 数据模型架构

系统包含以下数据表：

#### 1. oceanElements - 海洋要素数据表

```typescript
oceanElements: defineTable({
  timestamp: v.number(),                 // 时间戳
  location: v.object({                   // 位置信息
    latitude: v.number(),                // 纬度
    longitude: v.number(),               // 经度
    depth: v.optional(v.number()),       // 深度（可选）
  }),
  temperature: v.optional(v.number()),   // 温度（°C）
  salinity: v.optional(v.number()),      // 盐度（PSU）
  flowRate: v.optional(v.number()),      // 流速（m/s）
  dissolvedOxygen: v.optional(v.number()), // 溶解氧（mg/L）
  pH: v.optional(v.number()),            // pH值
  turbidity: v.optional(v.number()),     // 浊度（NTU）
  deviceId: v.string(),                  // 监测设备ID
  status: v.string(),                    // 数据状态：normal/abnormal
})
  .index("by_timestamp", ["timestamp"])
  .index("by_location", ["location.latitude", "location.longitude"])
  .index("by_deviceId", ["deviceId"])
```

#### 2. devices - 监测设备表

```typescript
devices: defineTable({
  name: v.string(),                      // 设备名称
  type: v.string(),                      // 设备类型
  location: v.object({                   // 设备位置
    latitude: v.number(),                // 纬度
    longitude: v.number(),               // 经度
    depth: v.optional(v.number()),       // 深度（可选）
    description: v.optional(v.string()), // 位置描述（可选）
  }),
  status: v.string(),                    // 在线状态：online/offline/maintenance
  lastActive: v.number(),                // 最后活跃时间
  batteryLevel: v.optional(v.number()),  // 电池电量（%）
  isSimulating: v.optional(v.boolean()), // 是否正在模拟数据
  config: v.object({                     // 设备配置
    sampleRate: v.number(),              // 采样频率（次/小时）
    uploadInterval: v.number(),          // 数据上传间隔（秒）
    parameters: v.array(v.string()),     // 监测的参数列表
  }),
})
```

#### 3. analysisResults - 分析结果表

```typescript
analysisResults: defineTable({
  timestamp: v.number(),                 // 分析时间戳
  type: v.string(),                      // 分析类型：trend/anomaly/forecast
  targetParameter: v.string(),           // 分析的目标参数
  timeRange: v.object({                  // 分析的时间范围
    start: v.number(),                   // 开始时间
    end: v.number(),                     // 结束时间
  }),
  results: v.any(),                      // 分析结果（灵活数据结构）
  insights: v.array(v.string()),         // 数据洞察文本
  createdBy: v.optional(v.string()),     // 创建者
})
  .index("by_timestamp", ["timestamp"])
  .index("by_type_parameter", ["type", "targetParameter"])
```

#### 4. users - 用户表

```typescript
users: defineTable({
  name: v.string(),                      // 用户名
  email: v.string(),                     // 邮箱
  role: v.string(),                      // 角色：admin/researcher/viewer
  preferences: v.optional(v.object({     // 用户偏好设置
    theme: v.optional(v.string()),       // 主题
    dashboardLayout: v.optional(v.any()), // 仪表盘布局
  })),
}).index("by_email", ["email"])
```

#### 5. alerts - 警报表

```typescript
alerts: defineTable({
  timestamp: v.number(),                 // 警报时间
  parameterType: v.string(),             // 参数类型：temperature/salinity等
  deviceId: v.string(),                  // 设备ID
  value: v.number(),                     // 异常值
  threshold: v.number(),                 // 阈值
  status: v.string(),                    // 状态：new/acknowledged/resolved
  severity: v.string(),                  // 严重程度：low/medium/high
  message: v.string(),                   // 警报消息
})
  .index("by_timestamp", ["timestamp"])
  .index("by_status", ["status"])
  .index("by_deviceId", ["deviceId"])
```

### API功能

系统提供了以下API功能，用于数据管理和分析：

#### 海洋要素数据 (oceanElements)

##### 查询函数

1. **getLatest** - 获取最新的海洋要素数据
   - 参数: 
     - `limit`: 可选，返回的数据条数，默认10
   - 返回: 按时间戳降序排列的海洋要素数据数组

2. **getByLocation** - 按位置获取数据
   - 参数:
     - `latitude`: 纬度
     - `longitude`: 经度
     - `radius`: 可选，搜索半径(km)，默认10
   - 返回: 指定位置半径范围内的海洋要素数据

3. **getByTimeRange** - 按时间段获取数据
   - 参数:
     - `startTime`: 开始时间戳
     - `endTime`: 结束时间戳
     - `deviceId`: 可选，设备ID
   - 返回: 指定时间范围内的海洋要素数据

##### 修改函数

1. **add** - 添加新的海洋要素数据
   - 参数:
     - `timestamp`: 时间戳
     - `location`: 位置对象 (latitude, longitude, depth可选)
     - `temperature`: 可选，温度
     - `salinity`: 可选，盐度
     - `flowRate`: 可选，流速
     - `dissolvedOxygen`: 可选，溶解氧
     - `pH`: 可选，pH值
     - `turbidity`: 可选，浊度
     - `deviceId`: 设备ID
   - 返回: 新插入数据的ID

#### 设备管理 (devices)

##### 查询函数

1. **getAll** - 获取所有监测设备
   - 参数: 无
   - 返回: 所有设备数据数组

2. **getById** - 获取特定设备详情
   - 参数:
     - `id`: 设备ID
   - 返回: 设备详细信息

3. **getAllOnline** - 获取所有在线设备
   - 参数: 无
   - 返回: 状态为"online"的设备数组

##### 修改函数

1. **add** - 添加新设备
   - 参数:
     - `name`: 设备名称
     - `type`: 设备类型
     - `location`: 位置对象 (latitude, longitude, description可选)
     - `config`: 配置对象 (sampleRate, uploadInterval, parameters)
   - 返回: 新设备ID

2. **updateStatus** - 更新设备状态
   - 参数:
     - `id`: 设备ID
     - `status`: 新状态
     - `batteryLevel`: 可选，电池电量
   - 返回: 更新结果对象，包含deviceId, updatedStatus, resolvedAlerts等信息

#### 警报管理 (alerts)

##### 查询函数

1. **getAll** - 获取所有警报
   - 参数:
     - `status`: 可选，警报状态筛选
     - `limit`: 可选，返回的数据条数，默认50
   - 返回: 警报数据数组

##### 修改函数

1. **add** - 添加新警报
   - 参数:
     - `timestamp`: 时间戳
     - `deviceId`: 设备ID
     - `alertType`: 警报类型
     - `severity`: 严重程度
     - `parameter`: 参数名称
     - `value`: 异常值
     - `threshold`: 阈值
     - `description`: 可选，描述
     - `location`: 位置对象 (仅用于前端显示)
     - `status`: 可选，状态，默认"new"
   - 返回: 新警报ID

2. **updateStatus** - 更新警报状态
   - 参数:
     - `id`: 警报ID
     - `status`: 新状态
   - 返回: 更新操作结果

3. **resolveAlertsByDevice** - 解决指定设备的所有警报
   - 参数:
     - `deviceId`: 设备ID
   - 返回: 操作结果，包含resolvedCount和message

#### 数据分析 (analysis)

##### 查询函数

1. **getResults** - 获取分析结果
   - 参数:
     - `type`: 可选，分析类型
     - `parameter`: 可选，参数名称
     - `limit`: 可选，返回条数，默认10
   - 返回: 分析结果数组

2. **getStatistics** - 获取特定参数的统计数据
   - 参数:
     - `parameter`: 参数名称
     - `timeRange`: 时间范围对象 (start, end)
     - `deviceId`: 可选，设备ID
   - 返回: 统计数据对象，包含avg, min, max, stdDev等

##### 修改函数

1. **createAnalysis** - 创建新的分析结果
   - 参数:
     - `type`: 分析类型
     - `targetParameter`: 目标参数
     - `timeRange`: 时间范围对象 (start, end)
     - `results`: 分析结果
     - `insights`: 数据洞察数组
     - `createdBy`: 可选，创建者
   - 返回: 新分析结果ID

#### 数据生成 (generateData)

##### 修改函数

1. **generateSingleDataPoint** - 生成单条模拟数据
   - 参数:
     - `deviceId`: 设备ID
     - `timestamp`: 可选，时间戳
     - `location`: 可选，位置对象
   - 返回: 生成的数据ID

2. **generateHistoricalData** - 生成历史数据
   - 参数:
     - `deviceId`: 设备ID
     - `days`: 天数
     - `interval`: 数据间隔(分钟)
   - 返回: 生成的数据数量

3. **startSimulation** - 开始数据模拟
   - 参数:
     - `deviceId`: 设备ID
     - `interval`: 生成间隔(秒)
   - 返回: 操作结果对象

4. **stopSimulation** - 停止数据模拟
   - 参数:
     - `deviceId`: 设备ID
   - 返回: 操作结果对象

#### 调度器 (scheduler)

##### 自动执行任务

1. **cleanupOldData** - 清理旧数据
   - 功能: 定期删除过期的海洋要素数据
   - 执行频率: 每天一次

2. **checkDeviceStatus** - 检查设备状态
   - 功能: 检查长时间未活动的设备并更新状态
   - 执行频率: 每小时一次

3. **runDailyAnalysis** - 执行每日分析
   - 功能: 对所有监测参数执行每日趋势分析
   - 执行频率: 每天一次

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
