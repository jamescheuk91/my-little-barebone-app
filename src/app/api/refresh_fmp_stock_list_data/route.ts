import { NextRequest, NextResponse } from 'next/server';
import { updateStockCache } from '@/services/StockDataService';

/**
 * API handler for refreshing FMP stock list data
 * GET /api/refresh_fmp_stock_list_data
 * 
 * This endpoint can be called by a cron job service like Vercel Cron
 * to regularly refresh the stock list data cache.
 */
export async function GET(request: NextRequest) {
  // Validate secret token if provided in environment
  const { searchParams } = new URL(request.url);
  const tokenFromRequest = searchParams.get('token');
  const secretToken = process.env.CRON_SECRET_TOKEN;
  
  // If a secret token is configured, verify that the request includes the correct token
  if (secretToken && tokenFromRequest !== secretToken) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    // Force refresh the stock cache
    await updateStockCache();
    
    return NextResponse.json({
      success: true,
      message: 'Stock data cache refreshed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to refresh stock cache:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to refresh stock data',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}