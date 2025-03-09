import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import * as alertsModule from "./alerts";

// 获取最新的海洋要素数据
export const getLatest = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    return await ctx.db.query("oceanElements").order("desc").take(limit);
  },
});

// 按位置获取数据
export const getByLocation = query({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    radius: v.optional(v.number()), // 半径，单位km
  },
  handler: async (ctx, args) => {
    const { latitude, longitude, radius = 10 } = args;

    // 简化实现：实际应用中应使用地理空间计算
    const data = await ctx.db.query("oceanElements").collect();

    // 使用Haversine公式计算距离
    return data.filter((item) => {
      const lat1 = (latitude * Math.PI) / 180;
      const lon1 = (longitude * Math.PI) / 180;
      const lat2 = (item.location.latitude * Math.PI) / 180;
      const lon2 = (item.location.longitude * Math.PI) / 180;

      const R = 6371; // 地球半径，单位km
      const dLat = lat2 - lat1;
      const dLon = lon2 - lon1;

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) *
          Math.cos(lat2) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return distance <= radius;
    });
  },
});

// 按时间段获取数据
export const getByTimeRange = query({
  args: {
    startTime: v.number(),
    endTime: v.number(),
    deviceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { startTime, endTime, deviceId } = args;

    try {
      let dataQuery = ctx.db
        .query("oceanElements")
        .filter(
          (q) =>
            q.gte(q.field("timestamp"), startTime) &&
            q.lte(q.field("timestamp"), endTime)
        );

      if (deviceId) {
        dataQuery = dataQuery.filter((q) =>
          q.eq(q.field("deviceId"), deviceId)
        );
      }

      const results = await dataQuery.collect();
      return results;
    } catch (error) {
      // 返回空数组而不是抛出错误，保证前端可以继续处理
      return [];
    }
  },
});

// 添加新的海洋要素数据
export const add = mutation({
  args: {
    timestamp: v.number(),
    location: v.object({
      latitude: v.number(),
      longitude: v.number(),
      depth: v.optional(v.number()),
    }),
    temperature: v.optional(v.number()),
    salinity: v.optional(v.number()),
    flowRate: v.optional(v.number()),
    dissolvedOxygen: v.optional(v.number()),
    pH: v.optional(v.number()),
    turbidity: v.optional(v.number()),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // 查找设备记录
      // 注意：oceanElements表中的deviceId是设备在devices表中的_id属性
      const device = await ctx.db
        .query("devices")
        .filter((q) => q.eq(q.field("_id"), args.deviceId))
        .first();

      if (device) {
        // 更新设备状态为在线
        await ctx.db.patch(device._id, {
          status: "online",
          lastActive: Date.now(),
        });

        // 使用alertsModule解决设备相关的警报
        await alertsModule.resolveAlertsByDevice(ctx, {
          deviceId: args.deviceId,
        });
      }
    } catch (error) {
      // 记录错误但不中断数据添加流程
    }

    const id = await ctx.db.insert("oceanElements", {
      ...args,
      status: "normal", // 默认状态为正常
    });

    // 检查是否有异常值，如果有则创建警报
    await checkAndCreateAlerts(ctx, args, id);

    return id;
  },
});

// 辅助函数：检查数据并创建警报
async function checkAndCreateAlerts(
  ctx: any,
  data: Record<string, any>,
  dataId: string
) {
  // 定义各参数的阈值（实际应用中可能从配置中获取）
  const thresholds: { [key: string]: { min: number; max: number } } = {
    temperature: { min: 5, max: 30 },
    salinity: { min: 30, max: 40 },
    dissolvedOxygen: { min: 4, max: 10 },
    pH: { min: 7, max: 8.5 },
  };

  // 检查每个参数是否超出阈值
  for (const [param, value] of Object.entries(data)) {
    if (param in thresholds && value !== undefined && value !== null) {
      const { min, max } = thresholds[param];

      if (typeof value === "number" && (value < min || value > max)) {
        // 创建警报
        await ctx.db.insert("alerts", {
          timestamp: Date.now(),
          parameterType: param,
          deviceId: data.deviceId,
          value: value,
          threshold: value < min ? min : max,
          status: "new",
          severity: "high",
          message: `${param} 值异常: ${value} ${value < min ? "低于" : "高于"}阈值`,
        });

        // 更新数据状态为异常
        await ctx.db.patch(dataId, { status: "abnormal" });
      }
    }
  }
}

