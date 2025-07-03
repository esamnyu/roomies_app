import { HouseRule } from '../types/types';
import { RuleTemplate } from '../data/ruleTemplates';

/**
 * Calculate the Levenshtein distance between two strings
 * This helps determine how similar two strings are
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }

  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity percentage between two strings
 * Returns a value between 0 and 1, where 1 means identical
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // If strings are identical, return 1
  if (s1 === s2) return 1;
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  
  // Convert distance to similarity (0 to 1)
  return maxLength === 0 ? 0 : 1 - (distance / maxLength);
}

/**
 * Check if a rule is similar to a template
 * @param rule - The existing house rule
 * @param template - The rule template to compare against
 * @param threshold - Similarity threshold (default 0.8 = 80% similar)
 */
export function isRuleSimilarToTemplate(
  rule: HouseRule, 
  template: RuleTemplate, 
  threshold: number = 0.8
): boolean {
  // If the rule was created from this template, it's definitely similar
  if (rule.templateId === template.id) {
    return true;
  }
  
  // Check content similarity
  const similarity = calculateSimilarity(rule.content, template.content);
  return similarity >= threshold;
}

/**
 * Get rule templates that haven't been used yet
 * @param existingRules - Current house rules
 * @param templates - Available rule templates
 * @param similarityThreshold - How similar content needs to be to consider it "used" (default 0.8)
 */
export function getUnusedRuleTemplates(
  existingRules: HouseRule[],
  templates: RuleTemplate[],
  similarityThreshold: number = 0.8
): RuleTemplate[] {
  return templates.filter(template => {
    // Check if any existing rule is similar to this template
    const isUsed = existingRules.some(rule => 
      isRuleSimilarToTemplate(rule, template, similarityThreshold)
    );
    
    return !isUsed;
  });
}

/**
 * Get suggested rules for a specific category
 * @param existingRules - Current house rules
 * @param templates - Available rule templates
 * @param category - Category to filter by (optional)
 * @param limit - Maximum number of suggestions to return
 */
export function getSuggestedRules(
  existingRules: HouseRule[],
  templates: RuleTemplate[],
  category?: string,
  limit: number = 5
): RuleTemplate[] {
  // Get unused templates
  let unusedTemplates = getUnusedRuleTemplates(existingRules, templates);
  
  // Filter by category if specified
  if (category) {
    unusedTemplates = unusedTemplates.filter(t => t.category === category);
  }
  
  // Sort by popularity and return top N
  return unusedTemplates
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
}