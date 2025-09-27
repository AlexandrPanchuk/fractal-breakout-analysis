import { MultiFractal, DailyMovement } from '../../types';
import { FileManager } from '../../utils/fileManager';
import { DATA_FILES } from '../../config/constants';

export class FractalService {
  static getMultiFractals(): MultiFractal[] {
    return FileManager.readJSON<MultiFractal>('multi-fractals.json');
  }

  static getCurrentFractals(): any[] {
    return FileManager.readJSON('fractals.json');
  }

  static getDailyMovements(): DailyMovement[] {
    return FileManager.readJSON<DailyMovement>('daily-movements.json');
  }

  static getForexCalendar(): any[] {
    return FileManager.readJSON('forex-calendar.json');
  }
}