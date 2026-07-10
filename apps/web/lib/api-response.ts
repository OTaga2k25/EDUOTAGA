import { NextResponse } from 'next/server';
import type { ApiResponse } from '@eduotaga/types';

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiResponse<T>>({ success: true, data }, init);
}

export function apiError(message: string, code = 'not_found', status = 404) {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error: { message, code } },
    { status },
  );
}
