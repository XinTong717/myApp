import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { useDidShow, getCurrentInstance } from '@tarojs/taro'
import { fetchSchoolById } from '../../services/api'

const palette = {
  bg: '#FFF9F2',
  card: '#FFFFFF',
  cardSoft: '#FFF3E6',
  text: '#2F241B',
  subtext: '#7A6756',
  accentDeep: '#E76F51',
  accentSoft: '#FCE6D6',
  line: '#F1DFCF',
  green: '#7BAE7F',
  greenSoft: '#EEF7EE',
}

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

function InfoRow(props: { label: string; value?: string }) {
  return (
    <View
      style={{
        backgroundColor: '#FFFDF9',
        borderRadius: '14px',
        padding: '12px',
        marginBottom: '10px',
      }}
    >
      <View style={{ marginBottom: '4px' }}>
        <Text style={{ fontSize: '12px', color: palette.accentDeep }}>{props.label}</Text>
      </View>
      <Text style={{ fontSize: '14px', color: palette.text, lineHeight: '21px' }}>
        {props.value || '未填写'}
      </Text>
    </View>
  )
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
    <View
      style={{
        padding: '16px',
        backgroundColor: palette.bg,
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      {loading ? (
        <Text style={{ color: palette.subtext }}>加载中...</Text>
      ) : null}

      {error ? (
        <View
          style={{
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#FFF1F0',
            borderRadius: '14px',
            border: '1px solid #FFD8D2',
          }}
        >
          <Text style={{ color: '#CF1322' }}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && !school ? (
        <Text style={{ color: palette.subtext }}>未找到该学校</Text>
      ) : null}

      {!loading && school ? (
        <>
          <View
            style={{
              backgroundColor: palette.card,
              borderRadius: '20px',
              padding: '18px 16px',
              marginBottom: '14px',
              border: `1px solid ${palette.line}`,
            }}
          >
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <View
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '14px',
                  backgroundColor: '#FFE8D6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '10px',
                }}
              >
                <Text style={{ fontSize: '20px' }}>🏫</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: '22px',
                    fontWeight: 'bold',
                    color: palette.text,
                    lineHeight: '30px',
                  }}
                >
                  {school.name}
                </Text>
              </View>
            </View>

            <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
              <View
                style={{
                  padding: '5px 10px',
                  borderRadius: '999px',
                  backgroundColor: palette.accentSoft,
                  marginRight: '8px',
                  marginBottom: '8px',
                }}
              >
                <Text style={{ fontSize: '12px', color: palette.accentDeep }}>
                  {school.province || '未知'} {school.city || ''}
                </Text>
              </View>

              <View
                style={{
                  padding: '5px 10px',
                  borderRadius: '999px',
                  backgroundColor: palette.greenSoft,
                  marginRight: '8px',
                  marginBottom: '8px',
                }}
              >
                <Text style={{ fontSize: '12px', color: palette.green }}>
                  {school.school_type || '未填写'}
                </Text>
              </View>

              <View
                style={{
                  padding: '5px 10px',
                  borderRadius: '999px',
                  backgroundColor: '#FFF3E6',
                  marginRight: '8px',
                  marginBottom: '8px',
                }}
              >
                <Text style={{ fontSize: '12px', color: palette.accentDeep }}>
                  {school.has_xuji ? '有/可处理学籍' : '学籍未填写或无'}
                </Text>
              </View>
            </View>
          </View>

          <InfoRow label='年龄段' value={school.age_range} />
          <InfoRow label='学籍说明' value={school.xuji_note} />
          <InfoRow label='户籍要求' value={school.residency_req} />
          <InfoRow label='入学要求' value={school.admission_req} />
          <InfoRow label='费用' value={school.fee} />
          <InfoRow label='去向' value={school.output_direction} />
          <InfoRow label='官网' value={school.official_url} />
        </>
      ) : null}
    </View>
  )
}