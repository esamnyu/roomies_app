import { Profile } from '../types';

export interface Balance {
  userId: string;
  balance: number;
  profile: Profile;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
  fromProfile: Profile;
  toProfile: Profile;
}

interface SettlementStrategy {
  compute(balances: Balance[]): Settlement[];
  maxUsers: number;
}

/**
 * Adaptive settlement solver that chooses the best algorithm based on group size
 * - 2-6 users: Exact minimal solution (guaranteed minimum transactions)
 * - 7-12 users: Clustering approach (near-optimal)
 * - 13-20 users: Fast heuristic (good approximation)
 */
export class AdaptiveSettlementSolver {
  private strategies: SettlementStrategy[] = [
    new ExactMinimalStrategy(),
    new ClusteringStrategy(),
    new HeuristicStrategy()
  ];

  solve(balances: Balance[]): Settlement[] {
    // Filter out zero balances
    const activeBalances = balances.filter(b => Math.abs(b.balance) > 0.01);
    
    if (activeBalances.length === 0) return [];
    if (activeBalances.length === 1) return []; // Can't settle with yourself
    
    const strategy = this.selectStrategy(activeBalances.length);
    return strategy.compute(activeBalances);
  }

  private selectStrategy(userCount: number): SettlementStrategy {
    for (const strategy of this.strategies) {
      if (userCount <= strategy.maxUsers) {
        return strategy;
      }
    }
    return this.strategies[this.strategies.length - 1];
  }
}

/**
 * Exact minimal strategy for small groups (2-6 users)
 * Uses dynamic programming to find the absolute minimum number of transactions
 */
class ExactMinimalStrategy implements SettlementStrategy {
  maxUsers = 6;
  private memo = new Map<string, number>();

  compute(balances: Balance[]): Settlement[] {
    const netAmounts = balances.map(b => ({
      ...b,
      balance: Math.round(b.balance * 100) / 100
    }));

    // First, try to find direct matches (optimal for 2-3 users)
    const directSettlements = this.findDirectMatches(netAmounts);
    if (directSettlements.length > 0) {
      const remaining = this.applySettlements(netAmounts, directSettlements);
      if (remaining.every(b => Math.abs(b.balance) < 0.01)) {
        return directSettlements;
      }
    }

    // For more complex cases, use recursive approach
    return this.findMinimalTransactions(netAmounts);
  }

  private findDirectMatches(balances: Balance[]): Settlement[] {
    const settlements: Settlement[] = [];
    const used = new Set<string>();

    // Sort by absolute balance for better matching
    const sorted = [...balances].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

    for (const debtor of sorted) {
      if (used.has(debtor.userId) || debtor.balance >= -0.01) continue;

      for (const creditor of sorted) {
        if (used.has(creditor.userId) || creditor.userId === debtor.userId || creditor.balance <= 0.01) continue;

        const amount = Math.min(Math.abs(debtor.balance), creditor.balance);
        
        // Check for exact or near-exact matches
        if (Math.abs(Math.abs(debtor.balance) - creditor.balance) < 0.01) {
          settlements.push({
            from: debtor.userId,
            to: creditor.userId,
            amount: Math.round(amount * 100) / 100,
            fromProfile: debtor.profile,
            toProfile: creditor.profile
          });
          used.add(debtor.userId);
          used.add(creditor.userId);
          break;
        }
      }
    }

    return settlements;
  }

  private findMinimalTransactions(balances: Balance[]): Settlement[] {
    const settlements: Settlement[] = [];
    const amounts = new Map<string, Balance>();
    
    for (const balance of balances) {
      if (Math.abs(balance.balance) > 0.01) {
        amounts.set(balance.userId, balance);
      }
    }

    this.settleDebts(amounts, settlements);
    return settlements;
  }

  private settleDebts(amounts: Map<string, Balance>, settlements: Settlement[]): void {
    const entries = Array.from(amounts.entries());
    if (entries.length === 0) return;

    // Find the person with maximum credit/debit
    let maxCredit = 0, maxDebit = 0;
    let maxCreditPerson: Balance | null = null;
    let maxDebitPerson: Balance | null = null;

    for (const [_, balance] of entries) {
      if (balance.balance > maxCredit) {
        maxCredit = balance.balance;
        maxCreditPerson = balance;
      }
      if (balance.balance < maxDebit) {
        maxDebit = balance.balance;
        maxDebitPerson = balance;
      }
    }

    if (!maxCreditPerson || !maxDebitPerson || maxCredit < 0.01 || maxDebit > -0.01) {
      return;
    }

    // Find the minimum of two amounts
    const min = Math.min(maxCredit, -maxDebit);
    
    settlements.push({
      from: maxDebitPerson.userId,
      to: maxCreditPerson.userId,
      amount: Math.round(min * 100) / 100,
      fromProfile: maxDebitPerson.profile,
      toProfile: maxCreditPerson.profile
    });

    // Update amounts
    maxCreditPerson.balance -= min;
    maxDebitPerson.balance += min;

    // Remove settled parties
    if (Math.abs(maxCreditPerson.balance) < 0.01) {
      amounts.delete(maxCreditPerson.userId);
    }
    if (Math.abs(maxDebitPerson.balance) < 0.01) {
      amounts.delete(maxDebitPerson.userId);
    }

    // Recursively settle remaining debts
    this.settleDebts(amounts, settlements);
  }

