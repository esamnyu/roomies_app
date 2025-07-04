import { createClient } from '@supabase/supabase-js';

interface EmbeddingMetrics {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  averageProcessingTime: number;
  lastProcessedAt?: Date;
  errors: Array<{
    timestamp: Date;
    error: string;
    itemId: string;
  }>;
}

class EmbeddingMonitor {
  private supabase;
  private metrics: EmbeddingMetrics = {
    totalProcessed: 0,
    successCount: 0,
    failureCount: 0,
    averageProcessingTime: 0,
    errors: []
  };
  
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async logEmbeddingGeneration(
    itemId: string,
    tableType: string,
    success: boolean,
    processingTime: number,
    error?: string
  ) {
    try {
      // Update metrics
      this.metrics.totalProcessed++;
      if (success) {
        this.metrics.successCount++;
      } else {
        this.metrics.failureCount++;
        if (error) {
          this.metrics.errors.push({
            timestamp: new Date(),
            error,
            itemId
          });
          // Keep only last 100 errors
          if (this.metrics.errors.length > 100) {
            this.metrics.errors = this.metrics.errors.slice(-100);
          }
        }
      }
      
      // Update average processing time
      this.metrics.averageProcessingTime = 
        (this.metrics.averageProcessingTime * (this.metrics.totalProcessed - 1) + processingTime) / 
        this.metrics.totalProcessed;
      
      this.metrics.lastProcessedAt = new Date();
      
      // Log to database for persistent monitoring
      await this.supabase.from('embedding_generation_logs').insert({
        item_id: itemId,
        table_type: tableType,
        success,
        processing_time_ms: processingTime,
        error_message: error,
        created_at: new Date().toISOString()
      });
      
    } catch (logError) {
      console.error('Failed to log embedding generation:', logError);
    }
  }

  async getQueueHealth() {
    try {
      // Get queue statistics
      const { data: queueStats } = await this.supabase
        .rpc('get_embedding_queue_stats');
      
      // Get processing rate (last hour)
      const { data: recentLogs } = await this.supabase
        .from('embedding_generation_logs')
        .select('created_at, processing_time_ms')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString())
        .order('created_at', { ascending: false });
      
      const processingRate = recentLogs?.length || 0;
      const avgProcessingTime = recentLogs?.length 
        ? recentLogs.reduce((sum, log) => sum + log.processing_time_ms, 0) / recentLogs.length
        : 0;
      
      // Calculate health score
      const backlogSize = queueStats?.[0]?.unprocessed || 0;
      const failureRate = this.metrics.totalProcessed > 0 
        ? this.metrics.failureCount / this.metrics.totalProcessed 
        : 0;
      
      let healthStatus = 'healthy';
      if (backlogSize > 1000 || failureRate > 0.1) {
        healthStatus = 'degraded';
      }
      if (backlogSize > 5000 || failureRate > 0.3) {
        healthStatus = 'unhealthy';
      }
      
      return {
        status: healthStatus,
        metrics: {
          queueBacklog: backlogSize,
          processingRatePerHour: processingRate,
          averageProcessingTimeMs: avgProcessingTime,
          failureRate: failureRate * 100,
          ...queueStats?.[0]
        },
        recommendations: this.getRecommendations(healthStatus, backlogSize, failureRate)
      };
    } catch (error) {
      console.error('Failed to get queue health:', error);
      return { status: 'unknown', error: error.message };
    }
  }

  private getRecommendations(status: string, backlog: number, failureRate: number): string[] {
    const recommendations = [];
    
    if (backlog > 1000) {
      recommendations.push('Consider increasing the batch size or frequency of the processing job');
    }
    
    if (failureRate > 0.1) {
      recommendations.push('High failure rate detected. Check API quotas and error logs');
    }
    
    if (status === 'unhealthy') {
      recommendations.push('System is unhealthy. Manual intervention may be required');
      recommendations.push('Consider temporarily disabling new embedding generation');
    }
    
    return recommendations;
  }

  async getDetailedMetrics(timeRange: 'hour' | 'day' | 'week' = 'day') {
    const timeRangeMs = {
      hour: 3600000,
      day: 86400000,
      week: 604800000
    };
    
    const since = new Date(Date.now() - timeRangeMs[timeRange]).toISOString();
    
    try {
      // Get processing statistics
      const { data: logs } = await this.supabase
        .from('embedding_generation_logs')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false });
      
      if (!logs || logs.length === 0) {
        return { message: 'No data available for the selected time range' };
      }
      
      // Calculate statistics
      const successLogs = logs.filter(log => log.success);
      const failureLogs = logs.filter(log => !log.success);
      
      // Group by table type
      const byTableType = logs.reduce((acc, log) => {
        if (!acc[log.table_type]) {
          acc[log.table_type] = { success: 0, failure: 0, avgTime: 0, times: [] };
        }
        if (log.success) {
          acc[log.table_type].success++;
          acc[log.table_type].times.push(log.processing_time_ms);
        } else {
          acc[log.table_type].failure++;
        }
        return acc;
      }, {} as Record<string, any>);
      
      // Calculate averages
      Object.keys(byTableType).forEach(type => {
        const times = byTableType[type].times;
        byTableType[type].avgTime = times.length > 0 
          ? times.reduce((a, b) => a + b) / times.length 
          : 0;
        delete byTableType[type].times;
      });
      
      // Get error patterns
      const errorPatterns = failureLogs.reduce((acc, log) => {
        const pattern = log.error_message?.split(':')[0] || 'Unknown error';
        acc[pattern] = (acc[pattern] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return {
        timeRange,
        summary: {
          total: logs.length,
          successful: successLogs.length,
          failed: failureLogs.length,
          successRate: `${((successLogs.length / logs.length) * 100).toFixed(1)}%`,
          averageProcessingTime: `${(successLogs.reduce((sum, log) => sum + log.processing_time_ms, 0) / successLogs.length).toFixed(0)}ms`
        },
        byTableType,
        errorPatterns,
        recentErrors: failureLogs.slice(0, 5).map(log => ({
          timestamp: log.created_at,
          itemId: log.item_id,
          error: log.error_message
        }))
      };
    } catch (error) {
      console.error('Failed to get detailed metrics:', error);
      return { error: error.message };
    }
  }
}

export const embeddingMonitor = new EmbeddingMonitor();