// 新增：获取汇总统计数据(用于仪表板)
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // 获取最新的数据点
    const latestData = await ctx.db
      .query("oceanElements")
      .order("desc")
      .take(100);

    // 获取过去24小时内的数据点
    const recentData = await ctx.db
      .query("oceanElements")
      .filter((q) => q.gte(q.field("timestamp"), oneDayAgo))
      .collect();

    // 计算每个参数的平均值
    const params = [
      "temperature",
      "salinity",
      "dissolvedOxygen",
      "pH",
      "flowRate",
      "turbidity",
    ];
    const averages = {};

    params.forEach((param) => {
      const validData = recentData
        .filter((d) => d[param] !== undefined && d[param] !== null)
        .map((d) => d[param]);

      if (validData.length > 0) {
        averages[param] =
          validData.reduce((sum, val) => sum + val, 0) / validData.length;
      }
    });

    // 计算24小时内的数据点增长
    const prevDayData = await ctx.db
      .query("oceanElements")
      .filter(
        (q) =>
          q.gte(q.field("timestamp"), oneDayAgo - 24 * 60 * 60 * 1000) &&
          q.lt(q.field("timestamp"), oneDayAgo)
      )
      .collect();

    const dataPointsGrowth = recentData.length - prevDayData.length;

    return {
      totalDataPoints: latestData.length,
      dataPointsLast24h: recentData.length,
      dataPointsGrowth,
      averages,
      lastUpdated: latestData.length > 0 ? latestData[0].timestamp : null,
    };
  },
});

// 新增：获取参数趋势数据(按小时聚合)
export const getHourlyTrends = query({
  args: {
    parameter: v.string(),
    days: v.number(),
  },
  handler: async (ctx, args) => {
    const { parameter, days } = args;
    const now = Date.now();
    const startTime = now - days * 24 * 60 * 60 * 1000;

    // 获取指定时间范围内的数据
    const data = await ctx.db
      .query("oceanElements")
      .filter((q) => q.gte(q.field("timestamp"), startTime))
      .collect();

    // 按小时聚合数据
    const hourlyData = [];
    const hourBuckets = new Map();

    data.forEach((item) => {
      if (item[parameter] === undefined || item[parameter] === null) return;

      // 向下取整到小时
      const hourTimestamp =
        Math.floor(item.timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000);

      if (!hourBuckets.has(hourTimestamp)) {
        hourBuckets.set(hourTimestamp, {
          timestamp: hourTimestamp,
          values: [],
        });
      }

      hourBuckets.get(hourTimestamp).values.push(item[parameter]);
    });

    // 计算每小时的平均值
    for (const [timestamp, bucket] of hourBuckets.entries()) {
      if (bucket.values.length > 0) {
        const avg =
          bucket.values.reduce((sum, val) => sum + val, 0) /
          bucket.values.length;
        hourlyData.push({
          timestamp,
          average: avg,
          min: Math.min(...bucket.values),
          max: Math.max(...bucket.values),
          count: bucket.values.length,
        });
      }
    }

    // 按时间排序
    return hourlyData.sort((a, b) => a.timestamp - b.timestamp);
  },
});

// 新增：按区域获取最新数据
export const getLatestByRegion = query({
  args: {
    northLat: v.number(),
    southLat: v.number(),
    westLng: v.number(),
    eastLng: v.number(),
  },
  handler: async (ctx, args) => {
    const { northLat, southLat, westLng, eastLng } = args;

    // 获取所有设备
    const devices = await ctx.db.query("devices").collect();

    // 筛选出在指定区域内的设备
    const regionDeviceIds = devices
      .filter((device) => {
        const lat = device.location.latitude;
        const lng = device.location.longitude;
        return (
          lat <= northLat && lat >= southLat && lng >= westLng && lng <= eastLng
        );
      })
      .map((device) => device._id);

    if (regionDeviceIds.length === 0) return [];

    // 获取这些设备的最新数据
    const latestData = [];

    for (const deviceId of regionDeviceIds) {
      const deviceData = await ctx.db
        .query("oceanElements")
        .filter((q) => q.eq(q.field("deviceId"), deviceId))
        .order("desc")
        .first();

      if (deviceData) {
        latestData.push(deviceData);
      }
    }

    return latestData;
  },
});

