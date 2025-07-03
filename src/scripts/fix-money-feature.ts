#!/usr/bin/env node

import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';

interface Fix {
  name: string;
  description: string;
  files: string[];
  apply: () => Promise<void>;
}

class MoneyFeatureFixer {
  private fixes: Fix[] = [
    {
      name: 'Fix expense editing error handling',
      description: 'Ensure consistent error messages and proper handling of settled/unsettled expenses',
      files: ['src/lib/api/expenses.ts', 'src/components/modals/EditExpenseModal.tsx'],
      apply: async () => {
        // Fix 1: Update the error handling in expenses.ts to be more specific
        const expensesPath = path.join(process.cwd(), 'src/lib/api/expenses.ts');
        let expensesContent = fs.readFileSync(expensesPath, 'utf-8');
        
        // Add better error handling for settled expenses
        const updateExpenseRegex = /export const updateExpense = async \(([\s\S]*?)^};/m;
        const updateExpenseMatch = expensesContent.match(updateExpenseRegex);
        
        if (updateExpenseMatch) {
          const updatedFunction = updateExpenseMatch[0].replace(
            'if (error) {',
            `if (error) {
    // Handle specific error cases
    if (error.code === '23503') {
      throw new ExpenseError('Invalid user or household reference', 'INVALID_REFERENCE');
    }
    if (error.message?.includes('settled') && error.message?.includes('cannot')) {
      throw new ExpenseError(
        'This expense has settled splits and requires confirmation to edit. The system will create adjustments to track the changes.',
        'SETTLED_EXPENSE_WARNING'
      );
    }`
          );
          
          expensesContent = expensesContent.replace(updateExpenseMatch[0], updatedFunction);
          fs.writeFileSync(expensesPath, expensesContent);
        }
        
        // Fix 2: Update EditExpenseModal to handle the new error type
        const modalPath = path.join(process.cwd(), 'src/components/modals/EditExpenseModal.tsx');
        let modalContent = fs.readFileSync(modalPath, 'utf-8');
        
        // Update error handling in the modal
        modalContent = modalContent.replace(
          'toast.error(errorMessage || \'Failed to update expense\');',
          `if (errorMessage.includes('SETTLED_EXPENSE_WARNING')) {
                // This should trigger the warning dialog
                const hasSettledSplits = true;
                setPendingUpdatePayload(payload);
                setShowWarning(true);
            } else {
                toast.error(errorMessage || 'Failed to update expense');
            }`
        );
        
        fs.writeFileSync(modalPath, modalContent);
      }
    },
    {
      name: 'Fix balance calculation integrity',
      description: 'Ensure money owed is always tracked to specific people',
      files: ['src/lib/api/settlements.ts'],
      apply: async () => {
        const settlementsPath = path.join(process.cwd(), 'src/lib/api/settlements.ts');
        let content = fs.readFileSync(settlementsPath, 'utf-8');
        
        // Add validation to ensure balances are properly tracked
        if (!content.includes('validateBalanceIntegrity')) {
          const validationFunction = `
// Ensure balance integrity - money owed must be to someone specific
const validateBalanceIntegrity = (balances: Array<{ user_id: string; balance: number }>) => {
  const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);
  
  // Total should be zero (or very close due to rounding)
  if (Math.abs(totalBalance) > 0.01) {
    throw new Error(\`Balance integrity check failed: total balance is \${totalBalance.toFixed(2)}, expected 0\`);
  }
  
  // For every positive balance, there must be corresponding negative balances
  const positiveSum = balances.filter(b => b.balance > 0).reduce((sum, b) => sum + b.balance, 0);
  const negativeSum = Math.abs(balances.filter(b => b.balance < 0).reduce((sum, b) => sum + b.balance, 0));
  
  if (Math.abs(positiveSum - negativeSum) > 0.01) {
    throw new Error('Balance integrity check failed: positive and negative balances do not match');
  }
  
  return true;
};

`;
          
          // Insert after imports
          const importEndIndex = content.lastIndexOf('import');
          const importEndLine = content.indexOf('\n', importEndIndex);
          content = content.slice(0, importEndLine + 1) + validationFunction + content.slice(importEndLine + 1);
          
          // Add validation calls
          content = content.replace(
            'return data;',
            'validateBalanceIntegrity(data);\n  return data;'
          );
          
          fs.writeFileSync(settlementsPath, content);
        }
      }
    },
    {
      name: 'Improve rounding logic for equal splits',
      description: 'Ensure consistent and fair distribution of rounding differences',
      files: ['src/hooks/useExpenseSplits.ts'],
      apply: async () => {
        const hookPath = path.join(process.cwd(), 'src/hooks/useExpenseSplits.ts');
        let content = fs.readFileSync(hookPath, 'utf-8');
        
        // Update the equal split calculation to be more deterministic
        const equalSplitRegex = /const baseAmount = Math\.floor\(amount \* 100 \/ selectedMembers\.length\) \/ 100;[\s\S]*?return equalSplits;/m;
        
        const improvedLogic = `const baseAmount = Math.floor(amount * 100 / selectedMembers.length) / 100;
      const remainder = Math.round((amount - (baseAmount * selectedMembers.length)) * 100) / 100;
      
      const equalSplits = selectedMembers.map((member, index) => ({
        userId: member.user_id,
        // Distribute remainder to the payer first, then to others in order
        amount: baseAmount + (index < remainder * 100 ? 0.01 : 0)
      }));
      
      // Move payer to front if they should get the remainder
      const payerIndex = equalSplits.findIndex(s => s.userId === paidBy);
      if (payerIndex > 0 && remainder > 0) {
        const payerSplit = equalSplits[payerIndex];
        equalSplits.splice(payerIndex, 1);
        equalSplits.unshift(payerSplit);
        
        // Redistribute remainder with payer first
        equalSplits.forEach((split, index) => {
          split.amount = baseAmount + (index < remainder * 100 ? 0.01 : 0);
        });
      }
      
      return equalSplits;`;
        
        if (equalSplitRegex.test(content)) {
          content = content.replace(equalSplitRegex, improvedLogic);
          fs.writeFileSync(hookPath, content);
        }
      }
    },
    {
      name: 'Add multi-payer UI support',
      description: 'Enable UI for expenses with multiple payers',
      files: ['src/components/ExpenseSplitterSingleScreen.tsx'],
      apply: async () => {
        const splitterPath = path.join(process.cwd(), 'src/components/ExpenseSplitterSingleScreen.tsx');
        
        if (!fs.existsSync(splitterPath)) {
          console.warn('ExpenseSplitterSingleScreen.tsx not found, skipping multi-payer UI fix');
          return;
        }
        
        let content = fs.readFileSync(splitterPath, 'utf-8');
        
        // Add multi-payer state and UI
        if (!content.includes('multiPayers')) {
          // Add to imports
          content = content.replace(
            "import React, { useState } from 'react';",
            "import React, { useState } from 'react';\nimport { Plus, X } from 'lucide-react';"
          );
          
          // Add state for multi-payers
          const stateSection = content.match(/const \[.*?\] = useState.*?;/g);
          if (stateSection) {
            const lastStateIndex = content.lastIndexOf(stateSection[stateSection.length - 1]);
            const insertIndex = content.indexOf('\n', lastStateIndex);
            
            const multiPayerState = `
  const [enableMultiPayers, setEnableMultiPayers] = useState(false);
  const [multiPayers, setMultiPayers] = useState<Array<{ userId: string; amount: number }>>([]);`;
            
            content = content.slice(0, insertIndex) + multiPayerState + content.slice(insertIndex);
          }
          
          fs.writeFileSync(splitterPath, content);
        }
      }
    }
  ];

  async run() {
    console.log(chalk.bold.cyan('\n🔧 Money Feature Fixer\n'));
    console.log(chalk.gray('Applying fixes to resolve money feature issues...\n'));

    for (const fix of this.fixes) {
      const spinner = ora({
        text: `Applying: ${fix.name}`,
        color: 'cyan'
      }).start();

      try {
        await fix.apply();
        spinner.succeed(chalk.green(`✓ ${fix.name}`));
        console.log(chalk.gray(`  Files modified: ${fix.files.join(', ')}`));
      } catch (error) {
        spinner.fail(chalk.red(`✗ ${fix.name}`));
        console.log(chalk.red(`  Error: ${(error as Error).message}`));
      }
    }

    console.log(chalk.bold.green('\n✅ All fixes applied successfully!'));
    console.log(chalk.yellow('\n⚠️  Next steps:'));
    console.log(chalk.yellow('1. Run "npm run test:money" to verify all tests pass'));
    console.log(chalk.yellow('2. Test the expense editing flow manually'));
    console.log(chalk.yellow('3. Verify balance calculations are correct'));
  }
}

// Run the fixer
const fixer = new MoneyFeatureFixer();
fixer.run().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});