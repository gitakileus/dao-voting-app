import { GROTHS_IN_BEAM } from '@app/shared/constants';

export const copyToClipboard = (value: string) => navigator.clipboard.writeText(value);

export function compact(value: string, stringLength: number = 5): string {
  if (value.length <= 11) {
    return value;
  }
  return `${value.substr(0, stringLength)}…${value.substr(-stringLength, stringLength)}`;
}

const LENGTH_MAX = 8;

export function truncate(value: string): string {
  if (!value) {
    return '';
  }

  if (value.length <= LENGTH_MAX) {
    return value;
  }

  return `${value.slice(0, LENGTH_MAX)}…`;
}

export function toUSD(amount: number, rate: number): string {
  switch (true) {
    case amount === 0 || Number.isNaN(amount):
      return '0 USD';
    case amount > 0.01: {
      const value = amount * rate;
      return `${value.toFixed(2)} USD`;
    }
    default:
      return '< 1 cent';
  }
}

export function fromGroths(value: number): number {
  return value && value !== 0 ? value / GROTHS_IN_BEAM : 0;
}

export function toGroths(value: number): number {
  return value > 0 ? Math.floor(value * GROTHS_IN_BEAM) : 0;
}