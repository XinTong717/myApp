import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { fetchSchools } from '@/services/api'

type School = {
  id: number
  name: string
  province?: string
  city?: string
  age_range?: string
  school_type?: string
  has_xuji?: boolean
  fee?: string
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadSchools = async () => {
    try {
      console.log('loadSchools start')
      setLoading(true)
      setError('')

      const data = await fetchSchools()
      const list = Array.isArray(data) ? data : []

      console.log('schools length:', list.length)
      console.log('schools first item:', list[0])

      setSchools(list)
    } catch (err: any) {
      console.error('loadSchools error:', err)
      setError(err?.message || '读取学校数据失败')
      Taro.showToast({
        title: '学校数据读取失败',
        icon: 'none',
      })
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    loadSchools()
  })

  return (
    <View style={{ padding: '16px', backgroundColor: '#f7f7f7', minHeight: '100vh' }}>
      <View style={{ marginBottom: '12px' }}>
        <Text style={{ fontSize: '20px', fontWeight: 'bold' }}>学校库</Text>
      </View>

      <View style={{ marginBottom: '16px' }}>
        <Text style={{ color: '#666' }}>
          {loading ? '加载中...' : `共 ${schools.length} 所学校`}
        </Text>
      </View>

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

      {!loading && schools.length === 0 ? (
        <View
          style={{
            padding: '16px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
          }}
        >
          <Text>暂无学校数据</Text>
        </View>
      ) : null}

      {schools.map((item) => (
        <View
          key={item.id}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '14px',
            marginBottom: '12px',
            boxSizing: 'border-box',
          }}
        >
          <View style={{ marginBottom: '8px' }}>
            <Text style={{ fontSize: '16px', fontWeight: 'bold', color: '#111111' }}>
              {item.name}
            </Text>
          </View>

          <View style={{ marginBottom: '6px' }}>
            <Text style={{ color: '#444444' }}>
              地区：{item.province || '未知'} {item.city || ''}
            </Text>
          </View>

          <View style={{ marginBottom: '6px' }}>
            <Text style={{ color: '#444444' }}>
              类型：{item.school_type || '未填写'}
            </Text>
          </View>

          <View style={{ marginBottom: '6px' }}>
            <Text style={{ color: '#444444' }}>
              年龄段：{item.age_range || '未填写'}
            </Text>
          </View>

          <View style={{ marginBottom: '6px' }}>
            <Text style={{ color: '#444444' }}>
              学籍：{item.has_xuji ? '有/可处理' : '未填写或无'}
            </Text>
          </View>

          <View>
            <Text style={{ color: '#444444' }}>
              费用：{item.fee || '未填写'}
            </Text>
          </View>
        </View>
      ))}
    </View>
  )
}