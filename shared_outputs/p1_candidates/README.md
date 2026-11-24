# P1 BFS 최종 후보 (τ=0.02)

P1 BFS(대→중→소 계층 탐색, τ 통과 노드만 하위로 내려감)로 뽑은 텍스트별 최종 후보 규칙 목록입니다. ShieldGemma 등 P2 판정의 `default` 조건 입력으로 쓸 수 있습니다.

## 파일

| 파일 | 행 수 | 내용 |
| --- | ---: | --- |
| `p2_candidates_dna.csv` | 300,433 | DNA 5,634개 텍스트의 BFS 최종 후보 (텍스트당 평균 53.3개) |
| `p2_candidates_jigsaw.csv` | 3,751 | Jigsaw 2,029개 텍스트의 BFS 최종 후보 (텍스트당 평균 1.85개) |

컬럼: `text_id, rule_id, score, tau`

- `score`: 해당 (텍스트, 규칙) 쌍의 RoBERTa 코사인 유사도 (`similarity_steps` 원본값)
- `tau`: 0.02로 고정 (dev에서 DNA top-1 정확도 최댓값 기준 선택, Jigsaw는 규칙이 2개뿐이라 τ에 따라 정확도가 전혀 안 바뀌어서 DNA와 동일값 사용)

## τ=0.02 선택 근거 (dev 기준)

| source | τ | top-1 | top-3 | 효율(방문비율) |
| --- | --- | ---: | ---: | ---: |
| DNA | 0.00 | 28.07% | 49.31% | 96.8% |
| DNA | **0.02** | **28.11%** | **49.51%** | 93.4% |
| DNA | 0.04 | 27.78% | 49.19% | 88.5% |
| Jigsaw | 전 구간 | 96.60% (고정) | ~99.5~100% | 100% (고정) |

전체 31개 τ(0.00~0.60, 0.02 단위) 값은 Supabase `p1_tau_grid` 테이블에 있습니다.

## 기존 ShieldGemma `default` 후보와 대조 결과

기존 `shared_outputs/shieldgemma/judgments_shieldgemma_{dna,jigsaw}.csv`의 `default` 조건 후보(DNA는 유사도 상위 5개, Jigsaw는 2개 전부)와 비교했습니다.

**Jigsaw**: 84.8%는 완전 일치, 15.2%는 BFS 결과가 더 적음(둘 중 하나만 τ 통과) — 기존 ShieldGemma 확률 재사용 가능, 재실행 불필요.

**DNA**: τ=0.02가 낮아 가지치기가 적어(평균 53/61개 생존) 후보 집합 자체는 다르지만, 실제 겹침은 이렇습니다:

| 결과 | 건수 | 비율 |
| --- | ---: | ---: |
| 기존 5개 후보가 BFS 후보에 전부 포함 | 5,252 | 93.2% |
| 일부만 포함 | 374 | 6.6% |
| 하나도 안 겹침 | 8 | 0.1% |

→ **DNA 텍스트 8건만 ShieldGemma 추가 판정이 필요**하고, 나머지 99.9%는 기존 확률을 BFS 결과로 재필터링하면 됩니다.

## DNA: ShieldGemma 기존 5개 후보별 BFS 통과 여부 (`p2_shieldgemma_bfs_dna.csv`)

28,170행 (5,634텍스트 × 5후보). 컬럼: `text_id, rule_id, shieldgemma_violation_prob, bfs_pass, is_fallback, fallback_rule_id`

- `bfs_pass`: 이 rule_id가 실제 BFS 결과(생존자 집합, fallback이면 유사도 1위 1개)에 포함되는지
- `is_fallback`: 이 텍스트가 어느 단계에서도 τ를 통과한 노드가 없어 "유사도 1위로 대체"된 경우인지
- `fallback_rule_id`: `is_fallback=True`일 때 그 대체 규칙의 id (대/중/소 어느 레벨이든 될 수 있음 — 아래 참고)

**사용법**: `bfs_pass=True`인 행들 중 `shieldgemma_violation_prob` 최댓값 = 그 텍스트의 default 최종 확률. `bfs_pass=True`가 하나도 없으면 `p2_dna_needs_shieldgemma_rerun.csv` 참고.

## DNA: 추가 판정 필요한 8건 (`p2_dna_needs_shieldgemma_rerun.csv`)

기존 5개 후보 중 BFS를 통과한 게 하나도 없는 텍스트입니다.

- 6건은 소분류 레벨에서 막힘 (`is_fallback=False`, `fallback_rule_id` 비어있음) — 실제 BFS 생존자가 기존 5개와 안 겹치는 경우. `p2_candidates_dna.csv`에서 이 text_id로 찾으면 진짜 생존자 목록이 있습니다.
- **2건은 대분류·중분류에서 아예 막힘** (`dna__921__ChatGPT`→대분류 `dna_major_0624bbb8aa`, `dna__921__GPT4`→중분류 `dna_mid_b419714480`) — `fallback_rule_id`가 **소분류가 아니라 대/중분류 문장**입니다. ShieldGemma 정책 자리에 소분류보다 훨씬 포괄적인 문장이 들어가게 되는데, 이게 의도한 입력 형식이 맞는지 확인 한번 부탁드립니다.

## Jigsaw id 매핑 (`jigsaw_id_mapping.csv`)

```
jigsaw_minor_560931914f54  →  jigsaw_rule_560931914f   ("No legal advice: Do not offer or request legal advice.")
jigsaw_minor_677797f76c2c  →  jigsaw_rule_677797f76c   ("No Advertising: Spam, referral links, unsolicited advertising, and promotional content are not allowed.")
```

## 생성 방법

`pipeline/generate_p2_candidates.py`, `pipeline/generate_shieldgemma_bfs_annotation.py` — BFS 로직은 `pipeline/precompute_p1.py`의 `run_bfs`와 동일(같은 코드 재사용).
