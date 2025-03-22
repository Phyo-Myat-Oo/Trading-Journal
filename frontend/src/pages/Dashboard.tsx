import { useState, useMemo } from 'react';
import { TradeFilters, SortConfig, SortField } from '../types/filters';
import { Trade } from '../types/trade';
import { PerformanceChart } from '../components/charts/PerformanceChart';
import { AccountDialog } from '../components/dialogs/AccountDialog';
import { Transaction } from '../types/account';
import { DashboardFilter } from '../components/filters/DashboardFilter';
import { filterTrades } from '../utils/filter-trades';
import { sortTrades } from '../utils/sort-trades';
import { SortableTableHeader } from '../components/ui/SortableTableHeader';
import { Container, Title, Text, Group, Button, Paper, Grid } from '@mantine/core';
import RoleGated from '../components/common/auth/RoleGated';

export const Dashboard = () => {
  // Default filter state
  const [filters, setFilters] = useState<TradeFilters>({
    timeFilter: 'This yr.',
    dateRange: { startDate: null, endDate: null },
    symbols: [],
    statuses: [],
    sides: []
  });
  
  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({
    field: 'date',
    direction: 'desc'
  });
  
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [allTrades] = useState<Trade[]>([
    {
      id: '1',
      date: '11/03/2022',
      symbol: 'PLTR',
      status: 'WIN',
      side: 'LONG',
      qty: 50,
      entry: 10.80,
      exit: 11.80,
      entryTotal: 540.00,
      exitTotal: 590.00,
      position: '-',
      hold: '1h',
      return: 50.00,
      returnPercent: 9.26,
    },
    {
      id: '2',
      date: '10/03/2022',
      symbol: 'BROS',
      status: 'WIN',
      side: 'LONG',
      qty: 50,
      entry: 44.16,
      exit: 49.00,
      entryTotal: 2208.00,
      exitTotal: 2450.00,
      position: '-',
      hold: '2h',
      return: 242.00,
      returnPercent: 10.96,
    },
    {
      id: '3',
      date: '09/11/2021',
      symbol: 'PLTR',
      status: 'LOSS',
      side: 'LONG',
      qty: 200,
      entry: 26.89,
      exit: 25.90,
      entryTotal: 5378.00,
      exitTotal: 5180.00,
      position: '-',
      hold: '30m',
      return: -198.00,
      returnPercent: -3.68,
    },
  ]);

  // Apply filters to trades
  const filteredTrades = useMemo(() => {
    return filterTrades(allTrades, filters);
  }, [allTrades, filters]);
  
  // Apply sorting to filtered trades
  const sortedTrades = useMemo(() => {
    return sortTrades(filteredTrades, sortConfig);
  }, [filteredTrades, sortConfig]);

  // Extract unique symbols for the filter
  const availableSymbols = useMemo(() => {
    return [...new Set(allTrades.map(trade => trade.symbol))];
  }, [allTrades]);

  // Calculate statistics based on filtered trades
  const wins = useMemo(() => filteredTrades.filter(t => t.status === 'WIN'), [filteredTrades]);
  const losses = useMemo(() => filteredTrades.filter(t => t.status === 'LOSS'), [filteredTrades]);
  const totalTrades = filteredTrades.length;
  const winRate = useMemo(() => 
    totalTrades > 0 ? (wins.length / totalTrades * 100).toFixed(0) : '0'
  , [wins.length, totalTrades]);
  
  const avgWin = useMemo(() => 
    wins.length > 0 
      ? wins.reduce((acc, t) => acc + t.return, 0) / wins.length 
      : 0
  , [wins]);
  
  const avgLoss = useMemo(() => 
    losses.length > 0
      ? Math.abs(losses.reduce((acc, t) => acc + t.return, 0) / losses.length)
      : 0
  , [losses]);
  
  // Handle sorting when a table header is clicked
  const handleSort = (field: SortField) => {
    setSortConfig((prevConfig: SortConfig | null) => {
      if (prevConfig?.field === field) {
        return {
          field,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return {
        field,
        direction: 'asc'
      };
    });
  };

  const handleAccountSave = (data: { 
    name: string; 
    cashBalance: number; 
    activeBalance: number; 
    isPrimary: boolean;
    transactions: Transaction[];
  }) => {
    // Handle saving account data
    console.log('Saving account:', data);
    setIsAccountDialogOpen(false);
  };

  return (
    <Container className="dashboard-container" fluid>
      <Title order={1} className="page-title">Dashboard</Title>
      
      {/* Admin-only stats panel */}
      <RoleGated allowedRoles={['admin']}>
        <Paper shadow="sm" p="md" mb="md" withBorder>
          <Title order={3} className="text-red-500">Admin Dashboard</Title>
          <Text>This content is only visible to administrators.</Text>
          <Group>
            <Button variant="outline" color="red" component="a" href="/admin">
              Go to Admin Panel
            </Button>
          </Group>
        </Paper>
      </RoleGated>
      
      {/* Regular dashboard content visible to all authenticated users */}
      <Grid>
        {/* Filter Section */}
        <Grid.Col span={12}>
          <DashboardFilter 
            filters={filters}
            onFilterChange={setFilters}
            availableSymbols={availableSymbols}
          />
        </Grid.Col>

        {/* Chart and Stats Section */}
        <Grid.Col className="md:col-span-6" span={12}>
          <div className="w-full h-full min-h-[160px] sm:min-h-[180px]">
            <PerformanceChart trades={filteredTrades} />
          </div>
        </Grid.Col>

        <Grid.Col className="md:col-span-6" span={12}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 sm:gap-4 auto-rows-min">
          <div className="bg-[#1E2024] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">WINS</span>
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-xs">{wins.length}</span>
                <div className="w-8 h-8 rounded-full bg-[#282C34] flex items-center justify-center">
                  <span className="text-green-400 text-xs">{winRate}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1E2024] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">LOSSES</span>
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xs">{losses.length}</span>
                <div className="w-8 h-8 rounded-full bg-[#282C34] flex items-center justify-center">
                  <span className="text-red-400 text-xs">{totalTrades > 0 ? (100 - Number(winRate)) : 0}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1E2024] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">OPEN</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">0</span>
                <div className="w-8 h-8 rounded-full bg-[#282C34] flex items-center justify-center">
                  <span className="text-gray-400 text-xs">0%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1E2024] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">WASH</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">0</span>
                <div className="w-8 h-8 rounded-full bg-[#282C34] flex items-center justify-center">
                  <span className="text-gray-400 text-xs">0%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1E2024] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">AVG W</span>
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-xs">${avgWin.toFixed(2)}</span>
                <div className="w-8 h-8 rounded-full bg-[#282C34] flex items-center justify-center">
                  <span className="text-green-400 text-xs">10%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1E2024] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">AVG L</span>
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xs">${avgLoss.toFixed(2)}</span>
                <div className="w-8 h-8 rounded-full bg-[#282C34] flex items-center justify-center">
                  <span className="text-red-400 text-xs">-4%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1E2024] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">MAX LOSS</span>
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xs">
                  ${filteredTrades.length > 0 ? Math.min(...filteredTrades.map(t => t.return)).toFixed(2) : '0.00'}
                </span>
                <div className="w-8 h-8 rounded-full bg-[#282C34] flex items-center justify-center">
                  <span className="text-red-400 text-xs">
                    {filteredTrades.length > 0 ? Math.min(...filteredTrades.map(t => t.returnPercent)).toFixed(1) : '0.0'}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1E2024] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">PnL</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${filteredTrades.reduce((acc, t) => acc + t.return, 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${filteredTrades.reduce((acc, t) => acc + t.return, 0).toFixed(2)}
                </span>
                <div className="w-8 h-8 rounded-full bg-[#282C34] flex items-center justify-center">
                  <span className={`text-xs ${filteredTrades.reduce((acc, t) => acc + t.returnPercent, 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {filteredTrades.reduce((acc, t) => acc + t.returnPercent, 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        </Grid.Col>

      {/* Trades Table */}
        <Grid.Col span={12}>
      <div className="bg-[#1E2024] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead>
              <tr className="text-left text-[10px] sm:text-xs text-gray-400 border-b border-[#282C34]">
                <SortableTableHeader
                  label="DATE"
                  field="date"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="SYMBOL"
                  field="symbol"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="STATUS"
                  field="status"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="SIDE"
                  field="side"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="QTY"
                  field="qty"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="ENTRY"
                  field="entry"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="EXIT"
                  field="exit"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="ENT TOT"
                  field="entryTotal"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="EXT TOT"
                  field="exitTotal"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <th className="p-3 sm:p-4 font-medium">POS</th>
                <SortableTableHeader
                  label="HOLD"
                  field="hold"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="RETURN"
                  field="return"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="RETURN %"
                  field="returnPercent"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              </tr>
            </thead>
            <tbody>
              {sortedTrades.map((trade) => (
                <tr 
                  key={trade.id}
                  className="text-[11px] sm:text-sm border-b border-[#282C34] hover:bg-[#282C34] transition-colors duration-150"
                >
                  <td className="p-3 sm:p-4 text-gray-300">{trade.date}</td>
                  <td className="p-3 sm:p-4 text-blue-400">{trade.symbol}</td>
                  <td className="p-3 sm:p-4">
                    <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium ${
                      trade.status === 'WIN' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {trade.status}
                    </span>
                  </td>
                  <td className="p-3 sm:p-4 text-gray-300">{trade.side}</td>
                  <td className="p-3 sm:p-4 text-gray-300">{trade.qty}</td>
                  <td className="p-3 sm:p-4 text-gray-300">${trade.entry.toFixed(2)}</td>
                  <td className="p-3 sm:p-4 text-gray-300">${trade.exit.toFixed(2)}</td>
                  <td className="p-3 sm:p-4 text-gray-300">${trade.entryTotal.toFixed(2)}</td>
                  <td className="p-3 sm:p-4 text-gray-300">${trade.exitTotal.toFixed(2)}</td>
                  <td className="p-3 sm:p-4 text-gray-300">{trade.position}</td>
                  <td className="p-3 sm:p-4 text-gray-300">{trade.hold}</td>
                  <td className={`p-3 sm:p-4 font-medium ${trade.return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${Math.abs(trade.return).toFixed(2)}
                  </td>
                  <td className={`p-3 sm:p-4 font-medium ${trade.returnPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trade.returnPercent >= 0 ? '+' : '-'}{Math.abs(trade.returnPercent).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </Grid.Col>
      </Grid>

      <AccountDialog
        isOpen={isAccountDialogOpen}
        onClose={() => setIsAccountDialogOpen(false)}
        onSave={handleAccountSave}
        onDelete={() => console.log('Delete account')}
        canDelete={false}
        currentBalance={10000}
      />
    </Container>
  );
};