// 新增：导出数据
export const prepareDataExport = query({
  args: {
    startTime: v.number(),
    endTime: v.number(),
    deviceId: v.optional(v.string()),
    parameter: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { startTime, endTime, deviceId, parameter, limit = 1000 } = args;

    let dataQuery = ctx.db
      .query("oceanElements")
      .filter(
        (q) =>
          q.gte(q.field("timestamp"), startTime) &&
          q.lte(q.field("timestamp"), endTime)
      );

    if (deviceId) {
      dataQuery = dataQuery.filter((q) => q.eq(q.field("deviceId"), deviceId));
    }

    if (parameter) {
      // 只返回有指定参数的数据点
      const data = await dataQuery.collect();
      return data
        .filter(
          (item) => item[parameter] !== undefined && item[parameter] !== null
        )
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    }

    return await dataQuery.order("desc").take(limit);
  },
});

// 检测异常数据
export const detectAnomalies = mutation({
  args: {
    deviceId: v.optional(v.string()),
    lookbackHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { deviceId, lookbackHours = 24 } = args;
    const now = Date.now();
    const startTime = now - lookbackHours * 60 * 60 * 1000;

    // 查询数据
    let dataQuery = ctx.db
      .query("oceanElements")
      .filter(
        (q) =>
          q.gte(q.field("timestamp"), startTime) &&
          q.lte(q.field("timestamp"), now)
      );

    if (deviceId) {
      dataQuery = dataQuery.filter((q) => q.eq(q.field("deviceId"), deviceId));
    }

    const data = await dataQuery.collect();

    // 如果数据少于5个点，不进行异常检测
    if (data.length < 5) {
      return {
        anomalies: [],
        message: "数据不足，无法进行异常检测",
        data: [],
      };
    }

    // 按设备分组数据
    const deviceGroups: Record<string, any[]> = {};
    data.forEach((item) => {
      if (!deviceGroups[item.deviceId]) {
        deviceGroups[item.deviceId] = [];
      }
      deviceGroups[item.deviceId].push(item);
    });

    const anomalies: any[] = [];
    const parameters = [
      "temperature",
      "salinity",
      "dissolvedOxygen",
      "pH",
      "turbidity",
    ];

    // 对每个设备的数据进行分析
    for (const deviceId in deviceGroups) {
      const deviceData = deviceGroups[deviceId].sort(
        (a, b) => a.timestamp - b.timestamp
      );

      // 对每个参数计算均值和标准差
      const stats: Record<string, { mean: number; stdDev: number }> = {};
      parameters.forEach((param) => {
        const values = deviceData
          .map((item) => item[param as keyof typeof item] as number | undefined)
          .filter((val): val is number => val !== undefined && val !== null);

        if (values.length >= 5) {
          const mean =
            values.reduce((sum: number, val: number) => sum + val, 0) /
            values.length;
          const variance =
            values.reduce(
              (sum: number, val: number) => sum + Math.pow(val - mean, 2),
              0
            ) / values.length;
          const stdDev = Math.sqrt(variance);

          stats[param] = { mean, stdDev };
        }
      });

      // 检测最近5个数据点是否有异常
      const recentData = deviceData.slice(-5);

      recentData.forEach((item) => {
        const anomalyParams: any[] = [];

        parameters.forEach((param) => {
          const value = item[param as keyof typeof item] as number | undefined;
          if (stats[param] && value !== undefined && value !== null) {
            // 检查是否超出3个标准差
            if (Math.abs(value - stats[param].mean) > 3 * stats[param].stdDev) {
              anomalyParams.push({
                parameter: param,
                value,
                mean: stats[param].mean,
                stdDev: stats[param].stdDev,
                deviation: (value - stats[param].mean) / stats[param].stdDev,
              });
            }
          }
        });

        if (anomalyParams.length > 0) {
          // 找到异常，创建警报
          anomalies.push({
            timestamp: item.timestamp,
            deviceId: item.deviceId,
            location: item.location,
            anomalies: anomalyParams,
          });
        }
      });
    }

    // 创建警报
    for (const anomaly of anomalies) {
      for (const param of anomaly.anomalies) {
        // 舍入数值，提高可读性
        const roundedValue = Math.round(param.value * 100) / 100;
        const roundedMean = Math.round(param.mean * 100) / 100;

        // 确定严重程度
        let severity = "低";
        if (Math.abs(param.deviation) > 5) severity = "高";
        else if (Math.abs(param.deviation) > 4) severity = "中";

        // 构建消息
        const aboveOrBelow = param.value > param.mean ? "高于" : "低于";
        const message = `检测到${getParameterName(param.parameter)}异常：${roundedValue}，${aboveOrBelow}正常值(${roundedMean})${Math.abs(param.deviation).toFixed(1)}个标准差`;

        // 检查是否已有类似警报
        const existingAlerts = await ctx.db
          .query("alerts")
          .filter(
            (q) =>
              q.eq(q.field("deviceId"), anomaly.deviceId) &&
              q.eq(q.field("parameterType"), param.parameter) &&
              q.neq(q.field("status"), "已解决") &&
              q.gte(q.field("timestamp"), now - 2 * 60 * 60 * 1000) // 2小时内
          )
          .collect();

        // 如果没有类似警报，则创建新警报
        if (existingAlerts.length === 0) {
          await ctx.db.insert("alerts", {
            timestamp: anomaly.timestamp,
            parameterType: param.parameter,
            deviceId: anomaly.deviceId,
            value: param.value,
            threshold:
              param.mean + (param.value > param.mean ? 3 : -3) * param.stdDev,
            status: "新建",
            severity,
            message,
          });
        }
      }
    }

    return {
      anomalies,
      message: `检测到${anomalies.length}个异常`,
      data,
    };
  },
});

