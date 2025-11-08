'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const UserContext = createContext()

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (session) {
        setUser(session.user)
        setUserRole(session.user.user_metadata?.user_type)
        
        // Fetch profile data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          
        if (profileData) {
          setProfile(profileData)
        }
      }
      
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUser(session.user)
          setUserRole(session.user.user_metadata?.user_type)
          
          // Fetch profile data
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            
          if (profileData) {
            setProfile(profileData)
          }
        } else {
          setUser(null)
          setUserRole(null)
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const refreshProfile = async () => {
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        
      if (profileData) {
        setProfile(profileData)
      }
    }
  }

  return (
    <UserContext.Provider value={{ user, userRole, profile, loading, refreshProfile }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
