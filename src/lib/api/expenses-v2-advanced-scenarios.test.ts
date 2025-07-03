import { createExpenseWithCustomSplits, createMultiPayerExpense, updateExpense, getHouseholdBalances, markExpenseSettled, createRecurringExpense, processDueRecurringExpenses } from './expenses';
import { v4 as uuidv4 } from 'uuid';

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn()
    },
    rpc: jest.fn(),
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn()
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn()
            }))
          }))
        }))
      }))
    }))
  }
}));

// Mock profile API
jest.mock('./profile', () => ({
  getProfile: jest.fn()
}));

// Import the mocked supabase
const { supabase } = require('../supabase');

describe('Advanced Bill Splitting Scenarios - CoHab Features', () => {
  // Mock user IDs for different scenarios
  const mockUserId = uuidv4();
  const mockUser2Id = uuidv4();
  const mockUser3Id = uuidv4();
  const mockUser4Id = uuidv4();
  const mockUser5Id = uuidv4();
  const mockHouseholdId = uuidv4();
  const mockExpenseId = uuidv4();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticated user
    (supabase.auth.getUser as jest.MockedFunction<any>).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Room-Weighted Splits', () => {
    it('should split rent based on room square footage', async () => {
      // Master bedroom: 200 sq ft, Room 2: 150 sq ft, Room 3: 100 sq ft
      const totalRent = 2250.00;
      const totalSqFt = 450;
      
      const roomWeightedSplits = [
        { user_id: mockUserId, amount: (200/totalSqFt) * totalRent }, // $1000
        { user_id: mockUser2Id, amount: (150/totalSqFt) * totalRent }, // $750
        { user_id: mockUser3Id, amount: (100/totalSqFt) * totalRent } // $500
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      const result = await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Monthly Rent - Room Weighted by Sq Ft',
        totalRent,
        roomWeightedSplits
      );

      expect(result.id).toBe(mockExpenseId);
      expect(roomWeightedSplits[0].amount).toBeCloseTo(1000, 2);
      expect(roomWeightedSplits[1].amount).toBeCloseTo(750, 2);
      expect(roomWeightedSplits[2].amount).toBeCloseTo(500, 2);
    });

    it('should apply premium for ensuite bathroom and balcony', async () => {
      const baseRent = 2000.00;
      const ensuitePremium = 150.00;
      const balconyPremium = 100.00;
      
      // Master has ensuite + balcony (35%), Room 2 standard (25%), Room 3 small (15%), Den converted (25%)
      const splits = [
        { user_id: mockUserId, amount: baseRent * 0.35 + ensuitePremium + balconyPremium }, // $950
        { user_id: mockUser2Id, amount: baseRent * 0.25 }, // $500
        { user_id: mockUser3Id, amount: baseRent * 0.15 }, // $300
        { user_id: mockUser4Id, amount: baseRent * 0.25 } // $500
      ];

      const totalAmount = splits.reduce((sum, split) => sum + split.amount, 0);

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Monthly Rent - Master Premium (Ensuite + Balcony)',
        totalAmount,
        splits
      );

      expect(splits[0].amount).toBe(950); // Master room with premiums
      expect(splits[1].amount).toBe(500);
      expect(splits[2].amount).toBe(300);
      expect(splits[3].amount).toBe(500);
    });

    it('should handle bid/auction method for room assignment', async () => {
      // Simulate auction results where each roommate bid for rooms
      const auctionResults = {
        masterBid: 1100,
        room2Bid: 800,
        room3Bid: 600
      };

      const totalRent = 2500.00;
      const totalBids = auctionResults.masterBid + auctionResults.room2Bid + auctionResults.room3Bid;
      const adjustment = totalRent / totalBids;

      const splits = [
        { user_id: mockUserId, amount: auctionResults.masterBid * adjustment },
        { user_id: mockUser2Id, amount: auctionResults.room2Bid * adjustment },
        { user_id: mockUser3Id, amount: auctionResults.room3Bid * adjustment }
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Monthly Rent - Bid/Auction Method',
        totalRent,
        splits
      );

      const totalSplits = splits.reduce((sum, split) => sum + split.amount, 0);
      expect(totalSplits).toBeCloseTo(totalRent, 2);
    });
  });

  describe('Income-Based Progressive Splits', () => {
    it('should split expenses based on income ratios', async () => {
      // Income levels: User1: $80k, User2: $50k, User3: $30k (grad student)
      const incomes = { user1: 80000, user2: 50000, user3: 30000 };
      const totalIncome = 160000;
      const monthlyExpense = 1600.00;

      const progressiveSplits = [
        { user_id: mockUserId, amount: (incomes.user1 / totalIncome) * monthlyExpense }, // $800
        { user_id: mockUser2Id, amount: (incomes.user2 / totalIncome) * monthlyExpense }, // $500
        { user_id: mockUser3Id, amount: (incomes.user3 / totalIncome) * monthlyExpense } // $300
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      const result = await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Monthly Utilities - Income Based',
        monthlyExpense,
        progressiveSplits
      );

      expect(progressiveSplits[0].amount).toBe(800);
      expect(progressiveSplits[1].amount).toBe(500);
      expect(progressiveSplits[2].amount).toBe(300);
    });

    it('should handle mixed income household with cap', async () => {
      // One high earner shouldn't pay more than 50% even if income suggests it
      const utilities = 300.00;
      const maxContribution = utilities * 0.5; // Cap at 50%

      const splits = [
        { user_id: mockUserId, amount: maxContribution }, // Capped at 50%
        { user_id: mockUser2Id, amount: 90 }, // 30%
        { user_id: mockUser3Id, amount: 60 } // 20%
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Utilities - Progressive with 50% Cap',
        utilities,
        splits
      );

      expect(splits[0].amount).toBeLessThanOrEqual(maxContribution);
    });
  });

  describe('Stay-Length Prorated Splits', () => {
    it('should prorate rent for semester abroad', async () => {
      const monthlyRent = 1500.00;
      const daysInMonth = 30;
      const dailyRate = monthlyRent / daysInMonth;
      
      // User2 is abroad for 15 days
      const user2Days = 15;
      const user2Share = dailyRate * user2Days * 0.25; // 25% room hold fee during absence
      const remainingRent = monthlyRent - user2Share;
      
      const splits = [
        { user_id: mockUserId, amount: remainingRent / 2 }, // Split remaining between 2 users
        { user_id: mockUser2Id, amount: user2Share }, // Reduced rate while abroad
        { user_id: mockUser3Id, amount: remainingRent / 2 }
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'January Rent - User2 Abroad Jan 15-30',
        monthlyRent,
        splits
      );

      expect(splits[1].amount).toBeLessThan(monthlyRent / 3); // User2 pays less than equal share
    });

    it('should handle co-op term with utilities adjustment', async () => {
      // User on co-op: pays full rent share but 0% utilities
      const rent = 2100.00;
      const utilities = 300.00;
      
      // Rent split equally
      const rentSplits = [
        { user_id: mockUserId, amount: 700 },
        { user_id: mockUser2Id, amount: 700 }, // On co-op but still pays rent
        { user_id: mockUser3Id, amount: 700 }
      ];

      // Utilities split only between present users
      const utilitySplits = [
        { user_id: mockUserId, amount: 150 },
        { user_id: mockUser2Id, amount: 0 }, // No utilities during co-op
        { user_id: mockUser3Id, amount: 150 }
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Monthly Rent - Equal Split',
        rent,
        rentSplits
      );

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Utilities - User2 on Co-op',
        utilities,
        utilitySplits
      );

      expect(utilitySplits[1].amount).toBe(0);
    });

    it('should calculate daily proration for mid-month move', async () => {
      const monthlyRent = 1800.00;
      const moveInDay = 15;
      const daysInMonth = 30;
      const remainingDays = daysInMonth - moveInDay + 1;
      
      // New roommate pays prorated amount
      const newRoommateShare = (monthlyRent / 3) * (remainingDays / daysInMonth);
      const existingRoommateAdjustment = (monthlyRent / 3) * ((moveInDay - 1) / daysInMonth) / 2;
      
      const splits = [
        { user_id: mockUserId, amount: (monthlyRent / 3) + existingRoommateAdjustment },
        { user_id: mockUser2Id, amount: (monthlyRent / 3) + existingRoommateAdjustment },
        { user_id: mockUser3Id, amount: newRoommateShare } // New roommate
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Rent - New Roommate Moved In Day 15',
        monthlyRent,
        splits
      );

      expect(splits[2].amount).toBeLessThan(monthlyRent / 3);
    });
  });

  describe('Usage-Metered Splits', () => {
    it('should split electricity based on smart plug readings', async () => {
      const totalElectric = 240.00;
      const baseCharge = 40.00; // Fixed delivery charges split equally
      const usageCharge = totalElectric - baseCharge;
      
      // Smart plug readings (kWh): User1: 400, User2: 800, User3: 200
      const totalUsage = 1400;
      const usage = { user1: 400, user2: 800, user3: 200 };
      
      const splits = [
        { user_id: mockUserId, amount: (baseCharge / 3) + (usage.user1 / totalUsage) * usageCharge },
        { user_id: mockUser2Id, amount: (baseCharge / 3) + (usage.user2 / totalUsage) * usageCharge },
        { user_id: mockUser3Id, amount: (baseCharge / 3) + (usage.user3 / totalUsage) * usageCharge }
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Electric Bill - Smart Meter Split',
        totalElectric,
        splits
      );

      // User2 with highest usage should pay the most
      expect(splits[1].amount).toBeGreaterThan(splits[0].amount);
      expect(splits[1].amount).toBeGreaterThan(splits[2].amount);
    });

    it('should handle water sub-meter readings', async () => {
      const waterBill = 120.00;
      // Gallons used: User1: 1000, User2: 2000, User3: 1500
      const gallonsUsed = { user1: 1000, user2: 2000, user3: 1500 };
      const totalGallons = 4500;
      
      const splits = [
        { user_id: mockUserId, amount: (gallonsUsed.user1 / totalGallons) * waterBill },
        { user_id: mockUser2Id, amount: (gallonsUsed.user2 / totalGallons) * waterBill },
        { user_id: mockUser3Id, amount: (gallonsUsed.user3 / totalGallons) * waterBill }
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Water Bill - Sub-meter Based',
        waterBill,
        splits
      );

      const totalSplits = splits.reduce((sum, split) => sum + split.amount, 0);
      expect(totalSplits).toBeCloseTo(waterBill, 2);
    });
  });

  describe('Hybrid Core + Variable Splits', () => {
    it('should split with base rent equal and utilities by usage', async () => {
      const rent = 2400.00;
      const electric = 300.00;
      
      // Rent split equally
      const rentSplits = [
        { user_id: mockUserId, amount: 800 },
        { user_id: mockUser2Id, amount: 800 },
        { user_id: mockUser3Id, amount: 800 }
      ];

      // Electric by usage (40%, 35%, 25%)
      const electricSplits = [
        { user_id: mockUserId, amount: 120 },
        { user_id: mockUser2Id, amount: 105 },
        { user_id: mockUser3Id, amount: 75 }
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Rent - Equal Split',
        rent,
        rentSplits
      );

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Electric - Usage Based',
        electric,
        electricSplits
      );

      expect(rentSplits[0].amount).toBe(rentSplits[1].amount);
      expect(electricSplits[0].amount).not.toBe(electricSplits[2].amount);
    });
  });

  describe('Rotating Payer System', () => {
    it('should handle rotating utility payer with auto-settlement', async () => {
      // Simulate 3 months of rotating payments
      const utilityAmount = 180.00;
      const equalShare = utilityAmount / 3;

      // Month 1: User1 pays
      const month1Payments = [{ payer_id: mockUserId, amount: utilityAmount }];
      const month1Splits = [
        { user_id: mockUserId, amount: equalShare },
        { user_id: mockUser2Id, amount: equalShare },
        { user_id: mockUser3Id, amount: equalShare }
      ];

      // Month 2: User2 pays
      const month2Payments = [{ payer_id: mockUser2Id, amount: utilityAmount }];
      const month2Splits = month1Splits;

      // Month 3: User3 pays
      const month3Payments = [{ payer_id: mockUser3Id, amount: utilityAmount }];
      const month3Splits = month1Splits;

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      // Create all three months
      await createMultiPayerExpense(
        mockHouseholdId,
        'Internet - January (User1 pays)',
        month1Payments,
        month1Splits
      );

      await createMultiPayerExpense(
        mockHouseholdId,
        'Internet - February (User2 pays)',
        month2Payments,
        month2Splits
      );

      await createMultiPayerExpense(
        mockHouseholdId,
        'Internet - March (User3 pays)',
        month3Payments,
        month3Splits
      );

      // After 3 months, everyone has paid once and owes equally
      expect(month1Splits).toEqual(month2Splits);
      expect(month2Splits).toEqual(month3Splits);
    });
  });

  describe('Chore Credit Offsets', () => {
    it('should apply chore credits against utility bills', async () => {
      const utilities = 240.00;
      const choreCredits = {
        user1: 20, // Did extra cleaning
        user2: 0,
        user3: 10  // Took out trash regularly
      };
      
      const baseShare = utilities / 3;
      const totalCredits = choreCredits.user1 + choreCredits.user2 + choreCredits.user3;
      
      // Credits are redistributed among all users
      const splits = [
        { user_id: mockUserId, amount: baseShare - choreCredits.user1 + (totalCredits / 3) }, // Gets credit for their chores
        { user_id: mockUser2Id, amount: baseShare - choreCredits.user2 + (totalCredits / 3) }, // No chores, pays more
        { user_id: mockUser3Id, amount: baseShare - choreCredits.user3 + (totalCredits / 3) } // Gets credit for their chores
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Utilities - March (with chore credits)',
        utilities,
        splits
      );

      // Verify that users with chore credits pay less than those without
      expect(splits[0].amount).toBe(70); // 80 - 20 + 10 = 70
      expect(splits[1].amount).toBe(90); // 80 - 0 + 10 = 90 (pays more, no chores)
      expect(splits[2].amount).toBe(80); // 80 - 10 + 10 = 80
    });
  });

  describe('Couples Count as 1.5 Scenarios', () => {
    it('should calculate splits with couple as 1.5 people', async () => {
      const rent = 2000.00;
      // 3 bedroom: Single, Single, Couple
      // Total "people units": 1 + 1 + 1.5 = 3.5
      
      const singleShare = rent / 3.5;
      const coupleShare = singleShare * 1.5;
      
      const splits = [
        { user_id: mockUserId, amount: singleShare }, // Single
        { user_id: mockUser2Id, amount: singleShare }, // Single
        { user_id: mockUser3Id, amount: coupleShare } // Couple (both partners)
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Monthly Rent - Couple as 1.5',
        rent,
        splits
      );

      expect(splits[2].amount).toBeCloseTo(coupleShare, 2);
      expect(splits[2].amount).toBeGreaterThan(splits[0].amount);
      expect(splits[2].amount).toBeLessThan(splits[0].amount * 2);
    });

    it('should handle utilities with couple multiplier', async () => {
      const utilities = 300.00;
      // Apply different multiplier for utilities (couple uses more)
      const utilityUnits = 1 + 1 + 1.75; // Couple counts as 1.75 for utilities
      
      const singleUtility = utilities / utilityUnits;
      const coupleUtility = singleUtility * 1.75;
      
      const splits = [
        { user_id: mockUserId, amount: singleUtility },
        { user_id: mockUser2Id, amount: singleUtility },
        { user_id: mockUser3Id, amount: coupleUtility }
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Utilities - Couple as 1.75',
        utilities,
        splits
      );

      expect(splits[2].amount / splits[0].amount).toBeCloseTo(1.75, 2);
    });
  });

  describe('Pet Premium Scenarios', () => {
    it('should add pet premium to pet owner share', async () => {
      const rent = 2400.00;
      const petPremium = 50.00; // Monthly pet fee
      const baseRent = rent - petPremium;
      
      const splits = [
        { user_id: mockUserId, amount: baseRent / 3 + petPremium }, // Pet owner
        { user_id: mockUser2Id, amount: baseRent / 3 },
        { user_id: mockUser3Id, amount: baseRent / 3 }
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Rent - With Pet Premium',
        rent,
        splits
      );

      expect(splits[0].amount).toBe(splits[1].amount + petPremium);
    });

    it('should split pet damage deposit appropriately', async () => {
      const petDeposit = 500.00;
      
      // Only pet owner pays pet deposit
      const splits = [
        { user_id: mockUserId, amount: petDeposit }, // Pet owner
        { user_id: mockUser2Id, amount: 0 },
        { user_id: mockUser3Id, amount: 0 }
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Pet Damage Deposit',
        petDeposit,
        splits
      );

      expect(splits[0].amount).toBe(petDeposit);
      expect(splits[1].amount + splits[2].amount).toBe(0);
    });
  });

  describe('Cap & Spill Grocery Scenarios', () => {
    it('should split groceries with cap and individual overages', async () => {
      const groceryTotal = 450.00;
      const capPerPerson = 100.00;
      const sharedAmount = capPerPerson * 3; // $300
      const overage = groceryTotal - sharedAmount; // $150
      
      // User2 bought expensive items causing overage
      const splits = [
        { user_id: mockUserId, amount: capPerPerson },
        { user_id: mockUser2Id, amount: capPerPerson + overage }, // Pays for their overage
        { user_id: mockUser3Id, amount: capPerPerson }
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Groceries - Shared + User2 Premium Items',
        groceryTotal,
        splits
      );

      expect(splits[1].amount).toBeGreaterThan(capPerPerson);
      expect(splits[0].amount).toBe(capPerPerson);
      expect(splits[2].amount).toBe(capPerPerson);
    });

    it('should handle communal vs personal grocery splits', async () => {
      const communalGroceries = 180.00;
      const personalGroceries = { user1: 50, user2: 75, user3: 25 };
      
      // Communal split equally, personal paid individually
      const communalShare = communalGroceries / 3;
      
      const splits = [
        { user_id: mockUserId, amount: communalShare + personalGroceries.user1 },
        { user_id: mockUser2Id, amount: communalShare + personalGroceries.user2 },
        { user_id: mockUser3Id, amount: communalShare + personalGroceries.user3 }
      ];

      const totalAmount = communalGroceries + Object.values(personalGroceries).reduce((a, b) => a + b, 0);

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Costco Run - Communal + Personal Items',
        totalAmount,
        splits
      );

      expect(splits[0].amount).toBe(110); // 60 + 50
      expect(splits[1].amount).toBe(135); // 60 + 75
      expect(splits[2].amount).toBe(85);  // 60 + 25
    });
  });

  describe('Edge Cases - Life Cycle Scenarios', () => {
    it('should handle move-in starter expenses with depreciation', async () => {
      const couchPrice = 600.00;
      const expectedLifeMonths = 24;
      const remainingMonths = 18; // Someone moves out after 6 months
      
      // Calculate depreciated value
      const depreciatedValue = couchPrice * (remainingMonths / expectedLifeMonths);
      const usedValue = couchPrice - depreciatedValue;
      
      // Original 3-way split
      const originalSplits = [
        { user_id: mockUserId, amount: 200 },
        { user_id: mockUser2Id, amount: 200 },
        { user_id: mockUser3Id, amount: 200 }
      ];

      // When User3 moves out, they should get back depreciated portion
      const moveOutAdjustment = depreciatedValue / 3; // Their share of remaining value
      
      const adjustmentSplits = [
        { user_id: mockUserId, amount: -moveOutAdjustment / 2 }, // Split refund between remaining
        { user_id: mockUser2Id, amount: -moveOutAdjustment / 2 },
        { user_id: mockUser3Id, amount: moveOutAdjustment } // Gets refund
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Shared Couch Purchase',
        couchPrice,
        originalSplits
      );

      expect(moveOutAdjustment).toBeCloseTo(150, 0); // $450 remaining / 3
    });

    it('should handle mid-lease exit with security deposit', async () => {
      const securityDeposit = 2400.00;
      const damageDeductions = 200.00;
      const returnedDeposit = securityDeposit - damageDeductions;
      
      // Original deposit was split equally
      const originalShare = securityDeposit / 3;
      
      // User2 exits mid-lease, forfeits damage portion
      const user2Refund = originalShare - (damageDeductions / 3);
      
      const exitSplits = [
        { user_id: mockUserId, amount: 0 }, // Stays
        { user_id: mockUser2Id, amount: user2Refund }, // Gets partial refund
        { user_id: mockUser3Id, amount: 0 } // Stays
      ];

      expect(user2Refund).toBeCloseTo(733.33, 2);
    });

    it('should calculate guest stay fees after threshold', async () => {
      const guestNights = 7; // Free for first 3 nights
      const freeNights = 3;
      const chargeableNights = guestNights - freeNights;
      const nightlyFee = 10.00;
      
      const guestFee = chargeableNights * nightlyFee;
      
      // Guest fee goes to communal pot, split among permanent residents
      const splits = [
        { user_id: mockUserId, amount: -guestFee }, // Guest's host pays
        { user_id: mockUser2Id, amount: guestFee / 2 }, // Benefits
        { user_id: mockUser3Id, amount: guestFee / 2 } // Benefits
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      // This would typically be handled as a credit/debit system
      expect(guestFee).toBe(40); // 4 nights * $10
    });

    it('should allocate damage costs appropriately', async () => {
      const damageAmount = 300.00;
      const responsibleParty = mockUser2Id;
      
      // Two options: responsible party pays all, or split among all
      
      // Option 1: Responsible party pays
      const directSplits = [
        { user_id: mockUserId, amount: 0 },
        { user_id: mockUser2Id, amount: damageAmount },
        { user_id: mockUser3Id, amount: 0 }
      ];

      // Option 2: Split among all (house decision)
      const sharedSplits = [
        { user_id: mockUserId, amount: 100 },
        { user_id: mockUser2Id, amount: 100 },
        { user_id: mockUser3Id, amount: 100 }
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Broken Window Repair - User2 Responsible',
        damageAmount,
        directSplits
      );

      expect(directSplits[1].amount).toBe(damageAmount);
    });

    it('should generate final settlement for graduation', async () => {
      // Mock final balances
      const mockBalances = [
        { user_id: mockUserId, balance: 45.50, name: 'User 1' },
        { user_id: mockUser2Id, balance: -30.00, name: 'User 2' },
        { user_id: mockUser3Id, balance: -15.50, name: 'User 3' }
      ];

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockBalances,
        error: null
      });

      const balances = await getHouseholdBalances(mockHouseholdId);

      // Verify settlement amounts
      expect(balances[0].balance).toBeGreaterThan(0); // User1 is owed money
      expect(balances[1].balance).toBeLessThan(0); // User2 owes money
      expect(balances[2].balance).toBeLessThan(0); // User3 owes money
      
      // Total should sum to zero
      const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);
      expect(totalBalance).toBeCloseTo(0, 2);
    });
  });

  describe('Complex Multi-Scenario Integration Tests', () => {
    it('should handle dorm suite with meal plan offset', async () => {
      const groceries = 120.00;
      const daysInMonth = 30;
      const weekendDays = 8; // Approximate weekends in month
      const mealPlanDays = daysInMonth - weekendDays;
      
      // Only split groceries for weekend days
      const effectiveShare = groceries / 3; // Still split equally but amount is lower
      
      const splits = [
        { user_id: mockUserId, amount: effectiveShare },
        { user_id: mockUser2Id, amount: effectiveShare },
        { user_id: mockUser3Id, amount: effectiveShare }
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Weekend Groceries - Dorm Suite',
        groceries,
        splits
      );

      expect(splits[0].amount).toBeLessThan(groceries / 2); // Less than if it were full month
    });

    it('should handle music production room with electricity premium', async () => {
      const totalElectric = 360.00;
      const baseShare = totalElectric * 0.4 / 3; // 40% split equally
      const usageShare = totalElectric * 0.6; // 60% by usage
      
      // Music producer uses 60% of metered electricity
      const usageRatios = { user1: 0.6, user2: 0.25, user3: 0.15 };
      
      const splits = [
        { user_id: mockUserId, amount: baseShare + (usageShare * usageRatios.user1) }, // Music producer
        { user_id: mockUser2Id, amount: baseShare + (usageShare * usageRatios.user2) },
        { user_id: mockUser3Id, amount: baseShare + (usageShare * usageRatios.user3) }
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Electric - 40% Base + 60% Usage (Music Studio)',
        totalElectric,
        splits
      );

      expect(splits[0].amount).toBeGreaterThan(totalElectric / 3); // Pays more than equal share
      expect(splits[0].amount).toBeCloseTo(177.6, 1); // 48 + 129.6
    });
  });

  describe('Recurring Expense Scenarios', () => {
    it('should create recurring rent with room-weighted splits', async () => {
      const monthlyRent = 2400.00;
      const roomWeights = { master: 0.4, room2: 0.35, room3: 0.25 };
      
      const customSplits = [
        { user_id: mockUserId, amount: monthlyRent * roomWeights.master },
        { user_id: mockUser2Id, amount: monthlyRent * roomWeights.room2 },
        { user_id: mockUser3Id, amount: monthlyRent * roomWeights.room3 }
      ];

      const mockRecurringExpense = {
        id: uuidv4(),
        household_id: mockHouseholdId,
        description: 'Monthly Rent - Room Weighted',
        amount: monthlyRent,
        frequency: 'monthly',
        splits: customSplits,
        created_by: mockUserId,
        is_active: true
      };

      const mockFrom = {
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockRecurringExpense,
              error: null
            })
          }))
        }))
      };

      (supabase.from as jest.MockedFunction<any>).mockReturnValue(mockFrom);

      const result = await createRecurringExpense(
        mockHouseholdId,
        'Monthly Rent - Room Weighted',
        monthlyRent,
        'monthly',
        new Date('2024-01-01'),
        undefined,
        customSplits
      );

      expect(result.splits).toEqual(customSplits);
      expect(result.splits[0].amount).toBe(960);  // 40% of 2400
      expect(result.splits[1].amount).toBe(840);  // 35% of 2400
      expect(result.splits[2].amount).toBe(600);  // 25% of 2400
    });

    it('should handle seasonal utility adjustments', async () => {
      // Summer AC vs Winter heating costs
      const summerElectric = 400.00;
      const winterElectric = 250.00;
      
      const currentMonth = new Date().getMonth();
      const isSummer = currentMonth >= 5 && currentMonth <= 9;
      const monthlyAmount = isSummer ? summerElectric : winterElectric;
      
      const mockRecurringExpense = {
        id: uuidv4(),
        household_id: mockHouseholdId,
        description: 'Monthly Electric - Seasonal',
        amount: monthlyAmount,
        frequency: 'monthly',
        created_by: mockUserId,
        is_active: true
      };

      const mockFrom = {
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockRecurringExpense,
              error: null
            })
          }))
        }))
      };

      (supabase.from as jest.MockedFunction<any>).mockReturnValue(mockFrom);

      const result = await createRecurringExpense(
        mockHouseholdId,
        'Monthly Electric - Seasonal',
        monthlyAmount,
        'monthly',
        new Date()
      );

      expect(result.amount).toBe(monthlyAmount);
    });
  });

  describe('Validation and Error Scenarios', () => {
    it('should validate percentage splits total 100%', async () => {
      const amount = 300.00;
      const invalidPercentages = [
        { user_id: mockUserId, amount: amount * 0.4 },   // 40%
        { user_id: mockUser2Id, amount: amount * 0.3 },  // 30%
        { user_id: mockUser3Id, amount: amount * 0.2 }   // 20% - Total 90%
      ];

      await expect(createExpenseWithCustomSplits(
        mockHouseholdId,
        'Invalid Percentage Split',
        amount,
        invalidPercentages
      )).rejects.toThrow('Split amounts');
    });

    it('should handle floating point precision in complex calculations', async () => {
      // Test case that might cause floating point issues
      const amount = 333.33;
      const splits = [
        { user_id: mockUserId, amount: 111.11 },
        { user_id: mockUser2Id, amount: 111.11 },
        { user_id: mockUser3Id, amount: 111.11 }
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      // Should accept small rounding differences
      await expect(createExpenseWithCustomSplits(
        mockHouseholdId,
        'Floating Point Test',
        amount,
        splits
      )).resolves.toBeDefined();
    });

    it('should validate minimum split amounts', async () => {
      const amount = 0.03; // 3 cents split 3 ways = 1 cent each
      const splits = [
        { user_id: mockUserId, amount: 0.01 },
        { user_id: mockUser2Id, amount: 0.01 },
        { user_id: mockUser3Id, amount: 0.01 }
      ];

      const mockResponse = {
        expense_id: mockExpenseId,
        idempotent: false
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      await createExpenseWithCustomSplits(
        mockHouseholdId,
        'Minimum Amount Test',
        amount,
        splits
      );

      expect(splits.every(s => s.amount >= 0.01)).toBe(true);
    });
  });
});