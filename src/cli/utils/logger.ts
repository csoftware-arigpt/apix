import chalk from 'chalk';
import ora, { type Ora } from 'ora';

class Logger {
  private spinner: Ora | null = null;

  info(message: string): void {
    this.stopSpinner();
    process.stderr.write(`${chalk.blue('i')} ${message}\n`);
  }

  success(message: string): void {
    this.stopSpinner();
    process.stderr.write(`${chalk.green('\u2713')} ${message}\n`);
  }

  warn(message: string): void {
    this.stopSpinner();
    process.stderr.write(`${chalk.yellow('\u26A0')} ${message}\n`);
  }

  error(message: string, suggestion?: string): void {
    this.stopSpinner();
    process.stderr.write(`${chalk.red('\u2717')} ${message}\n`);
    if (suggestion) {
      process.stderr.write(`  ${chalk.dim(suggestion)}\n`);
    }
  }

  spin(message: string): Ora {
    this.stopSpinner();
    this.spinner = ora({ text: message, stream: process.stderr }).start();
    return this.spinner;
  }

  stopSpinner(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  done(startTime: number): void {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    this.success(`Done in ${elapsed}s`);
  }

  newline(): void {
    process.stderr.write('\n');
  }

  table(rows: Array<[string, string]>): void {
    const maxKey = Math.max(...rows.map(([k]) => k.length));
    for (const [key, value] of rows) {
      process.stderr.write(`  ${chalk.dim(key.padEnd(maxKey))}  ${value}\n`);
    }
  }
}

export const logger = new Logger();