// 获取参数的中文名称
function getParameterName(paramKey) {
  const paramNames = {
    temperature: "温度",
    salinity: "盐度",
    dissolvedOxygen: "溶解氧",
    pH: "pH值",
    turbidity: "浊度",
    flowRate: "流速",
  };

  return paramNames[paramKey] || paramKey;
}

// 导出数据为格式化字符串（用于CSV或Excel导出）
export const exportData = query({
  args: {
    startTime: v.number(),
    endTime: v.number(),
    deviceId: v.optional(v.string()),
    format: v.string(), // "csv", "excel", "json"
  },
  handler: async (ctx, args) => {
    const { startTime, endTime, deviceId, format } = args;

    // 查询数据
    let dataQuery = ctx.db
      .query("oceanElements")
      .filter(
        (q) =>
          q.gte(q.field("timestamp"), startTime) &&
          q.lte(q.field("timestamp"), endTime)
      );

    if (deviceId) {
      dataQuery = dataQuery.filter((q) => q.eq(q.field("deviceId"), deviceId));
    }

    const data = await dataQuery.collect();

    // 获取设备信息，用于展示设备名称而不是ID
    const deviceIds = [...new Set(data.map((item) => item.deviceId))];
    const devices = await Promise.all(
      deviceIds.map((id) =>
        ctx.db
          .query("devices")
          .filter((q) => q.eq(q.field("_id"), id))
          .first()
      )
    );

    // 设备ID到名称的映射
    const deviceMap = devices.reduce((map, device) => {
      if (device) {
        map[device._id] = device.name;
      }
      return map;
    }, {});

    // 准备导出数据
    const formattedData = data.map((item) => {
      const date = new Date(item.timestamp);
      return {
        时间: date.toLocaleString(),
        设备: deviceMap[item.deviceId] || item.deviceId,
        经度: item.location.longitude,
        纬度: item.location.latitude,
        深度: item.location.depth || 0,
        温度: item.temperature !== undefined ? item.temperature.toFixed(2) : "",
        盐度: item.salinity !== undefined ? item.salinity.toFixed(2) : "",
        溶解氧:
          item.dissolvedOxygen !== undefined
            ? item.dissolvedOxygen.toFixed(2)
            : "",
        流速: item.flowRate !== undefined ? item.flowRate.toFixed(2) : "",
        pH值: item.pH !== undefined ? item.pH.toFixed(2) : "",
        浊度: item.turbidity !== undefined ? item.turbidity.toFixed(2) : "",
        状态: item.status,
      };
    });

    // 根据格式返回数据
    if (format === "json") {
      return formattedData;
    } else if (format === "csv") {
      // 生成CSV格式字符串
      const headers = Object.keys(formattedData[0] || {}).join(",");
      const rows = formattedData.map((item) =>
        Object.values(item)
          .map((value) => `"${value}"`)
          .join(",")
      );
      return [headers, ...rows].join("\n");
    } else if (format === "excel") {
      // 对于Excel格式，返回包含头部的数据，由前端转换为Excel
      return {
        headers: Object.keys(formattedData[0] || {}),
        rows: formattedData.map((item) => Object.values(item)),
      };
    } else {
      throw new Error(`不支持的导出格式: ${format}`);
    }
  },
});

