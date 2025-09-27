import fs from 'fs';
import path from 'path';

export class FileManager {
  private static dataDir = path.join(process.cwd());

  static readJSON<T>(filename: string): T[] {
    try {
      const filePath = path.join(this.dataDir, filename);
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.log(`File ${filename} not found, returning empty array`);
      return [];
    }
  }

  static writeJSON<T>(filename: string, data: T[]): void {
    const filePath = path.join(this.dataDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  static appendJSON<T>(filename: string, newData: T): void {
    const existingData = this.readJSON<T>(filename);
    existingData.push(newData);
    this.writeJSON(filename, existingData);
  }
}