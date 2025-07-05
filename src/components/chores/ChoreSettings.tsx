import React, { useState, useEffect } from 'react';
import { Input } from '@/components/primitives/Input';
import { Label } from '@/components/primitives/Label';
import { Button } from '@/components/primitives/Button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/primitives/Select';
import { Loader2, Settings } from 'lucide-react';
import { updateChoreConfiguration } from '@/lib/api/chores';
import { getHouseholdMembers } from '@/lib/api/households';
import type { HouseholdChore, ChoreFrequency, ChoreAllocationMode, HouseholdMember } from '@/lib/types/types';
import { toast } from 'react-hot-toast';

interface ChoreSettingsProps {
  chore: HouseholdChore;
  householdId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function ChoreSettings({
  chore,
  householdId,
  open,
  onOpenChange,
  onUpdate
}: ChoreSettingsProps) {
  const [frequency, setFrequency] = useState<ChoreFrequency>(chore.frequency || 'household_default');
  const [customDays, setCustomDays] = useState(chore.frequency_days?.toString() || '');
  const [allocationMode, setAllocationMode] = useState<ChoreAllocationMode>(chore.allocation_mode || 'household_default');
  const [singleOwnerId, setSingleOwnerId] = useState(chore.single_owner_id || '');
  const [minParticipants, setMinParticipants] = useState(chore.min_participants?.toString() || '1');
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadMembers();
    }
  }, [open, householdId]);

  const loadMembers = async () => {
    try {
      const membersData = await getHouseholdMembers(householdId);
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validation
      if (frequency === 'custom' && (!customDays || parseInt(customDays) < 1)) {
        toast.error('Custom frequency must be at least 1 day');
        return;
      }

      if (allocationMode === 'single_owner' && !singleOwnerId) {
        toast.error('Please select a single owner for this chore');
        return;
      }

      const minPart = parseInt(minParticipants);
      if (isNaN(minPart) || minPart < 1) {
        toast.error('Minimum participants must be at least 1');
        return;
      }

      await updateChoreConfiguration(chore.id, {
        frequency,
        frequency_days: frequency === 'custom' ? parseInt(customDays) : null,
        allocation_mode: allocationMode,
        single_owner_id: allocationMode === 'single_owner' ? singleOwnerId : null,
        min_participants: minPart
      });

      toast.success('Chore settings updated successfully');

      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating chore settings:', error);
      toast.error('Failed to update chore settings');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Chore Settings
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-secondary-foreground hover:text-foreground transition-colors"
          >
            <span className="text-2xl">&times;</span>
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure settings for "{chore.name}"
          </p>
          
          {/* Frequency Settings */}
          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select
              value={frequency}
              onValueChange={(value) => setFrequency(value as ChoreFrequency)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="household_default">Use Household Default</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {frequency === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="customDays">Days Between Cycles</Label>
              <Input
                id="customDays"
                type="number"
                min="1"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder="Enter number of days"
              />
            </div>
          )}

          {/* Allocation Mode */}
          <div className="space-y-2">
            <Label htmlFor="allocation">Allocation Mode</Label>
            <Select
              value={allocationMode}
              onValueChange={(value) => setAllocationMode(value as ChoreAllocationMode)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select allocation mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="household_default">Use Household Default</SelectItem>
                <SelectItem value="split">Split (Round Robin)</SelectItem>
                <SelectItem value="single_owner">Single Owner</SelectItem>
                <SelectItem value="sequential">Sequential</SelectItem>
                <SelectItem value="weighted">Weighted by Workload</SelectItem>
                <SelectItem value="volunteer">Volunteer Based</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {allocationMode === 'single_owner' && (
            <div className="space-y-2">
              <Label htmlFor="owner">Single Owner</Label>
              <Select
                value={singleOwnerId}
                onValueChange={setSingleOwnerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  {members.map(member => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.profiles?.name || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Minimum Participants */}
          <div className="space-y-2">
            <Label htmlFor="minParticipants">Minimum Participants</Label>
            <Input
              id="minParticipants"
              type="number"
              min="1"
              value={minParticipants}
              onChange={(e) => setMinParticipants(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Minimum number of people needed for this chore
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-6 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}