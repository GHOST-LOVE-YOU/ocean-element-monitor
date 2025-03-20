import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// 获取分析结果
// export const getResults = query({
//   args: {
//     type: v.optional(v.string()),
//     parameter: v.optional(v.string()),
//     limit: v.optional(v.number()),
//   },
//   handler: async (ctx, args) => {
//     const { type, parameter, limit = 10 } = args;

//     let resultsQuery = ctx.db.query("analysisResults").order("desc");

//     if (type) {
//       resultsQuery = resultsQuery.filter((q) => q.eq(q.field("type"), type));
//     }

//     if (parameter) {
//       resultsQuery = resultsQuery.filter((q) =>
//         q.eq(q.field("targetParameter"), parameter)
//       );
//     }

//     return await resultsQuery.take(limit);
//   },
// });

// // 创建新的分析结果
// export const createAnalysis = mutation({
//   args: {
//     type: v.string(),
//     targetParameter: v.string(),
//     timeRange: v.object({
//       start: v.number(),
//       end: v.number(),
//     }),
//     results: v.any(),
//     insights: v.array(v.string()),
//     createdBy: v.optional(v.string()),
//   },
//   handler: async (ctx, args) => {
//     return await ctx.db.insert("analysisResults", {
//       ...args,
//       timestamp: Date.now(),
//     });
//   },
// });

// 获取特定参数的统计数据
export const getStatistics = query({
  args: {
    parameter: v.string(),
    timeRange: v.object({
      start: v.number(),
      end: v.number(),
    }),
    deviceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { parameter, timeRange, deviceId } = args;

    // 查询指定时间范围内的数据
    let dataQuery = ctx.db
      .query("oceanElements")
      .filter(
        (q) =>
          q.gte(q.field("timestamp"), timeRange.start) &&
          q.lte(q.field("timestamp"), timeRange.end)
      );

    if (deviceId) {
      dataQuery = dataQuery.filter((q) => q.eq(q.field("deviceId"), deviceId));
    }

    const data = await dataQuery.collect();

    // 计算统计数据
    // 提取参数值，过滤掉undefined
    const values = data
      .map((item) => item[parameter])
      .filter((value) => value !== undefined);

    if (values.length === 0) {
      return { count: 0 };
    }

    // 计算基本统计量
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // 计算标准差
    const variance =
      values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);

    return {
      count: values.length,
      average: avg,
      minimum: min,
      maximum: max,
      standardDeviation: stdDev,
      // 添加时间趋势的简单分析
      trend: getTrend(data, parameter),
    };
  },
});

// 辅助函数：计算时间趋势
function getTrend(data, parameter) {
  // 按时间排序
  const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

  // 如果数据点太少，无法分析趋势
  if (sortedData.length < 3) {
    return "insufficient_data";
  }

  // 简单线性回归分析趋势
  const n = sortedData.length;
  const x = Array.from({ length: n }, (_, i) => i); // 使用索引作为X轴
  const y = sortedData.map((item) => item[parameter]).filter(Boolean);

  if (y.length < 3) {
    return "insufficient_data";
  }

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  if (slope > 0.05) {
    return "increasing";
  } else if (slope < -0.05) {
    return "decreasing";
  } else {
    return "stable";
  }
}

// 新增：比较不同时间段的参数变化
// export const compareTimeRanges = query({
//   args: {
//     parameter: v.string(),
//     currentRange: v.object({
//       start: v.number(),
//       end: v.number(),
//     }),
//     previousRange: v.object({
//       start: v.number(),
//       end: v.number(),
//     }),
//     deviceId: v.optional(v.string()),
//   },
//   handler: async (ctx, args) => {
//     const { parameter, currentRange, previousRange, deviceId } = args;

//     // 查询当前时间段数据
//     let currentDataQuery = ctx.db
//       .query("oceanElements")
//       .filter(
//         (q) =>
//           q.gte(q.field("timestamp"), currentRange.start) &&
//           q.lte(q.field("timestamp"), currentRange.end)
//       );

//     // 查询之前时间段数据
//     let previousDataQuery = ctx.db
//       .query("oceanElements")
//       .filter(
//         (q) =>
//           q.gte(q.field("timestamp"), previousRange.start) &&
//           q.lte(q.field("timestamp"), previousRange.end)
//       );

