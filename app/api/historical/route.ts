import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// 创建Convex HTTP客户端
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const { deviceId, days, dataPointsPerDay } = await request.json();

    if (!deviceId || !days || !dataPointsPerDay) {
      return NextResponse.json(
        { error: "设备ID、天数和每天数据点数都是必需的" },
        { status: 400 }
      );
    }

    // 调用Convex action生成历史数据
    const result = await convex.action(
      api.generateData.generateHistoricalData,
      {
        deviceId,
        days,
        dataPointsPerDay,
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("历史数据生成失败:", error);
    return NextResponse.json({ error: "历史数据生成失败" }, { status: 500 });
  }
}
