import type { NextRequest } from 'next/server';
import { apiOk } from '@/lib/api-response';
import { search } from '@/services/search-service';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') ?? '';
  const results = await search(query);
  return apiOk(results);
}
