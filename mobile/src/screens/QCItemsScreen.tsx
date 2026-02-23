import { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../../App'
import { supabase } from '../lib/supabase'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'QCItems'>
  route: RouteProp<RootStackParamList, 'QCItems'>
}

interface Item {
  id: string
  item_code: string
  description: string
  floor_code: string | null
  room_code: string | null
  type_code: string | null
}

const TYPE_LABELS: Record<string, string> = {
  K: 'Kitchen', W: 'Wardrobes', V: 'Vanity', T: 'TV Unit', J: 'Joinery',
}

export function QCItemsScreen({ navigation, route }: Props) {
  const { projectId, projectName, projectCode } = route.params
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data } = await supabase
      .from('project_items')
      .select('id, item_code, description, floor_code, room_code, type_code')
      .eq('project_id', projectId)
      .eq('status', 'installed')
      .order('item_code')
    setItems(data || [])
    setLoading(false)
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0f172a" /></View>

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.code}>{projectCode}</Text>
        <Text style={styles.name}>{projectName}</Text>
        <Text style={styles.count}>{items.length} items to inspect</Text>
      </View>
      <FlatList
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('QCItem', {
              itemId: item.id,
              itemCode: item.item_code,
              description: item.description,
              projectId,
            })}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.itemCode}>{item.item_code}</Text>
              <Text style={styles.itemDesc}>{item.description}</Text>
              <View style={styles.tags}>
                {item.type_code && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{TYPE_LABELS[item.type_code] || item.type_code}</Text>
                  </View>
                )}
                {item.floor_code && (
                  <View style={[styles.tag, { backgroundColor: '#e0f2fe' }]}>
                    <Text style={[styles.tagText, { color: '#0369a1' }]}>{item.floor_code}</Text>
                  </View>
                )}
                {item.room_code && (
                  <View style={[styles.tag, { backgroundColor: '#f0fdf4' }]}>
                    <Text style={[styles.tagText, { color: '#15803d' }]}>{item.room_code}</Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No items left to QC ✅</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#0f172a', padding: 20 },
  code: { fontSize: 13, color: '#94a3b8', fontFamily: 'monospace', marginBottom: 4 },
  name: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  count: { fontSize: 14, color: '#0f766e' },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  cardLeft: { flex: 1 },
  itemCode: { fontFamily: 'monospace', fontSize: 14, color: '#0f766e', fontWeight: 'bold', marginBottom: 2 },
  itemDesc: { fontSize: 16, color: '#1e293b', marginBottom: 8 },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 12, color: '#15803d', fontWeight: '600' },
  arrow: { fontSize: 20, color: '#94a3b8', marginLeft: 8 },
  emptyWrap: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, color: '#64748b' },
})
