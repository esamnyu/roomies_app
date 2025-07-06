export interface RuleTemplate {
  id: string;
  category: string;
  content: string;
  popularity: number; // 0-100, higher means more commonly used
  tags?: string[];
}

export interface RuleCategory {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  description: string;
}

export const ruleCategories: RuleCategory[] = [
  {
    id: 'cleanliness',
    name: 'Cleanliness',
    icon: 'Sparkles',
    description: 'Keeping shared spaces clean and tidy'
  },
  {
    id: 'noise',
    name: 'Noise & Quiet Hours',
    icon: 'Volume2',
    description: 'Respecting everyone\'s need for peace'
  },
  {
    id: 'guests',
    name: 'Guests & Visitors',
    icon: 'Users',
    description: 'Guidelines for having people over'
  },
  {
    id: 'kitchen',
    name: 'Kitchen & Food',
    icon: 'UtensilsCrossed',
    description: 'Sharing kitchen space and food'
  },
  {
    id: 'bathroom',
    name: 'Bathroom',
    icon: 'Bath',
    description: 'Bathroom usage and cleanliness'
  },
  {
    id: 'shared-spaces',
    name: 'Shared Spaces',
    icon: 'Home',
    description: 'Using common areas respectfully'
  },
  {
    id: 'utilities',
    name: 'Utilities & Bills',
    icon: 'Receipt',
    description: 'Managing shared expenses and resources'
  },
  {
    id: 'parking',
    name: 'Parking & Vehicles',
    icon: 'Car',
    description: 'Parking arrangements and vehicle rules'
  },
  {
    id: 'pets',
    name: 'Pets',
    icon: 'PawPrint',
    description: 'Rules for pets in the household'
  },
  {
    id: 'security',
    name: 'Security & Safety',
    icon: 'Shield',
    description: 'Keeping the home secure'
  }
];

