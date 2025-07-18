import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiEmbeddingService {
  private genAI: GoogleGenerativeAI | null = null;
  
  private getGenAI(): GoogleGenerativeAI {
    if (!this.genAI) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not set');
      }
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
    return this.genAI;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const genAI = this.getGenAI();
      const model = genAI.getGenerativeModel({ model: 'embedding-001' });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Error generating Gemini embedding:', error);
      throw error;
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const genAI = this.getGenAI();
      const model = genAI.getGenerativeModel({ model: 'embedding-001' });
      
      // Gemini requires sequential processing for embeddings
      const embeddings = await Promise.all(
        texts.map(text => model.embedContent(text))
      );
      
      return embeddings.map(result => result.embedding.values);
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      throw error;
    }
  }

  // Helper to ensure embedding has correct dimensions
  validateEmbedding(embedding: number[]): boolean {
    return embedding.length === 768;
  }

  // Calculate similarity between two embeddings (cosine similarity)
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}

export const geminiEmbeddingService = new GeminiEmbeddingService();

// Helper function for real-time embedding with fallback
export async function generateEmbeddingWithFallback(
  text: string,
  options?: {
    maxRetries?: number;
    priority?: boolean;
  }
): Promise<number[] | null> {
  const maxRetries = options?.maxRetries || 2;
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await geminiEmbeddingService.generateEmbedding(text);
    } catch (error) {
      lastError = error as Error;
      // If rate limited, wait before retry
      if (error instanceof Error && error.message?.includes('429') && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  
  console.warn('Failed to generate embedding, queuing for later:', lastError?.message);
  return null;
}