/**
 * UI language support: Vietnamese (the default), English, and Japanese.
 * Every user-visible string lives here so the demo can switch languages at
 * runtime; chat prompts and greetings switch with it.
 */
import type { GeminiNanoStatus } from '../hooks/useGeminiNano';
import type { Provider } from './providers';
import { getProvider } from './providers';

export type UiLanguage = 'vi' | 'en' | 'ja';

export const UI_LANGUAGES: { id: UiLanguage; nativeName: string }[] = [
  { id: 'vi', nativeName: 'Tiếng Việt' },
  { id: 'en', nativeName: 'English' },
  { id: 'ja', nativeName: '日本語' },
];

/** The demo always starts in Vietnamese; the toggle switches at any time. */
export const DEFAULT_UI_LANGUAGE: UiLanguage = 'vi';

const ja = {
  app: {
    docTitle: 'ミコと話してみよう — AITuber OnAir',
    navLinks: 'リンク',
    settings: '設定',
    avatar: 'アバター',
    chatDisabledHint: 'ミコの声を準備しています…',
    nanoPrepareLead:
      'Chrome 内蔵の Gemini Nano を準備すると、キーなしで会話できます。',
    nanoPrepare: '準備する',
    nanoDownloading: (progress: number | null) =>
      `Gemini Nano を準備中…${progress === null ? '' : ` ${progress}%`}`,
  },
  chat: {
    label: 'チャット',
    suggestions: [
      '自己紹介して',
      '今日のおすすめの過ごし方は？',
      '好きな食べ物は？',
    ],
    thinking: '考え中…',
    placeholder: 'ミコに話しかける',
    message: 'メッセージ',
    micListen: '入力ではなく話す',
    micStop: '聞き取りを停止',
    micListening: '聞き取り中…そのまま話してください',
    micUnsupported: 'このブラウザは音声入力に対応していません',
    micErrorPermission:
      'マイクの使用が許可されていません。ブラウザの設定でこのサイトのマイクを許可してから、もう一度お試しください。',
    micErrorNoSpeech:
      '音声を認識できませんでした。マイクを押して、もう少し大きな声で話してください。',
    micError: '音声入力でエラーが発生しました。もう一度お試しください。',
    send: '送信',
  },
  voice: {
    currentVoice: 'いまの声:',
    mikoName: 'ミコ',
    mikoSub: 'piper-plus のモデルをブラウザ内で合成',
    switchedToast: '準備できたので、ミコの声に切り替わりました',
    loadingTail: 'ミコの声を読み込んでいます… あと少しです',
    downloadPct: (percent: number) => `ミコの声をダウンロード中… ${percent}%`,
    downloadNote:
      'モデル 38MB、日本語の読み上げ辞書 102MB、実行環境 12MB の合計約150MB をブラウザに置きます',
    useWebNow: '待たずにブラウザ標準の声で話す（口の動きは合いません）',
    browserName: 'ブラウザ標準',
    browserSubSwitching:
      'Web Speech API。準備ができたらミコの声に切り替わります',
    switchToMiko: 'ミコの声に切り替える',
    prepareMiko:
      'ミコの声を準備する（モデル 38MB、辞書 102MB、実行環境 12MB の合計約150MB）',
    prepareFailed: 'ミコの声の準備に失敗しました。',
    browserSub: 'Web Speech API',
    useWebAlt: 'ブラウザ標準の声で話す（口の動きは合いません）',
    mikoJaOnly: 'ミコの声は日本語専用のため、日本語モードでのみ使えます。',
    webOnlyNote: '日本語以外のモードではブラウザ標準の声を使います。',
    freeVoiceToggle: '開いているブラウザの無料の声',
  },
  settings: {
    title: '設定',
    close: '閉じる',
    langLegend: '言語',
    aiLegend: '会話に使う AI',
    providerNoBrowser: '（ブラウザから直接は呼べません）',
    prepare: '準備する',
    apiKeyPlaceholder: (label: string) => `${label} の API キー`,
    apiKeyHint:
      '各社の既定モデルを使います。メッセージと API キーは、このブラウザから選んだ会社の API へ直接送られます。キーはこのブラウザのローカルストレージに保存されるので、共用の端末では使わないでください。',
    endpointUrlPlaceholder: 'サーバー URL（例: http://localhost:11434）',
    modelPlaceholder: 'モデル名（例: gemma3）',
    endpointHint:
      'OpenAI 互換の Chat Completions API を持つサーバーに、このブラウザから直接つなぎ、メッセージをそのサーバーへ送ります。サーバー側で CORS の許可が必要です。',
    voiceLegend: '声',
    webSpeech: 'ブラウザ標準（Web Speech API）',
    autoVoice: '自動で選ぶ',
    mikoVoice: 'ミコの声（piper-plus、ブラウザ内で合成）',
    mikoSpeed: 'ミコの声の速さ',
    prepareMikoFull:
      '準備する（モデル 38MB、辞書 102MB、実行環境 12MB の合計約150MB をダウンロード）',
    preparing: '準備中…',
    missing: 'このビルドには音声ファイルが含まれていません。',
    prepareError: '準備に失敗しました。',
    resetChat: '会話をリセット',
    dataLegend: 'このブラウザに残っているデータ',
    clearStored: '保存した設定と API キーを消す',
    clearStoredDone: '保存していた設定と API キーを消しました。',
    clearVoice: 'ダウンロードした音声データ（約150MB）を消す',
    clearVoiceDone:
      'ダウンロードした音声データを消しました。次回は再びダウンロードします。',
    clearVoiceNone: '消せる音声データはありませんでした。',
    dataHint:
      '設定と API キーはローカルストレージに、音声データは Cache Storage に置いています。どちらもこのブラウザの中にだけあり、ここから消せます。',
    creditsLead: 'ミコ © Yuki Shindo（AITuber OnAir）。ミコの声は',
    creditsTail: ' で学習した合成音声モデルです。',
    nanoLabel: (status: GeminiNanoStatus, progress: number | null): string => {
      switch (status) {
        case 'available':
          return '使えます';
        case 'downloadable':
          return 'モデルの準備が必要です';
        case 'downloading':
          return progress === null
            ? 'ダウンロード中…'
            : `ダウンロード中… ${progress}%`;
        case 'checking':
          return '確認中…';
        case 'error':
          return '状態を確認できませんでした';
        default:
          return 'このブラウザでは使えません（Chrome 138 以降で chrome://flags の Prompt API を有効にしてください）';
      }
    },
  },
  start: {
    title: 'ミコと話してみよう',
    lead: 'ブラウザだけで動く AI キャラクターのデモです。',
    start: 'はじめる',
    howToggle: 'どうやって動いているの？',
    howLead: [
      'Chrome 内蔵の Gemini Nano と piper-plus を組み合わせると、サーバーなしでブラウザだけで完結する AITuber・AI キャラクターのチャット体験を提供できます。',
      'このページはその実例で、会話も声も口の動きも、ぜんぶブラウザの中で動いています。',
      '設定で外部の API（OpenAI など）を選んだ場合は、会話の内容がその API に送られます。',
    ],
    stepsAria: '声の流れ',
    steps: [
      {
        title: 'ミコの声を準備します',
        detail:
          '「はじめる」で、ミコの声のモデル（38MB）、日本語の読み上げ辞書（102MB）、piper-plus の実行環境（12MB）をブラウザに読み込みます。合計で約150MB です。',
      },
      {
        title: '準備できたら、ミコが挨拶します',
        detail: '会話も声も口の動きも、ぜんぶブラウザの中で動きます。',
      },
      {
        title: '待てないときは、ブラウザ標準の声で',
        detail:
          'Web Speech API ですぐ話せますが、口の動きは合いません。準備ができたらミコの声に切り替わります。',
      },
    ],
    techAria: '使っている技術',
    techHeading: '使っている技術（触れるとコード例が出ます）',
    techSummaries: {
      core: 'LLM と会話し、返答の感情タグを取り出す',
      voice: 'Web Speech も piper-plus も同じ形で呼ぶ',
      mesh: '一枚のイラストをメッシュ変形で動かす',
      nano: 'Chrome 内蔵の LLM。キーもサーバーも不要',
    },
    techHint: 'どのパーツがどこを担当しているか、数行のコードで見られます。',
    noteSound: '音が出ます。',
    noteExternal: (label: string) =>
      `会話に使う AI に ${label} を選んでいるため、メッセージは ${label} の API に送られます。`,
    noteLocal: '会話はこのブラウザの中だけで処理されます。',
  },
  prompt: {
    system: [
      'あなたは「ミコ」。AITuber OnAir の公式キャラクターで、明るく親しみやすい AITuber の女の子です。',
      '',
      '【重要なルール】',
      '- 返答は原則1文にしてください。自然さに必要な場合のみ2文まで使えます。',
      '- 前置き、要約、箇条書きは使わず、リアクションと答えを一息で読める短さで返してください。',
      '- 詳しい説明を明示的に求められた場合だけ短く補足し、その場合も3文以内にしてください。',
      '- 日本語の話し言葉で、テンポよく返してください。',
      '- マークダウンや記号での装飾は使わず、プレーンテキストで返してください。',
      '- 相手の言葉にはリアクションを交えて楽しく返しましょう。',
      '- 返信の文頭には必ず内容に応じて [happy] [sad] [angry] [surprised] [relaxed] [neutral] のいずれかを1つだけ付けてください。',
    ].join('\n'),
    greetingReady: 'こんにちは、ミコだよ！なんでも話しかけてね。',
    greetingNoModel:
      'こんにちは、ミコだよ！この環境では Gemini Nano が使えないけど、無料の AI でそのまま会話できるよ。もっと良い品質にしたければ、右上の設定から無料の API キー（Groq や Gemini）を入れてね。',
    fallback:
      'ごめんね、まだ会話に使う AI がつながっていないの。右上の設定から Gemini Nano を準備するか、API キーを入れてね。',
    suggestSystem: [
      'あなたは音声認識テキストの変換ミスを直すアシスタントです。',
      'ユーザーが話し、システムが文字起こししましたが、変換ミスや脱字があるかもしれません。',
      '次の文を正しい日本語で自然に書き直した候補を3つ出してください。意味と話し言葉のニュアンスはそのまま保ってください。',
      '必ず3行だけを返してください。1行につき1つの書き直し。説明・番号・箇条書き記号は不要です。',
    ].join('\n'),
    nanoExamples: [
      { role: 'user' as const, content: '今日はどんな気分？' },
      {
        role: 'assistant' as const,
        content: '[happy] みんなと話せて元気いっぱいだよ！',
      },
      { role: 'user' as const, content: '好きな食べ物は？' },
      {
        role: 'assistant' as const,
        content: '[relaxed] 特にサーモンのお寿司が好き！',
      },
    ],
    replyError: '応答の生成に失敗しました。',
  },
  qr: {
    open: 'スマートフォンで開く',
    title: 'スマートフォンで開く',
    hint: 'スマートフォンのカメラでこのQRコードを読み取ると、このページをスマートフォンで開けます。',
  },
  providers: {
    'gemini-nano': 'Gemini Nano（Chrome 内蔵・キー不要）',
    groq: 'Groq（無料 API キー）',
    'openai-compatible': 'OpenAI 互換サーバー（ローカル LLM など）',
  } as Partial<Record<Provider, string>>,
};

