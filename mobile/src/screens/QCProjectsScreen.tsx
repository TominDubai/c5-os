import { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../App'
import { supabase } from '../lib/supabase'

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'QCProjects'> }

interface QCProject {
  id: string
  project_code: string
  name: string
  site_address: string | null
  itemCount: number
}

export function QCProjectsScreen({ navigation }: Props) {
  const [projects, setProjects] = useState<QCProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    // Items installed but not yet QC'd
    const { data } = await supabase
      .from('project_items')
      .select('project_id, projects(id, project_code, name, site_address)')
      .eq('status', 'installed')

    if (!data) { setLoading(false); return }

    const map: Record<string, QCProject> = {}
    data.forEach((item: any) => {
      const p = item.projects
      if (!p) return
      if (!map[p.id]) map[p.id] = { id: p.id, project_code: p.project_code, name: p.name, site_address: p.site_address, itemCount: 0 }
      map[p.id].itemCount++
    })

    setProjects(Object.values(map).sort((a, b) => b.itemCount - a.itemCount))
    setLoading(false)
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0f172a" /></View>

  if (projects.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>✅</Text>
        <Text style={styles.emptyTitle}>All Clear!</Text>
        <Text style={styles.emptyDesc}>No items waiting for site QC</Text>
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
          onPress={() => navigation.navigate('QCItems', {
            projectId: item.id,
            projectName: item.name,
            projectCode: item.project_code,
          })}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.code}>{item.project_code}</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{item.itemCount}</Text>
            </View>
          </View>
          <Text style={styles.name}>{item.name}</Text>
          {item.site_address && <Text style={styles.address}>📍 {item.site_address}</Text>}
          <Text style={styles.cta}>{item.itemCount} item{item.itemCount !== 1 ? 's' : ''} awaiting QC →</Text>
        </TouchableOpacity>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
    />
  )
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  emptyDesc: { fontSize: 16, color: '#64748b' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  code: { fontFamily: 'monospace', fontSize: 14, color: '#0f766e', fontWeight: 'bold' },
  countBadge: { backgroundColor: '#0f766e', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  name: { fontSize: 19, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  address: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  cta: { fontSize: 14, color: '#0f766e', fontWeight: '600' },
})
