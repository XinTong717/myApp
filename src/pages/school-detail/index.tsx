import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { useDidShow, getCurrentInstance } from '@tarojs/taro'
import { fetchSchoolById } from '../../services/api'

type School = {
  id: number
  name: string
  province?: string
  city?: string
  age_range?: string
  school_type?: string
  has_xuji?: boolean
  xuji_note?: string
  residency_req?: string
  admission_req?: string
  fee?: string
  output_direction?: string
  official_url?: string
}

export default function SchoolDetailPage() {
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDetail = async () => {
    try {
      setLoading(true)
      setError('')

      const id = Number(getCurrentInstance().router?.params?.id || 0)
      console.log('school detail id:', id)

      const found = await fetchSchoolById(id)
      setSchool(found)
    } catch (err: any) {
      console.error('loadDetail error:', err)
      setError(err?.message || '读取学校详情失败')
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    loadDetail()
  })

  return (
    <View style={{ padding: '16px', backgroundColor: '#f7f7f7', minHeight: '100vh' }}>
      {loading ? <Text>加载中...</Text> : null}

      {error ? (
        <View
          style={{
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#fff1f0',
            borderRadius: '10px',
          }}
        >
          <Text style={{ color: '#cf1322' }}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && !school ? <Text>未找到该学校</Text> : null}

      {!loading && school ? (
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '16px',
          }}
        >
          <View style={{ marginBottom: '12px' }}>
            <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#111111' }}>
              {school.name}
            </Text>
          </View>

          <View style={{ marginBottom: '10px' }}>
            <Text style={{ color: '#444444' }}>
              地区：{school.province || '未知'} {school.city || ''}
            </Text>
          </View>

          <View style={{ marginBottom: '10px' }}>
            <Text style={{ color: '#444444' }}>
              类型：{school.school_type || '未填写'}
            </Text>
          </View>

          <View style={{ marginBottom: '10px' }}>
            <Text style={{ color: '#444444' }}>
              年龄段：{school.age_range || '未填写'}
            </Text>
          </View>

          <View style={{ marginBottom: '10px' }}>
            <Text style={{ color: '#444444' }}>
              学籍：{school.has_xuji ? '有/可处理' : '未填写或无'}
            </Text>
          </View>

          <View style={{ marginBottom: '10px' }}>
            <Text style={{ color: '#444444' }}>
              学籍说明：{school.xuji_note || '未填写'}
            </Text>
          </View>

          <View style={{ marginBottom: '10px' }}>
            <Text style={{ color: '#444444' }}>
              户籍要求：{school.residency_req || '未填写'}
            </Text>
          </View>

          <View style={{ marginBottom: '10px' }}>
            <Text style={{ color: '#444444' }}>
              入学要求：{school.admission_req || '未填写'}
            </Text>
          </View>

          <View style={{ marginBottom: '10px' }}>
            <Text style={{ color: '#444444' }}>
              费用：{school.fee || '未填写'}
            </Text>
          </View>

          <View style={{ marginBottom: '10px' }}>
            <Text style={{ color: '#444444' }}>
              去向：{school.output_direction || '未填写'}
            </Text>
          </View>

          <View>
            <Text style={{ color: '#444444' }}>
              官网：{school.official_url || '未填写'}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  )
}