//     if (deviceId) {
//       currentDataQuery = currentDataQuery.filter((q) =>
//         q.eq(q.field("deviceId"), deviceId)
//       );
//       previousDataQuery = previousDataQuery.filter((q) =>
//         q.eq(q.field("deviceId"), deviceId)
//       );
//     }

//     const currentData = await currentDataQuery.collect();
//     const previousData = await previousDataQuery.collect();

//     // 提取参数值
//     const currentValues = currentData
//       .map((item) => item[parameter])
//       .filter((value) => value !== undefined && value !== null);

//     const previousValues = previousData
//       .map((item) => item[parameter])
//       .filter((value) => value !== undefined && value !== null);

//     if (currentValues.length === 0 || previousValues.length === 0) {
//       return {
//         insufficientData: true,
//         message: "没有足够的数据进行比较",
//       };
//     }

//     // 计算基本统计量
//     const currentAvg =
//       currentValues.reduce((sum, val) => sum + val, 0) / currentValues.length;
//     const previousAvg =
//       previousValues.reduce((sum, val) => sum + val, 0) / previousValues.length;

//     const currentMin = Math.min(...currentValues);
//     const previousMin = Math.min(...previousValues);

//     const currentMax = Math.max(...currentValues);
//     const previousMax = Math.max(...previousValues);

//     // 计算标准差
//     const currentVariance =
//       currentValues.reduce(
//         (acc, val) => acc + Math.pow(val - currentAvg, 2),
//         0
//       ) / currentValues.length;
//     const currentStdDev = Math.sqrt(currentVariance);

//     const previousVariance =
//       previousValues.reduce(
//         (acc, val) => acc + Math.pow(val - previousAvg, 2),
//         0
//       ) / previousValues.length;
//     const previousStdDev = Math.sqrt(previousVariance);

//     // 计算变化百分比
//     const avgChange = ((currentAvg - previousAvg) / previousAvg) * 100;
//     const minChange = ((currentMin - previousMin) / previousMin) * 100;
//     const maxChange = ((currentMax - previousMax) / previousMax) * 100;

//     return {
//       current: {
//         average: currentAvg,
//         minimum: currentMin,
//         maximum: currentMax,
//         standardDeviation: currentStdDev,
//         sampleCount: currentValues.length,
//       },
//       previous: {
//         average: previousAvg,
//         minimum: previousMin,
//         maximum: previousMax,
//         standardDeviation: previousStdDev,
//         sampleCount: previousValues.length,
//       },
//       changes: {
//         average: avgChange,
//         minimum: minChange,
//         maximum: maxChange,
//       },
//       trend:
//         avgChange > 1 ? "increasing" : avgChange < -1 ? "decreasing" : "stable",
//     };
//   },
// });

// 新增：创建异常参数检测分析
// export const detectAnomalies = query({
//   args: {
//     timeRange: v.object({
//       start: v.number(),
//       end: v.number(),
//     }),
//     deviceId: v.optional(v.string()),
//     stdDevThreshold: v.optional(v.number()), // 标准差倍数阈值，默认为2
//   },
//   handler: async (ctx, args) => {
//     const { timeRange, deviceId, stdDevThreshold = 2 } = args;

//     let dataQuery = ctx.db
//       .query("oceanElements")
//       .filter(
//         (q) =>
//           q.gte(q.field("timestamp"), timeRange.start) &&
//           q.lte(q.field("timestamp"), timeRange.end)
//       );

//     if (deviceId) {
//       dataQuery = dataQuery.filter((q) => q.eq(q.field("deviceId"), deviceId));
//     }

//     const data = await dataQuery.collect();

//     if (data.length < 10) {
//       return {
//         insufficientData: true,
//         message: "没有足够的数据进行异常检测分析",
//         anomalies: [],
//       };
//     }

//     // 需要分析的参数
//     const parameters = [
//       "temperature",
//       "salinity",
//       "dissolvedOxygen",
//       "pH",
//       "flowRate",
//       "turbidity",
//     ];
//     const anomalies = [];

//     // 对每个参数进行异常检测
//     for (const param of parameters) {
//       const values = data
//         .map((item) => item[param])
//         .filter((value) => value !== undefined && value !== null);

