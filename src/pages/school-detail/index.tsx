import { useState } from 'react'
import { View, Text, Textarea } from '@tarojs/components'
import Taro, { useDidShow, getCurrentInstance } from '@tarojs/taro'
import { getSchoolDetail, submitCorrection } from '../../services/school'
import { palette } from '../../theme/palette'
import { DetailSkeleton } from '../../components/common/Skeleton'

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
      backgroundColor: palette.card,
      borderRadius: '18px',
      padding: '14px 16px',
      marginBottom: '12px',
      border: `1px solid ${palette.lineSoft}`,
    }}>
      <View style={{ marginBottom: '6px' }}>
        <Text style={{ fontSize: '13px', color: palette.brand, fontWeight: 'bold' }}>{props.label}</Text>
      </View>
      <Text style={{ fontSize: '15px', color: palette.text, lineHeight: '22px' }}>
        {props.value || '未填写'}
      </Text>
    </View>
  )
}

function Tag(props: { text: string }) {
  return (
    <View style={{ padding: '5px 10px', borderRadius: '999px', backgroundColor: palette.tag, marginRight: '8px', marginBottom: '8px' }}>
      <Text style={{ fontSize: '12px', color: palette.tagText }}>{props.text}</Text>
    </View>
  )
}

export default function SchoolDetailPage() {
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCorrectionForm, setShowCorrectionForm] = useState(false)
  const [correctionText, setCorrectionText] = useState('')
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false)
  const [correctionDone, setCorrectionDone] = useState(false)

  const loadDetail = async (options: { forceRefresh?: boolean } = {}) => {
    try {
      setLoading(true)
      setError('')
      const id = Number(getCurrentInstance().router?.params?.id || 0)
      const result = await getSchoolDetail(id, { forceRefresh: !!options.forceRefresh })
      const nextSchool = result?.school || null
      setSchool(nextSchool)
      if (!result?.ok || !nextSchool) {
        setError(result?.message || '未找到该学习社区')
      }
    } catch (err: any) {
      console.error('loadDetail error:', err)
      setError(err?.message || '读取学习社区详情失败')
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    loadDetail()
    setShowCorrectionForm(false)
    setCorrectionText('')
    setCorrectionDone(false)
  })

  const handleSubmitCorrection = async () => {
    const text = correctionText.trim()
    if (!text) {
      Taro.showToast({ title: '请填写修正内容', icon: 'none' })
      return
    }
    if (!school) return

    try {
      setCorrectionSubmitting(true)
      const result = await submitCorrection(school.id, school.name, text)
      if (result?.ok) {
        setCorrectionDone(true)
        setCorrectionText('')
        Taro.showToast({ title: '提交成功，感谢反馈', icon: 'success' })
      } else {
        Taro.showToast({ title: result?.message || '提交失败，请稍后重试', icon: 'none' })
      }
    } catch (err: any) {
      console.error('submitCorrection error:', err)
      Taro.showToast({ title: '提交失败，请稍后重试', icon: 'none' })
    } finally {
      setCorrectionSubmitting(false)
    }
  }

  return (
    <View style={{ padding: '16px', backgroundColor: palette.bg, minHeight: '100vh', boxSizing: 'border-box' }}>
      {loading && <DetailSkeleton />}

      {!loading && error && (
        <View style={{ padding: '12px', marginBottom: '16px', backgroundColor: palette.errorSoft, borderRadius: '14px', border: `1px solid ${palette.line}` }}>
          <Text style={{ color: palette.error }}>{error}</Text>
          <View onClick={() => loadDetail({ forceRefresh: true })} style={{ marginTop: '10px', backgroundColor: palette.accentSoft, borderRadius: '12px', padding: '8px 12px', alignSelf: 'flex-start' }}>
            <Text style={{ color: palette.accentDeep, fontSize: '12px', fontWeight: 'bold' }}>重新加载</Text>
          </View>
        </View>
      )}

      {!loading && !error && !school && <Text style={{ color: palette.subtext }}>未找到该学习社区</Text>}

      {!loading && !error && school && (
        <>
          <View style={{ backgroundColor: palette.card, borderRadius: '22px', padding: '18px 16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '12px' }}>
              <View style={{ width: '42px', height: '42px', borderRadius: '15px', backgroundColor: palette.tag, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px', border: `1px solid ${palette.line}` }}>
                <Text style={{ fontSize: '20px' }}>🏫</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: '22px', fontWeight: 'bold', color: palette.text, lineHeight: '30px' }}>{school.name}</Text>
              </View>
            </View>

            <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: school.official_url ? '10px' : '0' }}>
              <Tag text={[school.province, school.city].filter(Boolean).join(' ') || '地区未填写'} />
              {!!school.school_type && <Tag text={school.school_type} />}
              {!!school.age_range && <Tag text={school.age_range} />}
            </View>

            {!!school.official_url && (
              <View onClick={() => Taro.setClipboardData({ data: school.official_url || '' })} style={{ backgroundColor: palette.surface, borderRadius: '16px', padding: '12px', display: 'flex', flexDirection: 'row', alignItems: 'center', border: `1px solid ${palette.line}` }}>
                <View style={{ flex: 1, paddingRight: '10px' }}>
                  <Text style={{ fontSize: '12px', color: palette.brand, fontWeight: 'bold' }}>官方/说明链接</Text>
                  <View style={{ marginTop: '4px' }}>
                    <Text style={{ fontSize: '13px', color: palette.text, lineHeight: '20px' }}>{school.official_url}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: '11px', color: palette.muted }}>点击复制</Text>
              </View>
            )}
          </View>

          <InfoRow label='公开说明' value={school.xuji_note} />
          <InfoRow label='参与前了解' value={school.residency_req} />
          <InfoRow label='参与方式参考' value={school.admission_req} />
          <InfoRow label='参考费用' value={school.fee} />
          <InfoRow label='相关说明' value={school.output_direction} />

          <View style={{ backgroundColor: palette.card, borderRadius: '22px', padding: '16px', marginTop: '6px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
            {!showCorrectionForm && !correctionDone && (
              <View onClick={() => setShowCorrectionForm(true)} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: '16px', marginRight: '8px' }}>✏️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: '14px', color: palette.text, fontWeight: 'bold' }}>信息有误？帮我们完善</Text>
                  <View style={{ marginTop: '2px' }}>
                    <Text style={{ fontSize: '12px', color: palette.subtext }}>补充、修正或更新这个学习社区的信息</Text>
                  </View>
                </View>
                <View style={{ padding: '7px 14px', borderRadius: '999px', backgroundColor: palette.brandSoft }}>
                  <Text style={{ fontSize: '12px', color: palette.brand, fontWeight: 'bold' }}>填写</Text>
                </View>
              </View>
            )}

            {showCorrectionForm && !correctionDone && (
              <View>
                <View style={{ marginBottom: '10px' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: palette.text }}>✏️ 补充或修正信息</Text>
                </View>
                <View style={{ marginBottom: '8px' }}>
                  <Text style={{ fontSize: '12px', color: palette.subtext, lineHeight: '18px' }}>请描述需要修正或补充的内容，例如：费用有调整、参与方式有变化、名称已更新、官网地址有误等。提交后我们会核实更新。</Text>
                </View>
                <Textarea
                  value={correctionText}
                  onInput={(e) => setCorrectionText(e.detail.value)}
                  placeholder='请输入需要修正或补充的信息...'
                  maxlength={500}
                  style={{ width: '100%', minHeight: '100px', padding: '12px', backgroundColor: palette.surface, borderRadius: '14px', border: `1px solid ${palette.line}`, fontSize: '14px', color: palette.text, lineHeight: '21px', boxSizing: 'border-box' }}
                />
                <View style={{ marginTop: '4px', marginBottom: '12px' }}>
                  <Text style={{ fontSize: '11px', color: palette.muted }}>{correctionText.length}/500</Text>
                </View>
                <View style={{ display: 'flex', flexDirection: 'row' }}>
                  <View onClick={() => { setShowCorrectionForm(false); setCorrectionText('') }} style={{ padding: '8px 16px', borderRadius: '999px', backgroundColor: palette.tag, marginRight: '10px' }}>
                    <Text style={{ fontSize: '13px', color: palette.tagText }}>取消</Text>
                  </View>
                  <View onClick={correctionSubmitting ? undefined : handleSubmitCorrection} style={{ padding: '8px 20px', borderRadius: '999px', backgroundColor: correctionSubmitting ? palette.muted : palette.brand }}>
                    <Text style={{ fontSize: '13px', color: '#FFF', fontWeight: 'bold' }}>{correctionSubmitting ? '提交中...' : '提交'}</Text>
                  </View>
                </View>
              </View>
            )}

            {correctionDone && (
              <View style={{ textAlign: 'center', padding: '8px 0' }}>
                <Text style={{ fontSize: '16px', marginBottom: '6px' }}>✅</Text>
                <View><Text style={{ fontSize: '14px', color: palette.green, fontWeight: 'bold' }}>感谢反馈！我们会尽快核实</Text></View>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  )
}
