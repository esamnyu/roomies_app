import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { RefreshCw, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmbeddingStats {
  overall: Array<{
    entity_type: string;
    total_count: number;
    with_embedding: number;
    without_embedding: number;
    avg_content_length: number;
  }>;
  household?: Array<{
    entity_type: string;
    total_count: number;
    with_embedding: number;
    coverage_percentage: number;
  }>;
  queue: {
    unprocessed: number;
    processed: number;
    failed: number;
  };
  summary: {
    total_embeddings: number;
    with_vectors: number;
    coverage_percentage: number;
  };
}

interface PerformanceInsights {
  totalQueries: number;
  avgExecutionTimeMs: number;
  vectorUsageRate: number;
  avgResultCount: number;
  queryTypeBreakdown: Record<string, number>;
  recommendations: string[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function RAGMonitorDashboard({ householdId }: { householdId?: string }) {
  const supabase = useSupabaseClient();
  const [embeddingStats, setEmbeddingStats] = useState<EmbeddingStats | null>(null);
  const [performanceInsights, setPerformanceInsights] = useState<PerformanceInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      
      // Fetch embedding statistics
      const statsResponse = await fetch('/api/rag/stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ householdId })
      });
      
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setEmbeddingStats(stats);
      }

      // Fetch performance insights
      const performanceResponse = await fetch('/api/rag/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ householdId, days: 7 })
      });
      
      if (performanceResponse.ok) {
        const insights = await performanceResponse.json();
        setPerformanceInsights(insights);
      }
    } catch (error) {
      console.error('Failed to fetch RAG monitoring data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [householdId]);

  const processQueueManually = async () => {
    try {
      const response = await fetch('/api/process-embedding-queue-unified', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      
      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Failed to process queue:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">RAG System Monitor</h2>
        <Button 
          onClick={fetchData} 
          disabled={refreshing}
          size="sm"
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="embeddings">Embeddings</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Embeddings</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {embeddingStats?.summary.total_embeddings.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {embeddingStats?.summary.with_vectors.toLocaleString() || 0} with vectors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Coverage</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {embeddingStats?.summary.coverage_percentage || 0}%
                </div>
                <Progress 
                  value={embeddingStats?.summary.coverage_percentage || 0} 
                  className="h-2 mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performanceInsights?.avgExecutionTimeMs || 0}ms
                </div>
                <p className="text-xs text-muted-foreground">
                  Vector usage: {performanceInsights?.vectorUsageRate || 0}%
                </p>
              </CardContent>
            </Card>
          </div>

          {performanceInsights?.recommendations && performanceInsights.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {performanceInsights.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="embeddings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Embedding Distribution by Type</CardTitle>
              <CardDescription>Coverage and count by entity type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={embeddingStats?.overall || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="entity_type" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="with_embedding" stackId="a" fill="#82ca9d" name="With Embedding" />
                  <Bar dataKey="without_embedding" stackId="a" fill="#ffc658" name="Without Embedding" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {householdId && embeddingStats?.household && (
            <Card>
              <CardHeader>
                <CardTitle>Household Coverage</CardTitle>
                <CardDescription>Embedding coverage for this household</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {embeddingStats.household.map((item) => (
                    <div key={item.entity_type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">
                          {item.entity_type.replace('_', ' ')}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {item.with_embedding}/{item.total_count}
                        </span>
                      </div>
                      <Progress value={item.coverage_percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {performanceInsights && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Query Type Distribution</CardTitle>
                  <CardDescription>Last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={Object.entries(performanceInsights.queryTypeBreakdown).map(([type, count]) => ({
                          name: type.replace('_', ' '),
                          value: count
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(performanceInsights.queryTypeBreakdown).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Queries</span>
                      <span className="text-sm font-medium">{performanceInsights.totalQueries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Execution Time</span>
                      <span className="text-sm font-medium">{performanceInsights.avgExecutionTimeMs}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Vector Usage Rate</span>
                      <span className="text-sm font-medium">{performanceInsights.vectorUsageRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Results/Query</span>
                      <span className="text-sm font-medium">{performanceInsights.avgResultCount}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Embedding Queue Status</CardTitle>
                <CardDescription>Current queue statistics</CardDescription>
              </div>
              <Button 
                onClick={processQueueManually}
                size="sm"
              >
                Process Queue
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Unprocessed</span>
                    <Badge variant={embeddingStats?.queue.unprocessed ? "default" : "secondary"}>
                      {embeddingStats?.queue.unprocessed || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Processed</span>
                    <Badge variant="success">
                      {embeddingStats?.queue.processed || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Failed</span>
                    <Badge variant={embeddingStats?.queue.failed ? "destructive" : "secondary"}>
                      {embeddingStats?.queue.failed || 0}
                    </Badge>
                  </div>
                </div>
                
                {embeddingStats?.queue.unprocessed && embeddingStats.queue.unprocessed > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      {embeddingStats.queue.unprocessed} items waiting to be processed. 
                      Click "Process Queue" to manually trigger processing.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}