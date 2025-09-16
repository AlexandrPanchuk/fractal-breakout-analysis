import { spawn } from 'child_process';
import * as cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let webServerProcess: any = null;

function startWebServer() {
  console.log('🌐 Starting web server...');
  webServerProcess = spawn('npm', ['run', 'web'], {
    stdio: 'inherit',
    shell: true
  });
  
  webServerProcess.on('error', (error: any) => {
    console.error('Web server error:', error);
  });
}

async function runMultiTimeframeFractals() {
  console.log('\n📊 Running multi-timeframe fractals update...');
  try {
    await execAsync('npx ts-node multi-timeframe-fractals.ts');
  } catch (error) {
    console.error('Multi-timeframe fractals error:', error);
  }
}

async function runDailyMovements() {
  console.log('\n📈 Running daily movements update...');
  try {
    await execAsync('npx ts-node daily-movements.ts');
  } catch (error) {
    console.error('Daily movements error:', error);
  }
}

async function startScheduler() {
  console.log('🚀 Starting Fractal Analysis Scheduler\n');
  
  // Start web server
  startWebServer();
  
  // Initial data updates
  await runMultiTimeframeFractals();
  await runDailyMovements();
  
  // Schedule multi-timeframe fractals: daily at 00:01 and every 4 hours
  cron.schedule('1 0 * * *', runMultiTimeframeFractals); // Daily at 00:01
  cron.schedule('0 */4 * * *', runMultiTimeframeFractals); // Every 4 hours
  
  // Schedule daily movements: every 5 minutes
  cron.schedule('*/5 * * * *', runDailyMovements);
  
  console.log('\n⏰ Scheduler started with the following schedule:');
  console.log('   • Multi-timeframe fractals: Daily at 00:01 + every 4 hours');
  console.log('   • Daily movements: Every 5 minutes');
  console.log('   • Web server: Running continuously on http://localhost:3000\n');
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down scheduler...');
    if (webServerProcess) {
      webServerProcess.kill();
    }
    process.exit(0);
  });
}

if (require.main === module) {
  startScheduler();
}

export { startScheduler };