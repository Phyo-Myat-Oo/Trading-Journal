export type TradeStatus = 'WIN' | 'LOSS' | 'BE';
export type TradeSide = 'LONG' | 'SHORT';

export interface Trade {
  id: string;
  date: string;
  symbol: string;
  status: TradeStatus;
  side: TradeSide;
  qty: number;
  entry: number;
  exit: number;
  entryTotal: number;
  exitTotal: number;
  position: string;
  hold: string;
  return: number;
  returnPercent: number;
}
