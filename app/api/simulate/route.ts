import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// 创建Convex HTTP客户端
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const { deviceId } = await request.json();

    if (!deviceId) {
      return NextResponse.json({ error: "设备ID是必需的" }, { status: 400 });
    }

    // 调用Convex action生成模拟数据
    const result = await convex.mutation(api.scheduler.simulateDeviceData, {
      deviceId,
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("模拟数据生成失败:", error);
    return NextResponse.json({ error: "模拟数据生成失败" }, { status: 500 });
  }
}
