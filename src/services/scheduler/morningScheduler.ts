import * as cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class MorningScheduler {
  static start() {
    // Run at 10:00 AM every day
    cron.schedule('0 10 * * *', async () => {
      console.log('🌅 Running morning tasks at 10:00 AM...');
      
      const tasks = [
        'npm run fetch:economic',
        'npm run fetch:releases:fred',
        'npm run fetch:rates',
        'npm run fetch:news',
        'npm run capture:reactions',
        'npm run morning:brief:all'
      ];

      for (const task of tasks) {
        try {
          console.log(`Running: ${task}`);
          await execAsync(task);
          console.log(`✅ Completed: ${task}`);
        } catch (error) {
          console.error(`❌ Failed: ${task}`, error);
        }
      }
      
      console.log('🎉 Morning tasks completed');
    });

    console.log('📅 Morning scheduler started - tasks will run at 10:00 AM daily');
  }
}