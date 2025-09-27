import { EconomicService } from '../economicService';

export async function fetchEconomicCalendar(): Promise<void> {
  console.log('📅 Fetching economic calendar...');
  
  const economicService = new EconomicService();
  
  try {
    const events = await economicService.fetchTodaysEvents();
    const highImpactCount = events.filter(e => e.importance === 3).length;
    
    console.log(`✅ Fetched ${events.length} economic events (${highImpactCount} high impact)`);
    
    if (highImpactCount > 0) {
      console.log('🚨 High impact events today - monitor for increased volatility');
    }
  } catch (error) {
    console.error('❌ Error fetching economic calendar:', error);
  }
}

if (require.main === module) {
  fetchEconomicCalendar();
}