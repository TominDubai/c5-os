import { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../App'
import { supabase } from '../lib/supabase'

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'DispatchList'> }

interface Dispatch {
  id: string
  dispatch_number: string
  status: string
  scheduled_date: string | null
  scheduled_time: string | null
  vehicle_number: string | null
  site_contact_name: string | null
  site_contact_phone: string | null
  projects: { project_code: string; name: string; site_address: string | null } | null
}

const STATUS_CONFIG: Record<string, { color: string; label: string; next?: string; nextLabel?: string }> = {
  pending: { color: '#64748b', label: 'Pending', next: 'loaded', nextLabel: 'Mark Loaded' },
  loaded: { color: '#7c3aed', label: 'Loaded', next: 'in_transit', nextLabel: 'Depart' },
  in_transit: { color: '#1e40af', label: 'In Transit', next: 'delivered', nextLabel: 'Confirm Delivered' },
  delivered: { color: '#15803d', label: 'Delivered' },
  partial_delivery: { color: '#d97706', label: 'Partial' },
}

export function DispatchListScreen({ navigation }: Props) {
  const [dispatches, setDispatches] = useState<Dispatch[]>([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState<string | null>(null)

  useEffect(() => { loadDispatches() }, [])

  const loadDispatches = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('users').select('role').eq('id', user!.id).single()

    let query = supabase
      .from('dispatches')
      .select('id, dispatch_number, status, scheduled_date, scheduled_time, vehicle_number, site_contact_name, site_contact_phone, projects(project_code, name, site_address)')
      .not('status', 'in', '(delivered,partial_delivery)')
      .order('scheduled_date')

    // Drivers only see their own dispatches
    if (profile?.role === 'driver') query = query.eq('driver_id', user!.id)

    const { data } = await query
    setDispatches((data as any) || [])
    setLoading(false)
  }

  const advance = async (dispatch: Dispatch) => {
    const config = STATUS_CONFIG[dispatch.status]
    if (!config?.next) return
    setAdvancing(dispatch.id)
    const timestamps: Record<string, string> = {
      loaded: 'loaded_at',
      in_transit: 'departed_at',
      delivered: 'delivered_at',
    }
    const updates: Record<string, string> = {
      status: config.next,
      updated_at: new Date().toISOString(),
    }
    if (timestamps[config.next]) updates[timestamps[config.next]] = new Date().toISOString()
    await supabase.from('dispatches').update(updates).eq('id', dispatch.id)
    setDispatches(prev => prev.map(d =>
      d.id === dispatch.id ? { ...d, status: config.next! } : d
    ).filter(d => !['delivered'].includes(d.status)))
    setAdvancing(null)
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0f172a" /></View>

  if (dispatches.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>🚚</Text>
        <Text style={styles.emptyTitle}>No Active Deliveries</Text>
        <Text style={styles.emptyDesc}>All caught up!</Text>
      </View>
    )
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={dispatches}
      keyExtractor={d => d.id}
      renderItem={({ item }) => {
        const config = STATUS_CONFIG[item.status] || { color: '#64748b', label: item.status }
        const proj = item.projects
        return (
          <View style={styles.card}>
            <View style={[styles.statusBar, { backgroundColor: config.color }]}>
              <Text style={styles.dispatchNum}>{item.dispatch_number}</Text>
              <Text style={styles.statusLabel}>{config.label}</Text>
            </View>
            <View style={styles.cardBody}>
              {proj && (
                <>
                  <Text style={styles.projectName}>{proj.name}</Text>
                  <Text style={styles.projectCode}>{proj.project_code}</Text>
                  {proj.site_address && <Text style={styles.address}>📍 {proj.site_address}</Text>}
                </>
              )}
              {item.vehicle_number && <Text style={styles.meta}>🚛 {item.vehicle_number}</Text>}
              {item.scheduled_date && (
                <Text style={styles.meta}>
                  📅 {new Date(item.scheduled_date).toLocaleDateString('en-GB')}
                  {item.scheduled_time ? ` at ${item.scheduled_time.slice(0, 5)}` : ''}
                </Text>
              )}
              {item.site_contact_name && (
                <Text style={styles.meta}>👤 {item.site_contact_name} {item.site_contact_phone ? `· ${item.site_contact_phone}` : ''}</Text>
              )}

              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => navigation.navigate('DispatchDetail', {
                  dispatchId: item.id,
                  dispatchNumber: item.dispatch_number,
                })}
              >
                <Text style={styles.detailBtnText}>View Items →</Text>
              </TouchableOpacity>

              {config.next && (
                <TouchableOpacity
                  style={[styles.advanceBtn, { backgroundColor: config.color }, advancing === item.id && styles.btnDisabled]}
                  onPress={() => advance(item)}
                  disabled={advancing === item.id}
                >
                  <Text style={styles.advanceBtnText}>
                    {advancing === item.id ? '…' : config.nextLabel}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )
      }}
      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
    />
  )
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  emptyDesc: { fontSize: 16, color: '#64748b' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, paddingHorizontal: 16 },
  dispatchNum: { color: '#fff', fontWeight: 'bold', fontSize: 15, fontFamily: 'monospace' },
  statusLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  cardBody: { padding: 16, gap: 6 },
  projectName: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  projectCode: { fontSize: 13, color: '#64748b', fontFamily: 'monospace' },
  address: { fontSize: 14, color: '#64748b' },
  meta: { fontSize: 14, color: '#475569' },
  detailBtn: { marginTop: 8, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10 },
  detailBtnText: { color: '#334155', fontWeight: '600', fontSize: 15 },
  advanceBtn: { marginTop: 8, paddingVertical: 14, alignItems: 'center', borderRadius: 12 },
  advanceBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
  btnDisabled: { opacity: 0.7 },
})
