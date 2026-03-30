// custom-reporter.ts
import {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

export interface ReporterConfig {
  outputDir?: string;
  reportTitle?: string;
  companyName?: string;
  projectName?: string;
  logo?: string;
  showPassedTests?: boolean;
  showSkippedTests?: boolean;
  includeScreenshots?: boolean;
  includeVideos?: boolean;
  includeTraces?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  primaryColor?: string;
  showEnvironmentInfo?: boolean;
  customMetadata?: Record<string, any>;
  testCategories?: string[];
  slackWebhook?: string;
  emailRecipients?: string[];
  language?: 'uk' | 'en' | 'pl';
}

interface TestData {
  id: string;
  title: string;
  fullTitle: string;
  file: string;
  line: number;
  column: number;
  status: string;
  duration: number;
  startTime: number;
  endTime: number;
  error?: {
    message: string;
    stack?: string;
  };
  steps: StepData[];
  annotations: Array<{ type: string; description?: string }>;
  attachments: AttachmentData[];
  retries: number;
  browser?: string;
  project?: string;
  tags: string[];
  category?: string;
}

interface StepData {
  title: string;
  duration: number;
  error?: string;
  category: string;
  startTime: number;
  endTime: number;
}

interface AttachmentData {
  name: string;
  contentType: string;
  path?: string;
  base64?: string;
}

interface SuiteData {
  title: string;
  file: string;
  tests: TestData[];
  suites: SuiteData[];
}

interface EnvironmentInfo {
  os: string;
  nodeVersion: string;
  playwrightVersion: string;
  timestamp: string;
  duration: number;
  workers: number;
}

class EnterpriseReporter implements Reporter {
  private config: ReporterConfig;
  private startTime: number = 0;
  private endTime: number = 0;
  private allTests: TestData[] = [];
  private suites: Map<string, SuiteData> = new Map();
  private playwrightConfig?: FullConfig;
  private testsByProject: Map<string, TestData[]> = new Map();
  private testsByFile: Map<string, TestData[]> = new Map();
  private testsByCategory: Map<string, TestData[]> = new Map();
  private translations: any;

  constructor(config: ReporterConfig = {}) {
    this.config = {
      outputDir: 'test-results/enterprise-report',
      reportTitle: 'Test Execution Report',
      companyName: 'Your Company',
      projectName: 'Test Suite',
      showPassedTests: true,
      showSkippedTests: true,
      includeScreenshots: true,
      includeVideos: true,
      includeTraces: true,
      theme: 'light',
      primaryColor: '#667eea',
      showEnvironmentInfo: true,
      testCategories: ['smoke', 'regression', 'integration', 'e2e'],
      language: 'uk',
      ...config,
    };
    
    this.translations = this.getTranslations(this.config.language!);
  }
  
  private getTranslations(lang: string) {
    const translations: any = {
      uk: {
        testReport: 'Звіт про виконання тестів',
        overview: 'Огляд',
        categories: 'Категорії',
        suites: 'Набори тестів',
        graphs: 'Графіки',
        timeline: 'Часова шкала',
        behaviors: 'Поведінка',
        packages: 'Пакети',
        totalTests: 'Всього тестів',
        testCases: 'тест кейсів',
        passed: 'Пройдено',
        failed: 'Провалено',
        broken: 'Зламано',
        skipped: 'Пропущено',
        unknown: 'Невідомо',
        duration: 'Тривалість',
        passRate: 'Показник успішності',
        features: 'Функції',
        environment: 'Середовище',
        trend: 'Тренд',
        itemsTotal: 'елементів всього',
        showAll: 'Показати все',
        nothingToShow: 'Немає даних для відображення',
        executors: 'Виконавці',
        noExecutorInfo: 'Немає інформації про виконавців тестів',
      },
      en: {
        testReport: 'Test Execution Report',
        overview: 'Overview',
        categories: 'Categories',
        suites: 'Suites',
        graphs: 'Graphs',
        timeline: 'Timeline',
        behaviors: 'Behaviors',
        packages: 'Packages',
        totalTests: 'Total Tests',
        testCases: 'test cases',
        passed: 'Passed',
        failed: 'Failed',
        broken: 'Broken',
        skipped: 'Skipped',
        unknown: 'Unknown',
        duration: 'Duration',
        passRate: 'Pass Rate',
        features: 'Features',
        environment: 'Environment',
        trend: 'Trend',
        itemsTotal: 'items total',
        showAll: 'Show all',
        nothingToShow: 'There is nothing to show',
        executors: 'Executors',
        noExecutorInfo: 'There is no information about tests executors',
      },
      pl: {
        testReport: 'Raport wykonania testów',
        overview: 'Przegląd',
        categories: 'Kategorie',
        suites: 'Zestawy',
        graphs: 'Wykresy',
        timeline: 'Oś czasu',
        behaviors: 'Zachowania',
        packages: 'Pakiety',
        totalTests: 'Wszystkie testy',
        testCases: 'przypadków testowych',
        passed: 'Zaliczone',
        failed: 'Nieudane',
        broken: 'Uszkodzone',
        skipped: 'Pominięte',
        unknown: 'Nieznane',
        duration: 'Czas trwania',
        passRate: 'Wskaźnik sukcesu',
        features: 'Funkcje',
        environment: 'Środowisko',
        trend: 'Trend',
        itemsTotal: 'elementów w sumie',
        showAll: 'Pokaż wszystko',
        nothingToShow: 'Nie ma nic do pokazania',
        executors: 'Wykonawcy',
        noExecutorInfo: 'Brak informacji o wykonawcach testów',
      },
    };
    
    return translations[lang] || translations.uk;
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.playwrightConfig = config;
    this.startTime = Date.now();
    
    console.log(`\n🚀 Starting ${suite.allTests().length} tests...`);
    
    if (!fs.existsSync(this.config.outputDir!)) {
      fs.mkdirSync(this.config.outputDir!, { recursive: true });
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const location = test.location;
    const steps: StepData[] = [];
    let currentTime = result.startTime.getTime();

    for (const step of result.steps) {
      const stepStart = currentTime;
      const stepEnd = stepStart + step.duration;
      steps.push({
        title: step.title,
        duration: step.duration,
        error: step.error?.message,
        category: step.category,
        startTime: stepStart,
        endTime: stepEnd,
      });
      currentTime = stepEnd;
    }

    const attachments: AttachmentData[] = [];
    for (const attachment of result.attachments) {
      const attData: AttachmentData = {
        name: attachment.name,
        contentType: attachment.contentType,
        path: attachment.path,
      };

      if (this.config.includeScreenshots && 
          attachment.path && 
          attachment.contentType.startsWith('image/')) {
        try {
          const imageBuffer = fs.readFileSync(attachment.path);
          attData.base64 = imageBuffer.toString('base64');
        } catch (e) {
          // Ignore
        }
      }
      
      attachments.push(attData);
    }

    const tags: string[] = [];
    test.annotations.forEach(ann => {
      if (ann.type === 'tag') {
        tags.push(ann.description || '');
      }
    });

    let category = 'other';
    for (const tag of tags) {
      if (this.config.testCategories?.includes(tag.toLowerCase())) {
        category = tag.toLowerCase();
        break;
      }
    }

    const testData: TestData = {
      id: `${test.id}-${result.retry}`,
      title: test.title,
      fullTitle: test.titlePath().join(' > '),
      file: location.file,
      line: location.line,
      column: location.column,
      status: result.status,
      duration: result.duration,
      startTime: result.startTime.getTime(),
      endTime: result.startTime.getTime() + result.duration,
      error: result.error ? {
        message: this.stripAnsiCodes(result.error.message || ''),
        stack: result.error.stack ? this.stripAnsiCodes(result.error.stack) : undefined,
      } : undefined,
      steps,
      annotations: test.annotations,
      attachments,
      retries: result.retry,
      browser: test.parent.project()?.name,
      project: test.parent.project()?.name,
      tags,
      category,
    };

    this.allTests.push(testData);

    const projectName = testData.project || 'default';
    if (!this.testsByProject.has(projectName)) {
      this.testsByProject.set(projectName, []);
    }
    this.testsByProject.get(projectName)!.push(testData);

    const fileName = path.basename(testData.file);
    if (!this.testsByFile.has(fileName)) {
      this.testsByFile.set(fileName, []);
    }
    this.testsByFile.get(fileName)!.push(testData);
    
    if (!this.testsByCategory.has(category)) {
      this.testsByCategory.set(category, []);
    }
    this.testsByCategory.get(category)!.push(testData);

    const statusSymbol = {
      passed: '✅',
      failed: '❌',
      skipped: '⏭️',
      timedOut: '⏱️',
    }[result.status] || '❓';

    console.log(`${statusSymbol} ${testData.fullTitle} (${(result.duration / 1000).toFixed(2)}s)`);
  }

  onEnd(result: FullResult) {
    this.endTime = Date.now();
    const duration = this.endTime - this.startTime;

    const stats = {
      total: this.allTests.length,
      passed: this.allTests.filter(t => t.status === 'passed').length,
      failed: this.allTests.filter(t => t.status === 'failed').length,
      skipped: this.allTests.filter(t => t.status === 'skipped').length,
      broken: this.allTests.filter(t => t.status === 'timedOut').length,
      unknown: this.allTests.filter(t => !['passed', 'failed', 'skipped', 'timedOut'].includes(t.status)).length,
      duration,
      passRate: 0,
    };

    stats.passRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;

    console.log(`\n✅ ${stats.passed} passed | ❌ ${stats.failed} failed | ⏭️ ${stats.skipped} skipped`);

    this.generateHTMLReport(stats);
    this.generateJSONReport(stats);

    const reportPath = path.resolve(this.config.outputDir!, 'index.html');
    console.log(`\n📁 Report: ${reportPath}\n`);
  }

  private generateHTMLReport(stats: any) {
    const envInfo = this.getEnvironmentInfo();
    const t = this.translations;
    
    const html = `<!DOCTYPE html>
<html lang="${this.config.language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.config.reportTitle}</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
        }
        
        .layout {
            display: flex;
            min-height: 100vh;
        }
        
        /* Sidebar */
        .sidebar {
            width: 240px;
            background: #2c3e50;
            color: white;
            position: fixed;
            height: 100vh;
            overflow-y: auto;
        }
        
        .sidebar-header {
            padding: 25px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .logo-container {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
        }
        
        .logo {
            width: 40px;
            height: 40px;
            border-radius: 8px;
        }
        
        .company-name {
            font-size: 18px;
            font-weight: 700;
        }
        
        .project-name {
            font-size: 13px;
            opacity: 0.7;
            margin-top: 4px;
        }
        
        .nav-menu {
            padding: 10px 0;
        }
        
        .nav-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 20px;
            cursor: pointer;
            transition: all 0.2s;
            color: rgba(255,255,255,0.8);
            text-decoration: none;
            border-left: 3px solid transparent;
        }
        
        .nav-item:hover {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        
        .nav-item.active {
            background: rgba(255,255,255,0.15);
            color: white;
            border-left-color: ${this.config.primaryColor};
        }
        
        .nav-icon {
            font-size: 18px;
            width: 24px;
            text-align: center;
        }
        
        /* Main Content */
        .main-content {
            flex: 1;
            margin-left: 240px;
        }
        
        .top-bar {
            background: white;
            padding: 20px 30px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .page-title {
            font-size: 24px;
            font-weight: 700;
            color: #2c3e50;
        }
        
        .timestamp {
            color: #777;
            font-size: 14px;
        }
        
        .content-area {
            padding: 30px;
        }
        
        /* Overview Cards */
        .overview-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            background: white;
            border-radius: 8px;
            padding: 25px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .stats-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .total-tests {
            text-align: center;
        }
        
        .total-number {
            font-size: 72px;
            font-weight: 700;
            color: #2c3e50;
            line-height: 1;
        }
        
        .total-label {
            font-size: 14px;
            color: #777;
            margin-top: 8px;
            text-transform: lowercase;
        }
        
        .status-bars {
            flex: 1;
            margin-left: 40px;
        }
        
        .status-item {
            margin-bottom: 20px;
        }
        
        .status-item:last-child {
            margin-bottom: 0;
        }
        
        .status-label {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 13px;
        }
        
        .status-name {
            font-weight: 600;
        }
        
        .status-count {
            color: #777;
        }
        
        .status-bar {
            height: 8px;
            background: #f0f0f0;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .status-fill {
            height: 100%;
            transition: width 0.3s;
        }
        
        .status-fill.passed { background: #4caf50; }
        .status-fill.failed { background: #f44336; }
        .status-fill.broken { background: #ff9800; }
        .status-fill.skipped { background: #9e9e9e; }
        .status-fill.unknown { background: #607d8b; }
        
        .donut-container {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 200px;
        }
        
        /* Section */
        .section {
            margin-bottom: 30px;
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .section-title {
            font-size: 16px;
            font-weight: 600;
            color: #2c3e50;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .items-count {
            color: #777;
            font-size: 13px;
        }
        
        .show-all {
            color: ${this.config.primaryColor};
            font-size: 13px;
            cursor: pointer;
            text-decoration: none;
        }
        
        .show-all:hover {
            text-decoration: underline;
        }
        
        /* Feature List */
        .feature-list {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .feature-item {
            border-bottom: 1px solid #f0f0f0;
            padding: 15px 20px;
            transition: background 0.2s;
            cursor: pointer;
        }
        
        .feature-item:hover {
            background: #fafafa;
        }
        
        .feature-item:last-child {
            border-bottom: none;
        }
        
        .feature-name {
            font-size: 14px;
            color: #333;
            margin-bottom: 8px;
        }
        
        .feature-stats {
            height: 24px;
            background: #f0f0f0;
            border-radius: 4px;
            display: flex;
            overflow: hidden;
        }
        
        .feature-stat {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 600;
            color: white;
        }
        
        .feature-stat.passed { background: #4caf50; }
        .feature-stat.failed { background: #f44336; }
        .feature-stat.broken { background: #ff9800; }
        .feature-stat.skipped { background: #9e9e9e; }
        
        /* Environment */
        .env-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
        }
        
        .env-item {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        
        .env-label {
            font-size: 12px;
            color: #777;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .env-value {
            font-size: 14px;
            font-weight: 600;
            color: #333;
        }
        
        /* Categories */
        .category-list {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .category-item {
            border-bottom: 1px solid #f0f0f0;
            padding: 15px 20px;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .category-item:last-child {
            border-bottom: none;
        }
        
        .category-name {
            flex: 0 0 250px;
            font-size: 14px;
            color: #333;
        }
        
        .category-bar {
            flex: 1;
            height: 32px;
            background: #f44336;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 12px;
        }
        
        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #999;
        }
        
        .empty-icon {
            font-size: 48px;
            margin-bottom: 15px;
            opacity: 0.3;
        }
        
        /* Content Pages */
        .content-page {
            display: none;
        }
        
        .content-page.active {
            display: block;
        }
        
        /* Charts */
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .chart-card {
            background: white;
            border-radius: 8px;
            padding: 25px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .chart-title {
            font-size: 14px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="layout">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="logo-container">
                    ${this.config.logo ? `<img src="${this.config.logo}" alt="Logo" class="logo">` : '<div class="logo" style="background: ${this.config.primaryColor}; display: flex; align-items: center; justify-content: center; font-size: 20px;">🎭</div>'}
                    <div>
                        <div class="company-name">${this.config.companyName}</div>
                        <div class="project-name">${this.config.projectName}</div>
                    </div>
                </div>
            </div>
            <nav class="nav-menu">
                <a class="nav-item active" data-page="overview">
                    <span class="nav-icon">🏠</span>
                    <span>${t.overview}</span>
                </a>
                <a class="nav-item" data-page="categories">
                    <span class="nav-icon">📂</span>
                    <span>${t.categories}</span>
                </a>
                <a class="nav-item" data-page="suites">
                    <span class="nav-icon">📦</span>
                    <span>${t.suites}</span>
                </a>
                <a class="nav-item" data-page="graphs">
                    <span class="nav-icon">📊</span>
                    <span>${t.graphs}</span>
                </a>
                <a class="nav-item" data-page="timeline">
                    <span class="nav-icon">⏱️</span>
                    <span>${t.timeline}</span>
                </a>
                <a class="nav-item" data-page="behaviors">
                    <span class="nav-icon">🎯</span>
                    <span>${t.behaviors}</span>
                </a>
                <a class="nav-item" data-page="packages">
                    <span class="nav-icon">📝</span>
                    <span>${t.packages}</span>
                </a>
            </nav>
        </aside>
        
        <!-- Main Content -->
        <main class="main-content">
            <div class="top-bar">
                <h1 class="page-title">${this.config.reportTitle}</h1>
                <div class="timestamp">${new Date().toLocaleString(this.config.language)}</div>
            </div>
            
            <div class="content-area">
                <!-- Overview Page -->
                <div class="content-page active" data-page="overview">
                    <div class="overview-grid">
                        <div class="card">
                            <div class="stats-container">
                                <div class="total-tests">
                                    <div class="total-number">${stats.total}</div>
                                    <div class="total-label">${t.testCases}</div>
                                </div>
                                <div class="status-bars">
                                    <div class="status-item">
                                        <div class="status-label">
                                            <span class="status-name">${t.passed}</span>
                                            <span class="status-count">${stats.passed}</span>
                                        </div>
                                        <div class="status-bar">
                                            <div class="status-fill passed" style="width: ${(stats.passed/stats.total*100).toFixed(1)}%"></div>
                                        </div>
                                    </div>
                                    <div class="status-item">
                                        <div class="status-label">
                                            <span class="status-name">${t.failed}</span>
                                            <span class="status-count">${stats.failed}</span>
                                        </div>
                                        <div class="status-bar">
                                            <div class="status-fill failed" style="width: ${(stats.failed/stats.total*100).toFixed(1)}%"></div>
                                        </div>
                                    </div>
                                    <div class="status-item">
                                        <div class="status-label">
                                            <span class="status-name">${t.broken}</span>
                                            <span class="status-count">${stats.broken}</span>
                                        </div>
                                        <div class="status-bar">
                                            <div class="status-fill broken" style="width: ${(stats.broken/stats.total*100).toFixed(1)}%"></div>
                                        </div>
                                    </div>
                                    <div class="status-item">
                                        <div class="status-label">
                                            <span class="status-name">${t.skipped}</span>
                                            <span class="status-count">${stats.skipped}</span>
                                        </div>
                                        <div class="status-bar">
                                            <div class="status-fill skipped" style="width: ${(stats.skipped/stats.total*100).toFixed(1)}%"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="card">
                            <div class="donut-container">
                                <canvas id="overviewDonut"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Suites Section -->
                    <div class="section">
                        <div class="section-header">
                            <div>
                                <span class="section-title">${t.suites}</span>
                                <span class="items-count">${this.testsByFile.size} ${t.itemsTotal}</span>
                            </div>
                            <a class="show-all">${t.showAll}</a>
                        </div>
                        <div class="feature-list">
                            ${Array.from(this.testsByFile.entries()).slice(0, 5).map(([file, tests]) => {
                                const passed = tests.filter(t => t.status === 'passed').length;
                                const failed = tests.filter(t => t.status === 'failed').length;
                                const broken = tests.filter(t => t.status === 'timedOut').length;
                                const skipped = tests.filter(t => t.status === 'skipped').length;
                                return `
                                    <div class="feature-item">
                                        <div class="feature-name">${this.escapeHtml(file)}</div>
                                        <div class="feature-stats">
                                            ${failed > 0 ? `<div class="feature-stat failed" style="width: ${(failed/tests.length*100).toFixed(1)}%">${failed}</div>` : ''}
                                            ${passed > 0 ? `<div class="feature-stat passed" style="width: ${(passed/tests.length*100).toFixed(1)}%">${passed}</div>` : ''}
                                            ${broken > 0 ? `<div class="feature-stat broken" style="width: ${(broken/tests.length*100).toFixed(1)}%">${broken}</div>` : ''}
                                            ${skipped > 0 ? `<div class="feature-stat skipped" style="width: ${(skipped/tests.length*100).toFixed(1)}%">${skipped}</div>` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    
                    <!-- Environment Section -->
                    <div class="section">
                        <div class="section-header">
                            <span class="section-title">${t.environment}</span>
                        </div>
                        <div class="card">
                            <div class="env-grid">
                                <div class="env-item">
                                    <div class="env-label">Environment</div>
                                    <div class="env-value">stage</div>
                                </div>
                                <div class="env-item">
                                    <div class="env-label">Browser</div>
                                    <div class="env-value">${this.playwrightConfig?.projects?.[0]?.name || 'Chromium'}</div>
                                </div>
                                <div class="env-item">
                                    <div class="env-label">Node</div>
                                    <div class="env-value">${envInfo.nodeVersion}</div>
                                </div>
                                <div class="env-item">
                                    <div class="env-label">Playwright</div>
                                    <div class="env-value">${envInfo.playwrightVersion}</div>
                                </div>
                                <div class="env-item">
                                    <div class="env-label">Platform</div>
                                    <div class="env-value">${envInfo.os}</div>
                                </div>
                                <div class="env-item">
                                    <div class="env-label">${t.duration}</div>
                                    <div class="env-value">${(stats.duration/1000).toFixed(2)}s</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Categories Page -->
                <div class="content-page" data-page="categories">
                    <div class="section">
                        <div class="section-header">
                            <div>
                                <span class="section-title">${t.categories}</span>
                                <span class="items-count">${this.testsByCategory.size} ${t.itemsTotal}</span>
                            </div>
                            <a class="show-all">${t.showAll}</a>
                        </div>
                        ${this.testsByCategory.size > 0 ? `
                        <div class="category-list">
                            ${Array.from(this.testsByCategory.entries()).map(([category, tests]) => {
                                const failed = tests.filter(t => t.status === 'failed').length;
                                return `
                                    <div class="category-item">
                                        <div class="category-name">${this.escapeHtml(category)}</div>
                                        <div class="category-bar" style="width: ${(failed/this.allTests.length*100*3).toFixed(0)}%">
                                            ${failed}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        ` : `
                        <div class="empty-state">
                            <div class="empty-icon">📂</div>
                            <div>${t.nothingToShow}</div>
                        </div>
                        `}
                    </div>
                </div>
                
                <!-- Graphs Page -->
                <div class="content-page" data-page="graphs">
                    <div class="charts-grid">
                        <div class="chart-card">
                            <div class="chart-title">Status Distribution</div>
                            <canvas id="statusChart"></canvas>
                        </div>
                        <div class="chart-card">
                            <div class="chart-title">Duration Analysis</div>
                            <canvas id="durationChart"></canvas>
                        </div>
                        <div class="chart-card">
                            <div class="chart-title">Pass Rate Trend</div>
                            <canvas id="trendChart"></canvas>
                        </div>
                        <div class="chart-card">
                            <div class="chart-title">Tests by Category</div>
                            <canvas id="categoryChart"></canvas>
                        </div>
                    </div>
                </div>
                
                <!-- Empty pages -->
                <div class="content-page" data-page="suites">
                    <div class="empty-state">
                        <div class="empty-icon">📦</div>
                        <div>${t.nothingToShow}</div>
                    </div>
                </div>
                
                <div class="content-page" data-page="timeline">
                    <div class="empty-state">
                        <div class="empty-icon">⏱️</div>
                        <div>${t.nothingToShow}</div>
                    </div>
                </div>
                
                <div class="content-page" data-page="behaviors">
                    <div class="empty-state">
                        <div class="empty-icon">🎯</div>
                        <div>${t.nothingToShow}</div>
                    </div>
                </div>
                
                <div class="content-page" data-page="packages">
                    <div class="empty-state">
                        <div class="empty-icon">📝</div>
                        <div>${t.nothingToShow}</div>
                    </div>
                </div>
            </div>
        </main>
    </div>
    
    <script>
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function() {
                const page = this.dataset.page;
                
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                this.classList.add('active');
                
                document.querySelectorAll('.content-page').forEach(p => p.classList.remove('active'));
                document.querySelector(\`.content-page[data-page="\${page}"]\`).classList.add('active');
            });
        });
        
        // Charts
        Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        
        // Overview Donut
        new Chart(document.getElementById('overviewDonut'), {
            type: 'doughnut',
            data: {
                labels: ['${t.passed}', '${t.failed}', '${t.broken}', '${t.skipped}'],
                datasets: [{
                    data: [${stats.passed}, ${stats.failed}, ${stats.broken}, ${stats.skipped}],
                    backgroundColor: ['#4caf50', '#f44336', '#ff9800', '#9e9e9e'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                cutout: '70%'
            }
        });
        
        // Status Chart
        new Chart(document.getElementById('statusChart'), {
            type: 'doughnut',
            data: {
                labels: ['${t.passed}', '${t.failed}', '${t.broken}', '${t.skipped}'],
                datasets: [{
                    data: [${stats.passed}, ${stats.failed}, ${stats.broken}, ${stats.skipped}],
                    backgroundColor: ['#4caf50', '#f44336', '#ff9800', '#9e9e9e']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
        
        // Duration Chart
        const sortedTests = ${JSON.stringify(this.allTests.sort((a, b) => b.duration - a.duration).slice(0, 10))};
        new Chart(document.getElementById('durationChart'), {
            type: 'bar',
            data: {
                labels: sortedTests.map(t => t.title.substring(0, 20)),
                datasets: [{
                    label: '${t.duration} (s)',
                    data: sortedTests.map(t => (t.duration / 1000).toFixed(2)),
                    backgroundColor: '#${this.config.primaryColor?.substring(1)}'
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: { legend: { display: false } }
            }
        });
        
        // Trend Chart
        new Chart(document.getElementById('trendChart'), {
            type: 'line',
            data: {
                labels: ['Run 1', 'Run 2', 'Run 3', 'Run 4', 'Current'],
                datasets: [{
                    label: '${t.passRate} %',
                    data: [85, 88, 90, 87, ${stats.passRate.toFixed(1)}],
                    borderColor: '#${this.config.primaryColor?.substring(1)}',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, max: 100 }
                }
            }
        });
        
        // Category Chart
        const categories = ${JSON.stringify(Array.from(this.testsByCategory.entries()).map(([cat, tests]) => ({ cat, count: tests.length })))};
        new Chart(document.getElementById('categoryChart'), {
            type: 'pie',
            data: {
                labels: categories.map(c => c.cat),
                datasets: [{
                    data: categories.map(c => c.count),
                    backgroundColor: ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b']
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    </script>
</body>
</html>`;

    fs.writeFileSync(path.join(this.config.outputDir!, 'index.html'), html);
  }

  private generateJSONReport(stats: any) {
    const jsonData = {
      config: this.config,
      stats,
      environment: this.getEnvironmentInfo(),
      tests: this.allTests,
      testsByProject: Object.fromEntries(this.testsByProject),
      testsByFile: Object.fromEntries(this.testsByFile),
      testsByCategory: Object.fromEntries(this.testsByCategory),
      generatedAt: new Date().toISOString(),
    };
    
    fs.writeFileSync(
      path.join(this.config.outputDir!, 'report.json'),
      JSON.stringify(jsonData, null, 2)
    );
  }

  private getEnvironmentInfo(): EnvironmentInfo {
    return {
      os: process.platform,
      nodeVersion: process.version,
      playwrightVersion: require('@playwright/test/package.json').version,
      timestamp: new Date().toISOString(),
      duration: this.endTime - this.startTime,
      workers: this.playwrightConfig?.workers || 1,
    };
  }

  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
  
  private stripAnsiCodes(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\u001b\[\d+m/g, '')
               .replace(/\u001b\[[\d;]+m/g, '')
               .replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
  }

  private truncate(text: string, length: number): string {
    return text.length > length ? text.substring(0, length) + '...' : text;
  }
}

export default EnterpriseReporter;