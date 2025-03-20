import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import * as alertsModule from "./alerts";

// 获取所有监测设备
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("devices").collect();
  },
});

// 获取特定设备详情
export const getById = query({
  args: { id: v.id("devices") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// 添加新设备
export const add = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    location: v.object({
      latitude: v.number(),
      longitude: v.number(),
      description: v.optional(v.string()),
    }),
    config: v.object({
      sampleRate: v.number(),
      uploadInterval: v.number(),
      parameters: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("devices", {
      ...args,
      status: "online",
      lastActive: Date.now(),
    });
  },
});

// 更新设备状态
export const updateStatus = mutation({
  args: {
    id: v.id("devices"),
    status: v.string(),
    batteryLevel: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, status, batteryLevel } = args;

    // 获取当前设备状态
    const device = await ctx.db.get(id);
    if (!device) {
      throw new Error("设备不存在");
    }

    const updateData: {
      status: string;
      lastActive: number;
      batteryLevel?: number;
    } = {
      status,
      lastActive: Date.now(),
    };

    if (batteryLevel !== undefined) {
      updateData.batteryLevel = batteryLevel;
    }

    // 更新设备状态
    await ctx.db.patch(id, updateData);

    // 如果设备状态从离线变为在线，自动处理所有未处理的警报
    if (device.status === "offline" && status === "online") {
      // 使用静态导入的resolveAlertsByDevice函数
      const result = await alertsModule.resolveAlertsByDevice(ctx, {
        deviceId: id,
      });

      return {
        deviceId: id,
        updatedStatus: status,
        resolvedAlerts: result.resolvedCount,
        message: result.message,
      };
    }

    return {
      deviceId: id,
      updatedStatus: status,
      resolvedAlerts: 0,
    };
  },
});

// 获取所有在线设备
export const getAllOnline = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("devices")
      .filter((q) => q.eq(q.field("status"), "online"))
      .collect();
  },
});

// 新增：获取设备健康状况
export const getDeviceHealth = query({
  args: {
    id: v.optional(v.id("devices")),
  },
  handler: async (ctx, args) => {
    const { id } = args;

    // 获取设备数据
    const devices = id
      ? [await ctx.db.get(id)].filter(Boolean)
      : await ctx.db.query("devices").collect();

    if (devices.length === 0) {
      return [];
    }

    const now = Date.now();
    const healthData = [];

    for (const device of devices) {
      // 确保设备对象存在
      if (!device) continue;

      // 检查最后活动时间
      const lastActiveAge = now - device.lastActive;
      const activeStatus =
        lastActiveAge < 3600000
          ? "正常"
          : lastActiveAge < 86400000
            ? "警告"
            : "异常";

      // 获取设备的最新数据点
      const latestData = await ctx.db
        .query("oceanElements")
        .filter((q) => q.eq(q.field("deviceId"), device._id))
        .order("desc")
        .first();

      // 获取过去7天内的数据点数量
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const recentData = await ctx.db
        .query("oceanElements")
        .filter(
          (q) =>
            q.eq(q.field("deviceId"), device._id) &&
            q.gte(q.field("timestamp"), weekAgo)
        )
        .collect();

      // 获取设备警报数量
      const activeAlerts = await ctx.db
        .query("alerts")
        .filter(
          (q) =>
            q.eq(q.field("deviceId"), device._id) &&
            q.eq(q.field("status"), "new")
        )
        .collect();

      // 计算健康得分 (0-100)
      let healthScore = 100;

      // 设备状态影响
      if (device.status !== "online") {
        healthScore -= 30;
      }

      // 最后活动时间影响
      if (activeStatus === "警告") {
        healthScore -= 15;
      } else if (activeStatus === "异常") {
        healthScore -= 30;
      }

      // 电池电量影响
      if (device.batteryLevel !== undefined) {
        if (device.batteryLevel < 20) {
          healthScore -= 20;
        } else if (device.batteryLevel < 50) {
          healthScore -= 10;
        }
      }

      // 警报数量影响
      healthScore -= Math.min(30, activeAlerts.length * 5);

      // 确保分数在0-100之间
      healthScore = Math.max(0, Math.min(100, healthScore));

      healthData.push({
        id: device._id,
        name: device.name,
        type: device.type,
        status: device.status,
        healthScore,
        lastActive: device.lastActive,
        lastActiveAge,
        activeStatus,
        batteryLevel: device.batteryLevel,
        dataPointsLastWeek: recentData.length,
        activeAlerts: activeAlerts.length,
        latestDataTimestamp: latestData?.timestamp,
      });
    }

    return healthData;
  },
});

// // 新增：获取设备数据覆盖率
// export const getDataCoverage = query({
//   args: {
//     deviceId: v.id("devices"),
//     days: v.number(),
//   },
//   handler: async (ctx, args) => {
//     const { deviceId, days } = args;

//     const device = await ctx.db.get(deviceId);
//     if (!device) {
//       throw new Error(`设备未找到: ${deviceId}`);
//     }

//     const now = Date.now();
//     const startTime = now - days * 24 * 60 * 60 * 1000;

