---
title: "곡명 — 분석 제목"
date: "2026-09-19"
summary: "메인 목록에 표시할 짧은 설명"
hidden: false
template: true
order: 100
---

# 분석 목적

이번 연습에서 비교하려는 해석이나 기술적 질문을 적는다.

## 악보

저장소 안의 이미지를 쓸 경우:

```piano-image
src: ./media/score-example.png
caption: Example 1. 분석할 악보 구간
alt: score excerpt
```

로컬 이미지를 매번 직접 선택해서 쓸 경우:

```piano-image
src: local:score-1
caption: Example 1. 분석할 악보 구간
alt: score excerpt
```

## 해석 A / B 비교

로컬 영상은 아래처럼 별칭만 적는다.

```piano-compare
a:
  src: local:take-a
  range: 32.4-41.7
  label: A — 내성을 조금 더 끊어서

b:
  src: local:take-b
  range: 51.2-60.9
  label: B — 내성을 연결해서
```

페이지를 열면 상단의 **로컬 미디어 연결** 영역에서
`take-a`, `take-b`에 대응하는 실제 MP4 파일을 선택한다.

원격 URL이나 저장소에 함께 둔 상대 경로도 사용할 수 있다.

```piano-video
src: https://example.com/video.mp4
range: 12.0-18.5
label: 원격 영상 예시
```

## 관찰

- A:
- B:
- 차이가 가장 잘 들리는 지점:
- 다음 연습에서 확인할 것:

## 결론

현재 판단과 다음 실험/연습 방향을 적는다.
