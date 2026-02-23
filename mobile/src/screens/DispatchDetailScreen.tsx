import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
} from 'react-native'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../../App'
import { supabase } from '../lib/supabase'

type Props = { route: RouteProp<RootStackParamList, 'DispatchDetail'> }

interface DispatchItem {
  id: string
  quantity: number
  delivered: boolean
  project_items: { item_code: string; description: string; floor_code: string | null } | null
}

const ITEM_STATUS_COLOR: Record<string, string> = {
  true: '#15803d',
  false: '#64748b',
}

export function DispatchDetailScreen({ route }: Props) {
  const { dispatchId, dispatchNumber } = route.params
  const [items, setItems] = useState<DispatchItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadItems() }, [])

  const loadItems = async () => {
    const { data } = await supabase
      .from('dispatch_items')
      .select('id, quantity, delivered, project_items(item_code, description, floor_code)')
      .eq('dispatch_id', dispatchId)
    setItems((data as any) || [])
    setLoading(false)
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0f172a" /></View>

  const delivered = items.filter(i => i.delivered).length

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.summaryNum}>{dispatchNumber}</Text>
        <Text style={styles.summaryCount}>{delivered}/{items.length} items delivered</Text>
      </View>
      <FlatList
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={i => i.id}
        renderItem={({ item }) => {
          const pi = item.project_items
          return (
            <View style={[styles.itemCard, item.delivered && styles.itemCardDone]}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemCode}>{pi?.item_code || '—'}</Text>
                <Text style={styles.itemDesc}>{pi?.description || '—'}</Text>
                {pi?.floor_code && <Text style={styles.itemFloor}>{pi.floor_code}</Text>}
                <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: item.delivered ? '#15803d' : '#e2e8f0' }]}>
                <Text style={[styles.badgeText, { color: item.delivered ? '#fff' : '#64748b' }]}>
                  {item.delivered ? '✓ Done' : 'Pending'}
                </Text>
              </View>
            </View>
          )
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No items in this dispatch</Text>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summary: { backgroundColor: '#0f172a', padding: 20, paddingTop: 16 },
  summaryNum: { color: '#94a3b8', fontSize: 13, fontFamily: 'monospace', marginBottom: 4 },
  summaryCount: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { padding: 16, paddingBottom: 40 },
  itemCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  itemCardDone: { opacity: 0.7 },
  itemLeft: { flex: 1 },
  itemCode: { fontFamily: 'monospace', fontSize: 14, color: '#1e40af', fontWeight: 'bold', marginBottom: 2 },
  itemDesc: { fontSize: 16, color: '#1e293b', marginBottom: 2 },
  itemFloor: { fontSize: 13, color: '#94a3b8', marginBottom: 2 },
  itemQty: { fontSize: 13, color: '#64748b' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 16 },
})
