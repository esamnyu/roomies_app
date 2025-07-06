"use client";

import React, { ReactNode } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { GripVertical } from 'lucide-react';

interface ResizableChoreLayoutProps {
  mainContent: ReactNode;
  sidebarContent: ReactNode;
  defaultSizes?: [number, number];
  onLayout?: (sizes: number[]) => void;
}

export const ResizableChoreLayout: React.FC<ResizableChoreLayoutProps> = ({
  mainContent,
  sidebarContent,
  defaultSizes = [65, 35],
  onLayout
}) => {
  return (
    <PanelGroup 
      direction="horizontal" 
      onLayout={onLayout}
      className="rounded-lg"
    >
      <Panel 
        defaultSize={defaultSizes[0]} 
        minSize={50}
        className="flex"
      >
        <div className="flex-1 pr-3">
          {mainContent}
        </div>
      </Panel>
      
      <PanelResizeHandle className="relative w-2 group">
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-border group-hover:bg-primary/30 transition-colors" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-10 rounded bg-background border border-border opacity-0 group-hover:opacity-100 transition-opacity cursor-col-resize">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </PanelResizeHandle>
      
      <Panel 
        defaultSize={defaultSizes[1]} 
        minSize={25}
        className="flex"
      >
        <div className="flex-1 pl-3 overflow-y-auto max-h-[calc(100vh-12rem)]">
          {sidebarContent}
        </div>
      </Panel>
    </PanelGroup>
  );
};