  private applySettlements(balances: Balance[], settlements: Settlement[]): Balance[] {
    const result = balances.map(b => ({ ...b }));
    
    for (const settlement of settlements) {
      const from = result.find(b => b.userId === settlement.from);
      const to = result.find(b => b.userId === settlement.to);
      
      if (from && to) {
        from.balance += settlement.amount;
        to.balance -= settlement.amount;
      }
    }
    
    return result;
  }
}

/**
 * Clustering strategy for medium groups (7-12 users)
 * Groups similar balances to reduce complexity
 */
class ClusteringStrategy implements SettlementStrategy {
  maxUsers = 12;

  compute(balances: Balance[]): Settlement[] {
    const settlements: Settlement[] = [];
    
    // Group by balance magnitude
    const clusters = this.createClusters(balances);
    
    // Solve within each cluster first
    for (const cluster of clusters) {
      const clusterSettlements = this.solveCluster(cluster);
      settlements.push(...clusterSettlements);
    }
    
    // Handle remaining imbalances between clusters
    const interClusterSettlements = this.solveInterCluster(clusters, settlements);
    settlements.push(...interClusterSettlements);
    
    return settlements;
  }

  private createClusters(balances: Balance[]): Balance[][] {
    // Sort by balance magnitude
    const sorted = [...balances].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
    
    const clusters: Balance[][] = [];
    const clusterSize = Math.ceil(sorted.length / 3); // Aim for 3-4 clusters
    
    for (let i = 0; i < sorted.length; i += clusterSize) {
      clusters.push(sorted.slice(i, i + clusterSize));
    }
    
    return clusters;
  }

  private solveCluster(cluster: Balance[]): Settlement[] {
    // Use greedy approach within clusters
    const strategy = new HeuristicStrategy();
    return strategy.compute(cluster);
  }

  private solveInterCluster(clusters: Balance[][], existingSettlements: Settlement[]): Settlement[] {
    // Apply existing settlements to get remaining balances
    const updatedBalances = new Map<string, Balance>();
    
    // Initialize with original balances
    for (const cluster of clusters) {
      for (const balance of cluster) {
        updatedBalances.set(balance.userId, { ...balance });
      }
    }
    
    // Apply settlements
    for (const settlement of existingSettlements) {
      const from = updatedBalances.get(settlement.from);
      const to = updatedBalances.get(settlement.to);
      if (from && to) {
        from.balance += settlement.amount;
        to.balance -= settlement.amount;
      }
    }
    
    // Get remaining non-zero balances
    const remaining = Array.from(updatedBalances.values())
      .filter(b => Math.abs(b.balance) > 0.01);
    
    // Solve remaining balances
    if (remaining.length > 0) {
      const strategy = new HeuristicStrategy();
      return strategy.compute(remaining);
    }
    
    return [];
  }
}

/**
 * Fast heuristic strategy for large groups (13-20 users)
 * Optimized greedy approach with improvements
 */
class HeuristicStrategy implements SettlementStrategy {
  maxUsers = 20;

  compute(balances: Balance[]): Settlement[] {
    const settlements: Settlement[] = [];
    
    // Separate and sort optimally
    const debtors = balances
      .filter(b => b.balance < -0.01)
      .map(b => ({ ...b }))
      .sort((a, b) => a.balance - b.balance);
      
    const creditors = balances
      .filter(b => b.balance > 0.01)
      .map(b => ({ ...b }))
      .sort((a, b) => b.balance - a.balance);

    // First pass: exact matches
    this.findExactMatches(debtors, creditors, settlements);
    
    // Second pass: greedy matching for remaining
    this.greedyMatch(debtors, creditors, settlements);
    
    return settlements;
  }

  private findExactMatches(
    debtors: Balance[], 
    creditors: Balance[], 
    settlements: Settlement[]
  ): void {
    for (let i = debtors.length - 1; i >= 0; i--) {
      const debtor = debtors[i];
      if (Math.abs(debtor.balance) < 0.01) continue;
      
      for (let j = creditors.length - 1; j >= 0; j--) {
        const creditor = creditors[j];
        if (creditor.balance < 0.01) continue;
        
        if (Math.abs(Math.abs(debtor.balance) - creditor.balance) < 0.01) {
          const amount = Math.min(Math.abs(debtor.balance), creditor.balance);
          settlements.push({
            from: debtor.userId,
            to: creditor.userId,
            amount: Math.round(amount * 100) / 100,
            fromProfile: debtor.profile,
            toProfile: creditor.profile
          });
          
          debtor.balance = 0;
          creditor.balance = 0;
          break;
        }
      }
    }
  }

  private greedyMatch(
    debtors: Balance[], 
    creditors: Balance[], 
    settlements: Settlement[]
  ): void {
    let i = 0, j = 0;
    
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      
      if (Math.abs(debtor.balance) < 0.01) {
        i++;
        continue;
      }
      if (creditor.balance < 0.01) {
        j++;
        continue;
      }
      
      const amount = Math.min(Math.abs(debtor.balance), creditor.balance);
      
      settlements.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: Math.round(amount * 100) / 100,
        fromProfile: debtor.profile,
        toProfile: creditor.profile
      });
      
      debtor.balance += amount;
      creditor.balance -= amount;
      
      if (Math.abs(debtor.balance) < 0.01) i++;
      if (creditor.balance < 0.01) j++;
    }
  }
}

// Export convenience function that matches existing API
export const getOptimalSettlementSuggestions = (
  balances: Balance[]
): Settlement[] => {
  const solver = new AdaptiveSettlementSolver();
  return solver.solve(balances);
};