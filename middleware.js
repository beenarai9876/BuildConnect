import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired
  await supabase.auth.getSession()

  // Check for protected routes
  const builderPaths = ['/builder']
  const contractorPaths = ['/contractor']
  const isBuilderPath = builderPaths.some(path => request.nextUrl.pathname.startsWith(path))
  const isContractorPath = contractorPaths.some(path => request.nextUrl.pathname.startsWith(path))
  
  if (isBuilderPath || isContractorPath) {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Check role-based access
    const userRole = session.user.user_metadata?.user_type
    
    if (isBuilderPath && userRole !== 'builder') {
      return NextResponse.redirect(new URL('/contractor/dashboard', request.url))
    }
    
    if (isContractorPath && userRole !== 'contractor') {
      return NextResponse.redirect(new URL('/builder/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|public|api).*)',
  ],
}
