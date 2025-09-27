import { SchedulerService } from './src/services/schedulerService';

const scheduler = new SchedulerService();

if (require.main === module) {
  scheduler.start();
}

export { scheduler };