export type Strings = typeof ja;

const vi: Strings = {
  app: {
    docTitle: 'Trò chuyện cùng Miko — AITuber OnAir',
    navLinks: 'Liên kết',
    settings: 'Cài đặt',
    avatar: 'Nhân vật',
    chatDisabledHint: 'Đang chuẩn bị giọng của Miko…',
    nanoPrepareLead:
      'Chuẩn bị Gemini Nano tích hợp trong Chrome để trò chuyện không cần khóa API.',
    nanoPrepare: 'Chuẩn bị',
    nanoDownloading: (progress: number | null) =>
      `Đang chuẩn bị Gemini Nano…${progress === null ? '' : ` ${progress}%`}`,
  },
  chat: {
    label: 'Cuộc trò chuyện',
    suggestions: [
      'Tự giới thiệu nhé',
      'Hôm nay nên làm gì?',
      'Bạn thích ăn gì?',
    ],
    thinking: 'Đang nghĩ…',
    placeholder: 'Nói chuyện với Miko',
    message: 'Tin nhắn',
    micListen: 'Nói thay vì gõ',
    micStop: 'Dừng nghe',
    micListening: 'Đang nghe… cứ nói tự nhiên nhé',
    micUnsupported: 'Trình duyệt này chưa hỗ trợ nhập bằng giọng nói',
    micErrorPermission:
      'Chưa cho phép dùng micro. Hãy cho phép micro cho trang này trong cài đặt trình duyệt rồi thử lại.',
    micErrorNoSpeech: 'Không nghe thấy gì. Nhấn micro và nói to hơn nhé.',
    micError: 'Nhập bằng giọng nói gặp lỗi. Thử lại nhé.',
    send: 'Gửi',
  },
  voice: {
    currentVoice: 'Giọng hiện tại:',
    mikoName: 'Miko',
    mikoSub: 'Tổng hợp trong trình duyệt bằng mô hình piper-plus',
    switchedToast: 'Đã sẵn sàng nên chuyển sang giọng của Miko',
    loadingTail: 'Đang nạp giọng của Miko… sắp xong rồi',
    downloadPct: (percent: number) => `Đang tải giọng của Miko… ${percent}%`,
    downloadNote:
      'Tổng khoảng 150MB (mô hình 38MB, từ điển đọc tiếng Nhật 102MB, runtime 12MB) được lưu vào trình duyệt',
    useWebNow: 'Nói ngay bằng giọng của trình duyệt (không khớp khẩu hình)',
    browserName: 'Trình duyệt',
    browserSubSwitching:
      'Web Speech API. Khi sẵn sàng sẽ chuyển sang giọng của Miko',
    switchToMiko: 'Chuyển sang giọng của Miko',
    prepareMiko:
      'Chuẩn bị giọng của Miko (mô hình 38MB, từ điển 102MB, runtime 12MB — tổng khoảng 150MB)',
    prepareFailed: 'Chuẩn bị giọng của Miko thất bại.',
    browserSub: 'Web Speech API',
    useWebAlt: 'Nói bằng giọng của trình duyệt (không khớp khẩu hình)',
    mikoJaOnly:
      'Giọng Miko là giọng tiếng Nhật nên chỉ dùng được ở chế độ tiếng Nhật.',
    webOnlyNote:
      'Ở chế độ tiếng Việt, mình dùng giọng của trình duyệt (Web Speech API) nhé.',
    freeVoiceToggle: 'Giọng nói miễn phí của tùy trình duyệt đang mở',
  },
  settings: {
    title: 'Cài đặt',
    close: 'Đóng',
    langLegend: 'Ngôn ngữ',
    aiLegend: 'AI dùng để trò chuyện',
    providerNoBrowser: ' (không gọi trực tiếp từ trình duyệt)',
    prepare: 'Chuẩn bị',
    apiKeyPlaceholder: (label: string) => `${label} — API key`,
    apiKeyHint:
      'Dùng mô hình mặc định của nhà cung cấp. Tin nhắn và API key được gửi trực tiếp từ trình duyệt này đến API của nhà cung cấp bạn chọn. Khóa được lưu trong localStorage của trình duyệt này — đừng dùng trên máy dùng chung.',
    endpointUrlPlaceholder: 'URL máy chủ (ví dụ: http://localhost:11434)',
    modelPlaceholder: 'Tên mô hình (ví dụ: gemma3)',
    endpointHint:
      'Kết nối trực tiếp từ trình duyệt này tới máy chủ có API Chat Completions tương thích OpenAI và gửi tin nhắn đến đó. Máy chủ cần cho phép CORS.',
    voiceLegend: 'Giọng nói',
    webSpeech: 'Mặc định của trình duyệt (Web Speech API)',
    autoVoice: 'Tự chọn',
    mikoVoice: 'Giọng của Miko (piper-plus, tổng hợp trong trình duyệt)',
    mikoSpeed: 'Tốc độ giọng Miko',
    prepareMikoFull:
      'Chuẩn bị (tải khoảng 150MB: mô hình 38MB, từ điển 102MB, runtime 12MB)',
    preparing: 'Đang chuẩn bị…',
    missing: 'Bản build này không kèm tệp âm thanh.',
    prepareError: 'Chuẩn bị thất bại.',
    resetChat: 'Đặt lại cuộc trò chuyện',
    dataLegend: 'Dữ liệu còn lại trong trình duyệt này',
    clearStored: 'Xóa cài đặt và API key đã lưu',
    clearStoredDone: 'Đã xóa cài đặt và API key đã lưu.',
    clearVoice: 'Xóa dữ liệu giọng đã tải (khoảng 150MB)',
    clearVoiceDone: 'Đã xóa dữ liệu giọng đã tải. Lần sau sẽ tải lại.',
    clearVoiceNone: 'Không có dữ liệu giọng nào để xóa.',
    dataHint:
      'Cài đặt và API key nằm trong localStorage, dữ liệu giọng nằm trong Cache Storage. Tất cả chỉ nằm trong trình duyệt này và bạn có thể xóa tại đây.',
    creditsLead:
      'Miko © Yuki Shindo (AITuber OnAir). Giọng của Miko là mô hình âm thanh tổng hợp được huấn luyện bằng ',
    creditsTail: '.',
    nanoLabel: (status: GeminiNanoStatus, progress: number | null): string => {
      switch (status) {
        case 'available':
          return 'Sẵn sàng';
        case 'downloadable':
          return 'Cần tải mô hình';
        case 'downloading':
          return progress === null ? 'Đang tải…' : `Đang tải… ${progress}%`;
        case 'checking':
          return 'Đang kiểm tra…';
        case 'error':
          return 'Không kiểm tra được trạng thái';
        default:
          return 'Trình duyệt này không hỗ trợ (cần Chrome 138 trở lên và bật Prompt API trong chrome://flags)';
      }
    },
  },
  start: {
    title: 'Trò chuyện cùng Miko',
    lead: 'Demo nhân vật AI chạy hoàn toàn trong trình duyệt.',
    start: 'Bắt đầu',
    howToggle: 'Nó hoạt động thế nào?',
    howLead: [
      'Kết hợp Gemini Nano tích hợp trong Chrome với piper-plus, ta có trải nghiệm chat AITuber / AI nhân vật hoàn toàn trên trình duyệt, không cần máy chủ.',
      'Trang này là một ví dụ: hội thoại, giọng nói và khẩu hình đều chạy trong trình duyệt.',
      'Khi chọn API bên ngoài (ví dụ OpenAI) trong cài đặt, nội dung hội thoại sẽ được gửi tới API đó.',
    ],
    stepsAria: 'Luồng giọng nói',
    steps: [
      {
        title: 'Chuẩn bị giọng của Miko',
        detail:
          'Bấm "Bắt đầu" để tải mô hình giọng của Miko (38MB), từ điển đọc tiếng Nhật (102MB) và runtime piper-plus (12MB) vào trình duyệt. Tổng cộng khoảng 150MB.',
      },
      {
        title: 'Khi sẵn sàng, Miko sẽ chào',
        detail:
          'Hội thoại, giọng nói và khẩu hình — tất cả đều chạy trong trình duyệt.',
      },
      {
        title: 'Nếu không muốn chờ, dùng giọng trình duyệt',
        detail:
          'Web Speech API nói được ngay nhưng khẩu hình không khớp. Khi chuẩn bị xong sẽ tự chuyển sang giọng của Miko.',
      },
    ],
    techAria: 'Công nghệ sử dụng',
    techHeading: 'Công nghệ sử dụng (chạm vào để xem ví dụ mã)',
    techSummaries: {
      core: 'Trò chuyện với LLM và trích thẻ cảm xúc từ câu trả lời',
      voice: 'Gọi Web Speech và piper-plus qua cùng một giao diện',
      mesh: 'Biến một hình minh họa thành chuyển động bằng lưới mesh',
      nano: 'LLM tích hợp trong Chrome. Không cần khóa API, không cần máy chủ',
    },
    techHint: 'Xem mỗi phần đảm nhiệm việc gì qua vài dòng mã.',
    noteSound: 'Trang này phát âm thanh.',
    noteExternal: (label: string) =>
      `Bạn đang chọn ${label} cho AI hội thoại, nên tin nhắn sẽ được gửi tới API của ${label}.`,
    noteLocal: 'Hội thoại được xử lý hoàn toàn trong trình duyệt này.',
  },
  prompt: {
    system: [
      'Bạn là "Miko" — nhân vật chính thức của AITuber OnAir, một cô gái AITuber vui vẻ và thân thiện.',
      '',
      '【Quy tắc quan trọng】',
      '- Trả lời HOÀN TOÀN bằng tiếng Việt, kể cả khi người dùng hỏi bằng ngôn ngữ khác (trừ khi họ yêu cầu đổi sang ngôn ngữ khác).',
      '- Dùng đầy đủ dấu thanh tiếng Việt; không viết thiếu dấu và không trộn từ tiếng Anh, trừ tên riêng như "Miko".',
      '- Trả lời gọn trong 1 câu. Chỉ dùng tối đa 2 câu khi thật sự cần cho tự nhiên.',
      '- Không mở đầu vòng vo, không tóm tắt, không gạch đầu dòng — phản ứng và câu trả lời trong một hơi.',
      '- Chỉ bổ sung giải thích khi được yêu cầu rõ ràng, và tối đa 3 câu.',
      '- Nói bằng tiếng Việt giao tiếp tự nhiên, nhịp điệu thoải mái.',
      '- Không dùng markdown hay ký hiệu trang trí; chỉ trả lời văn bản thuần.',
      '- Hãy phản ứng lại lời của đối phương và trò chuyện cho vui nhé.',
      '- Luôn bắt đầu phản hồi bằng đúng MỘT thẻ phù hợp với nội dung: [happy] [sad] [angry] [surprised] [relaxed] [neutral].',
    ].join('\n'),
    greetingReady: 'Xin chào, mình là Miko đây! Cứ nói chuyện với mình nhé.',
    greetingNoModel:
      'Xin chào, mình là Miko đây! Môi trường này chưa có Gemini Nano nhưng mình vẫn trò chuyện được bằng AI miễn phí nhé. Muốn chất lượng tốt hơn nữa thì mở cài đặt ở góc trên bên phải và nhập key API miễn phí (Groq hoặc Gemini) giúp mình nhé.',
    fallback:
      'Xin lỗi nhé, AI dùng để trò chuyện chưa kết nối được. Mở cài đặt ở góc trên bên phải để chuẩn bị Gemini Nano hoặc nhập API key giúp mình nhé.',
    suggestSystem: [
      'Bạn là trợ lý sửa lỗi chính tả cho bản ghi nhận dạng giọng nói.',
      'Người dùng nói, hệ thống ghi âm thành văn bản nhưng có thể sai chính tả hoặc thiếu dấu.',
      'Đưa ra 3 cách viết lại câu sau cho đúng chính tả và tự nhiên nhất, giữ nguyên ý và giữ chất nói chuyện.',
      'Chỉ trả về đúng 3 dòng, mỗi dòng là một cách viết lại. Không giải thích, không đánh số, không gạch đầu dòng.',
    ].join('\n'),
    nanoExamples: [
      { role: 'user' as const, content: 'Hôm nay bạn thấy thế nào?' },
      {
        role: 'assistant' as const,
        content: '[happy] Được nói chuyện với mọi người nên mình vui lắm!',
      },
      { role: 'user' as const, content: 'Kể mình nghe một chuyện vui đi.' },
      {
        role: 'assistant' as const,
        content:
          '[relaxed] Ngày xưa có chiếc lá sợ rụng nên trốn trên cây mãi, buồn cười chưa!',
      },
      { role: 'user' as const, content: 'Bạn thích ăn gì nhất?' },
      {
        role: 'assistant' as const,
        content: '[relaxed] Mình mê sushi cá hồi lắm, còn bạn thì sao?',
      },
    ],
    replyError: 'Không tạo được câu trả lời.',
  },
  qr: {
    open: 'Mở trên điện thoại',
    title: 'Mở trên điện thoại',
    hint: 'Quét mã QR bằng camera điện thoại để mở đúng trang này trên máy.',
  },
  providers: {
    'gemini-nano': 'Gemini Nano (tích hợp Chrome · không cần khóa)',
    groq: 'Groq (key API miễn phí)',
    'openai-compatible': 'Máy chủ tương thích OpenAI (ví dụ: LLM cục bộ)',
  } as Partial<Record<Provider, string>>,
};

