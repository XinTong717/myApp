import { useState } from 'react'
import { View, Text, Input, Picker } from '@tarojs/components'
import SectionTitle from './SectionTitle'
import { MultiPillSelect, SinglePillSelect } from '../common/PillSelect'
import ProfileCard from './ProfileCard'
import ProfileInputBox from './ProfileInputBox'
import ProfileHelperText from './ProfileHelperText'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'
import { typography } from '../../theme/typography'
import type { PickerColumnChangeEvent, PickerMultiChangeEvent } from '../../hooks/useProfileForm'

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
  publicChannel: string
  setPublicChannel: (value: string) => void
  publicChannelNote: string
  setPublicChannelNote: (value: string) => void
  pickerRange: string[][]
  pickerValue: number[]
  handlePickerChange: (e: PickerMultiChangeEvent) => void
  handlePickerColumnChange: (e: PickerColumnChangeEvent) => void
  genderOptions: readonly string[]
  ageRangeOptions: readonly string[]
  roleOptions: readonly string[]
}

type FocusField = 'displayName' | 'customCity' | 'publicChannel' | 'publicChannelNote' | ''

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
    publicChannel,
    setPublicChannel,
    publicChannelNote,
    setPublicChannelNote,
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
      <ProfileInputBox marginBottom={space(4)} focused={focusedField === 'displayName'}>
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
      <SinglePillSelect options={genderOptions} selected={gender} onChange={setGender} />

      <SectionTitle text='年龄段' />
      <SinglePillSelect options={ageRangeOptions} selected={ageRange} onChange={setAgeRange} />

      <SectionTitle text='身份（可多选）' />
      <MultiPillSelect options={roleOptions} selected={roles} onChange={setRoles} />

      <SectionTitle text='所在城市' />
      <Picker mode='multiSelector' range={pickerRange} value={pickerValue} onChange={handlePickerChange} onColumnChange={handlePickerColumnChange}>
        <ProfileInputBox marginBottom={cityOption === '其他' ? space(2) : space(3)}>
          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ ...typography.body, flex: 1, color: province ? palette.text : palette.muted }}>{province && currentCity ? `${province} · ${currentCity}` : '点击选择省份和城市'}</Text>
            <Text style={{ ...typography.caption, color: palette.subtext }}>▼</Text>
          </View>
        </ProfileInputBox>
      </Picker>
      {cityOption === '其他' && (
        <View style={{ marginBottom: space(3) }}>
          <ProfileHelperText text='请输入真实城市名。地图会先按省级近似坐标展示，但列表中会显示你填写的城市。' marginBottom={space(2)} />
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

      <SectionTitle text='联系方式（选填）' />
      <ProfileHelperText text='可填写个人微信、公众号、小红书、个人网站、公开邮箱等。仅对已登录并完成个人资料的用户可见；请不要填写孩子或第三方联系方式。' />
      <ProfileInputBox focused={focusedField === 'publicChannel'}>
        <Input
          value={publicChannel}
          placeholder='例如：微信号：xxx'
          onFocus={() => setFocusedField('publicChannel')}
          onBlur={() => setFocusedField('')}
          onInput={(e) => setPublicChannel(e.detail.value)}
          style={{ ...typography.body, color: palette.text }}
        />
      </ProfileInputBox>

      <SectionTitle text='添加备注说明（选填）' />
      <ProfileHelperText text='添加微信时希望对方备注的内容。' />
      <ProfileInputBox focused={focusedField === 'publicChannelNote'}>
        <Input
          value={publicChannelNote}
          placeholder='例如：添加时请备注“可雀”'
          onFocus={() => setFocusedField('publicChannelNote')}
          onBlur={() => setFocusedField('')}
          onInput={(e) => setPublicChannelNote(e.detail.value)}
          style={{ ...typography.body, color: palette.text }}
        />
      </ProfileInputBox>
    </ProfileCard>
  )
}
