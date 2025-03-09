"use client";

import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/70 to-blue-700/50 z-10" />
          <Image
            src="/bg-ocean.jpg"
            alt="Ocean Monitoring System"
            fill
            className="object-cover"
            priority
            unoptimized
          />
        </div>

        <div className="container mx-auto px-6 relative z-20">
          <div className="max-w-3xl text-white">
            <h1 className="text-5xl font-bold mb-4">海洋要素智能监测系统</h1>
            <p className="text-xl mb-8">
              实时监测与分析海洋环境要素，为海洋环境保护、资源管理与气候研究提供智能化解决方案
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/dashboard"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg text-center transition-colors"
              >
                查看实时监测数据
              </Link>
              <Link
                href="/elements/temperature"
                className="bg-white/20 hover:bg-white/30 backdrop-blur text-white font-semibold py-3 px-6 rounded-lg text-center transition-colors"
              >
                了解系统功能
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">系统核心功能</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon="📊"
              title="多元素监测"
              description="实时监测海水温度、盐度、流速、溶解氧等关键海洋环境要素数据"
            />
            <FeatureCard
              icon="🧠"
              title="智能分析"
              description="运用机器学习算法进行数据处理、异常检测和趋势预测分析"
            />
            <FeatureCard
              icon="🌊"
              title="可视化展示"
              description="多维度可视化展示，包括实时监测数据、历史趋势和地理空间分布"
            />
            <FeatureCard
              icon="⚠️"
              title="预警系统"
              description="基于阈值和异常检测的智能预警机制，及时发现环境异常"
            />
          </div>
        </div>
      </section>

      {/* System Architecture */}
      <section className="py-16 bg-blue-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-3">系统架构</h2>
          <p className="text-gray-600 text-center max-w-3xl mx-auto mb-12">
            基于物联网技术、大数据分析和人工智能算法的全栈解决方案
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ArchitectureCard
              title="数据采集层"
              description="整合海洋浮标、传感器网络和遥感技术等多源数据采集手段，实现海洋要素的全面监测"
              color="bg-blue-600"
            />
            <ArchitectureCard
              title="数据处理层"
              description="对原始数据进行预处理、特征提取和数据融合，通过智能算法识别数据异常和挖掘数据规律"
              color="bg-teal-600"
            />
            <ArchitectureCard
              title="数据存储层"
              description="高性能数据库设计，支持海量数据的存储、检索和管理，保障数据安全与完整性"
              color="bg-indigo-600"
            />
            <ArchitectureCard
              title="应用服务层"
              description="提供数据可视化、预警通知、决策支持等应用服务，满足不同场景的实际需求"
              color="bg-purple-600"
            />
          </div>
        </div>
      </section>

      {/* Research Value */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-3">研究价值</h2>
          <p className="text-gray-600 text-center max-w-3xl mx-auto mb-12">
            本系统的设计与实现具有重要的学术价值和应用前景
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <ResearchValueCard
              title="学术创新"
              items={[
                "海洋要素监测技术的研究与创新",
                "智能算法在环境监测中的应用研究",
                "海洋数据可视化与决策支持技术探索",
                "多源异构数据融合方法研究",
              ]}
            />
            <ResearchValueCard
              title="应用价值"
              items={[
                "海洋环境保护与生态安全监测",
                "海洋资源可持续开发管理",
                "海洋灾害预警与应急响应",
                "气候变化研究与环境评估",
              ]}
            />
          </div>
        </div>
      </section>

      {/* Academic Requirements */}
      <section className="py-16 bg-blue-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-3">毕业要求支撑</h2>
          <p className="text-gray-600 text-center max-w-3xl mx-auto mb-12">
            本系统设计与实现支撑以下毕业要求指标点
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <RequirementCard
              title="需求分析与问题建模"
              indicators={["2.1", "2.2", "2.3"]}
              description="针对海洋要素监测的复杂工程问题进行需求分析，建立抽象模型，并通过文献研究进行论证和改进"
            />
            <RequirementCard
              title="信息获取与工具应用"
              indicators={["5.1", "5.2"]}
              description="掌握信息技术工具，合理选择并应用于系统设计、开发与验证，同时理解其局限性"
            />
            <RequirementCard
              title="研究方法与解决方案"
              indicators={["4.1", "11.2"]}
              description="采用科学方法通过文献研究分析解决方案，并在多学科环境下运用工程项目管理与经济决策方法"
            />
            <RequirementCard
              title="沟通与表达"
              indicators={["10.1"]}
              description="通过系统开发与论文撰写，展示在智能科学与技术领域进行有效沟通和表达的能力"
            />
            <RequirementCard
              title="社会责任"
              indicators={["6.2"]}
              description="分析和评价本系统在海洋环境保护方面的社会影响，理解应承担的责任"
            />
            <RequirementCard
              title="自主学习"
              indicators={["12.1"]}
              description="通过阅读专业文献，学习前沿技术，展示拓展与更新知识的能力"
            />
          </div>
        </div>
      </section>

      {/* System Modules Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-3">系统模块</h2>
          <p className="text-gray-600 text-center max-w-3xl mx-auto mb-12">
            探索系统的不同功能模块，全面了解智能海洋监测系统的能力
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ModuleCard
              title="实时监测仪表盘"
              description="查看实时监测数据，包括温度、盐度、溶解氧等关键指标的实时变化"
              icon="📊"
              link="/dashboard"
            />
            <ModuleCard
              title="海洋要素分析"
              description="深入分析各种海洋要素的变化趋势、关联性和异常模式"
              icon="🔍"
              link="/elements/temperature"
            />
            <ModuleCard
              title="地理空间分布"
              description="在地图上查看监测设备分布和海洋要素的地理空间变化"
              icon="🗺️"
              link="/map"
            />
            <ModuleCard
              title="预警系统"
              description="查看和管理系统生成的异常警报，及时发现潜在环境问题"
              icon="⚠️"
              link="/alerts"
            />
            <ModuleCard
              title="数据导出与分享"
              description="导出历史数据用于深入分析或与其他研究人员分享"
              icon="📤"
              link="/data"
            />
            <ModuleCard
              title="系统管理"
              description="管理监测设备、用户权限和系统设置"
              icon="⚙️"
              link="/admin"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-700 to-blue-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">开始探索海洋世界</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            体验智能化的海洋监测系统，获取实时海洋数据与分析报告
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/dashboard"
              className="bg-white text-blue-700 hover:bg-blue-100 font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              进入系统
            </Link>
            <Link
              href="/admin"
              className="border border-white hover:bg-white/20 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              管理控制台
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold">海洋要素智能监测系统</h3>
              <p className="text-gray-400">本科毕业设计作品</p>
            </div>
            <div className="flex gap-6">
              <Link
                href="/dashboard"
                className="text-gray-400 hover:text-white transition-colors"
              >
                仪表盘
              </Link>
              <Link
                href="/map"
                className="text-gray-400 hover:text-white transition-colors"
              >
                监测地图
              </Link>
              <Link
                href="/alerts"
                className="text-gray-400 hover:text-white transition-colors"
              >
                预警系统
              </Link>
              <Link
                href="/admin"
                className="text-gray-400 hover:text-white transition-colors"
              >
                管理控制台
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

// Component for feature cards
interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

// Component for architecture cards
interface ArchitectureCardProps {
  title: string;
  description: string;
  color: string;
}

function ArchitectureCard({
  title,
  description,
  color,
}: ArchitectureCardProps) {
  return (
    <div className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className={`${color} p-4 text-white`}>
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>
      <div className="bg-white p-4">
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}

// Component for research value cards
interface ResearchValueCardProps {
  title: string;
  items: string[];
}

function ResearchValueCard({ title, items }: ResearchValueCardProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <ul className="space-y-2">
        {items.map((item: string, index: number) => (
          <li key={index} className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <span className="text-gray-700">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Component for module cards
interface ModuleCardProps {
  title: string;
  description: string;
  icon: string;
  link: string;
}

function ModuleCard({ title, description, icon, link }: ModuleCardProps) {
  return (
    <Link href={link} className="block">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all h-full">
        <div className="flex items-center mb-4">
          <div className="text-2xl mr-3">{icon}</div>
          <h3 className="text-xl font-semibold">{title}</h3>
        </div>
        <p className="text-gray-600">{description}</p>
        <div className="mt-4 text-blue-600 font-medium flex items-center">
          查看详情
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 ml-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </Link>
  );
}

// Component for academic requirement cards
interface RequirementCardProps {
  title: string;
  indicators: string[];
  description: string;
}

function RequirementCard({
  title,
  indicators,
  description,
}: RequirementCardProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 hover:shadow-md transition-shadow">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <div className="flex flex-wrap gap-2 mb-3">
        {indicators.map((indicator, index) => (
          <span
            key={index}
            className="inline-block bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-md font-medium"
          >
            {indicator}
          </span>
        ))}
      </div>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
