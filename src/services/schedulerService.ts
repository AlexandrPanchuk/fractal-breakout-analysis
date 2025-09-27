import { spawn } from 'child_process';
import * as cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { BreakoutMonitor } from './monitoring/breakoutMonitor';
import { EconomicService } from './economic/economicService';

const execAsync = promisify(exec);

export class SchedulerService {
  private webServerProcess: any = null;
  private economicService = new EconomicService();

  startWebServer(): void {
    console.log('🌐 Starting web server...');
    this.webServerProcess = spawn('npx', ['ts-node', 'src/server.ts'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, PORT: process.env.PORT || '3000' }
    });
    
    this.webServerProcess.on('error', (error: any) => {
      console.error('Web server error:', error);
    });
  }

  async runMultiTimeframeFractals(): Promise<void> {
    console.log('\n📊 Running multi-timeframe fractals update...');
    try {
      await execAsync('npx ts-node multi-timeframe-fractals.ts');
    } catch (error) {
      console.error('Multi-timeframe fractals error:', error);
    }
  }

  async runDailyMovements(): Promise<void> {
    console.log('\n📈 Running daily movements update...');
    try {
      await execAsync('npx ts-node daily-movements.ts');
    } catch (error) {
      console.error('Daily movements error:', error);
    }
  }

  async checkBreakouts(): Promise<void> {
    try {
      const isHighImpact = this.economicService.isHighImpactTime();
      if (isHighImpact) {
        console.log('⚠️ High impact economic event detected');
      }
      
      await BreakoutMonitor.checkBreakouts();
    } catch (error) {
      console.error('Breakout monitoring error:', error);
    }
  }
  
  async fetchEconomicData(): Promise<void> {
    try {
      await this.economicService.fetchTodaysEvents();
    } catch (error) {
      console.error('Economic data fetch error:', error);
    }
  }

  async monitorAsianSession(): Promise<void> {
    try {
      const { monitorAsianSession } = require('../../asian-session-monitor');
      await monitorAsianSession();
    } catch (error) {
      console.error('Asian session monitoring error:', error);
    }
  }

  async start(): Promise<void> {
    console.log('🚀 Starting Fractal Analysis Scheduler\n');
    
    this.startWebServer();
    
    await this.runMultiTimeframeFractals();
    await this.runDailyMovements();
    
    // Schedule tasks
    cron.schedule('1 0 * * *', () => this.runMultiTimeframeFractals());
    cron.schedule('0 */4 * * *', () => this.runMultiTimeframeFractals());
    cron.schedule('*/5 * * * *', () => this.runDailyMovements());
    cron.schedule('*/30 * * * * *', () => this.checkBreakouts());
    cron.schedule('*/5 * * * *', () => this.monitorAsianSession());
    cron.schedule('0 8 * * *', () => this.fetchEconomicData());
    
    const webUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
      : `http://localhost:${process.env.PORT || 3000}`;
      
    console.log('\n⏰ Scheduler started with the following schedule:');
    console.log('   • Multi-timeframe fractals: Daily at 00:01 + every 4 hours');
    console.log('   • Daily movements: Every 5 minutes');
    console.log('   • Breakout monitoring: Every 30 seconds');
    console.log('   • Asian session alerts: Every 5 minutes (03:00-08:00 Kyiv)');
    console.log(`   • Web server: Running continuously on ${webUrl}\n`);
    
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down scheduler...');
      if (this.webServerProcess) {
        this.webServerProcess.kill();
      }
      process.exit(0);
    });
  }
}