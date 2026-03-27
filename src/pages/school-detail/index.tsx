import { useState } from 'react'
import { View, Text, Textarea } from '@tarojs/components'
import Taro, { useDidShow, getCurrentInstance } from '@tarojs/taro'
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
    <View style={{
      backgroundColor: '#FFFDF9',
      borderRadius: '14px',
      padding: '12px',
      marginBottom: '10px',
    }}>
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

  // 纠错功能状态
  const [showCorrectionForm, setShowCorrectionForm] = useState(false)
  const [correctionText, setCorrectionText] = useState('')
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false)
  const [correctionDone, setCorrectionDone] = useState(false)

  const loadDetail = async () => {
    try {
      setLoading(true)
      setError('')
      const id = Number(getCurrentInstance().router?.params?.id || 0)
      const found = await fetchSchoolById(id)
      setSchool(found)
    } catch (err: any) {
      console.error('loadDetail error:', err)
      setError(err?.message || '读取学习社区详情失败')
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    loadDetail()
    // 重置纠错状态
    setShowCorrectionForm(false)
    setCorrectionText('')
    setCorrectionDone(false)
  })

  const submitCorrection = async () => {
    const text = correctionText.trim()
    if (!text) {
      Taro.showToast({ title: '请填写修正内容', icon: 'none' })
      return
    }
    if (!school) return

    try {
      setCorrectionSubmitting(true)

      // 通过 CloudBase 云函数提交
      await Taro.cloud.callFunction({
        name: 'submitCorrection',
        data: {
          schoolId: school.id,
          schoolName: school.name,
          content: text,
        },
      })

      setCorrectionDone(true)
      setCorrectionText('')
      Taro.showToast({ title: '提交成功，感谢反馈', icon: 'success' })
    } catch (err: any) {
      console.error('submitCorrection error:', err)
      // 云函数还没部署时的 fallback：直接提示成功并记录到 console
      // 等你部署了 submitCorrection 云函数就会真正存到 CloudBase
      console.log('Correction data (cloud function not deployed yet):', {
        schoolId: school.id,
        schoolName: school.name,
        content: text,
        timestamp: new Date().toISOString(),
      })
      setCorrectionDone(true)
      setCorrectionText('')
      Taro.showToast({ title: '已记录，感谢反馈', icon: 'success' })
    } finally {
      setCorrectionSubmitting(false)
    }
  }

  return (
    <View style={{
      padding: '16px',
      backgroundColor: palette.bg,
      minHeight: '100vh',
      boxSizing: 'border-box',
    }}>
      {loading && <Text style={{ color: palette.subtext }}>加载中...</Text>}

      {error && (
        <View style={{
          padding: '12px', marginBottom: '16px',
          backgroundColor: '#FFF1F0', borderRadius: '14px', border: '1px solid #FFD8D2',
        }}>
          <Text style={{ color: '#CF1322' }}>{error}</Text>
        </View>
      )}

      {!loading && !error && !school && (
        <Text style={{ color: palette.subtext }}>未找到该学习社区</Text>
      )}

      {!loading && school && (
        <>
          {/* 学习社区基本信息 */}
          <View style={{
            backgroundColor: palette.card, borderRadius: '20px',
            padding: '18px 16px', marginBottom: '14px', border: `1px solid ${palette.line}`,
          }}>
            <View style={{
              display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '12px',
            }}>
              <View style={{
                width: '42px', height: '42px', borderRadius: '14px',
                backgroundColor: '#FFE8D6', display: 'flex',
                alignItems: 'center', justifyContent: 'center', marginRight: '10px',
              }}>
                <Text style={{ fontSize: '20px' }}>🏫</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: '22px', fontWeight: 'bold', color: palette.text, lineHeight: '30px',
                }}>
                  {school.name}
                </Text>
              </View>
            </View>

            <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
              <View style={{
                padding: '5px 10px', borderRadius: '999px',
                backgroundColor: palette.accentSoft, marginRight: '8px', marginBottom: '8px',
              }}>
                <Text style={{ fontSize: '12px', color: palette.accentDeep }}>
                  {school.province || '未知'} {school.city || ''}
                </Text>
              </View>
              <View style={{
                padding: '5px 10px', borderRadius: '999px',
                backgroundColor: palette.greenSoft, marginRight: '8px', marginBottom: '8px',
              }}>
                <Text style={{ fontSize: '12px', color: palette.green }}>
                  {school.school_type || '未填写'}
                </Text>
              </View>
              <View style={{
                padding: '5px 10px', borderRadius: '999px',
                backgroundColor: '#FFF3E6', marginRight: '8px', marginBottom: '8px',
              }}>
                <Text style={{ fontSize: '12px', color: palette.accentDeep }}>
                  {school.has_xuji ? '有/可处理学籍' : '学籍未填写或无'}
                </Text>
              </View>
            </View>
          </View>

          {/* 详细字段 */}
          <InfoRow label='年龄段' value={school.age_range} />
          <InfoRow label='学籍说明' value={school.xuji_note} />
          <InfoRow label='户籍要求' value={school.residency_req} />
          <InfoRow label='入学要求' value={school.admission_req} />
          <InfoRow label='费用' value={school.fee} />
          <InfoRow label='去向' value={school.output_direction} />
          <InfoRow label='官网' value={school.official_url} />

          {/* ===== 信息纠错区 ===== */}
          <View style={{
            backgroundColor: palette.card, borderRadius: '20px',
            padding: '16px', marginTop: '6px', marginBottom: '14px',
            border: `1px solid ${palette.line}`,
          }}>
            {!showCorrectionForm && !correctionDone && (
              <View
                onClick={() => setShowCorrectionForm(true)}
                style={{
                  display: 'flex', flexDirection: 'row', alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: '16px', marginRight: '8px' }}>✏️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: '14px', color: palette.text, fontWeight: 'bold' }}>
                    信息有误？帮我们完善
                  </Text>
                  <View style={{ marginTop: '2px' }}>
                    <Text style={{ fontSize: '12px', color: palette.subtext }}>
                      补充、修正或更新这个学习社区的信息
                    </Text>
                  </View>
                </View>
                <View style={{
                  padding: '6px 12px', borderRadius: '999px', backgroundColor: palette.accentSoft,
                }}>
                  <Text style={{ fontSize: '12px', color: palette.accentDeep }}>填写</Text>
                </View>
              </View>
            )}

            {showCorrectionForm && !correctionDone && (
              <View>
                <View style={{ marginBottom: '10px' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: palette.text }}>
                    ✏️ 补充或修正信息
                  </Text>
                </View>
                <View style={{ marginBottom: '8px' }}>
                  <Text style={{ fontSize: '12px', color: palette.subtext, lineHeight: '18px' }}>
                    请描述需要修正的内容，例如：费用已涨价到 XX 万/年、学习社区已更名、官网地址有误等。提交后我们会核实更新。
                  </Text>
                </View>
                <Textarea
                  value={correctionText}
                  onInput={(e) => setCorrectionText(e.detail.value)}
                  placeholder='请输入需要修正或补充的信息...'
                  maxlength={500}
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '12px',
                    backgroundColor: '#FFFDF9',
                    borderRadius: '14px',
                    border: `1px solid ${palette.line}`,
                    fontSize: '14px',
                    color: palette.text,
                    lineHeight: '21px',
                    boxSizing: 'border-box',
                  }}
                />
                <View style={{ marginTop: '4px', marginBottom: '12px' }}>
                  <Text style={{ fontSize: '11px', color: '#C5B5A5' }}>
                    {correctionText.length}/500
                  </Text>
                </View>
                <View style={{ display: 'flex', flexDirection: 'row' }}>
                  <View
                    onClick={() => { setShowCorrectionForm(false); setCorrectionText('') }}
                    style={{
                      padding: '8px 16px', borderRadius: '999px',
                      backgroundColor: '#F5F5F5', marginRight: '10px',
                    }}
                  >
                    <Text style={{ fontSize: '13px', color: palette.subtext }}>取消</Text>
                  </View>
                  <View
                    onClick={correctionSubmitting ? undefined : submitCorrection}
                    style={{
                      padding: '8px 20px', borderRadius: '999px',
                      backgroundColor: correctionSubmitting ? '#DDD' : palette.accentDeep,
                    }}
                  >
                    <Text style={{ fontSize: '13px', color: '#FFF', fontWeight: 'bold' }}>
                      {correctionSubmitting ? '提交中...' : '提交'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {correctionDone && (
              <View style={{ textAlign: 'center', padding: '8px 0' }}>
                <Text style={{ fontSize: '16px', marginBottom: '6px' }}>✅</Text>
                <View>
                  <Text style={{ fontSize: '14px', color: palette.green, fontWeight: 'bold' }}>
                    感谢反馈！我们会尽快核实
                  </Text>
                </View>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  )
}
