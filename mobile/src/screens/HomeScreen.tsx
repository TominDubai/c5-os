import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../../App'
import { supabase } from '../lib/supabase'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>
  route: RouteProp<RootStackParamList, 'Home'>
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  operations: 'Operations',
  estimator: 'Estimator',
  design_lead: 'Design Lead',
  designer: 'Designer',
  production_manager: 'Production Manager',
  qs: 'QS',
  stores: 'Stores',
  pm: 'Project Manager',
  site_staff: 'Site Staff',
  driver: 'Driver',
}

export function HomeScreen({ navigation, route }: Props) {
  const { role, name } = route.params

  const signOut = async () => {
    await supabase.auth.signOut()
    navigation.replace('Login')
  }

  const isSiteStaff = ['site_staff', 'pm', 'admin', 'operations'].includes(role)
  const isDriver = ['driver', 'stores', 'admin', 'operations'].includes(role)
  const isQS = ['qs', 'admin', 'operations'].includes(role)

  return (
    <View style={styles.container}>
      <View style={styles.welcome}>
        <Text style={styles.greeting}>Hello, {name.split(' ')[0]} 👋</Text>
        <Text style={styles.roleLabel}>{ROLE_LABELS[role] || role}</Text>
      </View>

      <View style={styles.actions}>
        {isSiteStaff && (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#1e40af' }]}
            onPress={() => navigation.navigate('Projects')}
          >
            <Text style={styles.cardIcon}>📋</Text>
            <Text style={styles.cardTitle}>Daily Report</Text>
            <Text style={styles.cardDesc}>Submit today's site report with photos</Text>
          </TouchableOpacity>
        )}

        {isDriver && (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#7c3aed' }]}
            onPress={() => navigation.navigate('DispatchList')}
          >
            <Text style={styles.cardIcon}>🚚</Text>
            <Text style={styles.cardTitle}>My Deliveries</Text>
            <Text style={styles.cardDesc}>View and confirm today's dispatches</Text>
          </TouchableOpacity>
        )}

        {isQS && (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#0f766e' }]}
            onPress={() => navigation.navigate('QCProjects')}
          >
            <Text style={styles.cardIcon}>✅</Text>
            <Text style={styles.cardTitle}>Site QC</Text>
            <Text style={styles.cardDesc}>Inspect and sign off installed items</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9', padding: 20 },
  welcome: {
    backgroundColor: '#0f172a', borderRadius: 16, padding: 24,
    marginBottom: 24, marginTop: 8,
  },
  greeting: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  roleLabel: { fontSize: 16, color: '#94a3b8', marginTop: 4 },
  actions: { gap: 16 },
  card: {
    borderRadius: 16, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  cardIcon: { fontSize: 40, marginBottom: 12 },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  cardDesc: { fontSize: 15, color: 'rgba(255,255,255,0.8)' },
  signOut: {
    marginTop: 'auto', paddingVertical: 16, alignItems: 'center',
  },
  signOutText: { fontSize: 16, color: '#64748b' },
})
