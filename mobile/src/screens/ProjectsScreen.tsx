import { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../App'
import { supabase } from '../lib/supabase'

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Projects'> }

interface Project {
  id: string
  project_code: string
  name: string
  site_address: string | null
  status: string
}

const STATUS_COLOR: Record<string, string> = {
  in_installation: '#1e40af',
  in_production: '#7c3aed',
  design_approved: '#0f766e',
  completed: '#15803d',
}

export function ProjectsScreen({ navigation }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    let query = supabase
      .from('projects')
      .select('id, project_code, name, site_address, status')
      .not('status', 'in', '(completed,cancelled,on_hold)')
      .order('project_code')

    // PMs only see their own projects
    if (profile?.role === 'pm' || profile?.role === 'site_staff') {
      query = query.eq('pm_id', user.id)
    }

    const { data } = await query
    setProjects(data || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    )
  }

  if (projects.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>No Active Projects</Text>
        <Text style={styles.emptyDesc}>No projects assigned to you right now</Text>
      </View>
    )
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={projects}
      keyExtractor={p => p.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('DailyReport', {
            projectId: item.id,
            projectName: item.name,
          })}
        >
          <View style={[styles.codeBar, { backgroundColor: STATUS_COLOR[item.status] || '#64748b' }]}>
            <Text style={styles.code}>{item.project_code}</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.name}>{item.name}</Text>
            {item.site_address && (
              <Text style={styles.address}>📍 {item.site_address}</Text>
            )}
            <Text style={styles.action}>Tap to submit daily report →</Text>
          </View>
        </TouchableOpacity>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
    />
  )
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  emptyDesc: { fontSize: 16, color: '#64748b', textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  codeBar: { paddingHorizontal: 16, paddingVertical: 10 },
  code: { fontSize: 14, fontWeight: 'bold', color: '#fff', fontFamily: 'monospace' },
  cardBody: { padding: 16 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  address: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  action: { fontSize: 14, color: '#1e40af', fontWeight: '600' },
})
