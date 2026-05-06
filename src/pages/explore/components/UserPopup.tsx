import { Text, View } from '@tarojs/components'
import { palette } from '../../../theme/palette'
import { radius, space } from '../../../theme/spacing'
import { typography } from '../../../theme/typography'
import { exploreTheme } from '../styles'
import type { MarkerItem } from '../types'
import { Tag } from './Chips'

type UserPopupProps = {
  user: MarkerItem | null
  popupRoleText: string
  hasProfile: boolean
  onClose: () => void
  onPrimaryAction: () => void
  onReport: (targetUserId: string) => void
  onBlock: (targetUserId: string) => void
}

const sheetStyle = {
  width: '100%',
  backgroundColor: exploreTheme.surface,
  borderTopLeftRadius: radius.md,
  borderTopRightRadius: radius.md,
  padding: `${space(4)} ${space(4)} ${space(6)}`,
  boxSizing: 'border-box',
  borderTop: `1px solid ${exploreTheme.border}`,
} as const

const panelStyle = {
  backgroundColor: exploreTheme.surface,
  borderRadius: radius.md,
  padding: `${space(3)} ${space(3)}`,
  border: `1px solid ${exploreTheme.border}`,
} as const

function SheetButton(props: { text: string; tone: 'primary' | 'ghost' | 'danger'; disabled?: boolean; onClick?: () => void }) {
  const isPrimary = props.tone === 'primary'
  const isDanger = props.tone === 'danger'
  return (
    <View
      onClick={props.disabled ? undefined : props.onClick}
      style={{
        backgroundColor: props.disabled ? exploreTheme.tag : isPrimary ? palette.brand : isDanger ? palette.errorSoft : exploreTheme.tag,
        borderRadius: radius.md,
        padding: space(3),
        textAlign: 'center',
        border: isPrimary ? 'none' : `1px solid ${isDanger ? palette.errorSoft : exploreTheme.border}`,
        opacity: props.disabled ? 0.72 : 1,
      }}
    >
      <Text style={{ ...typography.button, color: props.disabled ? exploreTheme.muted : isPrimary ? '#FFF' : isDanger ? palette.error : exploreTheme.tagText }}>
        {props.text}
      </Text>
    </View>
  )
}

export default function UserPopup(props: UserPopupProps) {
  const { user, popupRoleText, hasProfile, onClose, onPrimaryAction, onReport, onBlock } = props

  if (!user) return null

  const cooldownDays = Number(user.requestCooldownDays || 0)
  const isCoolingDown = !user.isSelf && cooldownDays > 0
  const primaryDisabled = isCoolingDown
  const primaryText = user.isSelf
    ? '去看我的资料'
    : isCoolingDown
      ? `${cooldownDays} 天后可再次联络`
      : hasProfile
        ? '发起联络'
        : '去填写资料'

  return (
    <View onClick={onClose} style={{ position: 'fixed', left: '0', right: '0', top: '0', bottom: '0', backgroundColor: exploreTheme.overlay, display: 'flex', alignItems: 'flex-end', zIndex: 30 }}>
      <View onClick={(e: any) => e?.stopPropagation?.()} style={sheetStyle}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', marginBottom: space(3) }}>
          <View style={{ flex: 1, paddingRight: space(3) }}>
            <Text style={{ ...typography.title, color: exploreTheme.text }}>{user.name}</Text>
            <View style={{ marginTop: space(2), display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
              {user.city ? <Tag text={user.city} tone='brand' /> : null}
              {popupRoleText ? <Tag text={popupRoleText} tone='user' /> : null}
              {user.isSelf ? <Tag text='这是你自己' /> : null}
              {isCoolingDown ? <Tag text={`冷却 ${cooldownDays} 天`} /> : null}
            </View>
          </View>
          <View onClick={onClose} style={{ width: space(7), height: space(7), borderRadius: radius.pill, backgroundColor: exploreTheme.tag, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ ...typography.sectionTitle, color: exploreTheme.tagText }}>✕</Text>
          </View>
        </View>

        {(user.companionContext || user.bio) ? (
          <View style={{ ...panelStyle, marginBottom: space(4) }}>
            {user.companionContext ? (
              <View style={{ marginBottom: user.bio ? space(3) : '0' }}>
                <Text style={{ ...typography.caption, color: palette.brand }}>和这个生态的关系</Text>
                <View style={{ marginTop: space(1) }}><Text style={{ ...typography.body, color: exploreTheme.text }}>{user.companionContext}</Text></View>
              </View>
            ) : null}
            {user.bio ? (
              <View>
                <Text style={{ ...typography.caption, color: palette.brand }}>简介</Text>
                <View style={{ marginTop: space(1) }}><Text style={{ ...typography.body, color: exploreTheme.text }}>{user.bio}</Text></View>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={{ ...panelStyle, marginBottom: space(4) }}>
            <Text style={{ ...typography.body, color: exploreTheme.subtext }}>这位同路人还没有填写更多介绍。</Text>
          </View>
        )}

        {!hasProfile && !user.isSelf ? (
          <View style={{ backgroundColor: palette.accent2Soft, borderRadius: radius.md, padding: space(3), marginBottom: space(3), border: `1px solid ${exploreTheme.border}` }}>
            <Text style={{ ...typography.meta, color: exploreTheme.subtext }}>先填写“我的资料”，再发起联络。这样别人也能更好理解你是谁。</Text>
          </View>
        ) : null}

        {isCoolingDown ? (
          <View style={{ backgroundColor: palette.accent2Soft, borderRadius: radius.md, padding: space(3), marginBottom: space(3), border: `1px solid ${exploreTheme.border}` }}>
            <Text style={{ ...typography.meta, color: exploreTheme.subtext }}>对方近期已拒绝你的联络请求。为减少打扰，请等待冷却期结束后再尝试。</Text>
          </View>
        ) : null}

        <SheetButton text={primaryText} tone={primaryDisabled || user.isSelf ? 'ghost' : 'primary'} disabled={primaryDisabled} onClick={onPrimaryAction} />

        {!user.isSelf && (
          <View style={{ display: 'flex', flexDirection: 'row', marginTop: space(3) }}>
            <View style={{ flex: 1, marginRight: space(2) }}>
              <SheetButton text='举报' tone='ghost' onClick={() => onReport(String(user.originalId))} />
            </View>
            <View style={{ flex: 1 }}>
              <SheetButton text='拉黑' tone='danger' onClick={() => onBlock(String(user.originalId))} />
            </View>
          </View>
        )}
      </View>
    </View>
  )
}
