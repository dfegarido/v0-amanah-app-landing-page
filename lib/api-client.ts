import { supabase } from './supabase'

/**
 * Helper function to make authenticated API requests
 * Automatically includes the Authorization header with the user's access token
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get the current session
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('Not authenticated. Please login again.')
  }

  // Merge headers with Authorization
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    ...options.headers,
  }

  // Make the request
  return fetch(url, {
    ...options,
    headers,
  })
}

/**
 * Helper function to make authenticated GET requests
 */
export async function authenticatedGet<T>(url: string): Promise<T> {
  const response = await authenticatedFetch(url, { method: 'GET' })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || error.message || 'Request failed')
  }
  
  return response.json()
}

/**
 * Helper function to make authenticated POST requests
 */
export async function authenticatedPost<T>(url: string, body?: any): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || error.message || 'Request failed')
  }
  
  return response.json()
}

/**
 * Helper function to make authenticated PUT requests
 */
export async function authenticatedPut<T>(url: string, body?: any): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || error.message || 'Request failed')
  }
  
  return response.json()
}

/**
 * Helper function to make authenticated PATCH requests
 */
export async function authenticatedPatch<T>(url: string, body?: any): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || error.message || 'Request failed')
  }
  
  return response.json()
}

/**
 * Helper function to make authenticated DELETE requests
 */
export async function authenticatedDelete<T>(url: string): Promise<T> {
  const response = await authenticatedFetch(url, { method: 'DELETE' })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || error.message || 'Request failed')
  }
  
  return response.json()
}
