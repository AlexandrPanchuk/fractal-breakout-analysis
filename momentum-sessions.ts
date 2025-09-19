interface MomentumSession {
  name: string;
  timezone: string;
  time: string;
  utcHour: number;
  utcMinute: number;
  isActive: boolean;
  nextSession: Date;
}

function getMomentumSessions(): MomentumSession[] {
  const now = new Date();
  
  // Get current date in YYYY-MM-DD format
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  
  // London 12:30 BST = 11:30 UTC (summer) or 12:30 GMT = 12:30 UTC (winter)
  // Currently BST (British Summer Time) until late October
  const londonUTC = new Date(`${year}-${month}-${day}T11:30:00Z`);
  
  // New York 15:30 EDT = 19:30 UTC (summer) or 15:30 EST = 20:30 UTC (winter)  
  // Currently EDT (Eastern Daylight Time) until early November
  const nyUTC = new Date(`${year}-${month}-${day}T19:30:00Z`);
  
  // Calculate next sessions
  const londonNext = londonUTC > now ? londonUTC : new Date(londonUTC.getTime() + 24 * 60 * 60 * 1000);
  const nyNext = nyUTC > now ? nyUTC : new Date(nyUTC.getTime() + 24 * 60 * 60 * 1000);
  
  // Check if sessions are active (within 2 minutes)
  const londonActive = Math.abs(now.getTime() - londonUTC.getTime()) <= 2 * 60 * 1000;
  const nyActive = Math.abs(now.getTime() - nyUTC.getTime()) <= 2 * 60 * 1000;
  
  return [
    {
      name: "New York Momentum",
      timezone: "America/New_York",
      time: "15:30", 
      utcHour: nyUTC.getUTCHours(),
      utcMinute: nyUTC.getUTCMinutes(),
      isActive: nyActive,
      nextSession: nyNext
    },
    {
      name: "London Momentum",
      timezone: "Europe/London", 
      time: "12:30",
      utcHour: londonUTC.getUTCHours(),
      utcMinute: londonUTC.getUTCMinutes(),
      isActive: londonActive,
      nextSession: londonNext
    }
  ];
}



function getCurrentMomentumStatus(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  
  // London 12:30 BST = 11:30 UTC
  const londonTime = new Date(`${year}-${month}-${day}T11:30:00Z`);
  const londonDiff = Math.abs(now.getTime() - londonTime.getTime()) / (1000 * 60);
  
  // New York 15:30 EDT = 19:30 UTC
  const nyTime = new Date(`${year}-${month}-${day}T19:30:00Z`);
  const nyDiff = Math.abs(now.getTime() - nyTime.getTime()) / (1000 * 60);
  
  if (londonDiff <= 2) {
    return '🔥 London, high volatility, watch entries carefully and check the levels from which the entry is made.';
  }
  
  if (nyDiff <= 2) {
    return '🔥 New York, high volatility, watch entries carefully and check the levels from which the entry is made.';
  }
  
  return 'Waiting 12:30 London or 15:30 New York...';
}

export { getMomentumSessions, getCurrentMomentumStatus };