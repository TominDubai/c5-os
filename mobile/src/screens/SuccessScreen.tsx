import { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../../App'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Success'>
  route: RouteProp<RootStackParamList, 'Success'>
}

export function SuccessScreen({ navigation, route }: Props) {
  const message = route.params?.message

  useEffect(() => {
    const timer = setTimeout(() => navigation.popToTop(), 2500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✅</Text>
      <Text style={styles.title}>Done!</Text>
      <Text style={styles.message}>{message || 'Submitted successfully'}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#0f172a',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  icon: { fontSize: 80, marginBottom: 24 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  message: { fontSize: 18, color: '#94a3b8', textAlign: 'center', lineHeight: 28 },
})
