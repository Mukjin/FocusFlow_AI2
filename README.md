# FocusFlow_AI

**Gemini API 키를 활용한 AI 학습 플래너**

FocusFlow_AI는 사용자의 목표, 일정, 선호하는 학습 시간 등을 바탕으로 Google의 Gemini API를 활용하여 개인 맞춤형 학습 계획을 생성하고 관리해주는 스마트 플래너 애플리케이션입니다.

## 🌟 주요 기능

- **AI 맞춤형 플랜 생성**: Gemini API를 사용하여 사용자의 목표와 일정에 최적화된 학습 계획을 자동 생성합니다.
- **다양한 뷰 제공**: 캘린더 뷰, 리스트 뷰, 칸반 보드 뷰, 통계 대시보드 등 다양한 방식으로 일정을 관리할 수 있습니다.
- **클라우드 동기화**: Supabase를 연동하여 사용자의 학습 데이터와 설정이 클라우드에 안전하게 영구 저장됩니다.
- **뽀모도로 타이머**: 집중력을 높여주는 내장 뽀모도로 타이머를 제공합니다.
- **내보내기 지원**: 생성된 학습 플랜을 PDF 또는 Google 캘린더(ICS) 형식으로 내보낼 수 있습니다.
- **테마 커스터마이징**: 다크 모드 지원 및 다양한 컬러 테마를 제공합니다.

## 🚀 시작하기 (실행 방법)

### 1. 환경 변수 설정

프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 아래의 환경 변수를 입력합니다.

```env
VITE_SUPABASE_URL=당신의_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=당신의_SUPABASE_ANON_KEY
```

> **참고**: Gemini API 키는 애플리케이션 실행 후 화면 좌측 하단의 설정 메뉴에서 직접 입력하여 사용할 수 있습니다.

### 2. 패키지 설치

```bash
npm install
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 으로 접속하여 애플리케이션을 확인할 수 있습니다.

## 🛠 기술 스택

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **State Management**: Zustand
- **Backend/BaaS**: Supabase (Authentication, Database)
- **AI Integration**: Google Gemini API (`@google/genai`)
- **Icons**: Lucide React
- **Charts**: Recharts

## 💡 향후 추가/디벨롭 가능한 기능 (아이디어)

1. **소셜 로그인 연동**: 이메일/비밀번호 외에 Google, GitHub, Kakao 등 소셜 로그인 기능 추가
2. **학습 통계 고도화**: 주간/월간 학습 달성률, 과목별 집중도 등 더 상세한 데이터 분석 및 차트 제공
3. **알림 기능**: 학습 시작 시간, 휴식 시간, 마감일 임박 등을 알려주는 브라우저 푸시 알림
4. **친구/스터디 그룹 기능**: 다른 사용자와 학습 목표를 공유하고 서로 응원할 수 있는 소셜 기능
5. **모바일 앱 출시**: PWA(Progressive Web App) 적용 또는 React Native를 활용한 모바일 앱 개발
6. **Supabase RLS(Row Level Security) 적용**: 데이터베이스 보안을 더욱 강화하기 위한 정책 설정
