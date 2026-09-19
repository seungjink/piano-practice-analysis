# Piano Practice Analysis

Markdown 기반 피아노 연주 분석 리포트용 정적 사이트입니다.

## 구조

```text
.
├─ index.html
├─ assets/
│  ├─ app.js
│  └─ styles.css
└─ reports/
   ├─ template.md
   └─ *.md
```

별도 빌드 스크립트나 custom GitHub Action은 사용하지 않습니다.

메인 페이지의 JavaScript가 GitHub의 `reports/` 폴더를 직접 읽고,
각 Markdown의 frontmatter에서 제목/날짜/설명/숨김 여부를 가져옵니다.

## 새 분석 추가

`reports/template.md`를 복사해서 새 `.md` 파일을 만들면 됩니다.

```yaml
---
title: "Schubert D.960 3악장"
date: "2026-09-19"
summary: "특정 프레이즈의 articulation 비교"
hidden: false
order: 100
---
```

- `hidden: false`: 메인 목록에 표시
- `hidden: true`: 메인 목록에서 숨김
- `order`: 작은 숫자가 먼저 표시
- 파일명이 `template.md`인 파일만 목록에서 제외

## 로컬 영상 / 이미지

Markdown에서 다음처럼 로컬 파일 별칭을 지정합니다.

````md
```piano-video
src: local:take-a
range: 32.4-41.7
label: Take A
```
````

페이지를 열면 해당 별칭의 로컬 파일을 선택할 수 있습니다.
파일은 서버에 업로드되지 않고 브라우저에서만 사용됩니다.

악보 이미지도 같은 방식입니다.

````md
```piano-image
src: local:score-1
caption: mm. 12–16
```
````

## GitHub Pages

GitHub Pages는 repository의 `main` branch / root를 그대로 서빙하면 됩니다.
