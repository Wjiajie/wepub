import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_request: NextRequest) {  // eslint-disable-line @typescript-eslint/no-unused-vars
  // 获取响应
  const response = NextResponse.next();

  // 添加 CORS 头
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}

// 配置需要应用中间件的路由
export const config = {
  matcher: '/api/:path*',
}; 