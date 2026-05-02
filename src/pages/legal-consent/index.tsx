import { useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { palette } from '../../theme/palette'
import { typography } from '../../theme/typography'
import { hasCurrentLocalLegalConsent, recordLegalConsent } from '../../services/legalConsent'

type ConsentChecks = {
  terms: boolean
  privacy: boolean
  adult: boolean
}

const initialChecks: ConsentChecks = {
  terms: false,
  privacy: false,
  adult: false,
}

function ConsentCheckbox(props: {
  checked: boolean
  children: any
  onClick: () => void
}) {
  return (
    <View
      onClick={props.onClick}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '11px 0',
      }}
    >
      <View
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '6px',
          flexShrink: 0,
          marginTop: '1px',
          backgroundColor: props.checked ? palette.brand : '#FFFFFF',
          border: `1px solid ${props.checked ? palette.brand : palette.line}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 'bold' }}>{props.checked ? '✓' : ''}</Text>
      </View>
      <View style={{ flex: 1 }}>{props.children}</View>
    </View>
  )
}

function decodeTarget(value?: string) {
  const text = String(value || '').trim()
  if (!text) return '/pages/explore/index'
  try {
    const decoded = decodeURIComponent(text)
    return decoded.startsWith('/') ? decoded : `/${decoded}`
  } catch (err) {
    return '/pages/explore/index'
  }
}

function isTabPage(url: string) {
  const path = url.split('?')[0]
  return [
    '/pages/explore/index',
    '/pages/schools/index',
    '/pages/events/index',
    '/pages/profile/index',
  ].includes(path)
}

export default function LegalConsentPage() {
  const [checks, setChecks] = useState<ConsentChecks>(initialChecks)
  const [submitting, setSubmitting] = useState(false)
  const [targetUrl, setTargetUrl] = useState('/pages/explore/index')

  useDidShow(() => {
    const pagesGetter = (globalThis as any).getCurrentPages
    const pages = typeof pagesGetter === 'function' ? pagesGetter() : []
    const current = pages[pages.length - 1]
    const target = decodeTarget(current?.options?.target as string | undefined)
    setTargetUrl(target)

    if (hasCurrentLocalLegalConsent()) {
      if (isTabPage(target)) Taro.switchTab({ url: target.split('?')[0] })
      else Taro.redirectTo({ url: target })
    }
  })

  const toggle = (key: keyof ConsentChecks) => {
    setChecks((current) => ({ ...current, [key]: !current[key] }))
  }

  const openUserAgreement = () => {
    Taro.navigateTo({ url: '/pages/user-agreement/index' })
  }

  const openPrivacyPolicy = () => {
    Taro.navigateTo({ url: '/pages/privacy-policy/index' })
  }

  const goBackToTarget = () => {
    if (isTabPage(targetUrl)) {
      Taro.switchTab({ url: targetUrl.split('?')[0] })
      return
    }
    Taro.redirectTo({ url: targetUrl }).catch(() => Taro.reLaunch({ url: '/pages/explore/index' }))
  }

  const handleAgree = async () => {
    if (!checks.terms) {
      Taro.showToast({ title: '请先阅读并同意用户协议', icon: 'none' })
      return
    }
    if (!checks.privacy) {
      Taro.showToast({ title: '请先阅读并同意隐私政策', icon: 'none' })
      return
    }
    if (!checks.adult) {
      Taro.showToast({ title: '请先确认已满18周岁', icon: 'none' })
      return
    }

    setSubmitting(true)
    const result = await recordLegalConsent()
    setSubmitting(false)

    if (!result.ok) {
      Taro.showToast({ title: result.message || '确认失败，请稍后重试', icon: 'none' })
      return
    }

    Taro.showToast({ title: '已确认', icon: 'success' })
    goBackToTarget()
  }

  return (
    <View style={{ minHeight: '100vh', backgroundColor: palette.bg, padding: '20px 18px 32px', boxSizing: 'border-box' }}>
      <View style={{
        backgroundColor: palette.card,
        borderRadius: '24px',
        padding: '22px 18px',
        border: `1px solid ${palette.line}`,
        boxShadow: '0 12px 32px rgba(80, 43, 30, 0.08)',
      }}>
        <Text style={{ ...typography.sectionTitle, color: palette.text, display: 'block', marginBottom: '8px' }}>
          欢迎来到可雀
        </Text>
        <Text style={{ ...typography.body, color: palette.subtext, display: 'block', marginBottom: '14px' }}>
          可雀目前仅面向18岁及以上用户。继续使用前，请阅读并同意用户协议与隐私政策；我们会处理你的微信用户标识，用于登录、安全与基础服务提供。
        </Text>
        <View style={{ backgroundColor: palette.surface, borderRadius: '16px', padding: '10px 12px', border: `1px solid ${palette.lineSoft}`, marginBottom: '12px' }}>
          <Text style={{ ...typography.caption, color: palette.subtext }}>
            请不要填写或上传可直接识别未成年人的姓名、学校、住址、联系方式或精确行程。
          </Text>
        </View>

        <ConsentCheckbox checked={checks.terms} onClick={() => toggle('terms')}>
          <Text style={{ ...typography.caption, color: palette.subtext }}>我已阅读并同意</Text>
          <Text onClick={openUserAgreement} style={{ ...typography.caption, color: palette.brand, fontWeight: 'bold' }}>《用户协议》</Text>
        </ConsentCheckbox>

        <ConsentCheckbox checked={checks.privacy} onClick={() => toggle('privacy')}>
          <Text style={{ ...typography.caption, color: palette.subtext }}>我已阅读并同意</Text>
          <Text onClick={openPrivacyPolicy} style={{ ...typography.caption, color: palette.brand, fontWeight: 'bold' }}>《隐私政策》</Text>
        </ConsentCheckbox>

        <ConsentCheckbox checked={checks.adult} onClick={() => toggle('adult')}>
          <Text style={{ ...typography.caption, color: palette.subtext }}>我确认本人已满18周岁</Text>
        </ConsentCheckbox>

        <Button
          loading={submitting}
          disabled={submitting}
          onClick={handleAgree}
          style={{
            marginTop: '12px',
            height: '44px',
            lineHeight: '44px',
            borderRadius: '999px',
            backgroundColor: palette.brand,
            color: '#FFFFFF',
            fontWeight: 'bold',
            fontSize: '15px',
            border: 'none',
          }}
        >
          {submitting ? '保存中...' : '同意并继续'}
        </Button>
      </View>
    </View>
  )
}
