import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 海洋要素数据表
  oceanElements: defineTable({
    timestamp: v.number(), // 时间戳
    location: v.object({
      latitude: v.number(),
      longitude: v.number(),
      depth: v.optional(v.number()),
    }),
    temperature: v.optional(v.number()), // 温度
    salinity: v.optional(v.number()), // 盐度
    flowRate: v.optional(v.number()), // 流速
    dissolvedOxygen: v.optional(v.number()), // 溶解氧
    // 其他可能的测量值
    pH: v.optional(v.number()),
    turbidity: v.optional(v.number()), // 浊度
    // 元数据
    deviceId: v.string(), // 监测设备ID
    status: v.string(), // 数据状态：正常/异常
    // 索引以加快查询速度
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_location", ["location.latitude", "location.longitude"])
    .index("by_deviceId", ["deviceId"]),

  // 监测设备表
  devices: defineTable({
    name: v.string(),
    type: v.string(),
    location: v.object({
      latitude: v.number(),
      longitude: v.number(),
      depth: v.optional(v.number()),
      description: v.optional(v.string()),
    }),
    status: v.string(), // 在线/离线/维护中
    lastActive: v.number(), // 最后活跃时间
    batteryLevel: v.optional(v.number()), // 电池电量
    isSimulating: v.optional(v.boolean()), // 是否正在模拟数据
    // 设备配置信息
    config: v.object({
      sampleRate: v.number(), // 采样频率
      uploadInterval: v.number(), // 数据上传间隔
      parameters: v.array(v.string()), // 监测的参数列表
    }),
  }),

  // 分析结果表
  analysisResults: defineTable({
    timestamp: v.number(),
    type: v.string(), // 分析类型：趋势分析/异常检测/预测
    targetParameter: v.string(), // 分析的目标参数
    timeRange: v.object({
      start: v.number(),
      end: v.number(),
    }),
    results: v.any(), // 分析结果
    insights: v.array(v.string()), // 数据洞察
    createdBy: v.optional(v.string()), // 创建者
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_type_parameter", ["type", "targetParameter"]),

  // 用户表
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.string(), // admin/researcher/viewer
    preferences: v.optional(
      v.object({
        theme: v.optional(v.string()),
        dashboardLayout: v.optional(v.any()),
      })
    ),
  }).index("by_email", ["email"]),

  // 警报表
  alerts: defineTable({
    timestamp: v.number(),
    parameterType: v.string(), // 温度/盐度等
    deviceId: v.string(),
    value: v.number(),
    threshold: v.number(),
    status: v.string(), // 新建/已确认/已解决
    severity: v.string(), // 低/中/高
    message: v.string(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_status", ["status"])
    .index("by_deviceId", ["deviceId"]),
});
