import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Input, Textarea, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { LOCATION_DATA, PROVINCES } from '../../../constants/location'
import { submitSchool } from '../../../services/school'
import SectionTitle from '../../../components/profile/SectionTitle'
import { palette } from '../../../theme/palette'
import { space } from '../../../theme/spacing'
import { typography } from '../../../theme/typography'
import { MultiPillSelect } from '../../../components/common/PillSelect'
import AppPage from '../../../components/common/AppPage'
import AppCard from '../../../components/common/AppCard'
import AppPromptBanner from '../../../components/common/AppPromptBanner'
import AppPrimaryButton from '../../../components/common/AppPrimaryButton'
import FormInputBox from '../../../components/common/FormInputBox'

const SCHOOL_TYPE_OPTIONS = ['项目制学习', '线下社区', '线上社区', '混合型', '家庭共学', '其他']
const AGE_RANGE_OPTIONS = ['学龄前', '小学阶段', '中学阶段', '混龄', '成人为主', '其他']

type FocusField =
  | 'name'
  | 'customCity'
  | 'schoolTypeOther'
  | 'ageRangeOther'
  | 'officialUrl'
  | 'xujiNote'
  | 'residencyReq'
  | 'admissionReq'
  | 'feeNote'
  | 'outputDirection'
  | 'sourceNote'
  | 'recommendationNote'
  | ''

type PickerMultiChangeEvent = { detail: { value: number[] } }
type PickerColumnChangeEvent = { detail: { column: number; value: number } }

function setBeforeUnloadAlert(enabled: boolean, message: string) {
  const taroAny = Taro as any
  try {
    if (enabled && taroAny.enableAlertBeforeUnload) taroAny.enableAlertBeforeUnload({ message })
    else if (!enabled && taroAny.disableAlertBeforeUnload) taroAny.disableAlertBeforeUnload()
  } catch (err) {
    console.warn('setBeforeUnloadAlert skipped:', err)
  }
}

async function showSubmittedModal() {
  await Taro.showModal({
    title: '已进入审核',
    content: '你的学习社区推荐已提交到人工审核队列，通常不会立即展示。审核通过后才会出现在学习社区库中。',
    showCancel: false,
    confirmText: '知道了',
  })
  Taro.navigateBack()
}

