import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// 获取所有警报
export const getAll = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { status, limit = 50 } = args;

    let alertsQuery = ctx.db.query("alerts").order("desc");

    if (status) {
      alertsQuery = alertsQuery.filter((q) => q.eq(q.field("status"), status));
    }

    return await alertsQuery.take(limit);
  },
});

// 更新警报状态
export const updateStatus = mutation({
  args: {
    id: v.id("alerts"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, status } = args;
    return await ctx.db.patch(id, { status });
  },
});

// 按设备获取警报
export const getByDevice = query({
  args: {
    deviceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { deviceId, limit = 20 } = args;

    return await ctx.db
      .query("alerts")
      .filter((q) => q.eq(q.field("deviceId"), deviceId))
      .order("desc")
      .take(limit);
  },
});

// 新增：获取警报摘要
export const getAlertSummary = query({
  args: {},
  handler: async (ctx) => {
    const alerts = await ctx.db.query("alerts").collect();

    if (alerts.length === 0) {
      return {
        total: 0,
        byStatus: {
          new: 0,
          acknowledged: 0,
          resolved: 0,
        },
        bySeverity: {
          low: 0,
          medium: 0,
          high: 0,
          info: 0,
        },
        byParameter: {} as Record<string, number>,
        recentAlerts: [],
      };
    }

    // 按状态统计
    const byStatus: Record<string, number> = {
      new: 0,
      acknowledged: 0,
      resolved: 0,
    };

    // 按严重程度统计
    const bySeverity: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      info: 0,
    };

    // 按参数类型统计
    const byParameter: Record<string, number> = {};

    alerts.forEach((alert) => {
      // 统计状态
      if (alert.status) {
        byStatus[alert.status] = (byStatus[alert.status] || 0) + 1;
      }

      // 统计严重程度
      if (alert.severity) {
        bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
      }

      // 统计参数类型
      if (alert.parameterType) {
        if (!byParameter[alert.parameterType]) {
          byParameter[alert.parameterType] = 0;
        }
        byParameter[alert.parameterType]++;
      }
    });

    // 获取最近警报
    const recentAlerts = [...alerts]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);

    return {
      total: alerts.length,
      byStatus,
      bySeverity,
      byParameter,
      recentAlerts,
    };
  },
});

// 新增：批量更新警报状态
export const updateMultipleStatus = mutation({
  args: {
    ids: v.array(v.id("alerts")),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const { ids, status } = args;
    const results = [];

    for (const id of ids) {
      try {
        await ctx.db.patch(id, { status });
        results.push({ id, success: true });
      } catch (error: any) {
        results.push({ id, success: false, error: error.message });
      }
    }

    return {
      message: `已更新 ${results.filter((r) => r.success).length} 条警报`,
      results,
    };
  },
});

// 新增：获取警报趋势
export const getAlertTrends = query({
  args: {
    days: v.number(),
  },
  handler: async (ctx, args) => {
    const { days } = args;
    const now = Date.now();
    const startTime = now - days * 24 * 60 * 60 * 1000;

    const alerts = await ctx.db
      .query("alerts")
      .filter((q) => q.gte(q.field("timestamp"), startTime))
      .collect();

    // 按天统计警报数
    const dailyAlerts = [];

    for (let day = 0; day < days; day++) {
      const dayStart = startTime + day * 24 * 60 * 60 * 1000;
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const dayAlerts = alerts.filter(
        (alert) => alert.timestamp >= dayStart && alert.timestamp < dayEnd
      );

      // 按严重程度分组
      const byDay = {
        date: new Date(dayStart).toISOString().split("T")[0],
        timestamp: dayStart,
        total: dayAlerts.length,
        high: dayAlerts.filter((a) => a.severity === "high").length,
        medium: dayAlerts.filter((a) => a.severity === "medium").length,
        low: dayAlerts.filter((a) => a.severity === "low").length,
      };

      dailyAlerts.push(byDay);
    }

    return dailyAlerts;
  },
});

// 添加确认警报的mutation
export const acknowledgeAlert = mutation({
  args: { alertId: v.id("alerts") },
  handler: async (ctx, args) => {
    const { alertId } = args;

    // 获取警报
    const alert = await ctx.db.get(alertId);
    if (!alert) {
      throw new Error("警报不存在");
    }

    // 只有未处理的警报可以确认
    if (alert.status !== "new") {
      throw new Error("只有未处理的警报可以确认");
    }

    // 更新警报状态为已确认
    await ctx.db.patch(alertId, {
      status: "acknowledged",
    });

    return { success: true };
  },
});

// 添加解决警报的mutation
export const resolveAlert = mutation({
  args: { alertId: v.id("alerts") },
  handler: async (ctx, args) => {
    const { alertId } = args;

    // 获取警报
    const alert = await ctx.db.get(alertId);
    if (!alert) {
      throw new Error("警报不存在");
    }

    // 只有未处理或已确认的警报可以解决
    if (alert.status !== "new" && alert.status !== "acknowledged") {
      throw new Error("只有未处理或已确认的警报可以解决");
    }

    // 更新警报状态为已解决
    await ctx.db.patch(alertId, {
      status: "resolved",
    });

    return { success: true };
  },
});

// 添加按设备ID解决所有未处理警报的mutation
export const resolveAlertsByDevice = mutation({
  args: {
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const { deviceId } = args;

    // 查找该设备的所有未处理警报（状态为new或acknowledged）
    const unhandledAlerts = await ctx.db
      .query("alerts")
      .filter(
        (q) =>
          q.eq(q.field("deviceId"), deviceId) &&
          q.or(
            q.eq(q.field("status"), "new"),
            q.eq(q.field("status"), "acknowledged")
          )
      )
      .collect();

    // 将所有未处理警报标记为已解决
    let resolvedCount = 0;
    for (const alert of unhandledAlerts) {
      await ctx.db.patch(alert._id, {
        status: "resolved",
      });
      resolvedCount++;
    }

    return {
      success: true,
      deviceId,
      resolvedCount,
      message: `已自动解决设备 ${deviceId} 的 ${resolvedCount} 条未处理警报`,
    };
  },
});
