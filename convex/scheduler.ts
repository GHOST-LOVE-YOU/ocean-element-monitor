import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import * as alertsModule from "./alerts";

// 设备状态检查间隔 (45秒)
const DEVICE_OFFLINE_THRESHOLD = 45 * 1000;
// 模拟数据发送间隔 (30秒)
const SIMULATION_INTERVAL = 30 * 1000;

// 更新设备状态的定时任务 (每30秒运行一次)
export const updateDeviceStatus = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const devices = await ctx.db.query("devices").collect();

    // 安排下一次执行
    await ctx.scheduler.runAfter(
      SIMULATION_INTERVAL,
      internal.scheduler.updateDeviceStatus,
      {}
    );

    for (const device of devices) {
      const lastActive = device.lastActive || 0;
      const timeSinceLastUpdate = now - lastActive;

      // 如果超过45秒没有更新，将设备标记为离线并创建警报
      if (
        timeSinceLastUpdate > DEVICE_OFFLINE_THRESHOLD &&
        device.status === "online"
      ) {
        // 更新设备状态为离线
        await ctx.db.patch(device._id, { status: "offline" });

        const deviceIdStr = device._id.toString();

        // 创建设备离线警报
        const alertId = await ctx.db.insert("alerts", {
          timestamp: now,
          parameterType: "device_status",
          deviceId: deviceIdStr, // 确保以字符串形式存储设备ID
          value: 0, // 0表示离线
          threshold: 1, // 1表示在线
          status: "new",
          severity: "high",
          message: `设备 ${device.name}(${deviceIdStr}) 已离线，最后活动时间: ${new Date(device.lastActive).toLocaleString()}`,
        });

        console.log(
          `设备 ${device.name} 已离线，创建了警报 ${alertId}，设备ID: ${deviceIdStr}`
        );
      }
    }
  },
});

// 为单个设备生成模拟数据
export const generateDeviceData = internalMutation({
  args: {
    deviceId: v.id("devices"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { deviceId } = args;

    // 获取设备
    const device = await ctx.db.get(deviceId);
    if (!device) {
      console.error(`设备 ${deviceId} 不存在`);
      return;
    }

    // 如果设备不再是模拟状态，则停止生成数据
    if (!device.isSimulating) {
      return;
    }

    try {
      // 检查设备之前是否为离线状态
      const wasOffline = device.status === "offline";

      // 生成并发送数据
      await ctx.db.insert("oceanElements", {
        deviceId: device._id,
        timestamp: now,
        ...(await generateSensorData(device, now)),
      });

      // 更新设备状态为在线
      await ctx.db.patch(device._id, {
        status: "online",
        lastActive: now,
      });

      // 如果设备之前为离线状态，现在恢复在线
      if (wasOffline) {
        const deviceIdStr = device._id.toString();
        console.log(`设备 ${device.name} (${deviceIdStr}) 状态从离线变为在线`);

        // 创建设备恢复在线通知
        const recoveryAlertId = await ctx.db.insert("alerts", {
          timestamp: now,
          parameterType: "device_status",
          deviceId: deviceIdStr,
          value: 1, // 1表示在线
          threshold: 0,
          status: "resolved", // 自动标记为已解决
          severity: "info",
          message: `设备 ${device.name}(${deviceIdStr}) 已恢复在线`,
        });

        console.log(`创建了恢复通知 ${recoveryAlertId}`);

        // 使用resolveAlertsByDevice函数解决该设备的所有未处理警报
        const result = await alertsModule.resolveAlertsByDevice(ctx, {
          deviceId: deviceIdStr,
        });
        console.log(result.message);
      }

      // 安排下一次数据生成（递归调用）
      await ctx.scheduler.runAfter(
        SIMULATION_INTERVAL,
        internal.scheduler.generateDeviceData,
        { deviceId }
      );
    } catch (error) {
      console.error(`设备 ${device._id} 数据生成失败:`, error);
    }
  },
});

// 开始设备模拟
export const startDeviceSimulation = mutation({
  args: { deviceId: v.id("devices") },
  handler: async (ctx, args) => {
    const device = await ctx.db.get(args.deviceId);
    if (!device) {
      throw new Error("设备不存在");
    }

    const wasOffline = device.status === "offline";

    // 更新设备状态
    await ctx.db.patch(args.deviceId, {
      isSimulating: true,
      status: "online",
      lastActive: Date.now(),
    });

    // 如果设备之前为离线状态，现在变为在线，自动解决相关警报
    if (wasOffline) {
      // 使用静态导入的resolveAlertsByDevice函数
      await alertsModule.resolveAlertsByDevice(ctx, {
        deviceId: args.deviceId,
      });
    }

    // 立即安排第一次数据生成
    await ctx.scheduler.runAfter(0, internal.scheduler.generateDeviceData, {
      deviceId: args.deviceId,
    });

    return { success: true };
  },
});

// 停止设备模拟
export const stopDeviceSimulation = mutation({
  args: { deviceId: v.id("devices") },
  handler: async (ctx, args) => {
    const device = await ctx.db.get(args.deviceId);
    if (!device) {
      throw new Error("设备不存在");
    }

    await ctx.db.patch(args.deviceId, {
      isSimulating: false,
    });

    return { success: true };
  },
});

// 获取设备模拟状态
export const getSimulatingDevices = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("devices")
      .filter((q) => q.eq(q.field("isSimulating"), true))
      .collect();
  },
});

// 初始化设备状态检查 (在系统启动时调用一次)
export const initScheduler = mutation({
  args: {},
  handler: async (ctx) => {
    // 安排第一次设备状态检查
    await ctx.scheduler.runAfter(0, internal.scheduler.updateDeviceStatus, {});
    return { success: true };
  },
});

// 生成模拟传感器数据
async function generateSensorData(device: Doc<"devices">, timestamp: number) {
  const hour = new Date(timestamp).getHours();
  const dayOfYear = Math.floor(
    (timestamp - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // 温度: 季节变化 + 日变化 + 随机波动
  const temperature =
    15 +
    8 * Math.sin((dayOfYear / 365) * 2 * Math.PI - Math.PI / 2) +
    1.5 * Math.sin((hour / 24) * 2 * Math.PI - Math.PI / 2) +
    (Math.random() - 0.5) * 0.8;

  // 盐度: 基于纬度的变化 + 小随机波动
  const salinity =
    35 - 0.1 * (device.location.latitude - 45) + (Math.random() - 0.5) * 0.6;

  // 流速: 小时变化 + 随机波动
  const flowRate =
    0.3 + 0.2 * Math.sin((hour / 12) * 2 * Math.PI) + Math.random() * 0.2;

  // 溶解氧: 温度反相关 + 随机波动
  const dissolvedOxygen =
    8 - 0.1 * (temperature - 15) + (Math.random() - 0.5) * 0.6;

  // pH: 小波动
  const pH = 8.1 + (Math.random() - 0.5) * 0.3;

  // 浊度: 流速相关 + 随机波动
  const turbidity = 2 + flowRate * 0.5 + Math.random() * 1.5;

  return {
    temperature,
    salinity,
    flowRate,
    dissolvedOxygen,
    pH,
    turbidity,
    location: {
      latitude: device.location.latitude + (Math.random() - 0.5) * 0.001,
      longitude: device.location.longitude + (Math.random() - 0.5) * 0.001,
      depth: device.location.depth ?? 5 + (Math.random() - 0.5) * 0.5,
    },
    status: "normal",
  };
}
