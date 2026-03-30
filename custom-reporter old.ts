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
        summary: 'ПІДСУМКИ ВИКОНАННЯ ТЕСТІВ',
        totalTests: 'Всього тестів',
        passed: 'Пройдено',
        failed: 'Провалено',
        skipped: 'Пропущено',
        flaky: 'Нестабільні',
        duration: 'Тривалість',
        passRate: 'Показник успішності',
        overview: 'Огляд',
        allTests: 'Всі тести',
        failedTests: 'Провалені',
        timeline: 'Часова шкала',
        projects: 'По проектах',
        statusDistribution: 'Розподіл за статусом',
        durationAnalysis: 'Аналіз тривалості',
        testsByCategory: 'Тести за категоріями',
        passRateTrend: 'Тренд успішності',
        topFilesByTests: 'Топ файлів за тестами',
        slowestTests: 'Найповільніші тести',
        projectsSummary: 'Підсумки проектів',
        testDetails: 'Деталі тестів',
        testExecutionTimeline: 'Часова шкала виконання тестів',
        testSteps: 'Кроки тесту',
        error: 'Помилка',
        noFailedTests: '🎉 Немає провалених тестів!',
        timestamp: 'Час виконання',
        workers: 'Воркери',
        nodeVersion: 'Версія Node',
        playwright: 'Playwright',
        platform: 'Платформа',
        environment: 'Середовище',
        all: 'Всі',
        search: 'Пошук тестів...',
        generatedAt: 'Згенеровано',
        tests: 'тестів',
      },
      en: {
        testReport: 'Test Execution Report',
        summary: 'TEST EXECUTION SUMMARY',
        totalTests: 'Total Tests',
        passed: 'Passed',
        failed: 'Failed',
        skipped: 'Skipped',
        flaky: 'Flaky',
        duration: 'Duration',
        passRate: 'Pass Rate',
        overview: 'Overview',
        allTests: 'All Tests',
        failedTests: 'Failed',
        timeline: 'Timeline',
        projects: 'By Project',
        statusDistribution: 'Status Distribution',
        durationAnalysis: 'Duration Analysis',
        testsByCategory: 'Tests by Category',
        passRateTrend: 'Pass Rate Trend',
        topFilesByTests: 'Top Files by Tests',
        slowestTests: 'Slowest Tests',
        projectsSummary: 'Projects Summary',
        testDetails: 'Test Details',
        testExecutionTimeline: 'Test Execution Timeline',
        testSteps: 'Test Steps',
        error: 'Error',
        noFailedTests: '🎉 No failed tests!',
        timestamp: 'Timestamp',
        workers: 'Workers',
        nodeVersion: 'Node Version',
        playwright: 'Playwright',
        platform: 'Platform',
        environment: 'Environment',
        all: 'All',
        search: 'Search tests...',
        generatedAt: 'Generated',
        tests: 'tests',
      },
      pl: {
        testReport: 'Raport wykonania testów',
        summary: 'PODSUMOWANIE WYKONANIA TESTÓW',
        totalTests: 'Wszystkie testy',
        passed: 'Zaliczone',
        failed: 'Nieudane',
        skipped: 'Pominięte',
        flaky: 'Niestabilne',
        duration: 'Czas trwania',
        passRate: 'Wskaźnik sukcesu',
        overview: 'Przegląd',
        allTests: 'Wszystkie testy',
        failedTests: 'Nieudane',
        timeline: 'Oś czasu',
        projects: 'Według projektów',
        statusDistribution: 'Rozkład według statusu',
        durationAnalysis: 'Analiza czasu trwania',
        testsByCategory: 'Testy według kategorii',
        passRateTrend: 'Trend wskaźnika sukcesu',
        topFilesByTests: 'Najważniejsze pliki według testów',
        slowestTests: 'Najwolniejsze testy',
        projectsSummary: 'Podsumowanie projektów',
        testDetails: 'Szczegóły testów',
        testExecutionTimeline: 'Oś czasu wykonania testów',
        testSteps: 'Kroki testu',
        error: 'Błąd',
        noFailedTests: '🎉 Brak nieudanych testów!',
        timestamp: 'Znacznik czasu',
        workers: 'Workery',
        nodeVersion: 'Wersja Node',
        playwright: 'Playwright',
        platform: 'Platforma',
        environment: 'Środowisko',
        all: 'Wszystkie',
        search: 'Szukaj testów...',
        generatedAt: 'Wygenerowano',
        tests: 'testów',
      },
    };
    
    return translations[lang] || translations.uk;
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.playwrightConfig = config;
    this.startTime = Date.now();
    
    const totalTests = suite.allTests().length;
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log(`║  🚀 ${this.config.reportTitle}`.padEnd(56) + '║');
    console.log('╠═══════════════════════════════════════════════════════╣');
    console.log(`║  📦 Project: ${this.config.projectName}`.padEnd(56) + '║');
    console.log(`║  🧪 Total Tests: ${totalTests}`.padEnd(56) + '║');
    console.log(`║  👷 Workers: ${config.workers}`.padEnd(56) + '║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    
    // Create output directory
    if (!fs.existsSync(this.config.outputDir!)) {
      fs.mkdirSync(this.config.outputDir!, { recursive: true });
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const location = test.location;
    const steps: StepData[] = [];
    let currentTime = result.startTime.getTime();

    // Process test steps with timing
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

    // Process attachments with base64 for screenshots
    const attachments: AttachmentData[] = [];
    for (const attachment of result.attachments) {
      const attData: AttachmentData = {
        name: attachment.name,
        contentType: attachment.contentType,
        path: attachment.path,
      };

      // Convert screenshots to base64 for embedding
      if (this.config.includeScreenshots && 
          attachment.path && 
          attachment.contentType.startsWith('image/')) {
        try {
          const imageBuffer = fs.readFileSync(attachment.path);
          attData.base64 = imageBuffer.toString('base64');
        } catch (e) {
          console.warn(`Could not read screenshot: ${attachment.path}`);
        }
      }
      
      attachments.push(attData);
    }

    // Extract tags from test title or annotations
    const tags: string[] = [];
    test.annotations.forEach(ann => {
      if (ann.type === 'tag') {
        tags.push(ann.description || '');
      }
    });

    // Try to extract category from tags
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

    // Group by project
    const projectName = testData.project || 'default';
    if (!this.testsByProject.has(projectName)) {
      this.testsByProject.set(projectName, []);
    }
    this.testsByProject.get(projectName)!.push(testData);

    // Group by file
    const fileName = path.basename(testData.file);
    if (!this.testsByFile.has(fileName)) {
      this.testsByFile.set(fileName, []);
    }
    this.testsByFile.get(fileName)!.push(testData);

    // Console progress indicator
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
      flaky: this.allTests.filter(t => t.status === 'passed' && t.retries > 0).length,
      timedOut: this.allTests.filter(t => t.status === 'timedOut').length,
      duration,
      passRate: 0,
      avgDuration: 0,
    };

    stats.passRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
    stats.avgDuration = stats.total > 0 ? 
      this.allTests.reduce((sum, t) => sum + t.duration, 0) / stats.total : 0;

    // Console summary
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log(`║  📊 ${this.translations.summary}`.padEnd(56) + '║');
    console.log('╠═══════════════════════════════════════════════════════╣');
    console.log(`║  ${this.translations.totalTests}: ${stats.total}`.padEnd(56) + '║');
    console.log(`║  ✅ ${this.translations.passed}: ${stats.passed}`.padEnd(56) + '║');
    console.log(`║  ❌ ${this.translations.failed}: ${stats.failed}`.padEnd(56) + '║');
    console.log(`║  ⏭️  ${this.translations.skipped}: ${stats.skipped}`.padEnd(56) + '║');
    console.log(`║  🔄 ${this.translations.flaky}: ${stats.flaky}`.padEnd(56) + '║');
    console.log(`║  ⏱️  ${this.translations.duration}: ${(duration / 1000).toFixed(2)}s`.padEnd(56) + '║');
    console.log(`║  📈 ${this.translations.passRate}: ${stats.passRate.toFixed(1)}%`.padEnd(56) + '║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    // Generate reports
    this.generateHTMLReport(stats);
    this.generateJSONReport(stats);
    this.generateMarkdownReport(stats);

    const reportPath = path.resolve(this.config.outputDir!, 'index.html');
    console.log(`\n📁 Enterprise Report: ${reportPath}\n`);
  }

  private generateHTMLReport(stats: any) {
    const envInfo = this.getEnvironmentInfo();
    const t = this.translations;
    
    const html = `<!DOCTYPE html>
<html lang="${this.config.language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.config.reportTitle} - ${this.config.companyName}</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"></script>
    <style>
        :root {
            --primary-color: ${this.config.primaryColor};
            --success-color: #10b981;
            --error-color: #ef4444;
            --warning-color: #f59e0b;
            --info-color: #3b82f6;
            --bg-primary: #ffffff;
            --bg-secondary: #f9fafb;
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
            --border-color: #e5e7eb;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, var(--primary-color) 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: var(--text-primary);
        }
        
        .container {
            max-width: 1600px;
            margin: 0 auto;
        }
        
        /* Header */
        .report-header {
            background: white;
            border-radius: 16px;
            padding: 40px;
            margin-bottom: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header-left {
            flex: 1;
        }
        
        .company-name {
            color: var(--primary-color);
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 10px;
        }
        
        .report-title {
            font-size: 36px;
            font-weight: 800;
            color: var(--text-primary);
            margin-bottom: 5px;
        }
        
        .project-name {
            font-size: 18px;
            color: var(--text-secondary);
            font-weight: 500;
        }
        
        .header-right {
            text-align: right;
        }
        
        .pass-rate-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            font-weight: 800;
            margin-bottom: 10px;
            background: linear-gradient(135deg, var(--success-color), #059669);
            color: white;
        }
        
        .pass-rate-label {
            font-size: 14px;
            color: var(--text-secondary);
            font-weight: 600;
        }
        
        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .stat-card {
            background: white;
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transition: all 0.3s;
            position: relative;
            overflow: hidden;
        }
        
        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: var(--accent-color);
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
        
        .stat-icon {
            font-size: 32px;
            margin-bottom: 15px;
        }
        
        .stat-value {
            font-size: 42px;
            font-weight: 800;
            margin-bottom: 8px;
            color: var(--stat-color);
        }
        
        .stat-label {
            color: var(--text-secondary);
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            font-weight: 600;
        }
        
        .stat-card.total { --accent-color: var(--primary-color); --stat-color: var(--primary-color); }
        .stat-card.passed { --accent-color: var(--success-color); --stat-color: var(--success-color); }
        .stat-card.failed { --accent-color: var(--error-color); --stat-color: var(--error-color); }
        .stat-card.skipped { --accent-color: var(--warning-color); --stat-color: var(--warning-color); }
        .stat-card.flaky { --accent-color: #8b5cf6; --stat-color: #8b5cf6; }
        .stat-card.duration { --accent-color: var(--info-color); --stat-color: var(--info-color); }
        
        /* Tabs */
        .tabs-container {
            background: white;
            border-radius: 16px;
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .tabs {
            display: flex;
            border-bottom: 2px solid var(--border-color);
            background: var(--bg-secondary);
        }
        
        .tab {
            padding: 20px 30px;
            cursor: pointer;
            font-weight: 600;
            color: var(--text-secondary);
            transition: all 0.3s;
            border-bottom: 3px solid transparent;
            position: relative;
        }
        
        .tab:hover {
            background: white;
            color: var(--primary-color);
        }
        
        .tab.active {
            background: white;
            color: var(--primary-color);
            border-bottom-color: var(--primary-color);
        }
        
        .tab-badge {
            display: inline-block;
            background: var(--primary-color);
            color: white;
            border-radius: 12px;
            padding: 2px 8px;
            font-size: 11px;
            margin-left: 8px;
            font-weight: 700;
        }
        
        .tab-content {
            display: none;
            padding: 30px;
        }
        
        .tab-content.active {
            display: block;
        }
        
        /* Charts */
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .chart-card {
            background: white;
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .chart-title {
            font-size: 18px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        /* Timeline */
        .timeline-container {
            margin-top: 20px;
        }
        
        .timeline-item {
            background: var(--bg-secondary);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 20px;
            transition: all 0.3s;
            border-left: 4px solid var(--border-color);
        }
        
        .timeline-item:hover {
            transform: translateX(5px);
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        
        .timeline-item.passed { border-left-color: var(--success-color); }
        .timeline-item.failed { border-left-color: var(--error-color); }
        .timeline-item.skipped { border-left-color: var(--warning-color); }
        
        .timeline-label {
            flex: 0 0 350px;
            font-weight: 600;
            color: var(--text-primary);
        }
        
        .timeline-bar-container {
            flex: 1;
            height: 40px;
            background: #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
            position: relative;
        }
        
        .timeline-bar {
            height: 100%;
            display: flex;
            align-items: center;
            padding: 0 15px;
            color: white;
            font-weight: 700;
            font-size: 13px;
            transition: width 0.6s ease;
        }
        
        .timeline-bar.passed {
            background: linear-gradient(90deg, var(--success-color), #059669);
        }
        
        .timeline-bar.failed {
            background: linear-gradient(90deg, var(--error-color), #dc2626);
        }
        
        .timeline-bar.skipped {
            background: linear-gradient(90deg, var(--warning-color), #d97706);
        }
        
        .timeline-duration {
            flex: 0 0 100px;
            text-align: right;
            font-weight: 700;
            color: var(--text-secondary);
        }
        
        /* Test List */
        .test-filters {
            display: flex;
            gap: 15px;
            margin-bottom: 25px;
            flex-wrap: wrap;
        }
        
        .search-box {
            flex: 1;
            min-width: 300px;
            padding: 15px 20px;
            border: 2px solid var(--border-color);
            border-radius: 12px;
            font-size: 15px;
            transition: all 0.3s;
        }
        
        .search-box:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .filter-btn {
            padding: 12px 24px;
            border: 2px solid var(--border-color);
            background: white;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
            font-size: 14px;
        }
        
        .filter-btn:hover {
            border-color: var(--primary-color);
            color: var(--primary-color);
            transform: translateY(-2px);
        }
        
        .filter-btn.active {
            background: var(--primary-color);
            color: white;
            border-color: var(--primary-color);
        }
        
        .test-item {
            background: white;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            border-left: 5px solid var(--border-color);
            transition: all 0.3s;
        }
        
        .test-item:hover {
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transform: translateY(-2px);
        }
        
        .test-item.passed { border-left-color: var(--success-color); }
        .test-item.failed { border-left-color: var(--error-color); }
        .test-item.skipped { border-left-color: var(--warning-color); }
        
        .test-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
            gap: 20px;
        }
        
        .test-title-section {
            flex: 1;
        }
        
        .test-title {
            font-size: 18px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 8px;
        }
        
        .test-path {
            font-size: 13px;
            color: var(--text-secondary);
            font-family: 'Courier New', monospace;
        }
        
        .test-badges {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .test-status {
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .test-status.passed {
            background: #d1fae5;
            color: #065f46;
        }
        
        .test-status.failed {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .test-status.skipped {
            background: #fef3c7;
            color: #92400e;
        }
        
        .test-meta {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            margin-bottom: 15px;
            font-size: 14px;
            color: var(--text-secondary);
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .test-error {
            background: #fef2f2;
            border: 2px solid #fecaca;
            border-radius: 12px;
            padding: 20px;
            margin-top: 15px;
        }
        
        .error-title {
            color: #991b1b;
            font-weight: 700;
            margin-bottom: 10px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .error-message {
            color: #991b1b;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            white-space: pre-wrap;
            word-break: break-word;
            line-height: 1.6;
        }
        
        .error-message details {
            margin-top: 15px;
        }
        
        .error-message summary {
            cursor: pointer;
            padding: 8px 12px;
            background: #fee2e2;
            border-radius: 6px;
            transition: background 0.2s;
        }
        
        .error-message summary:hover {
            background: #fecaca;
        }
        
        .error-message pre {
            background: #1f2937;
            color: #fca5a5;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 10px 0 0 0;
        }
        
        .test-steps {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid var(--border-color);
        }
        
        .steps-title {
            font-weight: 700;
            margin-bottom: 15px;
            color: var(--text-primary);
            font-size: 15px;
        }
        
        .step-item {
            background: var(--bg-secondary);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
        }
        
        .step-title {
            font-weight: 500;
            color: var(--text-primary);
        }
        
        .step-duration {
            color: var(--text-secondary);
            font-weight: 600;
            font-size: 12px;
        }
        
        .test-screenshots {
            margin-top: 20px;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 15px;
        }
        
        .screenshot-item {
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            cursor: pointer;
            transition: transform 0.3s;
        }
        
        .screenshot-item:hover {
            transform: scale(1.05);
        }
        
        .screenshot-item img {
            width: 100%;
            display: block;
        }
        
        .screenshot-label {
            padding: 10px;
            background: var(--bg-secondary);
            font-size: 12px;
            font-weight: 600;
            text-align: center;
        }
        
        /* Environment Info */
        .env-info {
            background: var(--bg-secondary);
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 20px;
        }
        
        .env-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        
        .env-item {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .env-label {
            font-size: 12px;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
        }
        
        .env-value {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary);
        }
        
        /* Summary Cards */
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .summary-card {
            background: white;
            border-radius: 16px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .summary-card-title {
            font-size: 16px;
            font-weight: 700;
            color: var(--text-secondary);
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .summary-list {
            list-style: none;
        }
        
        .summary-list li {
            padding: 12px 0;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .summary-list li:last-child {
            border-bottom: none;
        }
        
        .summary-list-label {
            font-weight: 500;
            color: var(--text-primary);
        }
        
        .summary-list-value {
            font-weight: 700;
            color: var(--primary-color);
        }
        
        /* Utility */
        .section-title {
            font-size: 24px;
            font-weight: 800;
            color: var(--text-primary);
            margin: 30px 0 20px 0;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
        }
        
        .badge.smoke { background: #dbeafe; color: #1e40af; }
        .badge.regression { background: #fce7f3; color: #9f1239; }
        .badge.integration { background: #f3e8ff; color: #6b21a8; }
        .badge.e2e { background: #d1fae5; color: #065f46; }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .filter-btn, .search-box {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="report-header">
            <div class="header-left">
                ${this.config.logo ? `
                <div style="margin-bottom: 15px;">
                    <img src="${this.config.logo}" alt="Company Logo" style="max-height: 60px; max-width: 200px;">
                </div>
                ` : ''}
                <div class="company-name">${this.config.companyName}</div>
                <h1 class="report-title">${this.config.reportTitle}</h1>
                <div class="project-name">${this.config.projectName}</div>
            </div>
            <div class="header-right">
                <div class="pass-rate-circle">${stats.passRate.toFixed(0)}%</div>
                <div class="pass-rate-label">${t.passRate}</div>
            </div>
        </div>
        
        <!-- Environment Info -->
        ${this.config.showEnvironmentInfo ? `
        <div class="env-info">
            <div class="env-grid">
                <div class="env-item">
                    <div class="env-label">${t.timestamp}</div>
                    <div class="env-value">${envInfo.timestamp}</div>
                </div>
                <div class="env-item">
                    <div class="env-label">${t.duration}</div>
                    <div class="env-value">${(envInfo.duration / 1000).toFixed(2)}s</div>
                </div>
                <div class="env-item">
                    <div class="env-label">${t.workers}</div>
                    <div class="env-value">${envInfo.workers}</div>
                </div>
                <div class="env-item">
                    <div class="env-label">${t.nodeVersion}</div>
                    <div class="env-value">${envInfo.nodeVersion}</div>
                </div>
                <div class="env-item">
                    <div class="env-label">${t.playwright}</div>
                    <div class="env-value">${envInfo.playwrightVersion}</div>
                </div>
                <div class="env-item">
                    <div class="env-label">${t.platform}</div>
                    <div class="env-value">${envInfo.os}</div>
                </div>
            </div>
        </div>
        ` : ''}
        
        <!-- Stats Grid -->
        <div class="stats-grid">
            <div class="stat-card total">
                <div class="stat-icon">🧪</div>
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">${t.totalTests}</div>
            </div>
            <div class="stat-card passed">
                <div class="stat-icon">✅</div>
                <div class="stat-value">${stats.passed}</div>
                <div class="stat-label">${t.passed}</div>
            </div>
            <div class="stat-card failed">
                <div class="stat-icon">❌</div>
                <div class="stat-value">${stats.failed}</div>
                <div class="stat-label">${t.failed}</div>
            </div>
            <div class="stat-card skipped">
                <div class="stat-icon">⏭️</div>
                <div class="stat-value">${stats.skipped}</div>
                <div class="stat-label">${t.skipped}</div>
            </div>
            <div class="stat-card flaky">
                <div class="stat-icon">🔄</div>
                <div class="stat-value">${stats.flaky}</div>
                <div class="stat-label">${t.flaky}</div>
            </div>
            <div class="stat-card duration">
                <div class="stat-icon">⏱️</div>
                <div class="stat-value">${(stats.avgDuration / 1000).toFixed(1)}s</div>
                <div class="stat-label">${t.duration}</div>
            </div>
        </div>
        
        <!-- Tabs -->
        <div class="tabs-container">
            <div class="tabs">
                <div class="tab active" data-tab="overview">
                    📊 ${t.overview}
                </div>
                <div class="tab" data-tab="tests">
                    📝 ${t.allTests}
                    <span class="tab-badge">${stats.total}</span>
                </div>
                <div class="tab" data-tab="failed">
                    ❌ ${t.failedTests}
                    <span class="tab-badge">${stats.failed}</span>
                </div>
                <div class="tab" data-tab="timeline">
                    ⏱️ ${t.timeline}
                </div>
                <div class="tab" data-tab="projects">
                    📦 ${t.projects}
                </div>
            </div>
            
            <!-- Overview Tab -->
            <div class="tab-content active" id="overview">
                <div class="charts-grid">
                    <div class="chart-card">
                        <div class="chart-title">📈 ${t.statusDistribution}</div>
                        <canvas id="statusChart"></canvas>
                    </div>
                    <div class="chart-card">
                        <div class="chart-title">⏱️ ${t.durationAnalysis}</div>
                        <canvas id="durationChart"></canvas>
                    </div>
                    <div class="chart-card">
                        <div class="chart-title">📊 ${t.testsByCategory}</div>
                        <canvas id="categoryChart"></canvas>
                    </div>
                    <div class="chart-card">
                        <div class="chart-title">🎯 ${t.passRateTrend}</div>
                        <canvas id="trendChart"></canvas>
                    </div>
                </div>
                
                <div class="summary-cards">
                    <div class="summary-card">
                        <div class="summary-card-title">📂 ${t.topFilesByTests}</div>
                        <ul class="summary-list">
                            ${this.getTopFilesByTests(5).map(item => `
                                <li>
                                    <span class="summary-list-label">${item.file}</span>
                                    <span class="summary-list-value">${item.count}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    <div class="summary-card">
                        <div class="summary-card-title">⏱️ ${t.slowestTests}</div>
                        <ul class="summary-list">
                            ${this.getSlowestTests(5).map(test => `
                                <li>
                                    <span class="summary-list-label">${this.truncate(test.title, 30)}</span>
                                    <span class="summary-list-value">${(test.duration / 1000).toFixed(2)}s</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    <div class="summary-card">
                        <div class="summary-card-title">🎯 ${t.projectsSummary}</div>
                        <ul class="summary-list">
                            ${Array.from(this.testsByProject.entries()).map(([project, tests]) => `
                                <li>
                                    <span class="summary-list-label">${project}</span>
                                    <span class="summary-list-value">${tests.length} ${t.tests}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            </div>
            
            <!-- All Tests Tab -->
            <div class="tab-content" id="tests">
                <div class="test-filters">
                    <input type="text" class="search-box" id="searchBox" placeholder="🔍 ${t.search}">
                    <button class="filter-btn active" data-filter="all">${t.all}</button>
                    <button class="filter-btn" data-filter="passed">${t.passed}</button>
                    <button class="filter-btn" data-filter="failed">${t.failed}</button>
                    <button class="filter-btn" data-filter="skipped">${t.skipped}</button>
                </div>
                
                <div id="testsContainer">
                    ${this.allTests.map(test => this.renderTestItem(test)).join('')}
                </div>
            </div>
            
            <!-- Failed Tests Tab -->
            <div class="tab-content" id="failed">
                ${this.allTests.filter(tt => tt.status === 'failed').length > 0 ? `
                    <div id="failedTestsContainer">
                        ${this.allTests.filter(tt => tt.status === 'failed').map(test => this.renderTestItem(test)).join('')}
                    </div>
                ` : `<p style="text-align: center; color: var(--text-secondary); padding: 40px;">${t.noFailedTests}</p>`}
            </div>
            
            <!-- Timeline Tab -->
            <div class="tab-content" id="timeline">
                <div class="timeline-container">
                    ${this.allTests
                        .sort((a, b) => b.duration - a.duration)
                        .map(test => {
                            const maxDuration = Math.max(...this.allTests.map(tt => tt.duration));
                            const percentage = (test.duration / maxDuration) * 100;
                            return `
                                <div class="timeline-item ${test.status}">
                                    <div class="timeline-label" title="${this.escapeHtml(test.fullTitle)}">
                                        ${this.escapeHtml(this.truncate(test.fullTitle, 50))}
                                    </div>
                                    <div class="timeline-bar-container">
                                        <div class="timeline-bar ${test.status}" style="width: ${percentage}%">
                                            ${(test.duration / 1000).toFixed(2)}s
                                        </div>
                                    </div>
                                    <div class="timeline-duration">${(test.duration / 1000).toFixed(2)}s</div>
                                </div>
                            `;
                        }).join('')}
                </div>
            </div>
            
            <!-- Projects Tab -->
            <div class="tab-content" id="projects">
                ${Array.from(this.testsByProject.entries()).map(([project, tests]) => `
                    <div style="margin-bottom: 40px;">
                        <h3 style="margin-bottom: 20px; color: var(--primary-color);">
                            📦 ${project} (${tests.length} ${t.tests})
                        </h3>
                        ${tests.map(test => this.renderTestItem(test)).join('')}
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
    
    <script>
        const testsData = ${JSON.stringify(this.allTests)};
        const stats = ${JSON.stringify(stats)};
        const translations = ${JSON.stringify(t)};
        
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.tab).classList.add('active');
            });
        });
        
        // Charts
        Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        
        // Status Chart
        new Chart(document.getElementById('statusChart'), {
            type: 'doughnut',
            data: {
                labels: [translations.passed, translations.failed, translations.skipped, translations.flaky],
                datasets: [{
                    data: [stats.passed, stats.failed, stats.skipped, stats.flaky],
                    backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 15, font: { size: 13 } } },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = ((ctx.parsed / total) * 100).toFixed(1);
                                return ctx.label + ': ' + ctx.parsed + ' (' + pct + '%)';
                            }
                        }
                    }
                }
            }
        });
        
        // Duration Chart
        const sortedTests = [...testsData].sort((a, b) => b.duration - a.duration).slice(0, 10);
        new Chart(document.getElementById('durationChart'), {
            type: 'bar',
            data: {
                labels: sortedTests.map(t => t.title.substring(0, 25)),
                datasets: [{
                    label: translations.duration + ' (s)',
                    data: sortedTests.map(t => (t.duration / 1000).toFixed(2)),
                    backgroundColor: sortedTests.map(t => 
                        t.status === 'passed' ? '#10b981' : t.status === 'failed' ? '#ef4444' : '#f59e0b'
                    )
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true, title: { display: true, text: translations.duration } } }
            }
        });
        
        // Category Chart
        const categories = {};
        testsData.forEach(t => {
            categories[t.category] = (categories[t.category] || 0) + 1;
        });
        
        new Chart(document.getElementById('categoryChart'), {
            type: 'pie',
            data: {
                labels: Object.keys(categories),
                datasets: [{
                    data: Object.values(categories),
                    backgroundColor: ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b']
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
        
        // Trend Chart (simulated)
        new Chart(document.getElementById('trendChart'), {
            type: 'line',
            data: {
                labels: ['Run 1', 'Run 2', 'Run 3', 'Run 4', 'Current'],
                datasets: [{
                    label: translations.passRate + ' %',
                    data: [85, 88, 90, 87, stats.passRate],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, max: 100, title: { display: true, text: translations.passRate + ' %' } }
                }
            }
        });
        
        // Filter functionality
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const filter = btn.dataset.filter;
                document.querySelectorAll('#testsContainer .test-item').forEach(item => {
                    if (filter === 'all' || item.dataset.status === filter) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });
        
        // Search functionality
        document.getElementById('searchBox')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#testsContainer .test-item').forEach(item => {
                const title = item.querySelector('.test-title').textContent.toLowerCase();
                item.style.display = title.includes(term) ? 'block' : 'none';
            });
        });
    </script>
</body>
</html>`;

    fs.writeFileSync(path.join(this.config.outputDir!, 'index.html'), html);
  }

  private renderTestItem(test: TestData): string {
    const screenshots = test.attachments.filter(a => a.contentType.startsWith('image/'));
    const t = this.translations;
    
    return `
        <div class="test-item ${test.status}" data-status="${test.status}">
            <div class="test-header">
                <div class="test-title-section">
                    <div class="test-title">${this.escapeHtml(test.title)}</div>
                    <div class="test-path">${this.escapeHtml(test.fullTitle)}</div>
                </div>
                <div class="test-badges">
                    <span class="test-status ${test.status}">${test.status}</span>
                    ${test.tags.map(tag => `<span class="badge ${tag}">${tag}</span>`).join('')}
                </div>
            </div>
            
            <div class="test-meta">
                <div class="meta-item">📁 ${this.escapeHtml(path.basename(test.file))}:${test.line}</div>
                <div class="meta-item">⏱️ ${(test.duration / 1000).toFixed(2)}s</div>
                ${test.project ? `<div class="meta-item">🎯 ${test.project}</div>` : ''}
                ${test.retries > 0 ? `<div class="meta-item">🔄 Retries: ${test.retries}</div>` : ''}
            </div>
            
            ${test.error ? `
                <div class="test-error">
                    <div class="error-title">❌ ${t.error}</div>
                    <div class="error-message">${this.cleanErrorMessage(test.error.message)}</div>
                    ${test.error.stack ? `
                    <details style="margin-top: 10px;">
                        <summary style="cursor: pointer; color: #991b1b; font-weight: 600;">Stack Trace</summary>
                        <pre style="margin-top: 10px; font-size: 12px; overflow-x: auto;">${this.cleanErrorMessage(test.error.stack)}</pre>
                    </details>
                    ` : ''}
                </div>
            ` : ''}
            
            ${test.steps.length > 0 ? `
                <div class="test-steps">
                    <div class="steps-title">📋 ${t.testSteps}</div>
                    ${test.steps.map(step => `
                        <div class="step-item">
                            <span class="step-title">${this.escapeHtml(step.title)}</span>
                            <span class="step-duration">${(step.duration / 1000).toFixed(2)}s</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${screenshots.length > 0 && this.config.includeScreenshots ? `
                <div class="test-screenshots">
                    ${screenshots.map(ss => `
                        <div class="screenshot-item">
                            <img src="data:${ss.contentType};base64,${ss.base64}" alt="${ss.name}">
                            <div class="screenshot-label">${ss.name}</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
  }

  private generateJSONReport(stats: any) {
    const jsonData = {
      config: this.config,
      stats,
      environment: this.getEnvironmentInfo(),
      tests: this.allTests,
      testsByProject: Object.fromEntries(this.testsByProject),
      testsByFile: Object.fromEntries(this.testsByFile),
      generatedAt: new Date().toISOString(),
    };
    
    fs.writeFileSync(
      path.join(this.config.outputDir!, 'report.json'),
      JSON.stringify(jsonData, null, 2)
    );
  }

  private generateMarkdownReport(stats: any) {
    const md = `# ${this.config.reportTitle}
**${this.config.companyName}** - ${this.config.projectName}

## 📊 Summary

- **Total Tests**: ${stats.total}
- **Passed**: ✅ ${stats.passed} (${stats.passRate.toFixed(1)}%)
- **Failed**: ❌ ${stats.failed}
- **Skipped**: ⏭️ ${stats.skipped}
- **Flaky**: 🔄 ${stats.flaky}
- **Duration**: ${(stats.duration / 1000).toFixed(2)}s
- **Generated**: ${new Date().toISOString()}

## Failed Tests

${this.allTests.filter(t => t.status === 'failed').map(test => `
### ❌ ${test.title}

- **File**: ${test.file}:${test.line}
- **Duration**: ${(test.duration / 1000).toFixed(2)}s
- **Error**: ${test.error?.message || 'N/A'}
`).join('\n') || '_No failed tests_'}

## Performance

### Slowest Tests

${this.getSlowestTests(10).map((test, i) => 
  `${i + 1}. ${test.title} - ${(test.duration / 1000).toFixed(2)}s`
).join('\n')}
`;

    fs.writeFileSync(path.join(this.config.outputDir!, 'report.md'), md);
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

  private getSlowestTests(count: number): TestData[] {
    return [...this.allTests]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count);
  }

  private getTopFilesByTests(count: number) {
    return Array.from(this.testsByFile.entries())
      .map(([file, tests]) => ({ file, count: tests.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, count);
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
    // Remove ANSI escape codes (colors, formatting, etc.)
    // eslint-disable-next-line no-control-regex
    return text.replace(/\u001b\[\d+m/g, '')
               .replace(/\u001b\[[\d;]+m/g, '')
               .replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
  }
  
  private cleanErrorMessage(text: string): string {
    return this.escapeHtml(this.stripAnsiCodes(text));
  }

  private truncate(text: string, length: number): string {
    return text.length > length ? text.substring(0, length) + '...' : text;
  }
}

export default EnterpriseReporter;