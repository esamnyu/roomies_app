#!/usr/bin/env node

import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

interface TestSuite {
  name: string;
  file: string;
  pattern?: string;
}

const testSuites: TestSuite[] = [
  {
    name: 'Comprehensive Money Feature Tests',
    file: 'src/tests/money-feature-comprehensive.test.ts'
  },
  {
    name: 'Expense API Tests',
    file: 'src/lib/api/expenses.test.ts'
  },
  {
    name: 'Expense V2 Tests',
    file: 'src/lib/api/expenses-v2.test.ts'
  },
  {
    name: 'Expense V2 Advanced Scenarios',
    file: 'src/lib/api/expenses-v2-advanced-scenarios.test.ts'
  },
  {
    name: 'Settlement Tests',
    file: 'src/lib/api/settlements.test.ts'
  },
  {
    name: 'Settled Expense Editing Tests',
    file: 'src/lib/api/settled-expense-editing.test.ts'
  },
  {
    name: 'Integration Bill Splitting Tests',
    file: 'src/lib/api/integration-bill-splitting.test.ts'
  },
  {
    name: 'Extreme Bill Splitting Tests',
    file: 'src/lib/api/extreme-bill-splitting-tests.test.ts'
  },
  {
    name: 'Real World Scenarios Tests',
    file: 'src/lib/api/real-world-scenarios.test.ts'
  },
  {
    name: 'Performance and Security Tests',
    file: 'src/lib/api/performance-and-security-tests.test.ts'
  },
  {
    name: 'useExpenseSplits Hook Tests',
    file: 'src/hooks/__tests__/useExpenseSplits.test.ts'
  }
];

class MoneyFeatureTestRunner {
  private results: TestResult[] = [];
  private startTime: number = Date.now();

  async run() {
    console.log(chalk.bold.cyan('\n🏦 Money Feature Test Runner\n'));
    console.log(chalk.gray('Running comprehensive test suite for all money/expense features...\n'));

    for (const suite of testSuites) {
      await this.runTestSuite(suite);
    }

    this.printSummary();
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    const spinner = ora({
      text: `Running ${suite.name}...`,
      color: 'cyan'
    }).start();

    const testStart = Date.now();

    try {
      // Check if test file exists
      if (!fs.existsSync(suite.file)) {
        spinner.warn(chalk.yellow(`${suite.name} - File not found: ${suite.file}`));
        this.results.push({
          name: suite.name,
          passed: false,
          duration: 0,
          error: 'File not found'
        });
        return;
      }

      // Run the test
      const output = execSync(
        `npm test -- ${suite.file} --passWithNoTests`,
        {
          encoding: 'utf-8',
          stdio: 'pipe',
          env: { ...process.env, CI: 'true' }
        }
      );

      const duration = Date.now() - testStart;

      // Check if tests passed
      if (output.includes('PASS') || output.includes('No tests found')) {
        spinner.succeed(chalk.green(`${suite.name} - Passed (${duration}ms)`));
        this.results.push({
          name: suite.name,
          passed: true,
          duration
        });
      } else {
        spinner.fail(chalk.red(`${suite.name} - Failed`));
        this.results.push({
          name: suite.name,
          passed: false,
          duration,
          error: this.extractError(output)
        });
      }

    } catch (error: any) {
      const duration = Date.now() - testStart;
      spinner.fail(chalk.red(`${suite.name} - Failed`));
      
      let errorMessage = 'Unknown error';
      if (error.stdout) {
        errorMessage = this.extractError(error.stdout) || this.extractError(error.stderr);
      } else if (error.message) {
        errorMessage = error.message;
      }

      this.results.push({
        name: suite.name,
        passed: false,
        duration,
        error: errorMessage
      });
    }
  }

  private extractError(output: string): string {
    // Extract meaningful error messages from Jest output
    const lines = output.split('\n');
    const errorLines: string[] = [];
    let capturing = false;

    for (const line of lines) {
      if (line.includes('● ') || line.includes('✕ ')) {
        capturing = true;
      }
      if (capturing && line.trim()) {
        errorLines.push(line);
        if (errorLines.length > 10) break; // Limit error output
      }
    }

    return errorLines.join('\n').trim() || 'Test failed';
  }

  private printSummary() {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    console.log(chalk.bold.cyan('\n📊 Test Summary\n'));
    console.log(chalk.gray('─'.repeat(60)));

    // Print detailed results
    this.results.forEach(result => {
      const status = result.passed ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');
      console.log(`${status} ${result.name} (${result.duration}ms)`);
      
      if (result.error) {
        console.log(chalk.red(`  Error: ${result.error.split('\n')[0]}`));
      }
    });

    console.log(chalk.gray('─'.repeat(60)));

    // Print summary stats
    console.log(chalk.bold('\nOverall Results:'));
    console.log(chalk.green(`  ✓ Passed: ${passed}`));
    console.log(chalk.red(`  ✗ Failed: ${failed}`));
    console.log(chalk.gray(`  ⏱  Total Duration: ${totalDuration}ms`));

    // Print failed tests details if any
    if (failed > 0) {
      console.log(chalk.bold.red('\n❌ Failed Tests:\n'));
      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(chalk.red(`\n${result.name}:`));
          if (result.error) {
            console.log(chalk.gray(result.error));
          }
        });

      console.log(chalk.bold.yellow('\n⚠️  Action Required:'));
      console.log(chalk.yellow('Please fix the failing tests before proceeding.'));
    } else {
      console.log(chalk.bold.green('\n✅ All tests passed!'));
    }

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run the test runner
const runner = new MoneyFeatureTestRunner();
runner.run().catch(error => {
  console.error(chalk.red('Fatal error running tests:'), error);
  process.exit(1);
});