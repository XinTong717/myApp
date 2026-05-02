import { Text, View } from '@tarojs/components'
import { palette } from '../../../theme/palette'
import { exploreTheme, ghostButtonStyle, panelStyle, primaryButtonStyle, sheetStyle } from '../styles'
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
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', marginBottom: '12px' }}>
          <View style={{ flex: 1, paddingRight: '12px' }}>
            <Text style={{ fontSize: '20px', fontWeight: 'bold', color: exploreTheme.text }}>{user.name}</Text>
            <View style={{ marginTop: '6px', display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
              {user.city ? <Tag text={user.city} tone='brand' /> : null}
              {popupRoleText ? <Tag text={popupRoleText} tone='user' /> : null}
              {user.isSelf ? <Tag text='这是你自己' /> : null}
              {isCoolingDown ? <Tag text={`冷却 ${cooldownDays} 天`} /> : null}
            </View>
          </View>
          <View onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '999px', backgroundColor: exploreTheme.tag, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: '16px', color: exploreTheme.tagText }}>✕</Text>
          </View>
        </View>

        {(user.companionContext || user.bio) ? (
          <View style={{ ...panelStyle, marginBottom: '14px' }}>
            {user.companionContext ? (
              <View style={{ marginBottom: user.bio ? '10px' : '0' }}>
                <Text style={{ fontSize: '12px', color: palette.brand, fontWeight: 'bold' }}>和这个生态的关系</Text>
                <View style={{ marginTop: '4px' }}><Text style={{ fontSize: '14px', color: exploreTheme.text, lineHeight: '22px' }}>{user.companionContext}</Text></View>
              </View>
            ) : null}
            {user.bio ? (
              <View>
                <Text style={{ fontSize: '12px', color: palette.brand, fontWeight: 'bold' }}>简介</Text>
                <View style={{ marginTop: '4px' }}><Text style={{ fontSize: '14px', color: exploreTheme.text, lineHeight: '22px' }}>{user.bio}</Text></View>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={{ ...panelStyle, marginBottom: '14px' }}>
            <Text style={{ fontSize: '14px', color: exploreTheme.subtext, lineHeight: '22px' }}>这位同路人还没有填写更多介绍。</Text>
          </View>
        )}

        {!hasProfile && !user.isSelf ? (
          <View style={{ backgroundColor: palette.accent2Glow, borderRadius: '14px', padding: '12px', marginBottom: '12px', border: `1px solid ${exploreTheme.border}` }}>
            <Text style={{ fontSize: '13px', color: exploreTheme.subtext, lineHeight: '20px' }}>先填写“我的资料”，再发起联络。这样别人也能更好理解你是谁。</Text>
          </View>
        ) : null}

        {isCoolingDown ? (
          <View style={{ backgroundColor: palette.accent2Glow, borderRadius: '14px', padding: '12px', marginBottom: '12px', border: `1px solid ${exploreTheme.border}` }}>
            <Text style={{ fontSize: '13px', color: exploreTheme.subtext, lineHeight: '20px' }}>对方近期已拒绝你的联络请求。为减少打扰，请等待冷却期结束后再尝试。</Text>
          </View>
        ) : null}

        <View onClick={primaryDisabled ? undefined : onPrimaryAction} style={primaryDisabled || user.isSelf ? ghostButtonStyle : primaryButtonStyle}>
          <Text style={{ fontSize: '15px', color: primaryDisabled || user.isSelf ? exploreTheme.tagText : '#FFF', fontWeight: 'bold' }}>
            {primaryText}
          </Text>
        </View>

        {!user.isSelf && (
          <View style={{ display: 'flex', flexDirection: 'row', marginTop: '10px' }}>
            <View onClick={() => onReport(String(user.originalId))} style={{ flex: 1, padding: '10px', borderRadius: '14px', backgroundColor: exploreTheme.tag, textAlign: 'center', marginRight: '8px' }}>
              <Text style={{ fontSize: '12px', color: exploreTheme.tagText }}>举报</Text>
            </View>
            <View onClick={() => onBlock(String(user.originalId))} style={{ flex: 1, padding: '10px', borderRadius: '14px', backgroundColor: palette.errorSoft, textAlign: 'center' }}>
              <Text style={{ fontSize: '12px', color: palette.error }}>拉黑</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}
