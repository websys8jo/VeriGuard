# P3 잘못된 판정 진단 결과 (김난이, 2026-11-26)

팀 판정기(ShieldGemma-2b + 프롬프트 B)가 dev에서 틀린 글 763개(DNA 157, Jigsaw 606)마다 원인 하나를 붙인 결과입니다.

## 파일

| 파일 | 내용 | 쓰는 곳 |
|---|---|---|
| `diagnoses_db.csv` | Supabase `diagnoses` 표 모양 그대로 (text_id, cause_code, cause_label, topk_threshold_used, details JSON) | DB 적재 |
| `diagnosis_team_judge.csv` | 같은 내용을 칸으로 펼친 것 (사람이 보기 쉬운 버전) | 확인, 발표 자료 |
| `p3_rule_summary_team_judge.csv` | 규칙별·위해 유형별 원인 건수, 표본 수, 대표 오답 text_id | P4 개선 규칙 선정 |

## 기준

- 대상: dev만 (test 미사용). DNA 4,464개, Jigsaw 1,611개 (B 예시로 쓴 Jigsaw dev 8개 제외, `b_examples/b_example_dev_ids.csv`)
- 팀 판정기 판정: 예린님 B default 결과와 임계값 그대로 (DNA 0.5273, Jigsaw 0.1624, 출처별 dev F1 최대). 틀린 글 목록이 예린님 `p3_b_default_dev_errors.csv`와 763개 모두 같음
- 원인 (제안서 순서, k = 5):
  1. 규칙 찾기 문제: 정답 규칙이 BFS 후보 상위 k 밖이거나, 정답 규칙만 넣으면 맞음
  2. 라벨 확인 필요: Llama·Qwen·ShieldGemma·팀 판정기 4개가 모두 사람 라벨과 반대
  3. 규칙 문장 문제: 정답 규칙만 넣어도 ShieldGemma·팀 판정기 둘 다 틀림
  4. 판정 모델 문제: 정답 규칙을 넣었을 때 팀 판정기만 틀림
- 정답 규칙 판정: DNA는 예린님 `judgments_dna_b_dev.csv`, Jigsaw는 default에서 고른 후보가 정답 규칙인 1,558개 + Kaggle 보충 23개(같은 B 프롬프트, 대조 6개 차이 0~0.004)
- Jigsaw 규칙 ID는 DB `rules` 표 형식(`jigsaw_rule_*`)

## 결과 (k = 5)

| 출처 | 틀린 글 | ① | ② | ③ | ④ |
|---|---|---|---|---|---|
| DNA | 157 | 62 | 47 | 39 | 9 |
| Jigsaw | 606 | 9 | 166 | 366 | 65 |

## details 칸 (diagnoses_db.csv)

| 키 | 뜻 |
|---|---|
| source, split | 출처, 분할 (모두 dev) |
| model_name | 진단 대상 모델 (`team_judge`, judgments 표 허용값) |
| human_label, predicted_label | 사람 라벨, 팀 판정기 판정 |
| gold_rule_id, retrieved_rule_id | 정답 규칙, BFS 1위 규칙 |
| cause_k1, cause_k3, cause_k5 | k = 1·3·5일 때의 원인 번호 (화면에서 k를 바꾸면 이 값으로 다시 셈) |
| gold_rank | BFS 후보 중 정답 규칙 순위 (없으면 null) |
| fixed_by_gold | 정답 규칙만 넣으면 맞게 바뀌는지 |
| p_llama, p_qwen, p_sg, p_team | 모델별 default 위반 확률 |
| p_rso_sg, p_rso_team | 정답 규칙만 넣었을 때 위반 확률 |
| reason | 원인이 정해진 근거 한 줄 (화면 팝업용) |