export const ruleTemplates: RuleTemplate[] = [
  // Cleanliness
  {
    id: 'clean-1',
    category: 'cleanliness',
    content: 'Clean up immediately after cooking - wash dishes, wipe counters, and put everything away',
    popularity: 95,
    tags: ['kitchen', 'dishes', 'daily']
  },
  {
    id: 'clean-2',
    category: 'cleanliness',
    content: 'Take turns deep cleaning common areas weekly (kitchen, living room, bathrooms)',
    popularity: 85,
    tags: ['weekly', 'rotation', 'deep-clean']
  },
  {
    id: 'clean-3',
    category: 'cleanliness',
    content: 'No dirty dishes left in sink overnight',
    popularity: 90,
    tags: ['kitchen', 'dishes', 'daily']
  },
  {
    id: 'clean-4',
    category: 'cleanliness',
    content: 'Clean your hair from shower drains after each use',
    popularity: 88,
    tags: ['bathroom', 'daily']
  },
  {
    id: 'clean-5',
    category: 'cleanliness',
    content: 'Empty trash when full, don\'t wait for someone else',
    popularity: 82,
    tags: ['trash', 'responsibility']
  },

  // Noise & Quiet Hours
  {
    id: 'noise-1',
    category: 'noise',
    content: 'Quiet hours: 10 PM - 8 AM on weekdays, 11 PM - 9 AM on weekends',
    popularity: 92,
    tags: ['quiet', 'schedule', 'respect']
  },
  {
    id: 'noise-2',
    category: 'noise',
    content: 'Use headphones for music/videos in common areas',
    popularity: 78,
    tags: ['music', 'common-areas', 'headphones']
  },
  {
    id: 'noise-3',
    category: 'noise',
    content: 'Give advance notice for parties or gatherings that might be noisy',
    popularity: 85,
    tags: ['parties', 'communication', 'planning']
  },
  {
    id: 'noise-4',
    category: 'noise',
    content: 'Keep TV/music volume reasonable, especially late at night',
    popularity: 80,
    tags: ['volume', 'consideration']
  },

  // Guests & Visitors
  {
    id: 'guests-1',
    category: 'guests',
    content: 'Overnight guests limited to 3 nights per week',
    popularity: 75,
    tags: ['overnight', 'limits', 'fairness']
  },
  {
    id: 'guests-2',
    category: 'guests',
    content: 'Inform housemates 24 hours in advance about overnight guests',
    popularity: 88,
    tags: ['communication', 'overnight', 'notice']
  },
  {
    id: 'guests-3',
    category: 'guests',
    content: 'Guests must be accompanied in common areas',
    popularity: 70,
    tags: ['supervision', 'common-areas', 'responsibility']
  },
  {
    id: 'guests-4',
    category: 'guests',
    content: 'You are responsible for your guests\' behavior and any damages',
    popularity: 90,
    tags: ['responsibility', 'damages', 'behavior']
  },
  {
    id: 'guests-5',
    category: 'guests',
    content: 'No guests in the house when you\'re not home',
    popularity: 82,
    tags: ['security', 'presence', 'safety']
  },

  // Kitchen & Food
  {
    id: 'kitchen-1',
    category: 'kitchen',
    content: 'Label your food with name and date',
    popularity: 85,
    tags: ['labeling', 'organization', 'fridge']
  },
  {
    id: 'kitchen-2',
    category: 'kitchen',
    content: 'Don\'t use other people\'s food without asking',
    popularity: 95,
    tags: ['respect', 'permission', 'food']
  },
  {
    id: 'kitchen-3',
    category: 'kitchen',
    content: 'Clean out expired food from fridge weekly',
    popularity: 78,
    tags: ['fridge', 'weekly', 'maintenance']
  },
  {
    id: 'kitchen-4',
    category: 'kitchen',
    content: 'Shared groceries (milk, eggs, bread) split equally',
    popularity: 65,
    tags: ['shared', 'groceries', 'splitting']
  },
  {
    id: 'kitchen-5',
    category: 'kitchen',
    content: 'Don\'t leave food cooking unattended',
    popularity: 88,
    tags: ['safety', 'cooking', 'attention']
  },

  // Bathroom
  {
    id: 'bath-1',
    category: 'bathroom',
    content: 'Replace toilet paper when you finish the roll',
    popularity: 92,
    tags: ['toilet-paper', 'courtesy', 'replacement']
  },
  {
    id: 'bath-2',
    category: 'bathroom',
    content: 'Limit showers to 15 minutes during peak hours (6-9 AM)',
    popularity: 72,
    tags: ['shower', 'time-limit', 'peak-hours']
  },
  {
    id: 'bath-3',
    category: 'bathroom',
    content: 'Wipe down shower after use to prevent mold',
    popularity: 80,
    tags: ['shower', 'cleaning', 'mold-prevention']
  },
  {
    id: 'bath-4',
    category: 'bathroom',
    content: 'Keep personal items in designated storage, not on counters',
    popularity: 77,
    tags: ['organization', 'storage', 'personal-items']
  },

  // Shared Spaces
  {
    id: 'shared-1',
    category: 'shared-spaces',
    content: 'Don\'t leave personal belongings in common areas',
    popularity: 86,
    tags: ['organization', 'common-areas', 'tidiness']
  },
  {
    id: 'shared-2',
    category: 'shared-spaces',
    content: 'Ask before rearranging furniture in shared spaces',
    popularity: 75,
    tags: ['furniture', 'permission', 'changes']
  },
  {
    id: 'shared-3',
    category: 'shared-spaces',
    content: 'Clean up after yourself immediately in common areas',
    popularity: 90,
    tags: ['cleaning', 'immediate', 'responsibility']
  },
  {
    id: 'shared-4',
    category: 'shared-spaces',
    content: 'Share TV/entertainment system fairly - no hogging',
    popularity: 70,
    tags: ['tv', 'sharing', 'fairness']
  },

  // Utilities & Bills
  {
    id: 'utilities-1',
    category: 'utilities',
    content: 'All utilities split equally unless otherwise agreed',
    popularity: 88,
    tags: ['bills', 'splitting', 'equality']
  },
  {
    id: 'utilities-2',
    category: 'utilities',
    content: 'Pay your share of bills on time (by the 5th of each month)',
    popularity: 92,
    tags: ['payment', 'deadline', 'responsibility']
  },
  {
    id: 'utilities-3',
    category: 'utilities',
    content: 'Turn off lights and electronics when not in use',
    popularity: 80,
    tags: ['energy', 'conservation', 'responsibility']
  },
  {
    id: 'utilities-4',
    category: 'utilities',
    content: 'Report maintenance issues immediately to prevent bigger problems',
    popularity: 85,
    tags: ['maintenance', 'communication', 'prevention']
  },

  // Parking & Vehicles
  {
    id: 'parking-1',
    category: 'parking',
    content: 'Assigned parking spots - no switching without permission',
    popularity: 82,
    tags: ['assigned', 'spots', 'permission']
  },
  {
    id: 'parking-2',
    category: 'parking',
    content: 'Guest parking is first-come, first-served',
    popularity: 75,
    tags: ['guests', 'fairness', 'availability']
  },
  {
    id: 'parking-3',
    category: 'parking',
    content: 'Move cars for street cleaning on scheduled days',
    popularity: 88,
    tags: ['street-cleaning', 'schedule', 'responsibility']
  },

  // Pets
  {
    id: 'pets-1',
    category: 'pets',
    content: 'All housemates must agree before getting a new pet',
    popularity: 90,
    tags: ['agreement', 'new-pets', 'consensus']
  },
  {
    id: 'pets-2',
    category: 'pets',
    content: 'Pet owners responsible for all pet-related cleaning and damages',
    popularity: 92,
    tags: ['responsibility', 'cleaning', 'damages']
  },
  {
    id: 'pets-3',
    category: 'pets',
    content: 'Keep pets out of other housemates\' rooms',
    popularity: 85,
    tags: ['boundaries', 'rooms', 'respect']
  },
  {
    id: 'pets-4',
    category: 'pets',
    content: 'Clean litter boxes/cages daily to prevent odors',
    popularity: 88,
    tags: ['cleaning', 'daily', 'odor-control']
  },

  // Security & Safety
  {
    id: 'security-1',
    category: 'security',
    content: 'Always lock doors when leaving, even for short periods',
    popularity: 95,
    tags: ['locking', 'safety', 'responsibility']
  },
  {
    id: 'security-2',
    category: 'security',
    content: 'Don\'t give out keys or door codes without household agreement',
    popularity: 92,
    tags: ['keys', 'codes', 'agreement']
  },
  {
    id: 'security-3',
    category: 'security',
    content: 'Let housemates know if you\'ll be away for more than 2 days',
    popularity: 78,
    tags: ['communication', 'absence', 'safety']
  },
  {
    id: 'security-4',
    category: 'security',
    content: 'No smoking inside the house - fire safety',
    popularity: 88,
    tags: ['smoking', 'fire-safety', 'health']
  }
];

// Helper function to get templates by category
export function getTemplatesByCategory(categoryId: string): RuleTemplate[] {
  return ruleTemplates.filter(template => template.category === categoryId);
}

// Helper function to get most popular templates
export function getPopularTemplates(limit: number = 5): RuleTemplate[] {
  return [...ruleTemplates]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
}

// Helper function to get category by ID
export function getCategoryById(categoryId: string): RuleCategory | undefined {
  return ruleCategories.find(cat => cat.id === categoryId);
}

// Helper function to search templates by content or tags
export function searchTemplates(query: string): RuleTemplate[] {
  const lowercaseQuery = query.toLowerCase();
  return ruleTemplates.filter(template => 
    template.content.toLowerCase().includes(lowercaseQuery) ||
    template.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
}