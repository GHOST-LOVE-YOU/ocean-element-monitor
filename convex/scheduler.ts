import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import * as alertsModule from "./alerts";
import { generateSensorData } from "./generateData";
import { cronJobs } from "convex/server";

// 设备状态检查间隔 (45秒)
const DEVICE_OFFLINE_THRESHOLD = 45 * 1000;
// 模拟数据发送间隔 (30秒)
const SIMULATION_INTERVAL = 30 * 1000;

export default cronJobs();

// 更新设备状态的定时任务 (每30秒运行一次)
export const updateDeviceStatus = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const devices = await ctx.db.query("devices").collect();

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
        await ctx.db.insert("alerts", {
          timestamp: now,
          parameterType: "device_status",
          deviceId: deviceIdStr, // 确保以字符串形式存储设备ID
          value: 0, // 0表示离线
          threshold: 1, // 1表示在线
          status: "new",
          severity: "high",
          message: `设备 ${device.name}(${deviceIdStr}) 已离线，最后活动时间: ${new Date(device.lastActive).toLocaleString()}`,
        });
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

        // 创建设备恢复在线通知
        await ctx.db.insert("alerts", {
          timestamp: now,
          parameterType: "device_status",
          deviceId: deviceIdStr,
          value: 1, // 1表示在线
          threshold: 0,
          status: "resolved", // 自动标记为已解决
          severity: "info",
          message: `设备 ${device.name}(${deviceIdStr}) 已恢复在线`,
        });

        // 解决该设备的所有未处理警报
        await alertsModule.resolveAlertsByDevice(ctx, {
          deviceId: deviceIdStr,
        });
      }

      // 只有设备仍在模拟状态才安排下一次数据生成
      if (device.isSimulating) {
        await ctx.scheduler.runAfter(
          SIMULATION_INTERVAL,
          internal.scheduler.generateDeviceData,
          { deviceId }
        );
      }
    } catch {
      // 即使出错，也要尝试安排下一次运行，确保模拟不会意外停止
      const deviceStatus = await ctx.db.get(deviceId);
      if (deviceStatus?.isSimulating) {
        await ctx.scheduler.runAfter(
          SIMULATION_INTERVAL,
          internal.scheduler.generateDeviceData,
          { deviceId }
        );
      }
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
    const wasAlreadySimulating = device.isSimulating;

    // 更新设备状态
    await ctx.db.patch(args.deviceId, {
      isSimulating: true,
      status: "online",
      lastActive: Date.now(),
    });

    // 如果设备之前为离线状态，现在变为在线，自动解决相关警报
    if (wasOffline) {
      await alertsModule.resolveAlertsByDevice(ctx, {
        deviceId: args.deviceId,
      });
    }

    // 只有设备之前不是模拟状态，才安排首次数据生成
    if (!wasAlreadySimulating) {
      await ctx.scheduler.runAfter(0, internal.scheduler.generateDeviceData, {
        deviceId: args.deviceId,
      });
    }

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