// 新增：获取已处理的图表数据(用于仪表板)
export const getProcessedChartData = query({
  args: {
    dataType: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    maxDataPoints: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { dataType, startTime, endTime, maxDataPoints = 100 } = args;

    try {
      // 获取指定时间范围内的数据
      const rawData = await ctx.db
        .query("oceanElements")
        .filter(
          (q) =>
            q.gte(q.field("timestamp"), startTime) &&
            q.lte(q.field("timestamp"), endTime)
        )
        .collect();

      // 确保数据在指定的时间范围内
      const filteredData = rawData.filter(
        (item) => item.timestamp >= startTime && item.timestamp <= endTime
      );

      // 如果数据为空，返回占位数据
      if (filteredData.length === 0) {
        return {
          labels: [
            new Date(startTime).toISOString(),
            new Date(endTime).toISOString(),
          ],
          data: [null, null],
          statistics: {
            count: 0,
            average: null,
            minimum: null,
            maximum: null,
            standardDeviation: null,
          },
        };
      }

      // 按时间排序
      const sortedData = [...filteredData].sort(
        (a, b) => a.timestamp - b.timestamp
      );

      // 数据采样 - 如果数据点太多，进行降采样
      let sampledData = sortedData;
      if (sortedData.length > maxDataPoints) {
        const samplingInterval = Math.ceil(sortedData.length / maxDataPoints);
        sampledData = sortedData.filter(
          (_, index) => index % samplingInterval === 0
        );

        // 确保包含最后一个数据点
        if (
          sampledData[sampledData.length - 1] !==
          sortedData[sortedData.length - 1]
        ) {
          sampledData.push(sortedData[sortedData.length - 1]);
        }
      }

      // 提取数据点
      const labels = sampledData.map((item) =>
        new Date(item.timestamp).toISOString()
      );
      const data = sampledData.map((item) =>
        item[dataType] !== undefined ? item[dataType] : null
      );

      // 计算统计数据
      const validValues = sortedData
        .map((item) => item[dataType])
        .filter((value) => value !== undefined && value !== null);

      let statistics = {
        count: validValues.length,
        average: null,
        minimum: null,
        maximum: null,
        standardDeviation: null,
      };

      if (validValues.length > 0) {
        const sum = validValues.reduce((acc, val) => acc + val, 0);
        const avg = sum / validValues.length;
        const min = Math.min(...validValues);
        const max = Math.max(...validValues);

        // 计算标准差
        const variance =
          validValues.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) /
          validValues.length;
        const stdDev = Math.sqrt(variance);

        statistics = {
          count: validValues.length,
          average: avg,
          minimum: min,
          maximum: max,
          standardDeviation: stdDev,
        };
      }

      return {
        labels,
        data,
        statistics,
      };
    } catch (error) {
      // 返回空数据结构而不是抛出错误
      return {
        labels: [],
        data: [],
        statistics: {
          count: 0,
          average: null,
          minimum: null,
          maximum: null,
          standardDeviation: null,
        },
      };
    }
  },
});
