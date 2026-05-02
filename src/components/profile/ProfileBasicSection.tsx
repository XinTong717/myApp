import { useState } from 'react'
import { View, Text, Input, Picker } from '@tarojs/components'
import SectionTitle from './SectionTitle'
import PillSelect from './PillSelect'
import ProfileCard from './ProfileCard'
import ProfileInputBox from './ProfileInputBox'
import ProfileHelperText from './ProfileHelperText'
import { profilePalette as palette } from './palette'
import { typography } from '../../theme/typography'

type Props = {
  displayName: string
  setDisplayName: (value: string) => void
  gender: string
  setGender: (value: string) => void
  ageRange: string
  setAgeRange: (value: string) => void
  roles: string[]
  setRoles: (value: string[]) => void
  province: string
  cityOption: string
  currentCity: string
  customCity: string
  setCustomCity: (value: string) => void
  contactId: string
  setContactId: (value: string) => void
  pickerRange: any[]
  pickerValue: number[]
  handlePickerChange: (e: any) => void
  handlePickerColumnChange: (e: any) => void
  genderOptions: string[]
  ageRangeOptions: string[]
  roleOptions: string[]
}

type FocusField = 'displayName' | 'customCity' | 'contactId' | ''

export default function ProfileBasicSection(props: Props) {
  const {
    displayName,
    setDisplayName,
    gender,
    setGender,
    ageRange,
    setAgeRange,
    roles,
    setRoles,
    province,
    cityOption,
    currentCity,
    customCity,
    setCustomCity,
    contactId,
    setContactId,
    pickerRange,
    pickerValue,
    handlePickerChange,
    handlePickerColumnChange,
    genderOptions,
    ageRangeOptions,
    roleOptions,
  } = props

  const [focusedField, setFocusedField] = useState<FocusField>('')

  return (
    <ProfileCard>
      <SectionTitle text='显示名' />
      <ProfileInputBox marginBottom='16px' focused={focusedField === 'displayName'}>
        <Input
          value={displayName}
          placeholder='你希望别人怎么称呼你'
          onFocus={() => setFocusedField('displayName')}
          onBlur={() => setFocusedField('')}
          onInput={(e) => setDisplayName(e.detail.value)}
          style={{ ...typography.body, color: palette.text }}
        />
      </ProfileInputBox>

      <SectionTitle text='性别' />
      <PillSelect options={genderOptions} selected={gender} onChange={(v) => setGender(v as string)} />

      <SectionTitle text='年龄段' />
      <PillSelect options={ageRangeOptions} selected={ageRange} onChange={(v) => setAgeRange(v as string)} />

      <SectionTitle text='身份（可多选）' />
      <PillSelect options={roleOptions} selected={roles} multi onChange={(v) => setRoles(v as string[])} />

      <SectionTitle text='所在城市' />
      <Picker mode='multiSelector' range={pickerRange} value={pickerValue} onChange={handlePickerChange} onColumnChange={handlePickerColumnChange}>
        <ProfileInputBox marginBottom={cityOption === '其他' ? '8px' : '12px'}>
          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ ...typography.body, flex: 1, color: province ? palette.text : '#C5B5A5' }}>{province && currentCity ? `${province} · ${currentCity}` : '点击选择省份和城市'}</Text>
            <Text style={{ ...typography.caption, color: palette.subtext }}>▼</Text>
          </View>
        </ProfileInputBox>
      </Picker>
      {cityOption === '其他' && (
        <View style={{ marginBottom: '12px' }}>
          <ProfileHelperText text='请输入真实城市名。地图会先按省级近似坐标展示，但列表中会显示你填写的城市。' marginBottom='6px' />
          <ProfileInputBox focused={focusedField === 'customCity'}>
            <Input
              value={customCity}
              placeholder='例如：义乌 / 凯里 / 唐山'
              onFocus={() => setFocusedField('customCity')}
              onBlur={() => setFocusedField('')}
              onInput={(e) => setCustomCity(e.detail.value)}
              style={{ ...typography.body, color: palette.text }}
            />
          </ProfileInputBox>
        </View>
      )}

      <SectionTitle text='联络标识（选填）' />
      <ProfileHelperText text='可填写微信号、手机号或 QQ，仅在你同意联络后对对方可见。' />
      <ProfileInputBox focused={focusedField === 'contactId'}>
        <Input
          value={contactId}
          placeholder='可填写微信号、手机号或 QQ，仅在你同意联络后对对方可见'
          onFocus={() => setFocusedField('contactId')}
          onBlur={() => setFocusedField('')}
          onInput={(e) => setContactId(e.detail.value)}
          style={{ ...typography.body, color: palette.text }}
        />
      </ProfileInputBox>
    </ProfileCard>
  )
}
