#!/usr/bin/env node

/**
 * 海洋要素监测系统API测试脚本
 *
 * 使用方法:
 * 1. 确保Node.js已安装
 * 2. 运行: node test-api.js
 */

const fetch = require("node-fetch");

// 配置
const config = {
  apiUrl: "http://localhost:3002/api/data",
  apiKey: "ocean-monitor-api-key",
  deviceId: "device-001",
  dataCount: 10,
  delayBetweenRequests: 1000, // 毫秒
};

// 生成随机数据
function generateRandomData() {
  return {
    deviceId: config.deviceId,
    timestamp: Date.now(),
    location: {
      latitude: 30 + Math.random() * 1,
      longitude: 121 + Math.random() * 1,
      depth: Math.random() * 10,
    },
    temperature: 15 + Math.random() * 10, // 15-25°C
    salinity: 30 + Math.random() * 10, // 30-40 PSU
    dissolvedOxygen: 4 + Math.random() * 6, // 4-10 mg/L
    pH: 7.5 + Math.random() * 1, // 7.5-8.5
    flowRate: Math.random() * 2, // 0-2 m/s
    turbidity: Math.random() * 5, // 0-5 NTU
    status: "normal",
  };
}

// 发送数据
async function sendData(data) {
  try {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`✅ 数据发送成功: ID=${result.id}`);
      return true;
    } else {
      console.error(`❌ 数据发送失败: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 请求错误: ${error.message}`);
    return false;
  }
}

// 主函数
async function main() {
  console.log("🌊 海洋要素监测系统API测试脚本");
  console.log(`📡 API地址: ${config.apiUrl}`);
  console.log(`🔑 API密钥: ${config.apiKey}`);
  console.log(`📱 设备ID: ${config.deviceId}`);
  console.log(`🔢 数据点数量: ${config.dataCount}`);
  console.log("-----------------------------------");

  let successCount = 0;

  for (let i = 0; i < config.dataCount; i++) {
    const data = generateRandomData();
    console.log(`📤 发送数据点 #${i + 1}/${config.dataCount}...`);

    const success = await sendData(data);
    if (success) successCount++;

    // 延迟，除非是最后一个请求
    if (i < config.dataCount - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, config.delayBetweenRequests)
      );
    }
  }

  console.log("-----------------------------------");
  console.log(`📊 结果: ${successCount}/${config.dataCount} 成功`);
}

// 运行主函数
main().catch((error) => {
  console.error("程序执行错误:", error);
  process.exit(1);
});