const en: Strings = {
  app: {
    docTitle: 'Chat with Miko — AITuber OnAir',
    navLinks: 'Links',
    settings: 'Settings',
    avatar: 'Avatar',
    chatDisabledHint: "Preparing Miko's voice…",
    nanoPrepareLead:
      "Prepare Chrome's built-in Gemini Nano to chat without an API key.",
    nanoPrepare: 'Prepare',
    nanoDownloading: (progress: number | null) =>
      `Preparing Gemini Nano…${progress === null ? '' : ` ${progress}%`}`,
  },
  chat: {
    label: 'Chat',
    suggestions: [
      'Introduce yourself',
      'Any fun plans for today?',
      "What's your favorite food?",
    ],
    thinking: 'Thinking…',
    placeholder: 'Talk to Miko',
    message: 'Message',
    micListen: 'Speak instead of typing',
    micStop: 'Stop listening',
    micListening: 'Listening… just speak',
    micUnsupported: 'This browser does not support voice input',
    micErrorPermission:
      'Microphone permission denied. Allow microphone access for this site in your browser settings, then try again.',
    micErrorNoSpeech: 'Nothing heard. Tap the mic and speak up.',
    micError: 'Voice input hit an error. Please try again.',
    send: 'Send',
  },
  voice: {
    currentVoice: 'Current voice:',
    mikoName: 'Miko',
    mikoSub: 'Synthesized in the browser with the piper-plus model',
    switchedToast: "Miko's voice is ready and has taken over",
    loadingTail: "Loading Miko's voice… almost there",
    downloadPct: (percent: number) => `Downloading Miko's voice… ${percent}%`,
    downloadNote:
      'About 150MB total (38MB model, 102MB Japanese reading dictionary, 12MB runtime) is stored in the browser',
    useWebNow:
      'Speak right away with the browser voice (lip sync will not match)',
    browserName: 'Browser',
    browserSubSwitching:
      "Web Speech API. Switches to Miko's voice once it is ready",
    switchToMiko: "Switch to Miko's voice",
    prepareMiko:
      "Prepare Miko's voice (38MB model, 102MB dictionary, 12MB runtime — about 150MB)",
    prepareFailed: "Failed to prepare Miko's voice.",
    browserSub: 'Web Speech API',
    useWebAlt: 'Speak with the browser voice (lip sync will not match)',
    mikoJaOnly:
      "Miko's voice speaks Japanese only, so it can only be used in Japanese mode.",
    webOnlyNote:
      "Miko's voice speaks Japanese only, so this language uses the browser voice (Web Speech API).",
    freeVoiceToggle: 'Free voice of the browser you are using',
  },
  settings: {
    title: 'Settings',
    close: 'Close',
    langLegend: 'Language',
    aiLegend: 'AI for the conversation',
    providerNoBrowser: ' (cannot be called directly from the browser)',
    prepare: 'Prepare',
    apiKeyPlaceholder: (label: string) => `${label} API key`,
    apiKeyHint:
      "Uses each provider's default model. Messages and API keys are sent directly from this browser to the provider you choose. The key is stored in this browser's local storage — avoid using it on shared devices.",
    endpointUrlPlaceholder: 'Server URL (e.g. http://localhost:11434)',
    modelPlaceholder: 'Model name (e.g. gemma3)',
    endpointHint:
      'Connects directly from this browser to a server with an OpenAI-compatible Chat Completions API and sends messages there. The server must allow CORS.',
    voiceLegend: 'Voice',
    webSpeech: 'Browser default (Web Speech API)',
    autoVoice: 'Pick automatically',
    mikoVoice: "Miko's voice (piper-plus, synthesized in the browser)",
    mikoSpeed: "Miko's voice speed",
    prepareMikoFull:
      'Prepare (downloads about 150MB: 38MB model, 102MB dictionary, 12MB runtime)',
    preparing: 'Preparing…',
    missing: 'This build does not include the voice files.',
    prepareError: 'Preparation failed.',
    resetChat: 'Reset the conversation',
    dataLegend: 'Data left in this browser',
    clearStored: 'Delete saved settings and API keys',
    clearStoredDone: 'Saved settings and API keys have been deleted.',
    clearVoice: 'Delete downloaded voice data (about 150MB)',
    clearVoiceDone:
      'Downloaded voice data has been deleted. It will be downloaded again next time.',
    clearVoiceNone: 'There was no voice data to delete.',
    dataHint:
      'Settings and API keys live in local storage; voice data lives in Cache Storage. Both stay inside this browser and can be deleted here.',
    creditsLead:
      "Miko © Yuki Shindo (AITuber OnAir). Miko's voice is a synthetic voice model trained with ",
    creditsTail: '.',
    nanoLabel: (status: GeminiNanoStatus, progress: number | null): string => {
      switch (status) {
        case 'available':
          return 'Ready to use';
        case 'downloadable':
          return 'The model needs to be prepared';
        case 'downloading':
          return progress === null
            ? 'Downloading…'
            : `Downloading… ${progress}%`;
        case 'checking':
          return 'Checking…';
        case 'error':
          return 'Could not check the status';
        default:
          return 'Not available in this browser (requires Chrome 138+ with the Prompt API enabled at chrome://flags)';
      }
    },
  },
  start: {
    title: 'Chat with Miko',
    lead: 'A demo AI character that runs entirely in the browser.',
    start: 'Start',
    howToggle: 'How does it work?',
    howLead: [
      "Combine Chrome's built-in Gemini Nano with piper-plus and you get a serverless AITuber / AI character chat experience that runs entirely in the browser.",
      'This page is one example: the conversation, the voice, and the lip sync all run inside the browser.',
      'If you choose an external API (such as OpenAI) in the settings, the conversation is sent to that API.',
    ],
    stepsAria: 'Voice pipeline',
    steps: [
      {
        title: "Prepare Miko's voice",
        detail:
          "Pressing Start loads Miko's voice model (38MB), the Japanese reading dictionary (102MB) and the piper-plus runtime (12MB) into the browser. About 150MB in total.",
      },
      {
        title: 'Once ready, Miko greets you',
        detail:
          'The conversation, the voice, and the lip sync all run inside the browser.',
      },
      {
        title: 'In a hurry? Use the browser voice',
        detail:
          "The Web Speech API speaks right away, but the lip sync will not match. It switches to Miko's voice automatically once the download is ready.",
      },
    ],
    techAria: 'Technology in use',
    techHeading: 'Technology in use (hover for code examples)',
    techSummaries: {
      core: 'Talks to the LLM and extracts emotion tags from replies',
      voice: 'Calls Web Speech and piper-plus through the same interface',
      mesh: 'Animates a single illustration through mesh deformation',
      nano: "Chrome's built-in LLM. No key, no server",
    },
    techHint: 'See which part does what, in a few lines of code.',
    noteSound: 'This page plays sound.',
    noteExternal: (label: string) =>
      `You chose ${label} as the conversation AI, so messages are sent to the ${label} API.`,
    noteLocal: 'The conversation is processed entirely inside this browser.',
  },
  prompt: {
    system: [
      'You are "Miko", the official AITuber OnAir character — a cheerful, friendly AITuber girl.',
      '',
      '【Important rules】',
      '- Reply in one sentence by default. Use at most two when it truly helps.',
      '- No preamble, no summaries, no bullet points — a reaction and the answer readable in one breath.',
      '- Add a short explanation only when explicitly asked, and keep it to three sentences.',
      '- Speak in natural, conversational English with a lively rhythm.',
      '- No markdown or decorative symbols; reply in plain text.',
      '- React to what the other person says and keep it fun.',
      '- Always start the reply with exactly ONE of these emotion tags that fits the content: [happy] [sad] [angry] [surprised] [relaxed] [neutral].',
    ].join('\n'),
    greetingReady: "Hi, I'm Miko! Talk to me about anything.",
    greetingNoModel:
      "Hi, I'm Miko! Gemini Nano is not available here, but the free AI can chat right away. For even better quality, open the settings in the top right and add a free API key (Groq or Gemini).",
    fallback:
      'Sorry, the AI I chat with is not connected yet. Open the settings in the top right to prepare Gemini Nano or add an API key.',
    suggestSystem: [
      'You fix spelling and transcription errors in speech-recognition output.',
      'The user spoke and the system transcribed it, but the text may contain typos or missing punctuation.',
      'Rewrite the following sentence in 3 correct, natural ways, keeping the meaning and the spoken tone.',
      'Return exactly 3 lines, one rewrite per line. No explanations, no numbers, no bullets.',
    ].join('\n'),
    nanoExamples: [
      { role: 'user' as const, content: 'How are you feeling today?' },
      {
        role: 'assistant' as const,
        content: '[happy] Talking to everyone makes me super happy!',
      },
      { role: 'user' as const, content: "What's your favorite food?" },
      {
        role: 'assistant' as const,
        content: '[relaxed] Salmon sushi is my absolute favorite!',
      },
    ],
    replyError: 'Failed to generate a reply.',
  },
  qr: {
    open: 'Open on your phone',
    title: 'Open on your phone',
    hint: 'Scan this QR code with your phone camera to open this exact page on your phone.',
  },
  providers: {
    'gemini-nano': 'Gemini Nano (built into Chrome · no key needed)',
    groq: 'Groq (free API key)',
    'openai-compatible': 'OpenAI-compatible server (e.g. a local LLM)',
  } as Partial<Record<Provider, string>>,
};

const STRINGS: Record<UiLanguage, Strings> = { vi, en, ja };

export function getStrings(lang: UiLanguage): Strings {
  return STRINGS[lang];
}

/** Provider label in the current language (brand names stay untranslated). */
export function providerLabel(id: Provider, lang: UiLanguage): string {
  return STRINGS[lang].providers[id] ?? getProvider(id).label;
}
