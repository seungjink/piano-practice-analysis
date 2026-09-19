# Piano Practice Analysis

Markdown 기반 피아노 연주 분석 리포트용 정적 사이트입니다.

## 기본 구조

```text
.
├─ index.html
├─ assets/
│  ├─ app.js
│  └─ styles.css
├─ reports/
│  ├─ template.md
│  └─ *.md
├─ scripts/
│  └─ build_index.py
└─ .github/workflows/pages.yml
```

- 메인 페이지: 공개 분석 목록
- 분석 본문: `reports/*.md`
- `hidden: true`: 메인 목록에서 숨김
- `hidden: false`: 메인 목록에 표시
- `template.md`: 새 분석 작성용 템플릿
- 새 Markdown 파일을 push하면 GitHub Actions가 목록 인덱스를 자동 생성합니다.

## 로컬 영상/이미지

브라우저 보안상 정적 웹사이트가 임의의 로컬 파일 경로를 직접 열 수는 없습니다.
대신 Markdown에서 `local:별칭`을 지정하면 리포트 상단에 파일 선택 UI가 나타납니다.

예:

````md
```piano-video
src: local:take-a
range: 32.4-41.7
label: Take A
```
````

페이지에서 `take-a`에 해당하는 로컬 MP4를 선택하면 해당 세션 동안 연결됩니다.
새로고침 후에는 브라우저 보안상 다시 선택해야 합니다.

## GitHub Pages

Repository Settings → Pages에서 Source를 **GitHub Actions**로 선택하면
`.github/workflows/pages.yml`이 사이트를 배포합니다.
