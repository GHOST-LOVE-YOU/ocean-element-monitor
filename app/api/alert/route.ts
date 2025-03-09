import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// 创建Convex HTTP客户端
const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

// 验证API密钥
const validateApiKey = (apiKey: string) => {
  const validApiKey = process.env.API_KEY || "ocean-monitor-api-key";
  return apiKey === validApiKey;
};

// POST处理程序 - 添加新的警报数据
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();

    // 验证API密钥
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey || !validateApiKey(apiKey)) {
      return NextResponse.json({ error: "无效的API密钥" }, { status: 401 });
    }

    // 验证必要字段
    if (
      !body.deviceId ||
      !body.alertType ||
      !body.severity ||
      !body.parameter ||
      body.timestamp === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "缺少必要字段: deviceId, alertType, severity, parameter, timestamp",
        },
        { status: 400 }
      );
    }

    // 验证数值字段
    if (body.value === undefined || body.threshold === undefined) {
      return NextResponse.json(
        { error: "缺少必要的测量值: value, threshold" },
        { status: 400 }
      );
    }

    // 验证位置信息
    if (
      !body.location ||
      body.location.latitude === undefined ||
      body.location.longitude === undefined
    ) {
      return NextResponse.json(
        { error: "缺少必要的位置信息: location.latitude, location.longitude" },
        { status: 400 }
      );
    }

    // 准备数据
    const alertData = {
      timestamp: body.timestamp || Date.now(),
      deviceId: body.deviceId,
      alertType: body.alertType,
      severity: body.severity,
      parameter: body.parameter,
      value: body.value,
      threshold: body.threshold,
      description: body.description || "",
      location: body.location,
      status: "new", // 初始状态统一为"new"，替换之前的"pending"
    };

    // 调用Convex函数添加警报
    const result = await client.mutation(api.alerts.add, alertData);

    return NextResponse.json({ success: true, id: result }, { status: 201 });
  } catch (error) {
    console.error("添加警报时出错:", error);
    return NextResponse.json(
      { error: "处理请求时出错", details: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET处理程序 - 获取API文档
export async function GET() {
  return NextResponse.json({
    message: "海洋要素监测系统警报API",
    documentation: {
      endpoints: {
        "/api/alert": {
          POST: {
            description: "添加新的异常警报数据",
            headers: {
              "x-api-key": "API密钥，用于验证请求",
              "Content-Type": "application/json",
            },
            body: {
              deviceId: "设备ID (必需)",
              timestamp: "时间戳，毫秒 (可选，默认为当前时间)",
              location: {
                latitude: "纬度 (必需)",
                longitude: "经度 (必需)",
                depth: "深度，米 (可选)",
              },
              alertType: "警报类型，如highTemperature, lowOxygen等 (必需)",
              severity: "严重程度，如low, warning, high, critical (必需)",
              parameter: "参数类型，如temperature, dissolvedOxygen等 (必需)",
              value: "实际值 (必需)",
              threshold: "阈值 (必需)",
              description: "警报描述 (可选)",
            },
            example: {
              deviceId: "device-001",
              timestamp: 1646006400000,
              location: {
                latitude: 30.5,
                longitude: 121.3,
                depth: 5,
              },
              alertType: "highTemperature",
              severity: "warning",
              parameter: "temperature",
              value: 28.5,
              threshold: 25.0,
              description: "温度超过警戒值",
            },
          },
        },
      },
    },
  });
}
