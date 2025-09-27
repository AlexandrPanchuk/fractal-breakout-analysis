import { PIP_MULTIPLIERS } from '../config/constants';

export class PipCalculator {
  static calculate(pair: string, price1: number, price2: number): number {
    const multiplier = PIP_MULTIPLIERS[pair as keyof typeof PIP_MULTIPLIERS] || PIP_MULTIPLIERS.DEFAULT;
    return Math.round((price1 - price2) * multiplier);
  }
}