//     // 获取预期的数据点数量(根据设备配置)
//     const expectedPointsPerDay = (24 * 60) / device.config.sampleRate;
//     const totalExpectedPoints = expectedPointsPerDay * days;

//     // 获取实际收集的数据点
//     const actualData = await ctx.db
//       .query("oceanElements")
//       .filter(
//         (q) =>
//           q.eq(q.field("deviceId"), deviceId) &&
//           q.gte(q.field("timestamp"), startTime)
//       )
//       .collect();

//     // 计算每个参数的覆盖率
//     const parameters = device.config.parameters;
//     const parameterCoverage = {};

//     parameters.forEach((param) => {
//       const dataWithParam = actualData.filter(
//         (item) => item[param] !== undefined && item[param] !== null
//       );

//       parameterCoverage[param] = {
//         expected: totalExpectedPoints,
//         actual: dataWithParam.length,
//         coverage: (dataWithParam.length / totalExpectedPoints) * 100,
//       };
//     });

//     // 计算时间段覆盖率
//     const timeSlots = [];
//     const slotSize = 24 / Math.min(24, days); // 每天最多24个时间段

//     for (let day = 0; day < days; day++) {
//       for (let slot = 0; slot < slotSize; slot++) {
//         const slotStart =
//           startTime +
//           day * 24 * 60 * 60 * 1000 +
//           slot * (24 / slotSize) * 60 * 60 * 1000;
//         const slotEnd = slotStart + (24 / slotSize) * 60 * 60 * 1000;

//         const slotData = actualData.filter(
//           (item) => item.timestamp >= slotStart && item.timestamp < slotEnd
//         );

//         timeSlots.push({
//           start: slotStart,
//           end: slotEnd,
//           expected: expectedPointsPerDay / slotSize,
//           actual: slotData.length,
//           coverage: (slotData.length / (expectedPointsPerDay / slotSize)) * 100,
//         });
//       }
//     }

//     return {
//       deviceId,
//       deviceName: device.name,
//       days,
//       totalExpected: totalExpectedPoints,
//       totalActual: actualData.length,
//       overallCoverage: (actualData.length / totalExpectedPoints) * 100,
//       parameterCoverage,
//       timeSlots,
//     };
//   },
// });

// // 新增：获取设备分组统计
// export const getDeviceStats = query({
//   args: {},
//   handler: async (ctx) => {
//     const devices = await ctx.db.query("devices").collect();

//     if (devices.length === 0) {
//       return {
//         total: 0,
//         byType: {},
//         byStatus: {},
//       };
//     }

//     // 按类型统计
//     const byType = {};
//     // 按状态统计
//     const byStatus = {};

//     devices.forEach((device) => {
//       // 统计类型
//       if (!byType[device.type]) {
//         byType[device.type] = 0;
//       }
//       byType[device.type]++;

//       // 统计状态
//       if (!byStatus[device.status]) {
//         byStatus[device.status] = 0;
//       }
//       byStatus[device.status]++;
//     });

//     return {
//       total: devices.length,
//       byType,
//       byStatus,
//     };
//   },
// });

// 删除设备及其关联数据
export const deleteDevice = mutation({
  args: {
    id: v.id("devices"),
  },
  handler: async (ctx, args) => {
    const { id } = args;

    // 获取设备信息，确认设备存在
    const device = await ctx.db.get(id);
    if (!device) {
      throw new Error("设备不存在");
    }

    // 1. 删除设备相关的海洋要素数据
    const oceanElementsToDelete = await ctx.db
      .query("oceanElements")
      .filter((q) => q.eq(q.field("deviceId"), id))
      .collect();

    for (const element of oceanElementsToDelete) {
      await ctx.db.delete(element._id);
    }

    // 2. 删除设备相关的警报
    const alertsToDelete = await ctx.db
      .query("alerts")
      .filter((q) => q.eq(q.field("deviceId"), id))
      .collect();

    for (const alert of alertsToDelete) {
      await ctx.db.delete(alert._id);
    }

    // 3. 最后删除设备本身
    await ctx.db.delete(id);

    return {
      success: true,
      message: `设备 ${device.name} 及其所有关联数据已成功删除`,
      deletedElements: oceanElementsToDelete.length,
      deletedAlerts: alertsToDelete.length,
    };
  },
});

// 更新设备信息
export const updateDevice = mutation({
  args: {
    id: v.id("devices"),
    name: v.string(),
    type: v.string(),
    location: v.object({
      latitude: v.number(),
      longitude: v.number(),
      description: v.optional(v.string()),
    }),
    config: v.object({
      sampleRate: v.number(),
      uploadInterval: v.number(),
      parameters: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const { id, ...updateData } = args;

    // 获取设备信息，确认设备存在
    const device = await ctx.db.get(id);
    if (!device) {
      throw new Error("设备不存在");
    }

    // 更新设备信息
    await ctx.db.patch(id, updateData);

    return {
      success: true,
      message: `设备 ${updateData.name} 已成功更新`,
      deviceId: id,
    };
  },
});
