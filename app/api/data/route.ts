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

// POST处理程序 - 添加新的海洋要素数据
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
    if (!body.deviceId || !body.location || body.timestamp === undefined) {
      return NextResponse.json(
        { error: "缺少必要字段: deviceId, location, timestamp" },
        { status: 400 }
      );
    }

    // 确保至少有一个测量值
    const hasMeasurement =
      body.temperature !== undefined ||
      body.salinity !== undefined ||
      body.dissolvedOxygen !== undefined ||
      body.pH !== undefined ||
      body.flowRate !== undefined ||
      body.turbidity !== undefined;

    if (!hasMeasurement) {
      return NextResponse.json(
        {
          error:
            "至少需要一个测量值 (temperature, salinity, dissolvedOxygen, pH, flowRate, turbidity)",
        },
        { status: 400 }
      );
    }

    // 准备数据
    const data = {
      timestamp: body.timestamp || Date.now(),
      location: body.location,
      deviceId: body.deviceId,
      temperature: body.temperature,
      salinity: body.salinity,
      dissolvedOxygen: body.dissolvedOxygen,
      pH: body.pH,
      flowRate: body.flowRate,
      turbidity: body.turbidity,
    };

    // 调用Convex函数添加数据
    const result = await client.mutation(api.oceanElements.add, data);

    return NextResponse.json({ success: true, id: result }, { status: 201 });
  } catch (error) {
    console.error("添加数据时出错:", error);
    return NextResponse.json(
      { error: "处理请求时出错", details: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET处理程序 - 获取API文档
export async function GET() {
  return NextResponse.json({
    message: "海洋要素监测系统API",
    documentation: {
      endpoints: {
        "/api/data": {
          POST: {
            description: "添加新的海洋要素数据",
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
              temperature: "温度，摄氏度 (可选)",
              salinity: "盐度，PSU (可选)",
              dissolvedOxygen: "溶解氧，mg/L (可选)",
              pH: "pH值 (可选)",
              flowRate: "流速，m/s (可选)",
              turbidity: "浊度，NTU (可选)",
            },
            example: {
              deviceId: "device-001",
              timestamp: 1646006400000,
              location: {
                latitude: 30.5,
                longitude: 121.3,
                depth: 5,
              },
              temperature: 18.5,
              salinity: 35.2,
              dissolvedOxygen: 6.8,
            },
          },
        },
      },
    },
  });
}
