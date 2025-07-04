'use client'

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select'
import { Checkbox } from './Checkbox'
import { RadioGroup, RadioGroupItem } from './RadioGroup'
import { Switch } from './Switch'
import { Label } from './Label'

export function FormComponentsExample() {
  const [selectValue, setSelectValue] = React.useState('')
  const [checked, setChecked] = React.useState(false)
  const [radioValue, setRadioValue] = React.useState('option1')
  const [switchValue, setSwitchValue] = React.useState(false)

  return (
    <div className="space-y-8 p-8 max-w-2xl mx-auto">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Form Components</h2>
        <p className="text-gray-600">New form components for better UI/UX</p>
      </div>

      {/* Select Component */}
      <div className="space-y-2">
        <Label htmlFor="select-example">Select Component</Label>
        <Select value={selectValue} onValueChange={setSelectValue}>
          <SelectTrigger id="select-example">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
            <SelectItem value="option3">Option 3</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-gray-500">Selected: {selectValue || 'None'}</p>
      </div>

      {/* Checkbox Component */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="checkbox-example" 
            checked={checked}
            onCheckedChange={setChecked}
          />
          <Label htmlFor="checkbox-example">Accept terms and conditions</Label>
        </div>
        <p className="text-sm text-gray-500">Checked: {checked ? 'Yes' : 'No'}</p>
      </div>

      {/* Radio Group Component */}
      <div className="space-y-2">
        <Label>Radio Group</Label>
        <RadioGroup value={radioValue} onValueChange={setRadioValue}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option1" id="r1" />
            <Label htmlFor="r1">Option 1</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option2" id="r2" />
            <Label htmlFor="r2">Option 2</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option3" id="r3" />
            <Label htmlFor="r3">Option 3</Label>
          </div>
        </RadioGroup>
        <p className="text-sm text-gray-500">Selected: {radioValue}</p>
      </div>

      {/* Switch Component */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Switch
            id="switch-example"
            checked={switchValue}
            onCheckedChange={setSwitchValue}
          />
          <Label htmlFor="switch-example">Enable notifications</Label>
        </div>
        <p className="text-sm text-gray-500">Enabled: {switchValue ? 'Yes' : 'No'}</p>
      </div>

      {/* Size Variants */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Size Variants</h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-4">
            <Checkbox size="sm" />
            <Checkbox size="md" />
            <Checkbox size="lg" />
            <span className="text-sm text-gray-500">Checkbox sizes</span>
          </div>
          <div className="flex items-center space-x-4">
            <Switch size="sm" />
            <Switch size="md" />
            <Switch size="lg" />
            <span className="text-sm text-gray-500">Switch sizes</span>
          </div>
        </div>
      </div>
    </div>
  )
}