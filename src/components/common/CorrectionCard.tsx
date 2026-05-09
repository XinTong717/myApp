import { Text, Textarea, View } from '@tarojs/components'
import AppCard from './AppCard'
import AppIcon from './AppIcon'
import AppPrimaryButton from './AppPrimaryButton'
import { palette } from '../../theme/palette'
import { radius, space } from '../../theme/spacing'
import { typography } from '../../theme/typography'

type CorrectionCardProps = {
  showForm: boolean
  value: string
  submitting: boolean
  done: boolean
  entryTitle: string
  entryDescription: string
  formTitle: string
  formDescription: string
  placeholder?: string
  openText?: string
  doneText?: string
  onOpen: () => void
  onCancel: () => void
  onChange: (value: string) => void
  onSubmit: () => void
}

export default function CorrectionCard({
  showForm,
  value,
  submitting,
  done,
  entryTitle,
  entryDescription,
  formTitle,
  formDescription,
  placeholder = '请输入需要修正或补充的信息...',
  openText = '填写',
  doneText = '感谢反馈！我们会尽快核实',
  onOpen,
  onCancel,
  onChange,
  onSubmit,
}: CorrectionCardProps) {
  return (
    <AppCard marginBottom={space(4)}>
      {!showForm && !done && (
        <View onClick={onOpen} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ marginRight: space(2) }}>
            <AppIcon name='edit-pencil' size={32} backgroundColor={palette.brandSoft} bordered />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.bodyStrong, color: palette.text }}>{entryTitle}</Text>
            <View style={{ marginTop: space(1) }}>
              <Text style={{ ...typography.caption, color: palette.subtext }}>{entryDescription}</Text>
            </View>
          </View>
          <AppPrimaryButton text={openText} variant='secondary' size='sm' appearance='inline' marginBottom='0' />
        </View>
      )}

      {showForm && !done && (
        <View>
          <View style={{ marginBottom: space(3), display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ marginRight: space(2) }}>
              <AppIcon name='edit-pencil' size={30} backgroundColor={palette.brandSoft} bordered />
            </View>
            <Text style={{ ...typography.bodyStrong, color: palette.text }}>{formTitle}</Text>
          </View>
          <View style={{ marginBottom: space(2) }}>
            <Text style={{ ...typography.caption, color: palette.subtext }}>{formDescription}</Text>
          </View>
          <Textarea
            value={value}
            onInput={(e) => onChange(e.detail.value)}
            placeholder={placeholder}
            maxlength={500}
            style={{
              width: '100%',
              minHeight: '100px',
              padding: space(3),
              backgroundColor: palette.surface,
              borderRadius: radius.md,
              border: `1px solid ${palette.line}`,
              ...typography.body,
              color: palette.text,
              boxSizing: 'border-box',
            }}
          />
          <View style={{ marginTop: space(1), marginBottom: space(3) }}>
            <Text style={{ ...typography.micro, color: palette.muted }}>{value.length}/500</Text>
          </View>
          <View style={{ display: 'flex', flexDirection: 'row' }}>
            <AppPrimaryButton text='取消' variant='ghost' size='sm' appearance='inline' marginBottom='0' marginRight={space(3)} disabled={submitting} onClick={onCancel} />
            <AppPrimaryButton text='提交' loadingText='提交中...' loading={submitting} variant='primary' size='sm' appearance='inline' marginBottom='0' onClick={onSubmit} />
          </View>
        </View>
      )}

      {done && (
        <View style={{ textAlign: 'center', padding: `${space(2)} 0` }}>
          <View style={{ marginBottom: space(2), display: 'flex', justifyContent: 'center' }}>
            <AppIcon name='check' size={36} backgroundColor={palette.greenSoft} color={palette.green} bordered />
          </View>
          <View><Text style={{ ...typography.bodyStrong, color: palette.green }}>{doneText}</Text></View>
        </View>
      )}
    </AppCard>
  )
}
