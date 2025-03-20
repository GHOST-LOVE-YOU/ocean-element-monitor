import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import * as alertsModule from "./alerts";
import { generateSensorData } from "./generateData";
import { cronJobs } from "convex/server";
import { Doc } from "./_generated/dataModel";

// 设备状态检查间隔 (15分钟)
const DEVICE_OFFLINE_THRESHOLD = 15 * 60 * 1000;
// 模拟数据发送间隔 (10分钟)
const SIMULATION_INTERVAL = 10 * 60 * 1000;

export default cronJobs();

// 更新设备状态的定时任务 (每15分钟运行一次)
export const updateDeviceStatus = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const devices = await ctx.db.query("devices").collect();

    for (const device of devices) {
      const lastActive = device.lastActive || 0;
      const timeSinceLastUpdate = now - lastActive;

      // 如果超过15分钟没有更新，将设备标记为离线并创建警报
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

      // 获取设备的历史数据用于生成连续的数据点
      const historyData = await ctx.db
        .query("oceanElements")
        .filter((q) => q.eq(q.field("deviceId"), deviceId.toString()))
        .order("desc")
        .take(48); // 获取足够的历史数据

      // 生成并发送数据
      const simulationData =
        historyData.length >= 5
          ? await generateRealisticData(device, historyData, now)
          : await generateSensorData(device, now);

      // 确保模拟数据包含必要的字段
      await ctx.db.insert("oceanElements", {
        deviceId: deviceId.toString(), // 转换为字符串类型
        timestamp: now,
        temperature: simulationData.temperature,
        salinity: simulationData.salinity,
        dissolvedOxygen: simulationData.dissolvedOxygen,
        pH: simulationData.pH,
        flowRate: simulationData.flowRate,
        turbidity: simulationData.turbidity,
        location: simulationData.location,
        status: simulationData.status,
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
    } catch (error) {
      // 记录错误以便调试
      console.error("设备模拟数据生成错误:", error);

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

// 基于历史数据生成更真实的模拟数据
async function generateRealisticData(
  device: Doc<"devices">,
  historyData: Doc<"oceanElements">[],
  timestamp: number
): Promise<{
  temperature: number;
  salinity: number;
  dissolvedOxygen: number;
  pH: number;
  flowRate: number;
  turbidity: number;
  location: {
    latitude: number;
    longitude: number;
    depth: number | undefined;
  };
  status: string;
}> {
  // 整理历史数据，确保按时间排序
  const sortedData = [...historyData].sort((a, b) => a.timestamp - b.timestamp);

  // 获取各参数的最近值
  const lastDataPoint = sortedData[sortedData.length - 1];

  // 准备参数列表
  type OceanParam =
    | "temperature"
    | "salinity"
    | "dissolvedOxygen"
    | "pH"
    | "flowRate"
    | "turbidity";
  const parameters: OceanParam[] = [
    "temperature",
    "salinity",
    "dissolvedOxygen",
    "pH",
    "flowRate",
    "turbidity",
  ];

  // 结果对象
  const result: {
    temperature: number;
    salinity: number;
    dissolvedOxygen: number;
    pH: number;
    flowRate: number;
    turbidity: number;
    location: {
      latitude: number;
      longitude: number;
      depth: number | undefined;
    };
    status: string;
  } = {
    location: {
      latitude: device.location.latitude + (Math.random() - 0.5) * 0.0005,
      longitude: device.location.longitude + (Math.random() - 0.5) * 0.0005,
      depth: device.location.depth,
    },
    status: "normal",
    temperature: 0,
    salinity: 0,
    dissolvedOxygen: 0,
    pH: 0,
    flowRate: 0,
    turbidity: 0,
  };

  // 为每个参数计算新值
  for (const param of parameters) {
    if (lastDataPoint[param] === undefined) continue;

    // 计算参数的平均值和趋势
    const values = sortedData
      .filter((item) => item[param] !== undefined)
      .map((item) => {
        const val = item[param];
        return val !== undefined ? val : 0;
      });

    if (values.length === 0) continue;

    // 计算短期趋势（最近12个点）
    const recentValues = values.slice(-12);
    const shortTermTrend =
      recentValues.length > 1
        ? (recentValues[recentValues.length - 1] - recentValues[0]) /
          recentValues.length
        : 0;

    // 获取小时变化模式
    const hour = new Date(timestamp).getHours();

    // 时间模式影响（每个参数有不同的模式）
    let hourlyPattern = 0;

    switch (param) {
      case "temperature":
        // 温度在下午最高，凌晨最低
        hourlyPattern = Math.sin((hour / 24) * 2 * Math.PI - Math.PI / 2) * 0.2;
        break;
      case "dissolvedOxygen":
        // 溶解氧与温度相反
        hourlyPattern =
          -Math.sin((hour / 24) * 2 * Math.PI - Math.PI / 2) * 0.15;
        break;
      case "flowRate":
        // 流速受潮汐影响，每12小时一个周期
        hourlyPattern = Math.sin((hour / 12) * 2 * Math.PI) * 0.1;
        break;
      default:
        // 其他参数使用小随机波动
        hourlyPattern = Math.sin((hour / 24) * 2 * Math.PI) * 0.05;
    }

    // 确定合理的随机波动范围
    let randomRange;
    switch (param) {
      case "temperature":
        randomRange = 0.1; // 温度波动较小
        break;
      case "salinity":
        randomRange = 0.05; // 盐度波动非常小
        break;
      case "dissolvedOxygen":
        randomRange = 0.12; // 溶解氧波动适中
        break;
      case "pH":
        randomRange = 0.03; // pH波动极小
        break;
      case "flowRate":
        randomRange = 0.08; // 流速波动适中
        break;
      case "turbidity":
        randomRange = 0.15; // 浊度波动较大
        break;
      default:
        randomRange = 0.1;
    }

    // 计算新值 = 上一个值 + 短期趋势 + 小时模式 + 受控的随机波动
    const newValue =
      lastDataPoint[param] +
      shortTermTrend * 0.3 +
      hourlyPattern +
      (Math.random() - 0.5) * randomRange;

    // 确保生成的值在合理范围内
    result[param] = constrainParameterValue(param, newValue);
  }

  return result;
}

// 确保参数值在合理范围内
function constrainParameterValue(param: string, value: number): number {
  switch (param) {
    case "temperature":
      return Math.max(5, Math.min(30, value));
    case "salinity":
      return Math.max(30, Math.min(40, value));
    case "dissolvedOxygen":
      return Math.max(4, Math.min(10, value));
    case "pH":
      return Math.max(7.8, Math.min(8.3, value));
    case "flowRate":
      return Math.max(0.1, Math.min(1.5, value));
    case "turbidity":
      return Math.max(0.5, Math.min(5, value));
    default:
      return value;
  }
}

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

    // 更新设备状态为不再模拟
    await ctx.db.patch(args.deviceId, {
      isSimulating: false,
    });

    // 查找并取消该设备的所有待处理模拟数据生成任务
    const scheduledTasks = await ctx.db.system
      .query("_scheduled_functions")
      .filter(
        (q) =>
          q.eq(q.field("name"), "scheduler.js:generateDeviceData") &&
          q.eq(q.field("state.kind"), "pending")
      )
      .collect();

    // 检查每个任务的参数，取消与此设备相关的任务
    for (const task of scheduledTasks) {
      // 检查任务参数中的deviceId是否匹配
      if (
        task.args &&
        task.args[0] &&
        task.args[0].deviceId === args.deviceId.toString()
      ) {
        await ctx.scheduler.cancel(task._id);
      }
    }

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
