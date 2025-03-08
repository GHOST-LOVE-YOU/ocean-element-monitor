import { mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// 生成单条模拟数据
export const generateSingleDataPoint = mutation({
  args: {
    deviceId: v.string(),
    timestamp: v.optional(v.number()),
    location: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
        depth: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // 获取设备信息
    const device = await ctx.db
      .query("devices")
      .filter((q) => q.eq(q.field("_id"), args.deviceId))
      .first();

    if (!device) {
      throw new Error(`设备未找到: ${args.deviceId}`);
    }

    const timestamp = args.timestamp || Date.now();
    const location = args.location || device.location;

    // 生成基于真实海洋环境的模拟数据
    const hour = new Date(timestamp).getHours();
    const dayOfYear = Math.floor(
      (timestamp - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // 温度: 季节变化 + 日变化 + 随机波动
    const temperature = 15 + 
      8 * Math.sin((dayOfYear / 365) * 2 * Math.PI - Math.PI / 2) + 
      1.5 * Math.sin((hour / 24) * 2 * Math.PI - Math.PI / 2) + 
      (Math.random() - 0.5) * 0.8;

    // 盐度: 基于纬度的变化 + 小随机波动
    const salinity = 35 - 
      0.1 * (location.latitude - 45) + 
      (Math.random() - 0.5) * 0.6;

    // 流速: 小时变化 + 随机波动
    const flowRate = 0.3 + 
      0.2 * Math.sin((hour / 12) * 2 * Math.PI) + 
      Math.random() * 0.2;

    // 溶解氧: 温度反相关 + 随机波动
    const dissolvedOxygen = 8 - 
      0.1 * (temperature - 15) + 
      (Math.random() - 0.5) * 0.6;

    // pH: 小波动
    const pH = 8.1 + (Math.random() - 0.5) * 0.3;

    // 浊度: 流速相关 + 随机波动
    const turbidity = 2 + 
      flowRate * 0.5 + 
      Math.random() * 1.5;

    // 创建数据点
    return await ctx.db.insert("oceanElements", {
      timestamp,
      location,
      temperature,
      salinity,
      flowRate,
      dissolvedOxygen,
      pH,
      turbidity,
      deviceId: args.deviceId,
      status: "normal", // 默认状态
    });
  },
});

// 生成历史数据
export const generateHistoricalData = action({
  args: {
    deviceId: v.string(),
    days: v.number(), // 要生成的天数
    dataPointsPerDay: v.number(), // 每天生成的数据点数量
    startDate: v.optional(v.string()), // 起始日期，格式为 ISO 字符串
  },
  handler: async (ctx, args) => {
    const { deviceId, days, dataPointsPerDay } = args;

    // 获取设备信息，验证设备是否存在
    const device = await ctx.runQuery(internal.devices.getById, {
      id: deviceId,
    });

    if (!device) {
      throw new Error(`设备未找到: ${deviceId}`);
    }

    // 计算起始时间
    const startDate = args.startDate
      ? new Date(args.startDate)
      : new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 计算每个数据点之间的时间间隔
    const intervalMs = (24 * 60 * 60 * 1000) / dataPointsPerDay;

    const results = [];

    // 生成历史数据
    for (let day = 0; day < days; day++) {
      for (let point = 0; point < dataPointsPerDay; point++) {
        const timestamp =
          startDate.getTime() + day * 24 * 60 * 60 * 1000 + point * intervalMs;

        // 添加一些小的随机位置变化，模拟设备漂移或不同的采样位置
        const location = {
          latitude: device.location.latitude + (Math.random() - 0.5) * 0.01,
          longitude: device.location.longitude + (Math.random() - 0.5) * 0.01,
          depth: device.location.depth || 5 + (Math.random() - 0.5) * 2,
        };

        // 调用函数生成单条数据
        const dataId = await ctx.runMutation(
          internal.generateData.generateSingleDataPoint,
          {
            deviceId,
            timestamp,
            location,
          }
        );

        results.push(dataId);
      }
    }

    return {
      message: `成功生成 ${results.length} 条历史数据`,
      count: results.length,
    };
  },
});

// 模拟实时数据更新（可以定期调用此函数生成新数据）
export const generateRealtimeUpdate = action({
  args: {
    deviceIds: v.array(v.string()), // 要更新的设备ID列表
  },
  handler: async (ctx, args) => {
    const { deviceIds } = args;
    const results = [];

    for (const deviceId of deviceIds) {
      try {
        const dataId = await ctx.runMutation(
          internal.generateData.generateSingleDataPoint,
          {
            deviceId,
            timestamp: Date.now(),
          }
        );
        results.push({ deviceId, dataId, success: true });
      } catch (error) {
        results.push({ deviceId, error: error.message, success: false });
      }
    }

    return results;
  },
});

// 生成示例设备
export const createSampleDevices = mutation({
  args: {},
  handler: async (ctx) => {
    // 定义几个示例设备
    const sampleDevices = [
      {
        name: "浮标站A1",
        type: "浮标",
        location: {
          latitude: 31.2304,
          longitude: 121.4737,
          description: "东海区域",
        },
        config: {
          sampleRate: 15, // 每15分钟
          uploadInterval: 60, // 每60分钟
          parameters: ["temperature", "salinity", "dissolvedOxygen", "pH"],
        },
      },
      {
        name: "水下观测点B2",
        type: "固定观测站",
        location: {
          latitude: 39.9042,
          longitude: 116.4074,
          description: "渤海湾",
        },
        config: {
          sampleRate: 10, // 每10分钟
          uploadInterval: 30, // 每30分钟
          parameters: [
            "temperature",
            "salinity",
            "flowRate",
            "dissolvedOxygen",
            "turbidity",
          ],
        },
      },
      {
        name: "海洋平台C3",
        type: "研究平台",
        location: {
          latitude: 22.5431,
          longitude: 114.0579,
          description: "南海区域",
        },
        config: {
          sampleRate: 5, // 每5分钟
          uploadInterval: 15, // 每15分钟
          parameters: [
            "temperature",
            "salinity",
            "flowRate",
            "dissolvedOxygen",
            "pH",
            "turbidity",
          ],
        },
      },
    ];

    const deviceIds = [];

    for (const device of sampleDevices) {
      const deviceId = await ctx.db.insert("devices", {
        ...device,
        status: "online",
        lastActive: Date.now(),
        batteryLevel: 95 + Math.floor(Math.random() * 6), // 95-100%
      });
      deviceIds.push(deviceId);
    }

    return {
      message: "成功创建示例设备",
      deviceIds,
    };
  },
});
