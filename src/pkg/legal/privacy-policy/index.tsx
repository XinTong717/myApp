import { View, Text } from '@tarojs/components'
import { palette } from '../../../theme/palette'

function Section(props: { title: string; children: any }) {
  return (
    <View style={{
      backgroundColor: palette.card,
      borderRadius: '18px',
      padding: '16px',
      marginBottom: '14px',
      border: `1px solid ${palette.line}`,
    }}>
      <View style={{ marginBottom: '8px' }}>
        <Text style={{ fontSize: '15px', fontWeight: 'bold', color: palette.text }}>{props.title}</Text>
      </View>
      {props.children}
    </View>
  )
}

function BodyText(props: { children: any }) {
  return <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '22px' }}>{props.children}</Text>
}

export default function PrivacyPolicyPage() {
  return (
    <View style={{ minHeight: '100vh', backgroundColor: palette.bg, padding: '16px', boxSizing: 'border-box' }}>
      <View style={{ marginBottom: '14px' }}>
        <Text style={{ fontSize: '24px', fontWeight: 'bold', color: palette.text }}>隐私政策</Text>
        <View style={{ marginTop: '6px' }}>
          <Text style={{ fontSize: '12px', color: palette.subtext, lineHeight: '18px' }}>
            更新日期：2026-05-01
          </Text>
        </View>
      </View>

      <Section title='1. 适用范围'>
        <BodyText>
          本政策适用于可雀小程序内的学习社区浏览、活动查看、同路人联络、资料填写、信息提交、信息纠错、安全举报、管理员审核等功能。你在使用这些功能时主动提交或因功能运行产生的信息，将按本政策处理。
        </BodyText>
      </Section>

      <Section title='2. 运营主体与联系方式'>
        <BodyText>
          本产品由杭州可雀科技有限责任公司运营。若你需要查询、更正、删除个人信息，撤回公开展示，或反馈隐私与安全问题，可以通过邮箱 xtong717@gmail.com 联系我们，也可以优先使用小程序内现有入口处理资料修改、地图展示和联络权限设置。
        </BodyText>
      </Section>

      <Section title='3. 我们会收集哪些信息'>
        <BodyText>
          你主动填写的信息可能包括：显示名、身份、所在省市、个人简介、联络标识（可能包括微信号、手机号或 QQ），以及你选择提供的家庭教育关注信息或教育服务信息。为实现联络和安全功能，我们还会处理联络请求记录、请求状态、拉黑或静音关系、举报记录及相关时间信息。为实现风险控制、内容安全和故障排查，我们也会处理必要的操作时间、请求标识、内容安全校验结果和云函数处理日志。
        </BodyText>
      </Section>

      <Section title='4. 我们如何使用这些信息'>
        <BodyText>
          我们使用这些信息提供地图浏览、学习社区信息展示、活动查看、同路人联络、资料保存、信息纠错处理、内容安全校验、举报处理、管理员审核、故障排查与风险控制等功能。联络标识用于在你同意联络请求后向双方提供后续联系线索。我们不会把你的联络标识、家庭教育关注信息或教育服务内容作为公开信息直接展示给所有用户。
        </BodyText>
      </Section>

      <Section title='5. 哪些信息会公开展示'>
        <BodyText>
          你选择出现在地图上时，可能公开展示的信息包括：显示名、身份、省市、简介以及你与本教育生态的关系说明。地图位置仅用于近似分布浏览，不应被理解为精确住址。联络标识、家庭教育关注信息和教育服务内容，仅在你主动同意联络请求后，才会对特定用户可见。
        </BodyText>
      </Section>

      <Section title='6. 未成年人相关信息'>
        <BodyText>
          本产品当前面向成年人使用。若你以家长身份填写家庭教育关注信息，请仅提供实现联络所必要的概括性信息，避免提交可直接识别未成年人的姓名、学校、住址、联系方式、证件号码、照片、精确行程或其他敏感细节。若我们发现相关内容可能对未成年人造成隐私或安全风险，可能会进行隐藏、删除、限制展示或要求修改。
        </BodyText>
      </Section>

      <Section title='7. 第三方服务与基础设施'>
        <BodyText>
          当前服务的数据存储、云函数处理、内容安全校验和小程序运行主要依托微信小程序平台、腾讯云云开发及微信开放能力。我们会在实现功能所必要的范围内调用这些基础服务。若未来接入新的地图、统计、客服、支付或消息服务，我们会在政策更新中补充说明其用途和处理范围。
        </BodyText>
      </Section>

      <Section title='8. 信息存储与保存期限'>
        <BodyText>
          当前服务的数据存储与处理主要依托中国境内基础设施。我们会在实现前述目的所必需的最短期限内保存你的信息；当你主动清空、修改、撤回相关资料，或在业务上不再需要时，我们会相应减少展示或删除相关数据。为安全审计、争议处理和异常行为排查所需的记录，可能在合理期限内保留。
        </BodyText>
      </Section>

      <Section title='9. 你的权利'>
        <BodyText>
          你可以在【我的】页查看、修改、补充或清空你主动填写的资料，也可以控制是否出现在地图上、是否接收联络请求。若你希望进一步删除信息、停止展示、撤回授权或反馈隐私问题，可以通过产品内现有入口或发送邮件至 xtong717@gmail.com 联系我们。我们会在核验身份和请求合理性后处理。
        </BodyText>
      </Section>

      <Section title='10. 信息安全'>
        <BodyText>
          我们会采取合理的技术和管理措施保护你的信息，包括访问控制、云函数服务端处理、必要的内容安全校验、频率限制、安全关系过滤和管理员权限校验。但互联网服务无法保证绝对安全，请谨慎填写不必要的敏感信息，尤其不要公开提交未成年人可识别信息或精确线下位置。
        </BodyText>
      </Section>

      <Section title='11. 政策更新'>
        <BodyText>
          当产品功能、处理方式、运营主体信息或合规要求发生变化时，我们可能更新本政策，并通过页面更新日期等方式向你说明。继续使用相关功能，表示你理解并接受更新后的政策内容。
        </BodyText>
      </Section>
    </View>
  )
}
