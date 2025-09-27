import { createApp } from './app';
import { MorningScheduler } from './services/scheduler/morningScheduler';

const app = createApp();
const PORT = process.env.PORT || 3000;

// Start morning scheduler
MorningScheduler.start();

app.listen(PORT, () => {
  console.log(`🌐 Server running on http://localhost:${PORT}`);
});

export default app;