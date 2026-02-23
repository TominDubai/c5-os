import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, Alert, ActivityIndicator, TextInput,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { RootStackParamList } from '../../App'
import { supabase } from '../lib/supabase'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'QCItem'>
  route: RouteProp<RootStackParamList, 'QCItem'>
}

type QCResult = 'pass' | 'fail' | 'snag' | null

export function QCItemScreen({ navigation, route }: Props) {
  const { itemId, itemCode, description, projectId } = route.params
  const [result, setResult] = useState<QCResult>(null)
  const [notes, setNotes] = useState('')
  const [snagDesc, setSnagDesc] = useState('')
  const [snagSeverity, setSnagSeverity] = useState<'minor' | 'major' | 'critical'>('minor')
  const [photo, setPhoto] = useState<{ uri: string; base64?: string | null } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const takePhoto = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync()
    if (!granted) { Alert.alert('Permission needed', 'Allow camera access'); return }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8, base64: true })
    if (!res.canceled && res.assets[0]) {
      setPhoto({ uri: res.assets[0].uri, base64: res.assets[0].base64 })
    }
  }

  const handleSubmit = async () => {
    if (!result) { Alert.alert('Required', 'Please select Pass, Fail, or Snag'); return }
    if (!photo) { Alert.alert('Required', 'A photo is required for site QC'); return }
    if (result === 'snag' && !snagDesc.trim()) {
      Alert.alert('Required', 'Describe the snag')
      return
    }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      let photoUrl = ''

      // Upload photo
      if (photo.base64) {
        const fileName = `qc/${itemId}/${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('site-photos')
          .upload(fileName, decode(photo.base64), { contentType: 'image/jpeg' })
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('site-photos').getPublicUrl(fileName)
          photoUrl = publicUrl
        }
      }

      const passed = result === 'pass'
      const newStatus = passed ? 'qs_verified' : result === 'snag' ? 'installed' : 'installed'

      await supabase.from('project_items').update({
        site_qc_passed: passed,
        site_qc_at: new Date().toISOString(),
        site_qc_by: user?.id,
        site_qc_notes: notes || null,
        site_qc_photo: photoUrl || null,
        status: newStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', itemId)

      // Raise snag if needed
      if (result === 'snag') {
        const { count } = await supabase
          .from('snags')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId)
        await supabase.from('snags').insert({
          project_id: projectId,
          project_item_id: itemId,
          snag_number: `SNG-${String((count || 0) + 1).padStart(3, '0')}`,
          description: snagDesc,
          severity: snagSeverity,
          photo_path: photoUrl || null,
          status: 'open',
          reported_by: user?.id,
        })
      }

      navigation.replace('Success', {
        message: passed ? `✅ ${itemCode} — Passed!` : `⚠️ ${itemCode} — ${result === 'snag' ? 'Snag raised' : 'Failed'}`,
      })
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit QC')
    } finally {
      setSubmitting(false)
    }
  }

  const RESULT_BUTTONS: { key: QCResult; label: string; color: string; activeColor: string }[] = [
    { key: 'pass', label: '✅ Pass', color: '#f0fdf4', activeColor: '#15803d' },
    { key: 'snag', label: '⚠️ Snag', activeColor: '#d97706', color: '#fffbeb' },
    { key: 'fail', label: '❌ Fail', color: '#fef2f2', activeColor: '#dc2626' },
  ]

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Item header */}
      <View style={styles.itemHeader}>
        <Text style={styles.itemCode}>{itemCode}</Text>
        <Text style={styles.itemDesc}>{description}</Text>
      </View>

      {/* Photo — mandatory */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photo * (required)</Text>
        {photo ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: photo.uri }} style={styles.photo} />
            <TouchableOpacity style={styles.retakeBtn} onPress={takePhoto}>
              <Text style={styles.retakeBtnText}>Retake</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
            <Text style={styles.photoBtnIcon}>📷</Text>
            <Text style={styles.photoBtnText}>Take Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* QC result */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Result *</Text>
        <View style={styles.resultRow}>
          {RESULT_BUTTONS.map(btn => (
            <TouchableOpacity
              key={btn.key}
              style={[
                styles.resultBtn,
                { backgroundColor: result === btn.key ? btn.activeColor : btn.color },
              ]}
              onPress={() => setResult(btn.key)}
            >
              <Text style={[
                styles.resultBtnText,
                { color: result === btn.key ? '#fff' : '#374151' },
              ]}>
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Snag details */}
      {result === 'snag' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Snag Details *</Text>
          <TextInput
            style={styles.textArea}
            value={snagDesc}
            onChangeText={setSnagDesc}
            placeholder="Describe the snag..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Severity</Text>
          <View style={styles.severityRow}>
            {(['minor', 'major', 'critical'] as const).map(s => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.severityBtn,
                  snagSeverity === s && styles.severityBtnActive,
                  s === 'critical' && snagSeverity === s && { backgroundColor: '#dc2626' },
                  s === 'major' && snagSeverity === s && { backgroundColor: '#d97706' },
                  s === 'minor' && snagSeverity === s && { backgroundColor: '#ca8a04' },
                ]}
                onPress={() => setSnagSeverity(s)}
              >
                <Text style={[styles.severityText, snagSeverity === s && { color: '#fff' }]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>QC Notes (optional)</Text>
        <TextInput
          style={styles.textArea}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any additional notes..."
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.submitBtnText}>Submit QC</Text>
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
  itemHeader: { backgroundColor: '#0f172a', borderRadius: 14, padding: 20, marginBottom: 20 },
  itemCode: { fontFamily: 'monospace', fontSize: 15, color: '#0f766e', fontWeight: 'bold', marginBottom: 4 },
  itemDesc: { fontSize: 18, color: '#fff', fontWeight: '600' },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 12 },
  photoBtn: {
    borderWidth: 2, borderColor: '#0f172a', borderStyle: 'dashed',
    borderRadius: 12, padding: 32, alignItems: 'center',
  },
  photoBtnIcon: { fontSize: 40, marginBottom: 8 },
  photoBtnText: { fontSize: 18, fontWeight: '600', color: '#0f172a' },
  photoWrap: { alignItems: 'center' },
  photo: { width: '100%', height: 220, borderRadius: 10, marginBottom: 10 },
  retakeBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#f1f5f9' },
  retakeBtnText: { color: '#334155', fontWeight: '600' },
  resultRow: { flexDirection: 'row', gap: 10 },
  resultBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  resultBtnText: { fontSize: 16, fontWeight: '700' },
  textArea: {
    backgroundColor: '#f8fafc', borderRadius: 10, padding: 14, fontSize: 16,
    color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0', minHeight: 80,
  },
  severityRow: { flexDirection: 'row', gap: 8 },
  severityBtn: {
    flex: 1, padding: 12, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  severityBtnActive: { borderColor: 'transparent' },
  severityText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  submitBtn: { backgroundColor: '#0f172a', borderRadius: 14, padding: 20, alignItems: 'center', marginTop: 4 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
})
