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

    // 获取设备之前的历史数据，用于更真实的趋势生成
    const previousData = await ctx.db
      .query("oceanElements")
      .filter((q) => q.eq(q.field("deviceId"), args.deviceId))
      .order("desc")
      .take(5);

    // 生成基于真实海洋环境的模拟数据
    const hour = new Date(timestamp).getHours();
    const month = new Date(timestamp).getMonth(); // 0-11，用于季节性变化
    const dayOfYear = Math.floor(
      (timestamp - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // 根据纬度确定基础温度范围，纬度越高温度越低
    const latitudeFactor = Math.max(0, (90 - Math.abs(location.latitude)) / 90); // 0-1，赤道接近1，极地接近0

    // 基础温度: 受纬度影响的基础温度 (0°C - 30°C)
    const baseTemperature = 5 + 25 * latitudeFactor;

    // 季节性温度变化: 北半球和南半球季节相反
    const isNorthernHemisphere = location.latitude >= 0;
    const seasonalOffset = isNorthernHemisphere
      ? Math.sin((dayOfYear / 365) * 2 * Math.PI) // 北半球：夏季较暖
      : Math.sin((dayOfYear / 365) * 2 * Math.PI + Math.PI); // 南半球：季节相反

    // 季节变化幅度随纬度增大，赤道附近季节变化小，极地季节变化大
    const seasonalAmplitude = 2 + 8 * (1 - latitudeFactor);

    // 日变化: 白天较暖，夜间较冷
    const diurnalOffset = Math.sin((hour / 24) * 2 * Math.PI - Math.PI / 2);

    // 连续性变化：如果有历史数据，让新数据连续变化
    let continuityFactor = 0;
    if (previousData.length > 0 && previousData[0].temperature) {
      // 添加一个趋势连续性因子，基于最近数据点的温度
      const prevTemp = previousData[0].temperature;
      // 当前计算的温度与前一个温度的差异，使变化更平滑
      const tempDiff =
        baseTemperature + seasonalOffset * seasonalAmplitude - prevTemp;
      continuityFactor = -tempDiff * 0.7; // 减少70%的差异，使变化更平滑
    }

    // 随机波动：海洋温度变化通常较小
    const randomFactor = (Math.random() - 0.5) * 0.3;

    // 最终温度计算
    const temperature =
      baseTemperature +
      seasonalOffset * seasonalAmplitude +
      diurnalOffset * 1.2 +
      randomFactor +
      continuityFactor;

    // 盐度计算：考虑纬度、深度和季节性变化
    // 全球海水盐度范围通常为33-37 PSU

    // 基础盐度：与纬度有关，中纬度区域盐度较高
    const latitudeForSalinity = Math.abs(location.latitude);
    let baseSalinity;
    if (latitudeForSalinity < 30) {
      // 低纬度地区，热带
      baseSalinity = 34.5; // 赤道附近盐度适中
    } else if (latitudeForSalinity < 60) {
      // 中纬度地区
      baseSalinity = 35.5; // 中纬度盐度较高
    } else {
      // 高纬度地区
      baseSalinity = 33.5; // 极地区域盐度较低
    }

    // 季节性影响：雨季盐度降低，旱季盐度升高
    // 简化模型：夏季降雨多，盐度略低
    const seasonalSalinityOffset = isNorthernHemisphere
      ? -0.3 * Math.sin((dayOfYear / 365) * 2 * Math.PI) // 北半球夏季盐度略低
      : -0.3 * Math.sin((dayOfYear / 365) * 2 * Math.PI + Math.PI); // 南半球相反

    // 深度影响：深水区域盐度略高
    const depthFactor = location.depth
      ? Math.min(1, location.depth / 100) * 0.5
      : 0;

    // 连续性变化
    let salinityContinuityFactor = 0;
    if (previousData.length > 0 && previousData[0].salinity) {
      const prevSalinity = previousData[0].salinity;
      const salinityDiff =
        baseSalinity + seasonalSalinityOffset + depthFactor - prevSalinity;
      salinityContinuityFactor = -salinityDiff * 0.8; // 减少80%的差异
    }

    // 随机变化：海水盐度变化通常很小
    const salinityRandom = (Math.random() - 0.5) * 0.2;

    // 最终盐度计算
    const salinity =
      baseSalinity +
      seasonalSalinityOffset +
      depthFactor +
      salinityRandom +
      salinityContinuityFactor;

    // 流速计算：考虑潮汐和日周期
    // 基础流速
    const baseFlowRate = 0.2;

    // 潮汐影响：每天两次高潮低潮
    const tidalFactor = 0.3 * Math.sin((hour / 12) * 2 * Math.PI);

    // 随机波动
    const flowRateRandom = Math.random() * 0.15;

    // 最终流速计算
    const flowRate = baseFlowRate + tidalFactor + flowRateRandom;

    // 溶解氧计算：受温度、盐度影响
    // 海水中溶解氧通常在4-10 mg/L之间，温度越高，溶解氧越低

    // 温度对溶解氧的影响：温度升高，溶解氧降低
    const tempOxygenFactor = -0.2 * (temperature - 15); // 15℃为基准

    // 盐度对溶解氧的影响：盐度升高，溶解氧降低
    const salinityOxygenFactor = -0.05 * (salinity - 35); // 35 PSU为基准

    // 连续性变化
    let oxygenContinuityFactor = 0;
    if (previousData.length > 0 && previousData[0].dissolvedOxygen) {
      const prevOxygen = previousData[0].dissolvedOxygen;
      const oxygenDiff =
        7.5 + tempOxygenFactor + salinityOxygenFactor - prevOxygen;
      oxygenContinuityFactor = -oxygenDiff * 0.75; // 减少75%的差异
    }

    // 随机变化
    const oxygenRandom = (Math.random() - 0.5) * 0.3;

    // 最终溶解氧计算
    const dissolvedOxygen =
      7.5 +
      tempOxygenFactor +
      salinityOxygenFactor +
      oxygenRandom +
      oxygenContinuityFactor;

    // pH值：通常海水pH在7.8-8.3之间，受多种因素影响
    // 基础pH值：全球海水平均约8.1
    const basePH = 8.1;

    // 溶解氧对pH的影响：溶解氧增加，pH略微上升
    const oxygenPHFactor = 0.05 * ((dissolvedOxygen - 7) / 5);

    // 随机变化
    const pHRandom = (Math.random() - 0.5) * 0.1;

    // 最终pH计算
    const pH = basePH + oxygenPHFactor + pHRandom;

    // 浊度：受流速影响，流速大浊度高
    // 基础浊度
    const baseTurbidity = 1.5;

    // 流速影响
    const flowTurbidityFactor = flowRate * 1.2;

    // 随机变化
    const turbidityRandom = Math.random() * 0.8;

    // 最终浊度计算
    const turbidity = baseTurbidity + flowTurbidityFactor + turbidityRandom;

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