export default function SubmitSchoolPage() {
  const [submitting, setSubmitting] = useState(false)
  const submitLockRef = useRef(false)
  const submittedRef = useRef(false)
  const [focusedField, setFocusedField] = useState<FocusField>('')
  const [name, setName] = useState('')
  const [province, setProvince] = useState('')
  const [cityOption, setCityOption] = useState('')
  const [customCity, setCustomCity] = useState('')
  const [schoolType, setSchoolType] = useState<string[]>([])
  const [schoolTypeOther, setSchoolTypeOther] = useState('')
  const [ageRange, setAgeRange] = useState<string[]>([])
  const [ageRangeOther, setAgeRangeOther] = useState('')
  const [officialUrl, setOfficialUrl] = useState('')
  const [xujiNote, setXujiNote] = useState('')
  const [residencyReq, setResidencyReq] = useState('')
  const [admissionReq, setAdmissionReq] = useState('')
  const [feeNote, setFeeNote] = useState('')
  const [outputDirection, setOutputDirection] = useState('')
  const [sourceNote, setSourceNote] = useState('')
  const [recommendationNote, setRecommendationNote] = useState('')

  const currentCity = cityOption === '其他' ? customCity.trim() : cityOption
  const hasUnsavedContent = !!(
    name.trim() || province || cityOption || customCity.trim() || schoolType.length > 0 || schoolTypeOther.trim() ||
    ageRange.length > 0 || ageRangeOther.trim() || officialUrl.trim() || xujiNote.trim() || residencyReq.trim() || admissionReq.trim() ||
    feeNote.trim() || outputDirection.trim() || sourceNote.trim() || recommendationNote.trim()
  )

  useEffect(() => {
    const shouldWarn = hasUnsavedContent && !submitting && !submittedRef.current
    setBeforeUnloadAlert(shouldWarn, '你填写的学习社区推荐还没有提交，确定要离开吗？')
    return () => setBeforeUnloadAlert(false, '')
  }, [hasUnsavedContent, submitting])

  const pickerRange = useMemo(() => {
    const cities = province ? (LOCATION_DATA[province] || ['其他']) : ['请先选择省份']
    return [PROVINCES, cities]
  }, [province])

  const pickerValue = useMemo(() => {
    const provIdx = Math.max(0, PROVINCES.indexOf(province))
    const cities = province ? (LOCATION_DATA[province] || []) : []
    const normalizedCityOption = cityOption || (cities[0] || '')
    return [provIdx, Math.max(0, cities.indexOf(normalizedCityOption))]
  }, [province, cityOption])

  const handlePickerChange = (e: PickerMultiChangeEvent) => {
    const [provIdx, cityIdx] = e.detail.value
    const nextProvince = PROVINCES[provIdx] || ''
    const cities = LOCATION_DATA[nextProvince] || []
    const nextCityOption = cities[cityIdx] || ''
    setProvince(nextProvince)
    setCityOption(nextCityOption)
    if (nextCityOption !== '其他') setCustomCity('')
  }

  const handlePickerColumnChange = (e: PickerColumnChangeEvent) => {
    if (e.detail.column === 0) {
      const nextProvince = PROVINCES[e.detail.value] || ''
      const firstCity = (LOCATION_DATA[nextProvince] || [])[0] || ''
      setProvince(nextProvince)
      setCityOption(firstCity)
      setCustomCity('')
    }
  }

  const handleSubmit = async () => {
    if (submitLockRef.current || submitting) return

    if (!name.trim()) { Taro.showToast({ title: '请填写学习社区名称', icon: 'none' }); return }
    if (!province || !currentCity) { Taro.showToast({ title: '请选择所在城市', icon: 'none' }); return }
    if (cityOption === '其他' && !customCity.trim()) { Taro.showToast({ title: '请输入真实城市名', icon: 'none' }); return }
    if (schoolType.includes('其他') && !schoolTypeOther.trim()) { Taro.showToast({ title: '请补充社区类型中的“其他”', icon: 'none' }); return }
    if (ageRange.includes('其他') && !ageRangeOther.trim()) { Taro.showToast({ title: '请补充适合年龄段中的“其他”', icon: 'none' }); return }

    submitLockRef.current = true

    const confirm = await Taro.showModal({ title: '提交推荐', content: '提交后将进入人工审核队列，审核通过后才会出现在学习社区列表中。', confirmText: '确认提交', cancelText: '再看看' })
    if (!confirm.confirm) { submitLockRef.current = false; return }

    try {
      setSubmitting(true)
      const result = await submitSchool({
        name: name.trim(),
        province,
        city: currentCity,
        schoolType,
        schoolTypeOther: schoolType.includes('其他') ? schoolTypeOther.trim() : '',
        ageRange,
        ageRangeOther: ageRange.includes('其他') ? ageRangeOther.trim() : '',
        officialUrl: officialUrl.trim(),
        xujiNote: xujiNote.trim(),
        residencyReq: residencyReq.trim(),
        admissionReq: admissionReq.trim(),
        feeNote: feeNote.trim(),
        outputDirection: outputDirection.trim(),
        sourceNote: sourceNote.trim(),
        recommendationNote: recommendationNote.trim(),
      })
      if (result?.ok) {
        submittedRef.current = true
        setBeforeUnloadAlert(false, '')
        await showSubmittedModal()
      } else {
        Taro.showToast({ title: result?.message || '提交失败', icon: 'none' })
      }
    } catch (err) {
      console.error('submitSchool error:', err)
      Taro.showToast({ title: '提交失败，请稍后重试', icon: 'none' })
    } finally {
      setSubmitting(false)
      submitLockRef.current = false
    }
  }

  return (
    <AppPage>
      <AppCard>
        <Text style={{ ...typography.title, color: palette.text }}>推荐新学习社区</Text>
        <View style={{ marginTop: space(2) }}><Text style={{ ...typography.meta, color: palette.subtext }}>请尽量按学习社区详情页会展示的内容填写。信息来源和补充说明仅供审核参考，不会直接公开展示。</Text></View>
      </AppCard>

      <AppCard>
        <SectionTitle text='学习社区名称' />
        <FormInputBox focused={focusedField === 'name'}><Input value={name} placeholder='例如：某某共学社区' onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField('')} onInput={(e) => setName(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox>

        <SectionTitle text='所在城市' />
        <Picker mode='multiSelector' range={pickerRange} value={pickerValue} onChange={handlePickerChange} onColumnChange={handlePickerColumnChange}>
          <FormInputBox marginBottom={cityOption === '其他' ? space(2) : space(4)}>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}><Text style={{ ...typography.body, flex: 1, color: province ? palette.text : palette.muted }}>{province && currentCity ? `${province} · ${currentCity}` : '点击选择省份和城市'}</Text><Text style={{ ...typography.caption, color: palette.subtext }}>▼</Text></View>
          </FormInputBox>
        </Picker>
        {cityOption === '其他' && <View style={{ marginBottom: space(4) }}><View style={{ marginBottom: space(2) }}><Text style={{ ...typography.caption, color: palette.subtext }}>请输入真实城市名。地图会先按省级近似坐标展示，但列表里会显示你填写的城市。</Text></View><FormInputBox focused={focusedField === 'customCity'} marginBottom='0'><Input value={customCity} placeholder='例如：义乌 / 凯里 / 唐山' onFocus={() => setFocusedField('customCity')} onBlur={() => setFocusedField('')} onInput={(e) => setCustomCity(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox></View>}

        <SectionTitle text='社区类型（可多选）' />
        <MultiPillSelect options={SCHOOL_TYPE_OPTIONS} selected={schoolType} onChange={setSchoolType} />
        {schoolType.includes('其他') && <View style={{ marginBottom: space(4) }}><View style={{ marginBottom: space(2) }}><Text style={{ ...typography.caption, color: palette.subtext }}>补充社区类型中的“其他”。</Text></View><FormInputBox focused={focusedField === 'schoolTypeOther'} marginBottom='0'><Input value={schoolTypeOther} placeholder='例如：森林学校 / 驻留计划' onFocus={() => setFocusedField('schoolTypeOther')} onBlur={() => setFocusedField('')} onInput={(e) => setSchoolTypeOther(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox></View>}

        <SectionTitle text='适合年龄段（可多选）' />
        <MultiPillSelect options={AGE_RANGE_OPTIONS} selected={ageRange} onChange={setAgeRange} />
        {ageRange.includes('其他') && <View style={{ marginBottom: space(4) }}><View style={{ marginBottom: space(2) }}><Text style={{ ...typography.caption, color: palette.subtext }}>补充适合年龄段中的“其他”。</Text></View><FormInputBox focused={focusedField === 'ageRangeOther'} marginBottom='0'><Input value={ageRangeOther} placeholder='例如：3.5-16岁 / 大学生 / 家庭混龄共学' onFocus={() => setFocusedField('ageRangeOther')} onBlur={() => setFocusedField('')} onInput={(e) => setAgeRangeOther(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox></View>}

        <SectionTitle text='官方/说明链接（选填）' />
        <FormInputBox focused={focusedField === 'officialUrl'}><Input value={officialUrl} placeholder='例如：官网链接 / 公众号名 / 小红书号' onFocus={() => setFocusedField('officialUrl')} onBlur={() => setFocusedField('')} onInput={(e) => setOfficialUrl(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox>

        <SectionTitle text='公开说明（选填）' />
        <FormInputBox focused={focusedField === 'xujiNote'} marginBottom={space(3)}><Textarea value={xujiNote} placeholder='例如：公开可查到的社区简介、办学理念或基本说明' maxlength={500} onFocus={() => setFocusedField('xujiNote')} onBlur={() => setFocusedField('')} onInput={(e) => setXujiNote(e.detail.value)} style={{ width: '100%', minHeight: '80px', ...typography.body, color: palette.text }} /></FormInputBox>

        <SectionTitle text='参与前了解（选填）' />
        <FormInputBox focused={focusedField === 'residencyReq'} marginBottom={space(3)}><Textarea value={residencyReq} placeholder='例如：是否需要面谈、试读、家长参与、长期承诺等' maxlength={400} onFocus={() => setFocusedField('residencyReq')} onBlur={() => setFocusedField('')} onInput={(e) => setResidencyReq(e.detail.value)} style={{ width: '100%', minHeight: '70px', ...typography.body, color: palette.text }} /></FormInputBox>

        <SectionTitle text='参与方式参考（选填）' />
        <FormInputBox focused={focusedField === 'admissionReq'} marginBottom={space(3)}><Textarea value={admissionReq} placeholder='例如：线下驻留、周末活动、线上项目制、联系公众号报名等' maxlength={400} onFocus={() => setFocusedField('admissionReq')} onBlur={() => setFocusedField('')} onInput={(e) => setAdmissionReq(e.detail.value)} style={{ width: '100%', minHeight: '70px', ...typography.body, color: palette.text }} /></FormInputBox>

        <SectionTitle text='参考费用（选填）' />
        <FormInputBox focused={focusedField === 'feeNote'} marginBottom={space(3)}><Textarea value={feeNote} placeholder='例如：按月、按学期、按活动收费，或未公开' maxlength={200} onFocus={() => setFocusedField('feeNote')} onBlur={() => setFocusedField('')} onInput={(e) => setFeeNote(e.detail.value)} style={{ width: '100%', minHeight: '60px', ...typography.body, color: palette.text }} /></FormInputBox>

        <SectionTitle text='相关说明（选填）' />
        <FormInputBox focused={focusedField === 'outputDirection'} marginBottom={space(3)}><Textarea value={outputDirection} placeholder='例如：项目成果、升学去向、适合的家庭类型、补充提醒等' maxlength={500} onFocus={() => setFocusedField('outputDirection')} onBlur={() => setFocusedField('')} onInput={(e) => setOutputDirection(e.detail.value)} style={{ width: '100%', minHeight: '80px', ...typography.body, color: palette.text }} /></FormInputBox>

        <SectionTitle text='仅供审核：你从哪里知道它（选填）' />
        <FormInputBox focused={focusedField === 'sourceNote'} marginBottom={space(3)}><Textarea value={sourceNote} placeholder='例如：官网 / 公众号 / 小红书 / 朋友推荐 / 亲身参与' maxlength={300} onFocus={() => setFocusedField('sourceNote')} onBlur={() => setFocusedField('')} onInput={(e) => setSourceNote(e.detail.value)} style={{ width: '100%', minHeight: '70px', ...typography.body, color: palette.text }} /></FormInputBox>

        <SectionTitle text='仅供审核：推荐理由 / 补充说明（选填）' />
        <FormInputBox focused={focusedField === 'recommendationNote'} marginBottom={space(2)}><Textarea value={recommendationNote} placeholder='补充任何有助于审核的信息，比如你为什么推荐、哪些信息需要管理员再核实等' maxlength={500} onFocus={() => setFocusedField('recommendationNote')} onBlur={() => setFocusedField('')} onInput={(e) => setRecommendationNote(e.detail.value)} style={{ width: '100%', minHeight: '90px', ...typography.body, color: palette.text }} /></FormInputBox>
        <View style={{ marginBottom: space(4) }}><Text style={{ ...typography.micro, color: palette.muted }}>{recommendationNote.length}/500</Text></View>
      </AppCard>

      <AppPromptBanner icon='lock' title='提交后进入审核' description='你的提交不会自动公开。请只提交公开可验证的信息，不要填写第三方未公开的私人联系方式或未公开的未成年人信息。' tone='warm' />
      <AppPrimaryButton text='提交推荐' loadingText='提交中...' loading={submitting} onClick={handleSubmit} />
    </AppPage>
  )
}