//       if (values.length < 10) continue;

//       // 计算平均值和标准差
//       const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
//       const variance =
//         values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) /
//         values.length;
//       const stdDev = Math.sqrt(variance);

//       // 检测异常值
//       const paramAnomalies = data
//         .filter((item) => {
//           const value = item[param];
//           if (value === undefined || value === null) return false;

//           const zScore = Math.abs(value - avg) / stdDev;
//           return zScore > stdDevThreshold;
//         })
//         .map((item) => ({
//           id: item._id,
//           timestamp: item.timestamp,
//           deviceId: item.deviceId,
//           parameter: param,
//           value: item[param],
//           zScore: Math.abs(item[param] - avg) / stdDev,
//           expected: avg,
//           deviation: item[param] - avg,
//         }))
//         .sort((a, b) => b.zScore - a.zScore); // 按异常程度排序

//       anomalies.push(...paramAnomalies);
//     }

//     return {
//       anomalyCount: anomalies.length,
//       anomalies: anomalies.slice(0, 100), // 限制返回数量
//       timeRange,
//     };
//   },
// });

// 新增：获取参数相关性分析
// export const getParameterCorrelations = query({
//   args: {
//     timeRange: v.object({
//       start: v.number(),
//       end: v.number(),
//     }),
//     deviceId: v.optional(v.string()),
//   },
//   handler: async (ctx, args) => {
//     const { timeRange, deviceId } = args;

//     let dataQuery = ctx.db
//       .query("oceanElements")
//       .filter(
//         (q) =>
//           q.gte(q.field("timestamp"), timeRange.start) &&
//           q.lte(q.field("timestamp"), timeRange.end)
//       );

//     if (deviceId) {
//       dataQuery = dataQuery.filter((q) => q.eq(q.field("deviceId"), deviceId));
//     }

//     const data = await dataQuery.collect();

//     if (data.length < 20) {
//       return {
//         insufficientData: true,
//         message: "没有足够的数据进行相关性分析",
//         correlations: [],
//       };
//     }

//     // 需要分析的参数对
//     const paramPairs = [
//       ["temperature", "dissolvedOxygen"],
//       ["temperature", "pH"],
//       ["salinity", "temperature"],
//       ["flowRate", "turbidity"],
//       ["dissolvedOxygen", "pH"],
//     ];

//     const correlations = [];

//     // 对每对参数计算相关性
//     for (const [param1, param2] of paramPairs) {
//       // 筛选同时有这两个参数的数据点
//       const validData = data.filter(
//         (item) =>
//           item[param1] !== undefined &&
//           item[param1] !== null &&
//           item[param2] !== undefined &&
//           item[param2] !== null
//       );

//       if (validData.length < 20) continue;

//       const values1 = validData.map((item) => item[param1]);
//       const values2 = validData.map((item) => item[param2]);

//       // 计算平均值
//       const avg1 = values1.reduce((sum, val) => sum + val, 0) / values1.length;
//       const avg2 = values2.reduce((sum, val) => sum + val, 0) / values2.length;

//       // 计算皮尔逊相关系数
//       let numerator = 0;
//       let denominator1 = 0;
//       let denominator2 = 0;

//       for (let i = 0; i < values1.length; i++) {
//         const diff1 = values1[i] - avg1;
//         const diff2 = values2[i] - avg2;

//         numerator += diff1 * diff2;
//         denominator1 += diff1 * diff1;
//         denominator2 += diff2 * diff2;
//       }

//       const correlation = numerator / Math.sqrt(denominator1 * denominator2);

//       correlations.push({
//         parameter1: param1,
//         parameter2: param2,
//         correlation,
//         sampleCount: validData.length,
//         relationship:
//           correlation > 0.7
//             ? "强正相关"
//             : correlation > 0.3
//               ? "中等正相关"
//               : correlation > 0
//                 ? "弱正相关"
//                 : correlation > -0.3
//                   ? "弱负相关"
//                   : correlation > -0.7
//                     ? "中等负相关"
//                     : "强负相关",
//       });
//     }

//     return {
//       correlations,
//       timeRange,
//     };
//   },
// });
