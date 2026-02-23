import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert, ActivityIndicator,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { RootStackParamList } from '../../App'
import { supabase } from '../lib/supabase'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DailyReport'>
  route: RouteProp<RootStackParamList, 'DailyReport'>
}

interface Photo { uri: string; base64?: string | null }

const WEATHER_OPTIONS = ['sunny', 'cloudy', 'rainy', 'hot', 'windy']
const WEATHER_ICONS: Record<string, string> = {
  sunny: '☀️', cloudy: '☁️', rainy: '🌧️', hot: '🌡️', windy: '💨',
}

export function DailyReportScreen({ navigation, route }: Props) {
  const { projectId, projectName } = route.params
  const [weather, setWeather] = useState('')
  const [workCompleted, setWorkCompleted] = useState('')
  const [attendance, setAttendance] = useState('')
  const [issues, setIssues] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [submitting, setSubmitting] = useState(false)

  const takePhoto = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync()
    if (!granted) { Alert.alert('Permission needed', 'Allow camera access to take photos'); return }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true })
    if (!result.canceled && result.assets[0]) {
      setPhotos(p => [...p, { uri: result.assets[0].uri, base64: result.assets[0].base64 }])
    }
  }

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7, base64: true, allowsMultipleSelection: true,
    })
    if (!result.canceled) {
      setPhotos(p => [...p, ...result.assets.map(a => ({ uri: a.uri, base64: a.base64 }))])
    }
  }

  const handleSubmit = async () => {
    if (!workCompleted.trim()) {
      Alert.alert('Required', 'Please describe the work completed today')
      return
    }
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const today = new Date().toISOString().split('T')[0]

      const { data: report, error } = await supabase.from('daily_reports').upsert({
        project_id: projectId,
        report_date: today,
        weather: weather || null,
        work_completed: workCompleted.trim(),
        issues: issues.trim() || null,
        attendance_count: attendance ? parseInt(attendance) : null,
        submitted_by: user?.id,
      }, { onConflict: 'project_id,report_date,submitted_by' }).select().single()

      if (error) throw error

      // Upload photos to Supabase storage
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i]
        if (photo.base64) {
          const fileName = `daily-reports/${report.id}/${Date.now()}-${i}.jpg`
          const { error: uploadError } = await supabase.storage
            .from('site-photos')
            .upload(fileName, decode(photo.base64), { contentType: 'image/jpeg' })
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('site-photos').getPublicUrl(fileName)
            await supabase.from('daily_report_photos').insert({
              daily_report_id: report.id,
              file_path: publicUrl,
            })
          }
        }
      }

      navigation.replace('Success', { message: 'Daily report submitted!' })
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.projectName}>{projectName}</Text>
      <Text style={styles.date}>
        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
      </Text>

      {/* Weather */}
      <View style={styles.field}>
        <Text style={styles.label}>Weather</Text>
        <View style={styles.weatherRow}>
          {WEATHER_OPTIONS.map(w => (
            <TouchableOpacity
              key={w}
              style={[styles.weatherBtn, weather === w && styles.weatherBtnActive]}
              onPress={() => setWeather(w === weather ? '' : w)}
            >
              <Text style={styles.weatherIcon}>{WEATHER_ICONS[w]}</Text>
              <Text style={[styles.weatherLabel, weather === w && styles.weatherLabelActive]}>{w}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Staff count */}
      <View style={styles.field}>
        <Text style={styles.label}>Staff on Site</Text>
        <TextInput
          style={styles.input}
          value={attendance}
          onChangeText={setAttendance}
          placeholder="0"
          placeholderTextColor="#94a3b8"
          keyboardType="number-pad"
        />
      </View>

      {/* Work completed */}
      <View style={styles.field}>
        <Text style={styles.label}>Work Completed Today *</Text>
        <TextInput
          style={styles.textArea}
          value={workCompleted}
          onChangeText={setWorkCompleted}
          placeholder="Describe what was done today..."
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
      </View>

      {/* Issues */}
      <View style={styles.field}>
        <Text style={styles.label}>Issues / Delays</Text>
        <TextInput
          style={[styles.textArea, { minHeight: 80 }]}
          value={issues}
          onChangeText={setIssues}
          placeholder="Any problems or delays? (optional)"
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Photos */}
      <View style={styles.field}>
        <Text style={styles.label}>Photos ({photos.length})</Text>
        <View style={styles.photoButtons}>
          <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
            <Text style={styles.photoBtnText}>📷 Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
            <Text style={styles.photoBtnText}>🖼️ Gallery</Text>
          </TouchableOpacity>
        </View>
        {photos.length > 0 && (
          <View style={styles.photoGrid}>
            {photos.map((p, i) => (
              <View key={i} style={styles.photoWrap}>
                <Image source={{ uri: p.uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => setPhotos(ph => ph.filter((_, j) => j !== i))}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.submitBtnText}>Submit Report</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  )
}

function decode(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { padding: 20, paddingBottom: 48 },
  projectName: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', textAlign: 'center' },
  date: { fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 4, marginBottom: 24 },
  field: { marginBottom: 20 },
  label: { fontSize: 17, fontWeight: '600', color: '#374151', marginBottom: 10 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 18,
    color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0',
  },
  textArea: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 17,
    color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0', minHeight: 120,
  },
  weatherRow: { flexDirection: 'row', gap: 8 },
  weatherBtn: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10,
    alignItems: 'center', borderWidth: 2, borderColor: '#e2e8f0',
  },
  weatherBtnActive: { borderColor: '#0f172a', backgroundColor: '#0f172a' },
  weatherIcon: { fontSize: 22, marginBottom: 4 },
  weatherLabel: { fontSize: 11, color: '#64748b', textTransform: 'capitalize' },
  weatherLabelActive: { color: '#fff' },
  photoButtons: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  photoBtn: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 2, borderColor: '#0f172a', borderStyle: 'dashed',
  },
  photoBtnText: { fontSize: 17, fontWeight: '600', color: '#0f172a' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoWrap: { position: 'relative' },
  photo: { width: 96, height: 96, borderRadius: 8 },
  removeBtn: {
    position: 'absolute', top: -8, right: -8, backgroundColor: '#ef4444',
    borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
  },
  removeBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  submitBtn: {
    backgroundColor: '#15803d', borderRadius: 14, padding: 20,
    alignItems: 'center', marginTop: 16,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
})
